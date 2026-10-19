import type { ItemId } from '../game/items';
import { CHAPTERS } from './chapters';

// Hội quán, thủ lĩnh và huy hiệu. Thêm hội quán mới = thêm một mục vào GYMS và đặt cửa hội quán trên bản đồ vùng.

export interface GymPokemon {
  species: string;
  level: number;
  /** dùng bộ đòn boss (Onix) */
  boss?: boolean;
}

export interface GymDef {
  id: string;
  city: string;
  title: string;
  leader: string;
  /** texture nhân vật trên bản đồ (trainer-<id>) */
  leaderSprite: string;
  /** huy hiệu khi thắng ('' = không có, vd. Tứ Thiên Vương) */
  badgeId: string;
  team: GymPokemon[];
  /** lời thoại trước trận */
  intro: string[];
  /** câu khi tung từng Pokémon ra (theo thứ tự đội hình) */
  sendOut: string[];
  /** sau khi thắng lần đầu */
  winLines: string[];
  /** nói chuyện khi đã có huy hiệu */
  afterLines: string[];
  /** vật phẩm thưởng khi thắng lần đầu */
  reward?: { item: ItemId; name: string };
}

export interface BadgeDef {
  id: string;
  name: string;
  texture: string;
}

const CORE_BADGES: Record<string, BadgeDef> = {
  boulder: { id: 'boulder', name: 'Huy hiệu Đá', texture: 'badge-boulder' },
  cascade: { id: 'cascade', name: 'Huy hiệu Thác', texture: 'badge-cascade' },
  thunder: { id: 'thunder', name: 'Huy hiệu Sấm', texture: 'badge-thunder' },
};

const CORE_GYMS: Record<string, GymDef> = {
  pewter: {
    id: 'pewter',
    city: 'Thành phố Pewter',
    title: 'Hội quán Pewter',
    leader: 'Takeshi',
    leaderSprite: 'takeshi',
    badgeId: 'boulder',
    team: [
      // thành viên ≈ giới hạn cấp (15), át chủ bài cao hơn 3 cấp
      { species: 'geodude', level: 14 },
      { species: 'geodude', level: 15 },
      { species: 'onix', level: 18, boss: true },
    ],
    intro: [
      'Takeshi: Ta là Takeshi, thủ lĩnh Hội quán Pewter!',
      'Takeshi: Ý chí của ta cứng như đá. Pokémon hệ Đá của ta sẽ cho cậu thấy điều đó!',
      'Takeshi: Muốn lấy Huy hiệu Đá thì đánh bại ta đi!',
    ],
    sendOut: ['Takeshi: Geodude, ra trận!', 'Takeshi: Geodude thứ hai, lên!', 'Takeshi: Onix, đến lượt ngươi!'],
    winLines: [
      'Takeshi: ...Ta đã đánh giá thấp cậu rồi.',
      'Takeshi: Đây, Huy hiệu Đá — bằng chứng cậu đã vượt qua Hội quán Pewter!',
      'Takeshi: Gom đủ 8 huy hiệu, cậu sẽ được vào Liên đoàn Indigo.',
    ],
    afterLines: ['Takeshi: Cậu đã có Huy hiệu Đá rồi. Hãy tiếp tục hành trình đến các hội quán khác!'],
    reward: { item: 'moonStone', name: 'Đá Trăng' },
  },
  cerulean: {
    id: 'cerulean',
    city: 'Thành phố Cerulean',
    title: 'Hội quán Cerulean',
    leader: 'Kasumi',
    leaderSprite: 'kasumi',
    badgeId: 'cascade',
    team: [
      { species: 'goldeen', level: 19 },
      { species: 'staryu', level: 20 },
      { species: 'starmie', level: 23, boss: true },
    ],
    intro: [
      'Kasumi: Chào mừng đến Hội quán Cerulean! Ta là Kasumi, nàng tiên cá của Cerulean.',
      'Kasumi: Hồ nước giữa sân sẽ làm chậm ai không phải hệ Nước. Cẩn thận đấy!',
    ],
    sendOut: ['Kasumi: Goldeen, lượn đi!', 'Kasumi: Staryu, ra trận!', 'Kasumi: Starmie, kết thúc trận này!'],
    winLines: [
      'Kasumi: Hừ... cậu mạnh hơn ta tưởng.',
      'Kasumi: Đây là Huy hiệu Thác. Và cầm lấy Đá Sấm này — nghe nói Pikachu có thể dùng nó để tiến hóa.',
    ],
    afterLines: ['Kasumi: Lần sau ta sẽ thắng!'],
    reward: { item: 'thunderStone', name: 'Đá Sấm' },
  },
  vermilion: {
    id: 'vermilion',
    city: 'Thành phố Vermilion',
    title: 'Hội quán Vermilion',
    leader: 'Matis',
    leaderSprite: 'matis',
    badgeId: 'thunder',
    team: [
      { species: 'voltorb', level: 25 },
      { species: 'magnemite', level: 25 },
      { species: 'raichu', level: 28, boss: true },
    ],
    intro: [
      'Matis: Ha! Một nhóc con muốn lấy Huy hiệu Sấm của Trung úy Matis à?',
      'Matis: Sàn đấu của ta có điện chạy qua. Ô nào sáng vàng là sắp phóng điện — né ra, trừ khi Pokémon của cậu là hệ Đất!',
      'Matis: Voltorb của ta còn biết tự nổ khi yếu máu đấy. Coi chừng!',
    ],
    sendOut: ['Matis: Voltorb, xông lên!', 'Matis: Magnemite, phóng điện!', 'Matis: Raichu, cho chúng nếm sấm sét!'],
    winLines: [
      'Matis: Whoa! Cậu làm ta tê cả người rồi đấy!',
      'Matis: Huy hiệu Sấm là của cậu. Xứng đáng lắm, nhóc!',
    ],
    afterLines: ['Matis: Lần sau ta sẽ sạc đầy pin hơn!'],
    reward: { item: 'thunderStone', name: 'Đá Sấm' },
  },
};

export const BADGES: Record<string, BadgeDef> = Object.assign({}, CORE_BADGES, ...CHAPTERS.map((c) => c.badges ?? {}));
export const GYMS: Record<string, GymDef> = Object.assign({}, CORE_GYMS, ...CHAPTERS.map((c) => c.gyms ?? {}));
