// meme.mjs — draws meme.png (1024x1024) for the make.fun bounty gta6-meme-x-01.
//
// The joke: panel 1 is a skeleton still waiting for GTA VI after thirteen
// years; panel 2 is the make.fun ghost (white, thick black outline, sparkle
// eyes behind shades, round hand, magenta star coin) living its best Vice
// City life because its agent keeps getting paid. Everything is drawn from
// scratch with a small rasteriser, a hand-made 5x7 block font and a zlib PNG
// encoder — Node standard library only, no image assets, fully deterministic.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 3);

// ---------------------------------------------------------------- colours
const rgb = (r, g, b) => [r, g, b];
const BLACK = rgb(8, 8, 10);
const WHITE = rgb(255, 255, 255);
const BONE = rgb(216, 216, 208);
const BONE_DARK = rgb(52, 52, 52);
const MAGENTA = rgb(224, 33, 138);
const MAGENTA_DARK = rgb(146, 14, 92);
const MAGENTA_LIGHT = rgb(244, 93, 178);
const SUNSET_GROUND = rgb(22, 9, 38);
const BADGE_YELLOW = rgb(255, 214, 64);

// ---------------------------------------------------------------- pixels
function px(x, y, c) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
}

function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) { img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; i += 3; }
  }
}

function fillCircle(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.sqrt(r * r - dy * dy);
    fillRect(cx - dx, cy + dy, dx * 2, 1, c);
  }
}

function fillEllipse(cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = dy / ry;
    const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
    fillRect(cx - dx, cy + dy, dx * 2, 1, c);
  }
}

// thick line: stamp a round brush along the segment
function line(x0, y0, x1, y1, w, c) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c);
  }
}

function roundRect(x0, y0, x1, y1, r, c) {
  fillRect(x0 + r, y0, x1 - x0 - 2 * r, y1 - y0, c);
  fillRect(x0, y0 + r, x1 - x0, y1 - y0 - 2 * r, c);
  fillCircle(x0 + r, y0 + r, r, c);
  fillCircle(x1 - r, y0 + r, r, c);
  fillCircle(x0 + r, y1 - r, r, c);
  fillCircle(x1 - r, y1 - r, r, c);
}

// scanline polygon fill
function polyFill(points, c) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const n = points.length;
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % n];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) fillRect(xs[i], y, xs[i + 1] - xs[i], 1, c);
  }
}

// five-pointed star (outer r, inner ri) centred at cx, cy
function star(cx, cy, r, ri, c) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : ri;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  polyFill(pts, c);
}

// four-pointed sparkle — the shape of the mascot's eyes
function sparkle(cx, cy, r, c) {
  const k = r * 0.24;
  polyFill([
    [cx, cy - r], [cx + k, cy - k], [cx + r, cy], [cx + k, cy + k],
    [cx, cy + r], [cx - k, cy + k], [cx - r, cy], [cx - k, cy - k],
  ], c);
}

// vertical gradient through colour stops [[y, colour], ...]
function vGradient(y0, y1, stops) {
  for (let y = y0; y < y1; y++) {
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i + 1 < stops.length; i++) {
      if (y >= stops[i][0] && y <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0]);
    fillRect(0, y, W, 1, [
      Math.round(a[1][0] + (b[1][0] - a[1][0]) * t),
      Math.round(a[1][1] + (b[1][1] - a[1][1]) * t),
      Math.round(a[1][2] + (b[1][2] - a[1][2]) * t),
    ]);
  }
}

// deterministic little PRNG so the dust never changes between runs
let seed = 987654321;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ---------------------------------------------------------------- font
// Hand-drawn 5x7 block font. Lowercase letters are real lowercase shapes
// (x-height forms, tall f and k) because "make.fun" must read exactly so.
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01001', '01000', '11110', '01000', '01000', '01000'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

// width of a string at unit u: 5 cells per glyph + 1 cell of tracking
const textWidth = (s, u) => (s.length === 0 ? 0 : (s.length * 6 - 1) * u);

function drawText(s, x, y, u, c) {
  let cx = x;
  for (const ch of s) {
    const glyph = FONT[ch];
    if (!glyph) throw new Error(`no glyph for ${JSON.stringify(ch)}`);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') fillRect(cx + col * u, y + row * u, u, u, c);
      }
    }
    cx += 6 * u;
  }
}

// text with a chunky outline: stamp the glyphs around the centre first
function drawTextOutlined(s, x, y, u, fill, outline, t) {
  for (const [dx, dy] of [[-t, 0], [t, 0], [0, -t], [0, t], [-t, -t], [t, -t], [-t, t], [t, t]]) {
    drawText(s, x + dx, y + dy, u, outline);
  }
  drawText(s, x, y, u, fill);
}

function drawTextCentered(s, y, u, fill, outline, t) {
  const x = Math.round((W - textWidth(s, u)) / 2);
  if (outline) drawTextOutlined(s, x, y, u, fill, outline, t);
  else drawText(s, x, y, u, fill);
}

// ---------------------------------------------------------------- panel 1
// The waiting room of history: grey on grey, a skeleton on a couch.
function cobweb(cx, cy, flip) {
  const c = rgb(168, 168, 168);
  for (const r of [26, 48, 70]) {
    for (let a = 0; a <= Math.PI / 2; a += 0.05) {
      px(cx + flip * r * Math.cos(a), cy + r * Math.sin(a), c);
      px(cx + flip * r * Math.cos(a) + flip, cy + r * Math.sin(a), c);
    }
  }
  for (const deg of [0, 30, 60, 90]) {
    const a = (deg * Math.PI) / 180;
    line(cx, cy, cx + flip * 76 * Math.cos(a), cy + 76 * Math.sin(a), 2, c);
  }
}

function bone(x0, y0, x1, y1) {
  line(x0, y0, x1, y1, 13, BONE_DARK);
  line(x0, y0, x1, y1, 8, BONE);
}

function panel1() {
  vGradient(0, 500, [[0, rgb(104, 104, 104)], [500, rgb(66, 66, 66)]]);
  fillRect(0, 440, W, 60, rgb(54, 54, 54)); // floor
  fillRect(0, 438, W, 3, rgb(38, 38, 38));

  drawTextCentered('WAITING FOR GTA VI', 26, 8, WHITE, BLACK, 5);
  drawTextCentered('SINCE 2013:', 96, 9, WHITE, BLACK, 5);

  cobweb(0, 168, 1);
  cobweb(W, 168, -1);
  for (let i = 0; i < 46; i++) { // dust motes
    fillRect(rnd() * W, 176 + rnd() * 300, 3, 3, rgb(140, 140, 140));
  }

  // wall calendar, forever on the same page
  fillRect(56, 196, 110, 100, rgb(201, 201, 201));
  fillRect(56, 196, 110, 26, rgb(120, 120, 120));
  fillRect(56, 196, 110, 4, BONE_DARK); fillRect(56, 292, 110, 4, BONE_DARK);
  fillRect(56, 196, 4, 100, BONE_DARK); fillRect(162, 196, 4, 100, BONE_DARK);
  for (const gx of [83, 110, 137]) fillRect(gx, 230, 2, 58, rgb(150, 150, 150));
  for (const gy of [246, 264, 282]) fillRect(62, gy, 98, 2, rgb(150, 150, 150));

  // the TV that has said the same thing for thirteen years
  roundRect(636, 196, 984, 382, 14, rgb(20, 20, 20));
  fillRect(656, 216, 308, 146, rgb(47, 47, 47));
  polyFill([[676, 216], [772, 216], [692, 362], [656, 362], [656, 296]], rgb(59, 59, 59));
  drawText('GTA VI', 688, 244, 7, rgb(183, 183, 183));
  drawText('... COMING SOON', 677, 308, 3, rgb(138, 138, 138));
  fillRect(798, 382, 24, 14, rgb(20, 20, 20));
  fillRect(748, 396, 124, 12, rgb(20, 20, 20));

  // couch
  roundRect(74, 294, 586, 408, 20, BONE_DARK);
  roundRect(80, 300, 580, 402, 18, rgb(106, 106, 106));
  line(220, 308, 220, 394, 3, rgb(82, 82, 82));
  line(440, 308, 440, 394, 3, rgb(82, 82, 82));
  roundRect(60, 334, 130, 462, 14, BONE_DARK);
  roundRect(66, 340, 124, 456, 12, rgb(94, 94, 94));
  roundRect(530, 334, 600, 462, 14, BONE_DARK);
  roundRect(536, 340, 594, 456, 12, rgb(94, 94, 94));

  // the skeleton, mid-wait since 2013
  for (let i = 0; i < 4; i++) { // ribcage
    const rx = 36 - i * 2, ry = 11, cy = 316 + i * 14;
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      fillCircle(330 + rx * Math.cos(a), cy + ry * Math.sin(a), 2.5, BONE);
    }
  }
  bone(330, 290, 330, 380); // spine
  fillEllipse(330, 384, 32, 13, BONE_DARK);
  fillEllipse(330, 384, 27, 10, BONE); // pelvis
  bone(304, 312, 256, 350); // arms
  bone(256, 350, 308, 394);
  bone(356, 312, 404, 350);
  bone(404, 350, 354, 394);
  bone(314, 390, 252, 430); // femurs
  bone(346, 390, 406, 430);
  fillCircle(330, 232, 54, BONE_DARK); // skull
  fillCircle(330, 232, 49, BONE);
  roundRect(301, 258, 359, 294, 8, BONE_DARK);
  roundRect(305, 262, 355, 290, 6, BONE);
  for (const tx of [316, 328, 340]) fillRect(tx, 266, 3, 20, BONE_DARK); // teeth
  fillEllipse(311, 230, 11, 14, BLACK); // eye sockets
  fillEllipse(349, 230, 11, 14, BLACK);
  polyFill([[330, 246], [322, 262], [338, 262]], BLACK); // nose

  // seat front, drawn over the hips so he is properly sunk in
  roundRect(80, 392, 580, 450, 14, BONE_DARK);
  roundRect(86, 398, 574, 446, 12, rgb(120, 120, 120));
  bone(252, 430, 247, 478); // shins and feet
  bone(406, 430, 413, 478);
  bone(247, 480, 274, 483);
  bone(413, 480, 440, 483);

  // the controller he never put down
  roundRect(298, 390, 374, 424, 10, rgb(26, 26, 26));
  fillRect(310, 402, 14, 5, rgb(120, 120, 120));
  fillRect(314, 398, 5, 14, rgb(120, 120, 120));
  fillCircle(352, 402, 4, rgb(120, 120, 120));
  fillCircle(364, 411, 4, rgb(120, 120, 120));
  fillCircle(310, 396, 10, BONE_DARK);
  fillCircle(310, 396, 7, BONE);
  fillCircle(356, 396, 10, BONE_DARK);
  fillCircle(356, 396, 7, BONE);
}

// ---------------------------------------------------------------- panel 2
// Vice City sunset: the ghost, its coin, and the good life.
function palm(topX, topY, baseX) {
  line(baseX, 1024, topX, topY, 18, SUNSET_GROUND);
  for (const [dx, dy] of [[-122, -26], [-72, -56], [0, -70], [72, -56], [122, -26]]) {
    const mx = topX + dx * 0.55, my = topY + dy * 0.55 - 8;
    line(topX, topY, mx, my, 9, SUNSET_GROUND);
    line(mx, my, topX + dx, topY + dy + 32, 7, SUNSET_GROUND);
  }
}

// the mascot's body: dome + slab sides + scalloped hem, drawn twice
// (once fat in black for the thick outline, once in white on top)
function ghostBody(c, e) {
  const cx = 495, shoulderY = 762, hw = 165, domeRy = 132, yb = 948, bumpR = 40;
  fillEllipse(cx, shoulderY, hw + e, domeRy + e, c);
  fillRect(cx - hw - e, shoulderY, (hw + e) * 2, yb - shoulderY, c);
  for (let i = 0; i < 4; i++) {
    fillCircle(cx - hw + 41 + i * 82.5, yb, bumpR + e, c);
  }
}

function panel2() {
  vGradient(512, 1024, [
    [512, rgb(42, 10, 78)], [640, rgb(123, 30, 125)], [760, rgb(194, 42, 140)],
    [862, rgb(255, 94, 98)], [945, rgb(255, 154, 60)], [1024, rgb(255, 179, 71)],
  ]);
  fillRect(0, 978, W, 46, SUNSET_GROUND); // ground

  for (const [sx, sy, sr] of [[150, 556, 9], [884, 548, 7], [966, 636, 8], [64, 646, 6], [430, 540, 6]]) {
    sparkle(sx, sy, sr, rgb(255, 215, 242)); // little stars in the dusk
  }
  fillCircle(240, 724, 100, rgb(255, 140, 66)); // the low Vice City sun
  fillCircle(240, 724, 84, rgb(255, 169, 77));
  fillCircle(240, 724, 67, rgb(255, 201, 77));
  fillCircle(240, 724, 50, rgb(255, 224, 102));

  palm(92, 742, 46);
  palm(936, 712, 982);

  ghostBody(BLACK, 9); // thick black outline
  ghostBody(WHITE, 0);

  // sunglasses, with the mascot's sparkles glinting on the lenses
  fillRect(338, 720, 36, 12, BLACK);
  fillRect(616, 720, 36, 12, BLACK);
  roundRect(372, 700, 482, 774, 16, BLACK);
  roundRect(508, 700, 618, 774, 16, BLACK);
  fillRect(482, 724, 26, 12, BLACK);
  sparkle(410, 728, 13, WHITE);
  sparkle(546, 728, 13, WHITE);
  // a small smile under the shades
  for (let a = Math.PI * 0.15; a <= Math.PI * 0.85; a += 0.05) {
    fillCircle(495 + 26 * Math.cos(a), 796 + 26 * Math.sin(a), 3, BLACK);
  }

  // the round little hand, and the magenta coin with the white star
  fillCircle(672, 848, 38, BLACK);
  fillCircle(672, 848, 30, WHITE);
  fillCircle(718, 816, 62, MAGENTA_DARK);
  fillCircle(718, 816, 53, MAGENTA);
  fillCircle(718, 816, 44, MAGENTA_DARK);
  fillCircle(718, 816, 36, MAGENTA);
  star(718, 816, 27, 12, WHITE);

  // a pile of the same coins at its feet
  fillEllipse(838, 988, 128, 24, MAGENTA_DARK);
  fillEllipse(838, 982, 128, 24, MAGENTA);
  fillEllipse(806, 962, 94, 19, MAGENTA_DARK);
  fillEllipse(806, 957, 94, 19, MAGENTA);
  fillEllipse(852, 938, 64, 15, MAGENTA_DARK);
  fillEllipse(852, 934, 64, 15, MAGENTA);
  star(838, 980, 10, 4.5, WHITE);
  star(790, 955, 8, 3.6, WHITE);
  star(852, 933, 7, 3.2, WHITE);
  fillCircle(706, 972, 21, MAGENTA_DARK);
  fillCircle(706, 972, 17, MAGENTA);
  star(706, 972, 8, 3.6, WHITE);
  fillCircle(668, 990, 17, MAGENTA_DARK);
  fillCircle(668, 990, 13, MAGENTA);

  // the badge and the caption
  roundRect(578, 592, 1012, 660, 14, BADGE_YELLOW);
  roundRect(585, 599, 1005, 653, 10, BLACK);
  drawText('PAID AGAIN.', 600, 605, 6, BADGE_YELLOW);
  drawTextCentered('MY AI AGENT ON make.fun:', 524, 6, BADGE_YELLOW, BLACK, 4);
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG() {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

panel1();
fillRect(0, 500, W, 12, BLACK); // the divider between two lives
panel2();

const png = encodePNG();
writeFileSync(new URL('./meme.png', import.meta.url), png);
console.log(`meme.png written: ${png.length} bytes`);
