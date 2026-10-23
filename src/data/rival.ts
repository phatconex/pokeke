// Đối thủ Shigeru: đội hình theo bậc (1 → 5), starter khắc chế starter của người chơi,
// cấp độ bám theo đội người chơi (không thấp hơn mức tối thiểu của bậc).
import type { GameState } from '../game/state';
import { levelCapFor, TRAINER } from '../config/balance';
import { POKEMON } from './pokemon';
import type { StageDef } from './stages';
import type { GymDef, GymPokemon } from './trainers';
import { t } from '../i18n';
import { rivalLines, stageArea, stageName } from '../i18n/content';

/** starter người chơi có thể chọn */
type Starter = 'pikachu' | 'bulbasaur' | 'charmander' | 'squirtle';
/** starter của Shigeru (gặp Pikachu thì cầm Eevee như bản Yellow) */
type RivalStarter = Exclude<Starter, 'pikachu'> | 'eevee';

/** starter của Shigeru khắc chế starter người chơi */
const COUNTER: Record<Starter, RivalStarter> = { pikachu: 'eevee', bulbasaur: 'charmander', charmander: 'squirtle', squirtle: 'bulbasaur' };
/** dòng tiến hóa của starter Shigeru theo bậc: [bậc 0, bậc 1, bậc 2]
 *  Eevee → Jolteon (kháng hệ Điện, nhanh hơn Pikachu) */
const LINE: Record<RivalStarter, [string, string, string]> = {
  bulbasaur: ['bulbasaur', 'ivysaur', 'venusaur'],
  charmander: ['charmander', 'charmeleon', 'charizard'],
  squirtle: ['squirtle', 'wartortle', 'blastoise'],
  eevee: ['eevee', 'jolteon', 'jolteon'],
};
/** dòng tiến hóa của starter người chơi (đoán starter cho bản lưu cũ) */
const PLAYER_LINE: Record<Starter, string[]> = {
  bulbasaur: LINE.bulbasaur,
  charmander: LINE.charmander,
  squirtle: LINE.squirtle,
  pikachu: ['pikachu', 'raichu'],
};
/** hai con "phụ" theo hệ starter của Shigeru (tránh trùng hệ với starter) */
const SUPPORT: Record<RivalStarter, [string, string]> = {
  bulbasaur: ['arcanine', 'gyarados'],
  charmander: ['exeggutor', 'gyarados'],
  squirtle: ['arcanine', 'exeggutor'],
  // Pikachu: Đất miễn nhiễm Điện, Cỏ kháng Điện
  eevee: ['golem', 'exeggutor'],
};

interface Tier {
  /** cấp tối thiểu của đội */
  base: number;
  /** đội (không gồm starter); 'S1', 'S2' = con phụ theo hệ */
  team: string[];
  /** bậc tiến hóa của starter (0..2) */
  stage: 0 | 1 | 2;
  intro: string[];
  win: string[];
}

const TIERS: Record<number, Tier> = {
  1: {
    base: 28, stage: 1, team: ['pidgeotto', 'raticate', 'kadabra'],
    intro: ['Shigeru: Ô, Satoshi! Cậu cũng lên tàu à?', 'Shigeru: Để tớ xem cậu đã mạnh lên được bao nhiêu!'],
    win: ['Shigeru: Hừ... chỉ là may mắn thôi!', 'Shigeru: Tớ sẽ gom huy hiệu nhanh hơn cậu, cứ chờ đấy!'],
  },
  2: {
    base: 39, stage: 2, team: ['pidgeot', 'growlithe', 'exeggcute', 'kadabra'],
    intro: ['Shigeru: Satoshi! Cậu cũng tới Silph à? Tránh đường cho tớ!', 'Shigeru: Starter của tớ đã tiến hóa hoàn toàn rồi đấy!'],
    win: ['Shigeru: Cái gì?! Lại thua cậu...', 'Shigeru: Tớ sẽ tới Liên đoàn trước cậu!'],
  },
  3: {
    base: 49, stage: 2, team: ['pidgeot', 'rhyhorn', 'alakazam', 'S1'],
    intro: ['Shigeru: Cuối cùng cũng tới Đường Chiến Thắng.', 'Shigeru: Chỉ một người được vào Liên đoàn — là tớ!'],
    win: ['Shigeru: ...Được rồi, cậu đi trước đi.', 'Shigeru: Nhưng đừng tưởng thế là xong!'],
  },
  5: {
    base: 59, stage: 2, team: ['pidgeot', 'alakazam', 'rhydon', 'S1', 'S2'],
    intro: [
      'Shigeru: Hê, Satoshi! Cậu tới muộn rồi. Tớ đã đánh bại Tứ Thiên Vương trước cậu!',
      'Shigeru: Giờ tớ là Nhà vô địch! Muốn giành ngôi vị thì đánh bại tớ đi!',
    ],
    win: ['Shigeru: Không thể nào... tớ đã thua.', 'Shigeru: ...Chúc mừng, Satoshi. Cậu mới là Nhà vô địch thật sự.'],
  },
};

/** Starter người chơi đã chọn (lưu ở game.starter; bản lưu cũ thì đoán theo Hộp) */
export function playerStarter(game: GameState): Starter {
  if (game.starter && game.starter in COUNTER) return game.starter as Starter;
  // bản lưu cũ có cả Pikachu đồng hành → ưu tiên 3 starter cổ điển, Pikachu xét sau cùng
  const order: Starter[] = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];
  for (const st of order) if (game.box.some((m) => PLAYER_LINE[st].includes(m.speciesId))) return st;
  return 'bulbasaur';
}

export function rivalTier(stage: StageDef): Tier | null {
  return stage.rival ? TIERS[stage.rival.tier] ?? TIERS[1] : null;
}

/** Đội của Shigeru cho một ải: GymPokemon[] (con cuối là boss) */
export function rivalTeam(game: GameState, stage: StageDef): GymPokemon[] {
  const tier = rivalTier(stage);
  if (!tier) return [];
  const rs = COUNTER[playerStarter(game)];
  const team = teamAvgLevel(game);
  // nhỉnh hơn đội người chơi, tối đa giới hạn cấp chung + aboveCap; starter cao hơn aceBonus cấp
  const R = TRAINER.rival;
  const lv = Math.max(tier.base, Math.min(levelCapFor(game.badges.length) + R.aboveCap, team + R.aboveTeam));
  const members = tier.team
    .map((id) => (id === 'S1' ? SUPPORT[rs][0] : id === 'S2' ? SUPPORT[rs][1] : id))
    .filter((id) => !!POKEMON[id])
    .map((species, i): GymPokemon => ({ species, level: lv - 1 + (i % 2) }));
  members.push({ species: LINE[rs][tier.stage], level: lv + R.aceBonus, boss: true });
  return members;
}

/** Mọi loài Shigeru có thể dùng (để nạp sprite trước khi vào trận) */
export function rivalSpeciesPool(): string[] {
  const out = new Set<string>(['pidgeotto', 'pidgeot', 'raticate', 'kadabra', 'alakazam', 'growlithe', 'arcanine', 'exeggcute', 'exeggutor', 'rhyhorn', 'rhydon', 'gyarados', 'golem']);
  for (const l of Object.values(LINE)) l.forEach((s) => out.add(s));
  return [...out];
}

/** Dựng "hội quán" tạm cho trận Shigeru (không có huy hiệu) */
export function buildRivalGym(game: GameState, stage: StageDef): GymDef {
  const tier = rivalTier(stage)!;
  const team = rivalTeam(game, stage);
  // lời thoại theo ngôn ngữ đang chọn (bản tiếng Việt nằm ở TIERS, tiếng Anh ở i18n/content)
  const lines = rivalLines(stage.rival && TIERS[stage.rival.tier] ? stage.rival.tier : 1, tier);
  return {
    id: `rival-${stage.rival?.tier ?? 1}`,
    city: stageArea(stage),
    title: stageName(stage),
    leader: 'Shigeru',
    leaderSprite: 'shigeru',
    badgeId: '',
    team,
    intro: lines.intro.map((l) => named(game, l)),
    sendOut: team.map((m, i) => t(i === team.length - 1 ? 'battle.rival.sendOutLast' : 'battle.rival.sendOut', { name: POKEMON[m.species].name })),
    winLines: lines.win.map((l) => named(game, l)),
    afterLines: [t('battle.rival.after')],
  };
}

/** thay 'Satoshi' trong câu thoại bằng tên huấn luyện viên của người chơi */
function named(game: GameState, line: string) {
  return line.replace(/Satoshi/g, game.trainer || 'Satoshi');
}

function teamAvgLevel(game: GameState) {
  const t = game.team.map((u) => game.box.find((m) => m.uid === u)).filter((m): m is NonNullable<typeof m> => !!m);
  if (!t.length) return 5;
  return Math.round(t.reduce((s, m) => s + m.level, 0) / t.length);
}
