// Bộ icon pixel 16x16 vẽ bằng bản đồ ký tự (14x14) + tự thêm viền tối 1px cho đồng bộ.
// Dùng: scene.add.image(x, y, 'icons', 'coin').setScale(2) hoặc helper icon() trong ui/style.ts.
import Phaser from 'phaser';

const PAL: Record<string, string> = {
  k: '#1a1420', w: '#ffffff', r: '#e04040', R: '#9a2020', y: '#ffd34a', Y: '#c08a20', o: '#f08030',
  g: '#60c050', G: '#2f7a30', b: '#4a8ae0', B: '#2a4a9a', c: '#9ad0ff', s: '#c8c8d0', S: '#7a7a84',
  p: '#a060e0', P: '#5a2a8a', n: '#8a5a30', N: '#5a3a1a', m: '#f080a8',
};

const ICONS: Record<string, string[]> = {
  coin: [
    '....yyyyyy....', '..yywwyyyyyy..', '.ywwyyyyyyyyY.', '.ywyyyYYYyyyY.', 'ywyyyYyyyyyyyY', 'yyyyyYyyyyyyyY', 'yyyyyyYYYyyyyY',
    'yyyyyyyyyYyyyY', 'yyyyyyyyyYyyyY', 'yyyyyYYYYyyyyY', '.yyyyyyyyyyyY.', '.yyyyyyyyyyYY.', '..YyyyyyyyYY..', '....YYYYYY....',
  ],
  pokeball: [
    '....rrrrrr....', '..rrwwrrrrrr..', '.rwwrrrrrrrrR.', '.rwrrrrrrrrrR.', 'rrrrrrrrrrrrrR', 'rrrrrkkkkrrrRR', 'kkkkkkwwkkkkkk',
    'kkkkkkwwkkkkkk', 'wwwwwkkkkwwwss', 'wwwwwwwwwwwwws', '.wwwwwwwwwwws.', '.swwwwwwwwwss.', '..sswwwwwsss..', '....ssssss....',
  ],
  heart: [
    '..............', '..rrr....rrr..', '.rwwrr..rrrrR.', 'rwwrrrrrrrrrrR', 'rwrrrrrrrrrrrR', 'rrrrrrrrrrrrrR', 'rrrrrrrrrrrrrR',
    '.rrrrrrrrrrrR.', '..rrrrrrrrrR..', '...rrrrrrrR...', '....rrrrrR....', '.....rrrR.....', '......rR......', '..............',
  ],
  star: [
    '......yy......', '......yy......', '.....yyyy.....', '.....ywyy.....', 'yyyyyywyyyyyyy', '.yyyyyyyyyyyY.', '..yyyyyyyyyY..',
    '...yyyyyyyY...', '...yyyyyyyY...', '..yyyyYyyyyY..', '..yyyY..YyyY..', '.yyyY....YyyY.', '.yY........YY.', '..............',
  ],
  skull: [
    '..............', '...wwwwwwww...', '..wwwwwwwwwws.', '.wwwwwwwwwwwws', '.wwwwwwwwwwwws', '.wwkkkwwkkkwws', '.wwkkkwwkkkwws',
    '.wwkkkwwkkkwws', '..wwwwkkwwwws.', '...wwwwwwwws..', '...wkwkwkwks..', '...wwwwwwwws..', '....ssssssss..', '..............',
  ],
  gym: [
    '......SS......', '....SSssSS....', '..SSssssssSS..', 'SSssssssssssSS', 'SSSSSSSSSSSSSS', '.ws.ws..ws.ws.', '.ws.ws..ws.ws.',
    '.ws.ws..ws.ws.', '.ws.ws..ws.ws.', '.ws.ws..ws.ws.', '.ws.ws..ws.ws.', 'SSSSSSSSSSSSSS', 'ssssssssssssss', '..............',
  ],
  check: [
    '..............', '............gg', '...........ggG', '..........ggG.', '.........ggG..', '........ggG...', 'gg.....ggG....',
    'ggg...ggG.....', '.ggg.ggG......', '..gggggG......', '...gggG.......', '....gG........', '..............', '..............',
  ],
  lock: [
    '..............', '....ssssss....', '...ss....ss...', '...s......s...', '...s......s...', '..yyyyyyyyyy..', '..ywyyyyyyyY..',
    '..yyyyNNyyyY..', '..yyyyNNyyyY..', '..yyyyyNyyyY..', '..yyyyyyyyyY..', '..YYYYYYYYYY..', '..............', '..............',
  ],
  clock: [
    '....wwwwww....', '..wwwwwwwwww..', '.wwwwwkwwwwws.', '.wwwwwkwwwwws.', 'wwwwwwkwwwwwws', 'wwwwwwkwwwwwws', 'wwwwwwkkkkwwws',
    'wwwwwwwwwwwwws', 'wwwwwwwwwwwwws', '.wwwwwwwwwwws.', '.swwwwwwwwwss.', '..ssswwwwsss..', '....ssssss....', '..............',
  ],
  sound: [
    '..............', '......S.......', '.....SS...b...', '....SsS....b..', 'sssSssS..b..b.', 'ssssssS...b.b.', 'ssssssS...b.b.',
    'ssssssS...b.b.', 'sssSssS..b..b.', '....SsS....b..', '.....SS...b...', '......S.......', '..............', '..............',
  ],
  mute: [
    '..............', '......S.......', '.....SS.......', '....SsS.r...r.', 'sssSssS..r.r..', 'ssssssS...r...', 'ssssssS..r.r..',
    'ssssssS.r...r.', 'sssSssS.......', '....SsS.......', '.....SS.......', '......S.......', '..............', '..............',
  ],
  fullscreen: [
    'wwwww....wwwww', 'w............w', 'w............w', 'w............w', 'w............w', '..............', '..............',
    '..............', '..............', 'w............w', 'w............w', 'w............w', 'w............w', 'wwwww....wwwww',
  ],
  book: [
    '..rrrrrrrrrrR.', '.rrrrrrrrrrrR.', '.rwwwwwwwwwrR.', '.rwbbbbbbbwrR.', '.rwbccccbbwrR.', '.rwbbbbbbbwrR.', '.rwwwwwwwwwrR.',
    '.rwSSSSSSSwrR.', '.rwwwwwwwwwrR.', '.rwSSSSSwwwrR.', '.rwwwwwwwwwrR.', '.rrrrrrrrrrrR.', '..RRRRRRRRRR..', '..............',
  ],
  upgrade: [
    '......gg......', '.....gggg.....', '....gggggg....', '...gggwgggg...', '..gggwggggggG.', '.ggggggggggggG', 'GGGGggggggGGGG',
    '....gggggG....', '....gggggG....', '....gggggG....', '....gggggG....', '....GGGGGG....', '..............', '..............',
  ],
  medal: [
    '..bb......rr..', '...bb....rr...', '....bb..rr....', '.....bbrr.....', '......yy......', '....yyyyyy....', '...yywyyyyY...',
    '..yywyyyyyyY..', '..yyyyyyyyyY..', '..yyyyyyyyyY..', '...yyyyyyyY...', '....YYYYYY....', '..............', '..............',
  ],
  people: [
    '..............', '...bb.....gg..', '..bbbb...gggg.', '..bbbb...gggg.', '...bb.....gg..', '..............', '.bbbbbb.gggggg',
    '.bbbbbb.gggggg', '.bbbbbb.gggggg', '.BBBBBB.GGGGGG', '..............', '..............', '..............', '..............',
  ],
  trophy: [
    '..yyyyyyyyyy..', 'yyywyyyyyyyyyy', 'y.ywyyyyyyyY.y', 'y.yyyyyyyyyY.y', '.yyyyyyyyyyYy.', '...yyyyyyyY...', '....yyyyyY....',
    '.....yyyY.....', '......yY......', '......yY......', '....nnnnnn....', '...nnnnnnnN...', '...NNNNNNNN...', '..............',
  ],
  bag: [
    '.....nnnn.....', '....n....n....', '...nnnnnnnn...', '..nnonnnnnnN..', '.nnnnnnnnnnnN.', '.nnyyyyyyyynN.', '.nnyyyyyyyynN.',
    '.nnnnnnnnnnnN.', '.nnnnnnnnnnnN.', '.nnnnnnnnnnnN.', '..NNNNNNNNNN..', '..............', '..............', '..............',
  ],
  potion: [
    '.....ssss.....', '.....nnnn.....', '......cc......', '......cc......', '.....cwcc.....', '....cwmmmc....', '...cwmmmmmc...',
    '...cmmmmmmc...', '...cmmmmmmc...', '...cmmmmmmc...', '....cmmmmc....', '.....cccc.....', '..............', '..............',
  ],
  candy: [
    '..............', '..............', '..............', 'r..........r..', 'rr..yyyyy..rr.', 'rrryywyyyyrrr.', 'rr.ywyyyyy.rr.',
    'r...yyyyY...r.', '..............', '..............', '..............', '..............', '..............', '..............',
  ],
  flame: [
    '......o.......', '.....oo.......', '.....ooo......', '....ooroo.....', '...oorrro..o..', '...orrrrroo...', '..oorryrrroo..',
    '..orryyyrrro..', '..orryyyyrro..', '..orryywyrro..', '...orryyyro...', '....oorroo....', '.....oooo.....', '..............',
  ],
  drop: [
    '......b.......', '......bb......', '.....bbbb.....', '....bbbbbb....', '...bwbbbbbb...', '..bwbbbbbbbB..', '..bwbbbbbbbB..',
    '..bbbbbbbbbB..', '...bbbbbbbB...', '....BBBBBB....', '..............', '..............', '..............', '..............',
  ],
  leaf: [
    '..........gg..', '........gggg..', '......gggggG..', '....ggggggGG..', '...ggggggGgG..', '..gggggGgggG..', '..ggggGggggG..',
    '..gggGgggGG...', '..ggGgggGG....', '..gGGGGG......', '.gG...........', 'g.............', '..............', '..............',
  ],
  bolt: [
    '.......yyyy...', '......yyyy....', '.....yyyy.....', '....yyyy......', '...yyyyyyyy...', '......yyyy....', '.....yyyy.....',
    '....yyy.......', '...yy.........', '..y...........', '..............', '..............', '..............', '..............',
  ],
  play: [
    '..............', '..ww..........', '..wwww........', '..wwwwww......', '..wwwwwwww....', '..wwwwwwwwww..', '..wwwwwwwwww..',
    '..wwwwwwww....', '..wwwwww......', '..wwww........', '..ww..........', '..............', '..............', '..............',
  ],
  house: [
    '......rr......', '....rrrrrr....', '..rrrrrrrrrr..', 'rrrrrrrrrrrrrR', '.wwwwwwwwwwws.', '.wbbwwnnwwbbs.', '.wbbwwnnwwbbs.',
    '.wwwwwnnwwwws.', '.wwwwwnnwwwws.', '.sssssnnsssss.', '..............', '..............', '..............', '..............',
  ],
  map: [
    '..............', 'yyyyyyyyyyyyyy', 'yggyyyybyyyyyY', 'yggggyybbyyyyY', 'yyggyyyybyrryY', 'yyyyyyyybbyryY', 'yybbbyyyybyyyY',
    'yyyyyyyyyyyyyY', 'YYYYYYYYYYYYYY', '..............', '..............', '..............', '..............', '..............',
  ],
  crown: [
    '..............', '..............', 'y.....yy.....y', 'yy...yyyy...yy', 'yyy.yyyyyy.yyy', 'yyyyyyyyyyyyyy', 'yyrryyyyyyrryY',
    'yyyyyywwyyyyyY', 'yyyyyyyyyyyyyY', 'YYYYYYYYYYYYYY', '..............', '..............', '..............', '..............',
  ],
  sword: [
    '............ss', '...........sws', '..........sws.', '.........sws..', '........sws...', '.......sws....', '..n...sws.....',
    '..nn.sws......', '...nnws.......', '....nn........', '...nNnn.......', '..nN..nn......', '..N...........', '..............',
  ],
  // ---- icon chiêu thức (mỗi kiểu chiêu một hình riêng) ----
  fang: [
    '..............', '.rrrrrrrrrrrr.', '.rRRRRRRRRRRr.', '.wwww....wwww.', '.wwws....wwws.', '..wws....wws..', '..ws......ws..',
    '...s......s...', '..............', '...w......w...', '..ww......ww..', '.wwww....wwww.', '.rRRRRRRRRRRr.', '.rrrrrrrrrrrr.',
  ],
  claw: [
    '..........w...', '.........ws...', '.....w..ws..w.', '....ws.ws..ws.', '...ws.ws..ws..', '..ws.ws..ws...', '.ws.ws..ws....',
    'ws.ws..ws.....', 's.ws..ws......', '..s..ws.......', '....ws........', '....s.........', '..............', '..............',
  ],
  wing: [
    '..............', '..........cw..', '........ccwc..', '......cccwc...', '....ccccwcc...', '...cccwwcc....', '..ccwwccc.....',
    '.cwwccbb......', '.wcccbb.......', '.ccbbb........', '..bbb.........', '..b...........', '..............', '..............',
  ],
  shell: [
    '....nnnnnn....', '..nnyyyyyynn..', '.nyyynnnnyyyn.', '.nyynyyyynyyn.', 'nyynyyyyyynyyn', 'nyynyyyyyynyyn', 'nnnnnnnnnnnnnn',
    'nyynyyyyyynyyn', 'nyyynyyyynyyyn', '.nyyynnnnyyyn.', '.nnyyyyyyyynn.', '..nnnnnnnnnn..', '..............', '..............',
  ],
  spiral: [
    '....mmmmmm....', '..mm......mm..', '.m..pppppp..m.', '.m.p......p.m.', 'm.p..mmmm..p.m', 'm.p.m....m.p.m', 'm.p.m.ww.m.p.m',
    'm.p.m.ww.m.p.m', 'm.p.m....m.p.m', 'm.p..mmmm..p.m', '.m.p......p.m.', '.m..pppppp..m.', '..mm......mm..', '....mmmmmm....',
  ],
  cloud: [
    '..............', '.....ssss.....', '...ssswwss....', '..sswwwwwss...', '.sswwwwwwwsss.', 'sswwwwwwwwwwss', 'swwwwwwwwwwwws',
    'ssssssssssssss', '..............', '..p...g...p...', '....g...p...g.', '.p...p....g...', '...g....p.....', '..............',
  ],
  shovel: [
    '...........nn.', '..........nNn.', '.........nNn..', '........nNn...', '.......nNn....', '...s.nNn......', '..sssnn.......',
    '.sssssS.......', 'ssssssS.......', 'sssssS........', 'ssssS.........', '.sSS..........', '..............', '..............',
  ],
  horn: [
    '......w.......', '......ws......', '.....wws......', '.....wwss.....', '....wwwss.....', '....wwwsss....', '...wwwwsss....',
    '...wwwwssss...', '..wwwwwssss...', '..wwwwwsssss..', '.ooooooooooo..', '.oooooooooooo.', '..............', '..............',
  ],
  whirl: [
    'wwwwwwwwwwwwww', '.cccccccccccc.', '..wwwwwwwwww..', '...cccccccc...', '....wwwwwww...', '.....ccccc....', '......www.....',
    '.....ccc......', '......ww......', '.......c......', '......c.......', '..............', '..............', '..............',
  ],
  wind: [
    '..............', '.........ccc..', '........c...c.', '.ccccccc....c.', '...........c..', '..............', '..cccccccccc..',
    '............c.', '.cccccccc...c.', '.........ccc..', '..............', '...cccccc.....', '..............', '..............',
  ],
  rock: [
    '..............', '..............', '.....SSSS.....', '...SSssssSS...', '..SsswwsssSS..', '.SsswwssssSSS.', '.SssssssssSSS.',
    'SsssssssssSSSS', 'SsssssssSSSSSS', 'SSssssSSSSSSSS', '.SSSSSSSSSSSS.', '..............', '..............', '..............',
  ],
  seed: [
    '.......gg.....', '......gGg.....', '.....gGG......', '......G.......', '....nnnn......', '...nNnnnn.....', '..nNnnnnnn....',
    '..nnnnnnnn....', '..nnnnnnnN....', '...nnnnnN.....', '....NNNN......', '..............', '..............', '..............',
  ],
  note: [
    '......pppppp..', '......pPPPPp..', '......p....p..', '......p....p..', '......p....p..', '......p....p..', '......p....p..',
    '...pppp..pppp.', '..ppppp.ppppp.', '..ppppp.ppppp.', '...ppp...ppp..', '..............', '..............', '..............',
  ],
  shield: [
    '..............', '.ssssssssssss.', '.swwbbbbbbbbs.', '.swbbbbbbbbBs.', '.sbbbbbbbbbBs.', '.sbbbbbbbbbBs.', '.sbbbbbbbbbBs.',
    '..sbbbbbbbBs..', '..sbbbbbbbBs..', '...sbbbbbBs...', '....sbbbBs....', '.....sbBs.....', '......ss......', '..............',
  ],
  sparkle: [
    '..............', '....m.........', '....m.........', '..mmwmm.......', '....m.....p...', '....m....pwp..', '..........p...',
    '..............', '......m.......', '.....mwm......', '......m.......', '..............', '..............', '..............',
  ],
  fist: [
    '..............', '....rrrrrr....', '...rwrrrrrr...', '..rwrrrrrrrr..', '..rrRrrRrrRr..', '..rrRrrRrrRr..', '..rrrrrrrrrr..',
    '..rrrrrrrrrR..', '...rrrrrrrR...', '...RRRRRRRR...', '....wwwwww....', '....wwwwww....', '....ssssss....', '..............',
  ],
  eye: [
    '..............', '..............', '....ssssss....', '..sswwwwwwss..', '.swwwppppwwws.', 'swwwpPkkPpwwws', 'swwwpkkkkpwwws',
    'swwwpPkkPpwwws', '.swwwppppwwws.', '..sswwwwwwss..', '....ssssss....', '..............', '..............', '..............',
  ],
  flower: [
    '.....mmmm.....', '...mmmmmmmm...', '..mmmmyymmmm..', '.mmmmyYYymmmm.', '.mmmmyYYymmmm.', '..mmmmyymmmm..', '...mmmmmmmm...',
    '.....mmmm.....', '......gG......', '....g.gG......', '...ggGGG......', '......G.gg....', '......GggG....', '......G.......',
  ],
  powder: [
    '..............', '...yy....y....', '..yyyyy.yyy...', '.yyyyyyyyyyy..', 'yyywyyyyyyyyy.', 'yyyyyyyygyyyyy', '.yyyyyyyyyyyy.',
    '..yyygyyyyyy..', '.y..yyyyy..y..', '...w...y...w..', '.....w........', '..y.....y.....', '..............', '..............',
  ],
  sun: [
    '......y.......', '..y...y...y...', '...y.....y....', '.....yyyy.....', '....yywwyy....', 'yy..ywwwwy..yy', '....yywwyy....',
    '.....yyyy.....', '...y..y..y....', '..y...y...y...', '......y.......', '..............', '..............', '..............',
  ],
  vine: [
    '.........gg...', '........gGgg..', '.....gg.GGg...', '....gGGGGg....', '...gG..gg.....', '...gG.........', '....gG........',
    '.....gGG......', '.......gGg....', '.......gGg....', '......gGg.....', '....gGGg......', '...gGg........', '..............',
  ],
  root: [
    '.......n......', '......nN......', '..n...nN..n...', '..nN.nNN.nN...', '..nNnnNNnNN...', '...nnNNNnN....', '....nnNNnn....',
    '....nnNNnn....', '..ggnnNNnngg..', '.gGGGnNNnGGGg.', '..gGGGGGGGGg..', '...gGGGGGGg...', '..............', '..............',
  ],
  wave: [
    '..............', '..............', '..cc....cc....', '.cbbc..cbbc..c', 'cb..bccb..bccb', '.....bb....bb.', '..............',
    '..cc....cc....', '.cbbc..cbbc..c', 'cb..bccb..bccb', '.....bb....bb.', '..............', '..............', '..............',
  ],
};

/** bánh răng vẽ theo toạ độ cực */
function gearIcon(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 14; y++) {
    let row = '';
    for (let x = 0; x < 14; x++) {
      const dx = x - 6.5;
      const dy = y - 6.5;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const tooth = Math.cos(a * 8) > 0.25;
      if (r < 2.3) row += '.';
      else if (r < 4.8) row += dx + dy < 0 ? 's' : 'S';
      else if (r < 6.8 && tooth) row += 'S';
      else row += '.';
    }
    rows.push(row);
  }
  return rows;
}
ICONS.gear = gearIcon();
ICONS.starEmpty = ICONS.star.map((r) => r.replace(/[yw]/g, 'S').replace(/Y/g, 'S'));
ICONS.greatball = ICONS.pokeball.map((r, i) => {
  let row = r.replace(/r/g, 'b').replace(/R/g, 'B');
  if (i === 2 || i === 3) row = row.slice(0, 3) + 'rr' + row.slice(5, 9) + 'rr' + row.slice(11);
  return row;
});
ICONS.back = ICONS.play.map((r) => r.split('').reverse().join(''));
// Ultra Ball: nửa trên đen, hai vạch vàng
ICONS.ultraball = ICONS.pokeball.map((r, i) => {
  let row = r.replace(/r/g, 'S').replace(/R/g, 'k');
  if (i >= 1 && i <= 4) row = row.slice(0, 3) + 'yy' + row.slice(5, 9) + 'yy' + row.slice(11);
  return row;
});

export const ICON_NAMES = Object.keys(ICONS);

export function generateIcons(scene: Phaser.Scene) {
  const names = Object.keys(ICONS);
  const cols = 8;
  const size = 16;
  if (scene.textures.exists('icons')) scene.textures.remove('icons');
  const tex = scene.textures.createCanvas('icons', cols * size, Math.ceil(names.length / cols) * size);
  if (!tex) return;
  const ctx = tex.getContext();
  names.forEach((name, idx) => {
    const ox = (idx % cols) * size;
    const oy = Math.floor(idx / cols) * size;
    const map = ICONS[name];
    const filled = (x: number, y: number) => y >= 0 && y < 14 && x >= 0 && x < 14 && (map[y]?.[x] ?? '.') !== '.';
    for (let y = -1; y <= 14; y++) {
      for (let x = -1; x <= 14; x++) {
        const ch = filled(x, y) ? map[y][x] : '.';
        let color: string | null = ch !== '.' ? PAL[ch] ?? null : null;
        // viền tối quanh mọi điểm có màu
        if (!color && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) color = PAL.k;
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(ox + x + 1, oy + y + 1, 1, 1);
      }
    }
    tex.add(name, 0, ox, oy, size, size);
  });
  tex.refresh();
}
