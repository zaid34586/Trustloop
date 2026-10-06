import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const tileSvg = readFileSync(
  path.join(root, "public/brand/trustloop-icon-tile.svg")
);

// Full-bleed square variant (apple-touch / maskable): no transparency, no rounding.
const paths = tileSvg
  .toString("utf8")
  .split("\n")
  .filter((line) => line.trim().startsWith("<path"))
  .join("\n");

const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" fill="#0B2A21"/>
  <g stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
${paths}
  </g>
</svg>`;

// Maskable: fingerprint scaled into the 80% safe zone, full-bleed background.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" fill="#0B2A21"/>
  <g stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(3.6 3.6) scale(0.7)">
${paths}
  </g>
</svg>`;

function pngToIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers.map((b) => b.buffer)]);
}

const outDirs = [
  path.join(root, "public/icons"),
  path.join(root, "app"),
];
for (const dir of outDirs) mkdirSync(dir, { recursive: true });

const write = (rel, buf) => {
  const file = path.join(root, rel);
  writeFileSync(file, buf);
  console.log(`${rel} (${buf.length} bytes)`);
};

const png192 = await sharp(Buffer.from(tileSvg)).resize(192, 192).png().toBuffer();
const png512 = await sharp(Buffer.from(tileSvg)).resize(512, 512).png().toBuffer();
const pngMaskable = await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toBuffer();
const png180 = await sharp(Buffer.from(squareSvg)).resize(180, 180).png().toBuffer();
const png32 = await sharp(Buffer.from(tileSvg)).resize(32, 32).png().toBuffer();
const png16 = await sharp(Buffer.from(tileSvg)).resize(16, 16).png().toBuffer();

write("public/icons/icon-192.png", png192);
write("public/icons/icon-512.png", png512);
write("public/icons/icon-maskable-512.png", pngMaskable);
write("app/apple-icon.png", png180);
write("app/favicon.ico", pngToIco([
  { size: 32, buffer: png32 },
  { size: 16, buffer: png16 },
]));
console.log("done");
