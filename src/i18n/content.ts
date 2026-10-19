// Truy cập nội dung game theo ngôn ngữ đang chọn (tiếng Việt = dữ liệu gốc, tiếng Anh = bản dịch).
import type { MoveDef, StatusKind } from '../data/moveKit';
import type { PokemonType } from '../data/types';
import type { GymDef } from '../data/trainers';
import type { StageDef } from '../data/stages';
import type { PokemonSpecies } from '../data/pokemon';
import { STATUS_LABEL } from '../data/moveKit';
import { TYPE_LABEL } from '../data/types';
import { lang } from './index';
import { EN_MOVES } from './content/moves.en';
import { EN_BADGES, EN_BLURBS, EN_CHAPTER_TITLES, EN_GYMS, EN_REGIONS, EN_RIVAL, EN_STAGES } from './content/world.en';

const en = () => lang() === 'en';

export const TYPE_EN: Record<PokemonType, string> = {
  normal: 'Normal', fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric', bug: 'Bug', poison: 'Poison', flying: 'Flying',
  rock: 'Rock', ground: 'Ground', psychic: 'Psychic', fighting: 'Fighting', ghost: 'Ghost', ice: 'Ice', dragon: 'Dragon',
};
export const STATUS_EN: Record<StatusKind, string> = {
  burn: 'Burn', poison: 'Poison', paralyze: 'Paralysis', confuse: 'Confusion', seed: 'Leech Seed', sleep: 'Sleep', freeze: 'Freeze',
};
const ITEM_EN: Record<string, string> = {
  pokeball: 'Poké Ball', greatball: 'Great Ball', ultraball: 'Ultra Ball', potion: 'Potion',
  thunderStone: 'Thunder Stone', moonStone: 'Moon Stone', fireStone: 'Fire Stone', waterStone: 'Water Stone', leafStone: 'Leaf Stone',
};
const ITEM_VI: Record<string, string> = {
  pokeball: 'Poké Ball', greatball: 'Great Ball', ultraball: 'Ultra Ball', potion: 'Thuốc hồi máu',
  thunderStone: 'Đá Sấm', moonStone: 'Đá Trăng', fireStone: 'Đá Lửa', waterStone: 'Đá Nước', leafStone: 'Đá Lá',
};
const AVATAR_EN: Record<string, string> = {
  satoshi: 'Red cap', 'hero-blue': 'Blue cap', 'hero-green': 'Green cap', 'girl-pink': 'Brown hair', 'girl-blue': 'Black hair', 'girl-gold': 'Blonde',
};
const ULT_EN: Record<PokemonType, { name: string; desc: string }> = {
  electric: { name: 'Gigavolt Storm', desc: 'Lightning strikes every foe twice and paralyzes them.' },
  fire: { name: 'Inferno Meteor', desc: 'Fiery meteors rain across the arena, burning every foe.' },
  water: { name: 'Great Flood', desc: 'A tidal wave sweeps the whole arena and hurls foes away.' },
  grass: { name: 'Primeval Thorns', desc: 'Thorns erupt under every foe and plant leech seeds.' },
  bug: { name: 'Swarm Surge', desc: 'A swarm floods the arena, biting every foe.' },
  poison: { name: 'Toxic Sea', desc: 'Poison floods the field, badly poisoning every foe.' },
  flying: { name: 'Tempest', desc: 'A tornado sweeps the arena, hurling and confusing foes.' },
  rock: { name: 'Meteor Barrage', desc: 'Boulders crash onto every foe and may stun them.' },
  ground: { name: 'Earthsplitter', desc: 'A massive quake tears through the whole arena.' },
  psychic: { name: 'Time Stop', desc: 'Psychic force crushes every foe and confuses them for long.' },
  fighting: { name: 'Hundred Fists', desc: 'An explosive flurry around you; heals 25% HP.' },
  ghost: { name: 'Eternal Night', desc: 'Phantoms seize every foe and confuse them.' },
  ice: { name: 'Ice Age', desc: 'A blizzard freezes every foe on the field.' },
  dragon: { name: 'Draco Meteor', desc: 'Dragon meteors rain down with devastating power.' },
  normal: { name: 'Hyper Annihilation', desc: 'A huge burst of raw energy around you; heals 20% HP.' },
};

export const moveName = (m: Pick<MoveDef, 'id' | 'name'>) => (en() ? EN_MOVES[m.id]?.name ?? m.name : m.name);
export const moveDesc = (m: Pick<MoveDef, 'id' | 'desc'>) => (en() ? EN_MOVES[m.id]?.desc ?? m.desc : m.desc);
export const typeLabel = (t: PokemonType) => (en() ? TYPE_EN[t] : TYPE_LABEL[t]);
export const statusLabel = (k: StatusKind) => (en() ? STATUS_EN[k] : STATUS_LABEL[k]);
export const itemName = (id: string) => (en() ? ITEM_EN[id] : ITEM_VI[id]) ?? id;
export const avatarName = (id: string, vi: string) => (en() ? AVATAR_EN[id] ?? vi : vi);
export const ultimateText = (type: PokemonType, vi: { name: string; desc: string }) => (en() ? ULT_EN[type] ?? vi : vi);

export const stageName = (st: Pick<StageDef, 'id' | 'name'>) => (en() ? EN_STAGES[st.id]?.name ?? st.name : st.name);
export const stageArea = (st: Pick<StageDef, 'id' | 'area'>) => (en() ? EN_STAGES[st.id]?.area ?? st.area : st.area);
export const stageLabel = (st: Pick<StageDef, 'id' | 'label'>) => (en() ? EN_STAGES[st.id]?.label ?? st.label : st.label);
export const blurb = (sp: Pick<PokemonSpecies, 'id' | 'blurb'>) => (en() ? EN_BLURBS[sp.id] ?? sp.blurb : sp.blurb);
export const chapterTitle = (id: string, vi: string) => (en() ? EN_CHAPTER_TITLES[id] ?? vi : vi);
export const badgeName = (id: string, vi: string) => (en() ? EN_BADGES[id] ?? vi : vi);
export const regionText = (id: string, vi: { name: string; desc: string }) => (en() ? { name: EN_REGIONS[id]?.name ?? vi.name, desc: EN_REGIONS[id]?.desc ?? vi.desc } : vi);
export const rivalLines = (tier: number, vi: { intro: string[]; win: string[] }) => (en() ? EN_RIVAL[tier] ?? vi : vi);

/** Bản hội quán theo ngôn ngữ (tiêu đề, thành phố, lời thoại) */
export function gymText(g: GymDef): GymDef {
  if (!en()) return g;
  const e = EN_GYMS[g.id];
  if (!e) return g;
  return {
    ...g,
    title: e.title ?? g.title,
    city: e.city ?? g.city,
    intro: e.intro ?? g.intro,
    sendOut: e.sendOut ?? g.sendOut,
    winLines: e.winLines ?? g.winLines,
    afterLines: e.afterLines ?? g.afterLines,
  };
}
