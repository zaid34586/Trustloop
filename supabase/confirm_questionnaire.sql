-- ============================================================
-- Trustloop — confirm_questionnaire function
--
-- Summary: one SECURITY INVOKER plpgsql function (RLS applies)
-- that replaces the 3-step client flow of
-- /api/questionnaires/confirm in ONE transaction:
--   1. verify the questionnaire belongs to auth.uid()
--   2. delete its old questions (owner only, RLS + explicit check)
--   3. insert the new questions from a jsonb array
--      [{ "row_number": int, "question_text": text }, ...]
--   4. update the questionnaire status/counts in the same call
-- Rejects more than 200 questions (MAX_QUESTIONS = 200) and empty
-- input; any error rolls the whole transaction back, so the old
-- questions are never lost. Returns the number of questions saved.
-- ============================================================

create or replace function public.confirm_questionnaire(
  p_questionnaire_id uuid,
  p_sheet_name text,
  p_question_col int,
  p_header_rows int,
  p_questions jsonb
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(jsonb_typeof(p_questions), '') <> 'array' then
    raise exception 'questions must be a JSON array';
  end if;

  if jsonb_array_length(p_questions) > 200 then
    raise exception 'too many questions (max 200)';
  end if;

  if jsonb_array_length(p_questions) = 0 then
    raise exception 'no questions to save';
  end if;

  -- Ownership check (also enforced by RLS on the select below).
  perform 1
    from public.questionnaires
   where id = p_questionnaire_id
     and user_id = v_uid;
  if not found then
    raise exception 'questionnaire not found';
  end if;

  delete from public.questions
   where questionnaire_id = p_questionnaire_id
     and user_id = v_uid;

  insert into public.questions (
    questionnaire_id,
    user_id,
    row_number,
    question_text,
    status,
    answer_text,
    confidence,
    sources,
    edited_by_user,
    approved_at
  )
  select
    p_questionnaire_id,
    v_uid,
    (elem ->> 'row_number')::int,
    left(btrim(elem ->> 'question_text'), 1000),
    'pending',
    null,
    null,
    '[]'::jsonb,
    false,
    null
  from jsonb_array_elements(p_questions) as elem
  where nullif(btrim(elem ->> 'question_text'), '') is not null;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    raise exception 'no questions to save';
  end if;

  update public.questionnaires
     set sheet_name = p_sheet_name,
         question_col = p_question_col,
         header_rows = p_header_rows,
         status = 'parsed',
         total_questions = v_inserted,
         error_message = null
   where id = p_questionnaire_id
     and user_id = v_uid;

  return v_inserted;
end;
$$;

grant execute on function public.confirm_questionnaire(uuid, text, int, int, jsonb)
  to authenticated;
