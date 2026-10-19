// Các vùng chọn được ở đầu game (mốc A chỉ mở Kanto)
export const REGIONS = [
  { id: 'kanto', name: 'Kanto', open: true, desc: 'Pallet → Pewter → Cerulean → Vermilion. Chọn 1 trong 4 Pokémon khởi đầu.' },
  { id: 'johto', name: 'Johto', open: false, desc: 'Sắp ra mắt' },
  { id: 'hoenn', name: 'Hoenn', open: false, desc: 'Sắp ra mắt' },
  { id: 'sinnoh', name: 'Sinnoh', open: false, desc: 'Sắp ra mắt' },
] as const;
