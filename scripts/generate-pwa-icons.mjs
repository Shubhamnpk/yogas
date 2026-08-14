import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = (await readFile("public/favicon.svg")).toString();

// Maskable icon: tile scaled to ~80% (safe zone) centered on a solid brand background,
// so OS circular cropping doesn't cut off the tile.
const masked = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#f97316"/>
     <g transform="translate(51.2 51.2) scale(0.8)">
       ${svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>$/, "")}
     </g>
   </svg>`,
);

await sharp(masked).png().toFile("public/icon-maskable-512.png");
console.log("wrote maskable icon");