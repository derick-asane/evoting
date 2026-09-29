/**
 * Builds the raster icons from app/icon.svg.
 *
 *   npm run icons
 *
 * app/icon.svg is the source of truth and is what modern browsers actually
 * use. This exists for the two places that cannot take an SVG: favicon.ico,
 * which Safari and the Windows taskbar still ask for, and apple-icon.png for
 * an iOS home screen.
 *
 * Run it only when the mark changes. The outputs are committed, so a normal
 * build and a normal `npm install` never touch this file — which matters,
 * because it leans on `sharp` arriving as one of Next's own dependencies
 * rather than one we declare.
 *
 * Nothing here reaches the network.
 */
import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

const SVG = "app/icon.svg";

/** The sizes a .ico is still asked for: tab, bookmark bar, taskbar. */
const ICO_SIZES = [16, 32, 48];

const source = await readFile(SVG);

/** One PNG, rendered from the SVG at its own size rather than downscaled. */
function render(size: number): Promise<Buffer> {
  // density scales the SVG rasteriser rather than resampling a big bitmap, so
  // the 16px version gets its own clean edges instead of a blurred 48.
  return sharp(source, { density: (72 * size) / 32 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// --- ICO container -----------------------------------------------------------

/**
 * Wraps PNGs in an ICO directory.
 *
 * PNG-in-ICO rather than the older BMP form: every browser since IE11 reads
 * it, and the BMP form would mean hand-rolling an upside-down DIB with a
 * separate 1-bit mask for no gain.
 */
function ico(images: Array<{ size: number; png: Buffer }>): Buffer {
  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries: Buffer[] = [];

  for (const { size, png } of images) {
    const entry = Buffer.alloc(ENTRY);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size, 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

// --- Preview -----------------------------------------------------------------

/**
 * Prints the 16px render as text.
 *
 * There is no browser here to look at a tab in, and a favicon either survives
 * the reduction to 16 square or it does not. Seeing the silhouette is the
 * whole check: if the slot or the check mark has dissolved into grey, the
 * shapes are too thin and the SVG needs heavier ones.
 */
async function preview(png: Buffer): Promise<void> {
  const { data, info } = await sharp(png)
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Each pixel printed as whichever of the three inks it landed nearest, so
  // the gold and the white are told apart. A greyscale ramp cannot do that:
  // gold and white sit close in luminance and the check mark vanishes into
  // the box.
  const INKS: Array<{ rgb: [number, number, number]; char: string }> = [
    { rgb: [29, 63, 158], char: "#" }, // brand blue tile
    { rgb: [224, 180, 94], char: "o" }, // gold check
    { rgb: [255, 255, 255], char: " " }, // white box and the page behind it
  ];

  console.log(`\n  16x16, flattened onto white   # tile   o gold   · white\n`);

  for (let y = 0; y < info.height; y++) {
    let row = "  ";
    for (let x = 0; x < info.width; x++) {
      const at = (y * info.width + x) * info.channels;
      const pixel: [number, number, number] = [data[at]!, data[at + 1]!, data[at + 2]!];

      let best = INKS[0]!;
      let bestDistance = Infinity;
      for (const ink of INKS) {
        const distance =
          (pixel[0] - ink.rgb[0]) ** 2 +
          (pixel[1] - ink.rgb[1]) ** 2 +
          (pixel[2] - ink.rgb[2]) ** 2;
        if (distance < bestDistance) [best, bestDistance] = [ink, distance];
      }
      row += best.char.repeat(2); // two columns per pixel, so it is square
    }
    console.log(row);
  }
  console.log("");
}

// --- Write -------------------------------------------------------------------

const rendered = await Promise.all(
  ICO_SIZES.map(async (size) => ({ size, png: await render(size) })),
);

await writeFile("app/favicon.ico", ico(rendered));
console.log(`  app/favicon.ico      ${ICO_SIZES.join(", ")}px`);

// 180 is what iOS asks for; it draws its own rounded corners over ours, which
// is why the tile corner radius is modest.
await writeFile("app/apple-icon.png", await render(180));
console.log(`  app/apple-icon.png   180px`);

await preview(rendered[0]!.png);
