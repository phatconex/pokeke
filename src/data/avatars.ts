// Nhân vật người chơi có thể chọn (bảng màu trong art/townArt.ts → texture trainer-<id>).
export interface AvatarDef {
  id: string;
  name: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'satoshi', name: 'Mũ đỏ' },
  { id: 'hero-blue', name: 'Mũ xanh' },
  { id: 'hero-green', name: 'Mũ lục' },
  { id: 'girl-pink', name: 'Tóc nâu' },
  { id: 'girl-blue', name: 'Tóc đen' },
  { id: 'girl-gold', name: 'Tóc vàng' },
];

export function isAvatar(id: unknown): id is string {
  return typeof id === 'string' && AVATARS.some((a) => a.id === id);
}
