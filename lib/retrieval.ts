import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// App-side chunk retrieval — replaces the search_chunks SQL RPC.
//
// The API routes read the user's document_chunks through the
// session-bearing server client (RLS applies), then rank chunks
// here in application code: lowercase -> stop-word removal ->
// light stemming -> keyword-overlap score.
//
// Corpora of ALL_CHUNKS_LIMIT chunks or fewer are sent to the AI
// in full (no ranking cut); larger corpora send the top TOP_CHUNKS
// chunks. Nothing in the app depends on Postgres full-text matching
// anymore, so tsquery/RLS quirks can never skip the AI call.
// ============================================================

/** Reading chunks failed (DB error) — always surfaced as a real error, never as "not found". */
export class RetrievalError extends Error {
  constructor(message = "Could not search your documents. Please try again.") {
    super(message);
    this.name = "RetrievalError";
  }
}

export type UserChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  file_name: string;
};

export type RankedChunk = UserChunk & { score: number };

/** Corpora this size or smaller send every chunk to the AI (no ranking cut). */
export const ALL_CHUNKS_LIMIT = 30;
/** How many chunks to keep when the corpus is larger than ALL_CHUNKS_LIMIT. */
export const TOP_CHUNKS = 6;

const STOP_WORDS = new Set([
  "a", "about", "all", "also", "am", "an", "and", "any", "are", "as", "at",
  "be", "been", "being", "but", "by", "can", "could", "did", "do", "does",
  "doing", "done", "down", "each", "few", "for", "from", "further", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "itself", "just", "may", "me", "might", "more", "most", "must", "my",
  "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
  "or", "other", "our", "ours", "ourselves", "out", "over", "own", "please",
  "re", "same", "shall", "she", "should", "so", "some", "such", "t", "than",
  "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "us", "ve", "very", "was", "we", "were", "what", "when", "where",
  "which", "while", "who", "whom", "why", "will", "with", "would", "you",
  "your", "yours", "yourself", "yourselves",
]);

/**
 * Light stemming: strip trailing ies->y, ing, ed, es, s and a final e.
 * Applied identically to query and chunk tokens so both sides land on
 * the same form (policies/policy, change/changes/changed -> chang).
 */
function stem(token: string): string {
  let w = token;
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** Lowercase -> word tokens -> drop stop words -> stem. Deduped, order kept. */
export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const word of raw) {
    if (STOP_WORDS.has(word)) continue;
    const stemmed = stem(word);
    if (!stemmed || STOP_WORDS.has(stemmed) || seen.has(stemmed)) continue;
    seen.add(stemmed);
    tokens.push(stemmed);
  }
  return tokens;
}

/**
 * Reads ALL chunks for the user through the session client (RLS scopes
 * them to auth.uid()) and joins each chunk with its document's file
 * name. Throws RetrievalError on any DB failure so callers surface a
 * real error instead of pretending the answer was not found.
 */
export async function fetchUserChunks(
  supabase: SupabaseClient,
  userId: string
): Promise<UserChunk[]> {
  const [chunksRes, docsRes] = await Promise.all([
    supabase
      .from("document_chunks")
      .select("id, document_id, chunk_index, content")
      .eq("user_id", userId)
      .order("document_id")
      .order("chunk_index"),
    supabase
      .from("documents")
      .select("id, file_name")
      .eq("user_id", userId),
  ]);

  if (chunksRes.error || docsRes.error) {
    console.error(
      "[retrieval] failed to read chunks:",
      chunksRes.error?.message ?? docsRes.error?.message
    );
    throw new RetrievalError();
  }

  const fileNames = new Map<string, string>(
    (docsRes.data ?? []).map((doc) => [doc.id, doc.file_name])
  );

  return (chunksRes.data ?? []).map((chunk) => ({
    id: chunk.id,
    document_id: chunk.document_id,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    file_name: fileNames.get(chunk.document_id) ?? "Document",
  }));
}

/**
 * Keyword-overlap ranking: score = how many distinct query tokens the
 * chunk contains (after stop-word removal + stemming). Ties keep the
 * original document/chunk order so results are deterministic.
 */
export function rankChunks(
  chunks: UserChunk[],
  query: string,
  limit?: number
): RankedChunk[] {
  const queryTokens = tokenize(query);
  const scored = chunks.map((chunk, index) => {
    let score = 0;
    if (queryTokens.length > 0) {
      const chunkTokens = new Set(tokenize(chunk.content));
      score = queryTokens.filter((token) => chunkTokens.has(token)).length;
    }
    return { chunk, index, score };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = typeof limit === "number" ? scored.slice(0, limit) : scored;
  return selected.map(({ chunk, score }) => ({ ...chunk, score }));
}

/**
 * Drops duplicate / heavily overlapping excerpts: a chunk is skipped
 * when >= 85% of its tokens also appear in an already-kept chunk
 * (exact copies and near-copies). Adjacent chunks that merely share
 * the ~150-char sliding overlap (~15% of their tokens) are kept.
 */
export function dedupeOverlapping(chunks: RankedChunk[]): RankedChunk[] {
  const kept: RankedChunk[] = [];
  const keptTokens: Set<string>[] = [];
  for (const chunk of chunks) {
    const tokens = new Set(tokenize(chunk.content));
    let duplicate = false;
    for (const other of keptTokens) {
      const small = tokens.size <= other.size ? tokens : other;
      const big = tokens.size <= other.size ? other : tokens;
      let shared = 0;
      for (const token of small) {
        if (big.has(token)) shared++;
      }
      if (small.size > 0 && shared / small.size >= 0.85) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) {
      kept.push(chunk);
      keptTokens.push(tokens);
    }
  }
  return kept;
}

/**
 * Chunks to send to the AI for `query`:
 * - 0 chunks -> [] (caller must return "Upload and process a document first")
 * - <= ALL_CHUNKS_LIMIT chunks -> every chunk, scored but uncut
 * - otherwise -> the TOP_CHUNKS best keyword matches
 * Duplicate/overlapping excerpts are removed before slicing so they
 * never occupy a slot. Never returns empty when chunks exist, so the
 * AI is always called.
 */
export function selectChunks(chunks: UserChunk[], query: string): RankedChunk[] {
  if (chunks.length === 0) return [];
  const deduped = dedupeOverlapping(rankChunks(chunks, query));
  if (chunks.length <= ALL_CHUNKS_LIMIT) return deduped;
  return deduped.slice(0, TOP_CHUNKS);
}
