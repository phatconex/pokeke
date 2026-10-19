// Sân đấu tự vẽ của chương 4: boong tàu S.S. Anne, Tháp Pokémon Lavender, Hội quán Celadon.
// (Đường 8 dùng nền 'blossom' có sẵn.) Mọi vật cản trong layout khớp đúng vị trí hình vẽ.
import type { Rect, Solid } from '../../data/hazards';
import type { ArenaDef, ArenaFrame, ArenaPainter, RGB } from './types';

const WALL = 22;

/** khoảng cách tới mép sân W×H */
const edgeOf = (x: number, y: number, W: number, H: number) => Math.min(x, y, W - 1 - x, H - 1 - y);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: RGB, k: number): RGB => [Math.max(0, Math.min(255, c[0] * k)), Math.max(0, Math.min(255, c[1] * k)), Math.max(0, Math.min(255, c[2] * k))];

/** bóng đổ mềm dưới vật cản */
function dropShadow(p: ArenaPainter, x: number, y: number, w: number, h: number) {
  p.rect(x + 3, y + 4, w, h, [0, 0, 0], 0.28);
}

/** vòng xuất phát của hai bên (trận huấn luyện viên: f.startL / f.startR) */
function startRings(p: ArenaPainter, f: ArenaFrame, c: RGB) {
  for (const { x: sx, y: cy } of [f.startL, f.startR]) {
    for (let y = cy - 26; y <= cy + 26; y++) for (let x = sx - 40; x <= sx + 40; x++) {
      const d = Math.hypot(x - sx, (y - cy) * 1.6);
      if (d < 34 && d > 31) p.set(x, y, c, 0.85);
    }
  }
}

// =========================================================================== Tàu S.S. Anne
const SS = {
  crates: { x: 228, y: 58, w: 44, h: 30 },
  crates2: { x: 440, y: 262, w: 44, h: 30 },
  funnel: { x: 296, y: 24, w: 48, h: 36 },
  mast: { x: 312, y: 172, w: 16, h: 16 },
  boatTop: { x: 420, y: 26, w: 84, h: 24 },
  boatBottom: { x: 136, y: 308, w: 84, h: 24 },
  pool: { x: 250, y: 250, w: 120, h: 54 },
};

function crate(p: ArenaPainter, x: number, y: number, w: number, h: number) {
  const wood: RGB = [196, 146, 82];
  const dark: RGB = [106, 68, 36];
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const lx = xx - x;
    const ly = yy - y;
    let c: RGB = ly % 6 === 5 ? shade(wood, 0.8) : wood;
    if (lx < 3 || lx >= w - 3 || ly < 3 || ly >= h - 3) c = [150, 104, 56];
    // thanh giằng chéo
    const t = ly / (h - 1);
    if (Math.abs(lx - (3 + t * (w - 7))) < 1.6 || Math.abs(lx - (w - 4 - t * (w - 7))) < 1.6) c = [158, 110, 60];
    if (lx === 0 || lx === w - 1 || ly === 0 || ly === h - 1) c = dark;
    if (ly === 1 && lx > 0 && lx < w - 1) c = [228, 186, 124];
    p.set(xx, yy, c);
  }
  // đinh góc
  for (const [dx, dy] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) p.set(x + dx, y + dy, [70, 60, 56]);
}

function lifeboat(p: ArenaPainter, b: Rect) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2;
  const ry = b.h / 2;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    p.set(x + 3, y + 4, [0, 0, 0], 0.25);
  }
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    let c: RGB;
    if (d > 0.78) c = [216, 80, 48]; // thân xuồng cam
    else if (d > 0.66) c = [250, 250, 246]; // mép trắng
    else {
      // bạt phủ có nếp gấp
      c = (x - b.x) % 10 < 1 ? [176, 168, 140] : y < cy ? [232, 224, 196] : [212, 204, 176];
    }
    if (d > 0.95) c = [120, 40, 24];
    p.set(x, y, c);
  }
  // dây buộc bạt
  for (let k = 1; k < 4; k++) for (let y = b.y + 4; y < b.y + b.h - 4; y++) p.set(b.x + (b.w * k) / 4, y, [120, 96, 60]);
}

type SSGeo = { [K in keyof typeof SS]: Rect } & { extraCrates: Rect[] };

function drawSSAnne(p: ArenaPainter, f: ArenaFrame, S: SSGeo) {
  const { W, H } = p;
  // ---- sàn gỗ boong tàu: ván ngang 10px, mạch so le ----
  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / 10);
    const off = (row * 37) % 60;
    const tone = [[184, 134, 78], [176, 126, 72], [192, 142, 86]][row % 3] as RGB;
    for (let x = 0; x < W; x++) {
      const lx = (x + off) % 60;
      const grain = p.noise(x / 26, y / 2.5);
      let c: RGB = shade(tone, 0.92 + grain * 0.16);
      if (y % 10 === 9) c = [106, 68, 38];
      else if (y % 10 === 0) c = shade(tone, 1.12);
      if (lx === 0) c = [122, 80, 46];
      if ((lx === 3 || lx === 56) && y % 10 === 4) c = [92, 72, 60];
      p.set(x, y, c);
    }
  }
  // vệt nắng chéo trên boong
  for (let y = 24; y < H - 24; y++) for (let x = 24; x < W - 24; x++) {
    const band = (x + y * 0.6) % 180;
    if (band < 26) p.set(x, y, [255, 240, 200], 0.06);
  }

  // ---- hồ bơi trên boong (làm chậm) ----
  const P = S.pool;
  for (let y = P.y - 6; y < P.y + P.h + 6; y++) for (let x = P.x - 6; x < P.x + P.w + 6; x++) {
    const e = Math.min(x - (P.x - 6), y - (P.y - 6), P.x + P.w + 5 - x, P.y + P.h + 5 - y);
    p.set(x, y, e < 1 ? [90, 96, 110] : (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? [236, 240, 246] : [210, 220, 232]);
  }
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const depth = Math.min(x - P.x, P.x + P.w - 1 - x, y - P.y, P.y + P.h - 1 - y);
    let c: RGB = depth < 4 ? [96, 186, 232] : [56, 150, 214];
    const wave = Math.sin(x / 7 + y / 3) + Math.sin(x / 13 - y / 5);
    if (wave > 1.5) c = [170, 226, 250];
    if (y === P.y) c = [40, 110, 170];
    p.set(x, y, c);
  }
  // thang hồ bơi
  for (const lx of [P.x + P.w - 18, P.x + P.w - 10]) for (let y = P.y - 6; y < P.y + 10; y++) p.set(lx, y, [200, 206, 216]);
  for (let y = P.y - 2; y < P.y + 10; y += 4) for (let x = P.x + P.w - 18; x <= P.x + P.w - 10; x++) p.set(x, y, [200, 206, 216]);
  // phao cứu sinh nổi trong hồ
  for (let a = 0; a < Math.PI * 2; a += 0.05) for (let r = 4; r <= 7; r++) {
    const seg = Math.floor(((a + 0.4) / (Math.PI * 2)) * 4) % 2;
    p.set(P.x + 34 + Math.cos(a) * r, P.y + 24 + Math.sin(a) * r, seg ? [250, 250, 250] : [232, 72, 48]);
  }

  // ---- thùng hàng ----
  for (const c of [S.crates, S.crates2, ...S.extraCrates]) {
    dropShadow(p, c.x, c.y, c.w, c.h);
    crate(p, c.x, c.y, 22, c.h);
    crate(p, c.x + 22, c.y, 22, c.h);
  }
  // cuộn dây thừng cạnh thùng hàng (trang trí, nằm sát chân)
  const coils = [[S.crates.x + 54, S.crates.y + 20], [S.crates2.x - 10, S.crates2.y + 18], ...S.extraCrates.map((c, i) => (i % 2 ? [c.x - 10, c.y + 18] : [c.x + 54, c.y + 20]))];
  for (const [cx, cy] of coils) {
    for (let r = 2; r <= 7; r++) for (let a = 0; a < Math.PI * 2; a += 0.08) p.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, r % 2 ? [214, 186, 128] : [164, 132, 84]);
  }

  // ---- ống khói tàu (đỏ, viền đen) ----
  // nhìn từ trên xuống: ống bầu dục, vành đen, sọc trắng, thân đỏ, miệng ống tối
  const F = S.funnel;
  const fcx = F.x + F.w / 2;
  const fcy = F.y + F.h / 2;
  const frx = F.w / 2;
  const fry = F.h / 2;
  for (let y = F.y; y < F.y + F.h; y++) for (let x = F.x; x < F.x + F.w; x++) {
    if (((x - fcx) / frx) ** 2 + ((y - fcy) / fry) ** 2 <= 1) p.set(x + 4, y + 5, [0, 0, 0], 0.3);
  }
  for (let y = F.y; y < F.y + F.h; y++) for (let x = F.x; x < F.x + F.w; x++) {
    const d = Math.sqrt(((x - fcx) / frx) ** 2 + ((y - fcy) / fry) ** 2);
    if (d > 1) continue;
    let c: RGB;
    if (d > 0.9) c = [30, 26, 30];
    else if (d > 0.8) c = [246, 246, 246];
    else if (d > 0.42) {
      const lit = (x - fcx) / frx - (y - fcy) / fry;
      c = lit < -0.5 ? [240, 84, 64] : lit < 0.4 ? [206, 54, 42] : [158, 36, 30];
    } else c = d > 0.36 ? [60, 20, 18] : [18, 14, 18];
    p.set(x, y, c);
  }
  // làn khói bay theo gió
  for (let k = 0; k < 6; k++) p.disc(fcx + 6 + k * 8, fcy - 2 - k * 1.2, 4 + k * 1.2, [226, 226, 234], 0.4 - k * 0.05);

  // ---- cột buồm giữa boong ----
  const M = S.mast;
  const mcx = M.x + M.w / 2;
  const mcy = M.y + M.h / 2;
  p.disc(mcx + 3, mcy + 4, 9, [0, 0, 0], 0.3);
  p.disc(mcx, mcy, 9, [70, 44, 24]);
  p.disc(mcx, mcy, 7, [138, 90, 48]);
  p.disc(mcx - 2, mcy - 2, 3, [196, 142, 86]);
  // vòng sắt + dây chằng toả ra sàn
  for (let a = 0; a < Math.PI * 2; a += 0.04) p.set(mcx + Math.cos(a) * 8, mcy + Math.sin(a) * 8, [60, 64, 72]);
  for (const a of [0.6, 2.5, 3.8, 5.6]) for (let r = 10; r < 30; r++) p.set(mcx + Math.cos(a) * r, mcy + Math.sin(a) * r, [150, 120, 80], 0.6);

  // ---- xuồng cứu sinh sát mạn tàu ----
  lifeboat(p, S.boatTop);
  lifeboat(p, S.boatBottom);

  // ---- vòng xuất phát ----
  startRings(p, f, [250, 250, 250]);

  // ---- mạn tàu: biển ngoài cùng, thân tàu xanh thẫm, lan can trắng ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeOf(x, y, W, H);
    if (e >= WALL) {
      if (e < WALL + 4) p.set(x, y, [0, 0, 0], (WALL + 4 - e) * 0.06);
      continue;
    }
    let c: RGB;
    if (e < 8) {
      const ripple = (x * 3 + y * 5) % 29 < 4 && e % 3 === 0;
      c = ripple ? [130, 190, 240] : e < 4 ? [34, 92, 170] : [44, 110, 196];
    } else if (e < 11) c = [26, 36, 70];
    else {
      // mặt lan can sơn trắng, cột lan can mỗi 18px
      const along = x < WALL || x >= W - WALL ? y : x;
      c = e === 11 ? [176, 184, 196] : e < 14 ? [246, 248, 252] : [226, 232, 240];
      if (along % 18 < 2 && e >= 13) c = [188, 196, 210];
      if (e === WALL - 1) c = [140, 148, 162];
    }
    p.set(x, y, c);
  }
  // phao cứu sinh treo trên lan can
  const buoys = [[f.x(100), 15], [f.x(560), 15], [W - 30, f.y(120)], [f.x(300), H - 16], [30, f.y(240)]];
  // sân rộng hơn: thêm vài phao để lan can không trống
  if (W > 640) buoys.push([f.x(330), 15], [f.x(520), H - 16], [W - 30, f.y(270)], [30, f.y(100)]);
  for (const [cx, cy] of buoys) {
    for (let a = 0; a < Math.PI * 2; a += 0.05) for (let r = 3; r <= 6; r++) {
      const seg = Math.floor(((a + 0.4) / (Math.PI * 2)) * 4) % 2;
      p.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, seg ? [250, 250, 250] : [232, 72, 48]);
    }
  }
}

// =========================================================================== Tháp Pokémon Lavender
/** góc trên-trái của bia mộ (rộng 16, cao 18 + bệ) */
const GRAVES: [number, number][] = [
  [112, 52], [232, 52], [392, 52], [512, 52],
  [112, 284], [232, 284], [392, 284], [512, 284],
  [312, 118], [312, 230],
];
const towerPillars = (W: number, H: number): Rect[] => [
  { x: 24, y: 24, w: 22, h: 22 }, { x: W - 46, y: 24, w: 22, h: 22 },
  { x: 24, y: H - 46, w: 22, h: 22 }, { x: W - 46, y: H - 46, w: 22, h: 22 },
];
const graveSolid = ([gx, gy]: [number, number]): Solid => ({ x: gx - 2, y: gy + 1, w: 20, h: 20 });

function grave(p: ArenaPainter, gx: number, gy: number, variant: number) {
  const stone: RGB = variant % 2 ? [150, 146, 170] : [136, 136, 156];
  // bóng
  for (let y = gy + 4; y < gy + 23; y++) for (let x = gx; x < gx + 20; x++) p.set(x + 1, y, [0, 0, 0], 0.3);
  // bệ
  for (let y = gy + 18; y < gy + 21; y++) for (let x = gx - 2; x < gx + 18; x++) p.set(x, y, y === gy + 18 ? [118, 112, 132] : [84, 80, 98]);
  // thân bia: nửa tròn phía trên + thân chữ nhật
  for (let y = gy; y < gy + 18; y++) for (let x = gx; x < gx + 16; x++) {
    const inTop = y < gy + 8 ? (x - (gx + 7.5)) ** 2 + (y - (gy + 8)) ** 2 <= 64 : true;
    if (!inTop) continue;
    const edge = x === gx || x === gx + 15 || (y < gy + 8 && (x - (gx + 7.5)) ** 2 + (y - (gy + 8)) ** 2 > 46);
    let c: RGB = x < gx + 5 ? shade(stone, 1.15) : x > gx + 11 ? shade(stone, 0.82) : stone;
    if (edge) c = [70, 66, 86];
    p.set(x, y, c);
  }
  // chữ thập khắc
  for (let y = gy + 5; y < gy + 14; y++) p.set(gx + 7, y, [92, 88, 110]), p.set(gx + 8, y, [92, 88, 110]);
  for (let x = gx + 5; x < gx + 11; x++) p.set(x, gy + 8, [92, 88, 110]);
  // rêu + vết nứt
  if (variant % 3 === 0) for (let k = 0; k < 6; k++) p.set(gx + 1 + k, gy + 16 - (k % 2), [96, 132, 92]);
  if (variant % 3 === 1) { let cx = gx + 11; for (let y = gy + 4; y < gy + 13; y++) { cx += (y % 3) - 1; p.set(cx, y, [64, 60, 80]); } }
  // nến nhỏ trước mộ
  const cx = gx + (variant % 2 ? 17 : -3);
  const cy = gy + 22;
  p.disc(cx, cy - 4, 6, [255, 200, 120], 0.12);
  for (let y = cy - 3; y < cy; y++) p.set(cx, y, [236, 230, 210]);
  p.set(cx, cy - 4, [255, 214, 90]);
  p.set(cx, cy - 5, [255, 160, 60]);
}

/** bia mộ vẽ từ khung vật cản (graveSolid lệch -2,+1 so với góc bia) */
function drawPokemonTower(p: ArenaPainter, f: ArenaFrame, graves: Solid[], pillars: Rect[]) {
  const { W, H } = p;
  const areaK = (W * H) / (640 * 360);
  // ---- sàn đá tím xám 20px, mạch tối, nứt nẻ ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = Math.floor(x / 20);
    const ty = Math.floor(y / 20);
    const lx = x % 20;
    const ly = y % 20;
    const v = ((tx * 13 + ty * 7) % 5) * 4;
    const n = p.noise(x / 16, y / 16);
    let c: RGB = [74 + v + n * 12, 66 + v + n * 10, 92 + v + n * 14];
    if (lx === 19 || ly === 19) c = [40, 34, 54];
    else if (lx === 0 || ly === 0) c = [100, 92, 120];
    p.set(x, y, c);
  }
  // vết nứt ngẫu nhiên
  for (let k = 0; k < Math.round(14 * areaK); k++) {
    let x = 40 + p.rng() * (W - 80);
    let y = 40 + p.rng() * (H - 80);
    let a = p.rng() * Math.PI * 2;
    for (let s = 0; s < 18; s++) {
      a += (p.rng() - 0.5) * 1.2;
      x += Math.cos(a);
      y += Math.sin(a);
      p.set(x, y, [36, 30, 48]);
    }
  }
  // ---- thảm đỏ tía chạy ngang giữa tháp, viền vàng ----
  // thảm chạy qua hai vòng xuất phát (giữa thảm = f.y(190))
  const cy0 = Math.round(f.y(190)) - 24;
  for (let y = cy0; y < cy0 + 48; y++) for (let x = 24; x < W - 24; x++) {
    const ly = y - cy0;
    let c: RGB = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? [110, 34, 62] : [98, 28, 54];
    if (ly < 3 || ly > 44) c = [196, 156, 70];
    else if (ly === 3 || ly === 44) c = [120, 88, 40];
    else if ((ly === 8 || ly === 39) && x % 6 < 3) c = [172, 130, 60];
    p.set(x, y, c);
  }
  // hoa văn thảm: hình thoi
  for (let cx = 60; cx < W - 40; cx += 64) {
    for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 10 || d === 6) p.set(cx + dx, cy0 + 24 + dy, [176, 120, 60]);
    }
  }
  // ---- sương mù tím trôi lững lờ ----
  for (let y = 24; y < H - 24; y++) for (let x = 24; x < W - 24; x++) {
    const m = p.noise(x / 60 + 3, y / 40 + 7);
    if (m > 0.6) p.set(x, y, [190, 170, 230], (m - 0.6) * 0.4);
  }
  // ---- bia mộ ----
  graves.forEach((g, i) => grave(p, g.x + 2, g.y - 1, i));
  // vài bông hoa viếng (không cản đường)
  for (const [fx, fy] of [[170, 140], [470, 140], [170, 250], [470, 250], [260, 150], [380, 236]].map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))])) {
    p.set(fx, fy, [240, 240, 250]);
    p.set(fx + 1, fy, [250, 220, 120]);
    p.set(fx, fy + 1, [96, 150, 90]);
  }
  // ---- tường gạch tháp + mép đá ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeOf(x, y, W, H);
    if (e >= WALL) {
      if (e < WALL + 5) p.set(x, y, [0, 0, 0], (WALL + 5 - e) * 0.07);
      continue;
    }
    const row = Math.floor(y / 8);
    const bx = Math.floor((x + (row % 2) * 8) / 16);
    const v = ((bx * 31 + row * 17) % 5) * 5;
    let c: RGB = [52 + v, 44 + v, 66 + v];
    if ((x + (row % 2) * 8) % 16 === 0 || y % 8 === 0) c = [28, 22, 38];
    if (e === WALL - 1) c = [150, 140, 170];
    if (e === WALL - 2) c = [92, 84, 110];
    p.set(x, y, c);
  }
  // cửa sổ vòm trên tường trên (ánh trăng)
  const nWin = Math.max(3, Math.round((W - 280) / 180) + 1);
  for (let i = 0; i < nWin; i++) {
    const wx = Math.round(W / 2 + (i - (nWin - 1) / 2) * 180);
    for (let y = 3; y < 19; y++) for (let x = wx - 7; x <= wx + 7; x++) {
      const inArch = y > 9 || (x - wx) ** 2 + (y - 9) ** 2 <= 49;
      if (!inArch) continue;
      const edge = Math.abs(x - wx) === 7 || (y <= 9 && (x - wx) ** 2 + (y - 9) ** 2 > 36);
      p.set(x, y, edge ? [30, 24, 40] : x === wx || y === 11 ? [60, 60, 90] : [120, 140, 200]);
    }
  }
  // ---- chân nến lớn ở bốn góc (vật cản) ----
  for (const r of pillars) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    p.disc(cx + 2, cy + 3, 11, [0, 0, 0], 0.35);
    p.disc(cx, cy, 11, [60, 50, 40]);
    p.disc(cx, cy, 9, [176, 140, 70]);
    p.disc(cx - 2, cy - 2, 4, [220, 190, 110]);
    // ba ngọn nến
    for (const [dx, dy] of [[-4, -1], [4, -1], [0, 4]]) {
      p.disc(cx + dx, cy + dy, 2, [240, 236, 220]);
      p.set(cx + dx, cy + dy - 3, [255, 220, 100]);
      p.set(cx + dx, cy + dy - 4, [255, 150, 60]);
    }
    p.disc(cx, cy, 20, [255, 190, 110], 0.08);
  }
  // mạng nhện ở hai góc trên
  for (const [ox, sx] of [[46, 1], [W - 47, -1]]) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 3) * (Math.PI / 2);
      for (let r = 0; r < 26; r++) p.set(ox + sx * Math.cos(a) * r, 24 + Math.sin(a) * r, [200, 200, 220], 0.45);
    }
    for (const r of [8, 15, 22]) for (let a = 0; a <= Math.PI / 2; a += 0.06) p.set(ox + sx * Math.cos(a) * r, 24 + Math.sin(a) * r, [200, 200, 220], 0.35);
  }
}

// =========================================================================== Hội quán Celadon
/** 5 bồn hoa phun bào tử: 3 nhóm luân phiên (0: chéo trái-trên/phải-dưới, 1: chéo còn lại, 2: bồn giữa) */
const CELADON_BEDS: (Rect & { group: number })[] = [
  { x: 190, y: 52, w: 80, h: 46, group: 0 },
  { x: 370, y: 262, w: 80, h: 46, group: 0 },
  { x: 370, y: 52, w: 80, h: 46, group: 1 },
  { x: 190, y: 262, w: 80, h: 46, group: 1 },
  { x: 282, y: 152, w: 76, h: 56, group: 2 },
];
/** 4 cây cắt tỉa tròn + 4 chậu cây lớn ở góc */
const TOPIARIES: [number, number][] = [[150, 96], [490, 96], [150, 284], [490, 284]];
const celadonPots = (W: number, H: number): Rect[] => [
  { x: 24, y: 24, w: 28, h: 28 }, { x: W - 52, y: 24, w: 28, h: 28 },
  { x: 24, y: H - 52, w: 28, h: 28 }, { x: W - 52, y: H - 52, w: 28, h: 28 },
];
const topiarySolid = ([cx, cy]: [number, number]): Solid => ({ x: cx - 11, y: cy - 9, w: 22, h: 20 });

const BED_FLOWERS: Record<number, RGB[]> = {
  0: [[248, 136, 184], [255, 200, 220], [232, 80, 140]],
  1: [[250, 214, 72], [255, 244, 170], [240, 150, 40]],
  2: [[208, 60, 60], [250, 236, 236], [150, 100, 220]],
};

function flowerBed(p: ArenaPainter, b: Rect & { group: number }) {
  dropShadow(p, b.x, b.y, b.w, b.h);
  // khung gỗ
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    const e = Math.min(x - b.x, y - b.y, b.x + b.w - 1 - x, b.y + b.h - 1 - y);
    let c: RGB;
    if (e < 4) {
      c = e === 0 ? [92, 58, 30] : e === 1 ? [176, 124, 70] : [150, 102, 56];
      if ((x + y) % 12 === 0 && e > 0) c = [120, 80, 44];
    } else {
      // đất tơi + lá nền
      const n = p.noise(x / 5, y / 5);
      c = n > 0.55 ? [74, 132, 60] : n > 0.4 ? [86, 60, 40] : [70, 48, 32];
    }
    p.set(x, y, c);
  }
  // hoa: cụm 5 cánh, xếp hàng so le
  const cols = BED_FLOWERS[b.group];
  let i = 0;
  let row = 0;
  for (let y = b.y + 9; y < b.y + b.h - 6; y += 9, row++) {
    for (let x = b.x + 9 + (row % 2) * 5; x < b.x + b.w - 7; x += 11) {
      const c = cols[i++ % 2];
      const center = b.group === 2 ? [250, 250, 250] as RGB : cols[2];
      for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) p.set(x + dx, y + dy, c);
      p.set(x, y, center);
      p.set(x + 3, y + 2, [60, 120, 50]);
      p.set(x - 3, y + 2, [90, 160, 70]);
    }
  }
  if (b.group === 2) {
    // bồn giữa: đóa hoa khổng lồ (kiểu Rafflesia) – nơi phun bào tử mạnh nhất
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      p.disc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 7, 6, [200, 50, 56]);
      p.disc(cx + Math.cos(a) * 10, cy + Math.sin(a) * 8, 2, [250, 236, 236]);
    }
    p.disc(cx, cy, 5, [110, 40, 50]);
    p.disc(cx, cy, 3, [250, 210, 90]);
  }
}

function drawCeladonGym(p: ArenaPainter, f: ArenaFrame, beds: (Rect & { group: number })[], topiaries: Solid[], pots: Rect[]) {
  const { W, H } = p;
  // ---- sàn đá kem lát ô 16px, khe có rêu ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = Math.floor(x / 16);
    const ty = Math.floor(y / 16);
    const lx = x % 16;
    const ly = y % 16;
    const v = ((tx * 7 + ty * 11) % 4) * 4;
    let c: RGB = [232 - v, 222 - v, 196 - v];
    if (lx === 15 || ly === 15) c = (tx * 3 + ty * 5) % 4 === 0 ? [120, 160, 90] : [184, 170, 140];
    else if (lx === 0 || ly === 0) c = [244, 238, 220];
    p.set(x, y, c);
  }
  // khóm cỏ nhỏ mọc giữa các khe đá
  const nTuft = Math.round((220 * W * H) / (640 * 360));
  for (let k = 0; k < nTuft; k++) {
    const x = 28 + Math.floor(p.rng() * (W - 56));
    const y = 28 + Math.floor(p.rng() * (H - 56));
    p.set(x, y, [96, 160, 76]);
    p.set(x - 1, y - 1, [124, 186, 92]);
    p.set(x + 1, y - 2, [110, 176, 84]);
    if (k % 9 === 0) p.set(x + 2, y - 1, [250, 236, 120]);
  }
  // nắng xuyên mái kính: các dải sáng chéo
  for (let y = 24; y < H - 24; y++) for (let x = 24; x < W - 24; x++) {
    if ((x - y * 0.8 + 600) % 150 < 34) p.set(x, y, [255, 252, 220], 0.12);
  }
  // ---- lối đi đá bước nối hai vòng xuất phát ----
  const mid = beds.find((b) => b.group === 2)!;
  for (let k = 0, x = f.startL.x + 46; x <= f.startR.x - 46; k++, x += 38) {
    if (x > mid.x - 12 && x < mid.x + mid.w + 12) continue; // nhường chỗ bồn giữa
    const y = f.startL.y + (k % 2 ? 5 : -5);
    p.disc(x + 1, y + 2, 7, [0, 0, 0], 0.18);
    p.disc(x, y, 7, [196, 190, 176]);
    p.disc(x - 2, y - 2, 3, [226, 222, 210]);
  }
  // ---- bồn hoa ----
  for (const b of beds) flowerBed(p, b);
  // ---- cây cắt tỉa tròn ----
  for (const { x: sx, y: sy } of topiaries) {
    const cx = sx + 11;
    const cy = sy + 9;
    p.disc(cx + 3, cy + 5, 11, [0, 0, 0], 0.28);
    // chậu đá
    for (let y = cy + 4; y < cy + 11; y++) for (let x = cx - 8; x < cx + 8; x++) p.set(x, y, y === cy + 4 ? [200, 196, 186] : x < cx - 3 ? [168, 160, 150] : [132, 124, 116]);
    p.disc(cx, cy - 2, 11, [36, 100, 46]);
    p.disc(cx - 2, cy - 4, 8, [62, 140, 66]);
    p.disc(cx - 4, cy - 6, 4, [110, 186, 96]);
    for (const [dx, dy] of [[5, -6], [-6, 2], [3, 3]]) p.set(cx + dx, cy + dy, [250, 180, 210]);
  }
  // ---- vòng xuất phát (lá xanh) ----
  startRings(p, f, [90, 170, 90]);
  // ---- tường hàng rào cây + viền giàn gỗ ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeOf(x, y, W, H);
    if (e >= WALL) {
      if (e < WALL + 4) p.set(x, y, [0, 0, 0], (WALL + 4 - e) * 0.05);
      continue;
    }
    const n = p.noise(x / 6, y / 6);
    let c: RGB = n > 0.62 ? [96, 170, 82] : n > 0.38 ? [56, 128, 58] : [34, 92, 44];
    if (e < 3) c = shade(c, 0.6);
    // hoa nhỏ điểm xuyết trên hàng rào
    if ((x * 13 + y * 7) % 53 === 0 && e > 3 && e < WALL - 4) c = (x + y) % 2 ? [250, 190, 220] : [255, 250, 250];
    // giàn gỗ trắng ở mép trong
    if (e >= WALL - 4) {
      const along = x < WALL || x >= W - WALL ? y : x;
      c = e === WALL - 1 ? [150, 120, 84] : along % 12 < 2 ? [236, 228, 210] : mix(c, [236, 228, 210], 0.55);
    }
    p.set(x, y, c);
  }
  // ---- chậu cây lớn ở bốn góc ----
  for (const r of pots) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    p.disc(cx + 2, cy + 3, 14, [0, 0, 0], 0.3);
    p.disc(cx, cy, 14, [168, 92, 56]);
    p.disc(cx, cy, 12, [204, 120, 74]);
    p.disc(cx, cy, 10, [86, 60, 40]);
    p.disc(cx, cy - 1, 10, [44, 112, 52]);
    p.disc(cx - 3, cy - 4, 6, [80, 156, 72]);
    p.disc(cx - 4, cy - 5, 2, [150, 210, 120]);
  }
}

// =========================================================================== xuất sân
const SS_ANNE: ArenaDef = (f) => {
  // sân rộng: thêm một chồng thùng hàng ở mỗi nửa sân trống (xa vòng xuất phát)
  const extraCrates = f.W > 640 ? [f.obj({ x: 100, y: 100, w: 44, h: 30 }), f.obj({ x: 540, y: 110, w: 44, h: 30 })] : [];
  const S: SSGeo = {
    crates: f.obj(SS.crates), crates2: f.obj(SS.crates2), funnel: f.obj(SS.funnel), mast: f.obj(SS.mast),
    boatTop: f.obj(SS.boatTop), boatBottom: f.obj(SS.boatBottom), pool: f.area(SS.pool), extraCrates,
  };
  return {
    draw: (p) => drawSSAnne(p, f, S),
    layout: {
      inset: 24,
      solids: [
        S.crates, S.crates2, S.funnel, S.mast, ...extraCrates,
        { x: S.boatTop.x + 4, y: S.boatTop.y + 2, w: S.boatTop.w - 8, h: S.boatTop.h - 4 },
        { x: S.boatBottom.x + 4, y: S.boatBottom.y + 2, w: S.boatBottom.w - 8, h: S.boatBottom.h - 4 },
      ],
      slowZones: [S.pool],
    },
  };
};

const POKEMON_TOWER: ArenaDef = (f) => {
  // sân rộng: thêm bia ở giữa hàng trên/dưới và sát hai tường bên (xa thảm + vòng xuất phát)
  const extra: [number, number][] = f.W > 640 ? [[312, 52], [312, 284], [52, 112], [572, 112], [52, 240], [572, 240]] : [];
  const graves = [...GRAVES, ...extra].map((g) => f.obj(graveSolid(g)));
  const pillars = towerPillars(f.W, f.H);
  return {
    draw: (p) => drawPokemonTower(p, f, graves, pillars),
    layout: {
      inset: 24,
      solids: [...graves, ...pillars],
      hazards: [{ kind: 'darkness', radius: 150 }],
    },
  };
};

const GYM_CELADON: ArenaDef = (f) => {
  const beds = CELADON_BEDS.map((b) => f.area(b));
  // sân rộng: thêm cây cắt tỉa dọc hai tường bên cho đỡ trống
  const extra: [number, number][] = f.W > 640 ? [[72, 112], [568, 112], [72, 268], [568, 268]] : [];
  const topiaries = [...TOPIARIES, ...extra].map((t) => f.obj(topiarySolid(t)));
  const pots = celadonPots(f.W, f.H);
  return {
    draw: (p) => drawCeladonGym(p, f, beds, topiaries, pots),
    layout: {
      inset: 24,
      solids: [...topiaries, ...pots],
      hazards: [{
        kind: 'pulse', areas: beds, periodMs: 3000, warnMs: 1000, fx: 'spore', color: 0xd8f080,
        damagePct: 0.04, type: 'grass', slowMs: 1800, immuneTypes: ['grass'],
      }],
    },
  };
};

export const ARENAS: Record<string, ArenaDef> = {
  'ss-anne': SS_ANNE,
  'pokemon-tower': POKEMON_TOWER,
  'gym-celadon': GYM_CELADON,
};
