# Hội quán (gym) — luật chung & cách thêm / chỉnh

Mục tiêu: **mọi hội quán dùng chung một bộ luật**. Muốn đổi cách đánh hội quán thì sửa MỘT chỗ, tất cả hội quán đổi theo.

## 1. Chỗ chỉnh luật chung — `GYM_RULES` (`src/config/balance.ts`)
| Khóa | Ý nghĩa |
|---|---|
| `recall` | Thủ lĩnh thu hồi con đang yếu: máu ≤ `hpRatio`, xác suất `chance`, tối đa `maxPerBattle` lần/trận |
| `rest` | Con bị thu hồi nghỉ hồi máu chậm: `regenPerSec` (tỉ lệ máu/giây), trần `cap` |
| `rage` | Cuồng nộ khi máu ≤ `hpRatio`: nhanh `speedMult`, mạnh `dmgMult`, ra đòn dồn dập `gapMult` (hệ Đá: mưa đá dày hơn) |
| `maxHitPct` | Một đòn không lấy quá % máu tối đa của Pokémon người chơi (bảo vệ người chơi cấp thấp) |
| `kitDamageMult` | Sát thương khi Pokémon hội quán dùng bộ chiêu riêng của loài (so với huyền thoại) |
| `swapFreezeMs` | Nghỉ ngắn sau khi người chơi đổi Pokémon |

Độ khó theo tiến trình (máu / sát thương theo số huy hiệu, tốc độ, nghỉ giữa các đòn) ở `TRAINER` và `STAGE_TUNING.gymHpMult` cùng file.

## 2. Những gì mọi hội quán đều có (code chung ở `BattleScene.ts`)
1. **Đội hình bốc ngẫu nhiên:** bốc `pick` con khác loài từ kho (`pool`), con át chủ bài (`ace`) ra cuối cùng. Không có kho thì lấy chính đội hình (trừ con `boss`) làm kho.
2. **Thu hồi → nghỉ hồi máu → thả con khác** (tia đỏ từ thủ lĩnh, bóng bay vòng cung).
3. **Tính cách di chuyển** ngẫu nhiên từng con: lao thẳng · rình quanh · đánh rồi lùi · đứng xa bắn.
4. **Chiêu:** Pokémon dùng bộ chiêu riêng của loài (qua cầu nối `makeLegendFoe`); chọn ô chiêu ngẫu nhiên có trọng số; có đánh lừa (khởi động đòn rồi đổi); báo trước ngắn, đòn nhỏ không vẽ vạch đỏ.
5. **Cuồng nộ** khi máu thấp.
6. **Đổi Pokémon của người chơi:** địch dừng ngắn, con mới thả về vị trí xuất phát (bóng ném từ huấn luyện viên), bất tử ngắn.

## 3. Dữ liệu riêng từng hội quán — `src/data/trainers.ts` (`GymDef`)
```ts
pewter: {
  id, city, title, leader, leaderSprite, badgeId,
  team: [...],        // đội hình cố định; con có `boss: true` là át chủ bài (ra cuối)
  pool: [...],        // (tùy chọn) kho Pokémon để bốc; bỏ trống = dùng team
  pick: 2,            // (tùy chọn) số con bốc từ kho; mặc định = số con trong team − 1
  ace: { ... },       // (tùy chọn) át chủ bài; mặc định = con `boss` cuối cùng trong team
  intro / sendOut / winLines / afterLines / reward ...
}
```
- Cấp Pokémon ≈ giới hạn cấp của bậc đó (người chơi nên hơn hoặc ngang).
- Kho nên có 5–8 con để mỗi lần đấu một khác; không để 2 con cùng loài đứng liền nhau (code tự xếp).

## 4. Địa hình riêng — `arenaLayout()` trong `src/art/arenaArt.ts`
Mỗi hội quán một kiểu hazard (khai báo trong `ArenaLayout.hazards`, kiểu ở `src/data/hazards.ts`):
- Pewter: đá rơi từ trần (`rain`, dày hơn khi Pokémon hệ Đá cuồng nộ).
- Cerulean: hồ nước làm chậm (`slowZones`).
- Vermilion: ô điện giật (`pulse`).
- Hội quán mới: thêm nhánh `biome === 'gym-xxx'` trả về `{ inset, solids, hazards }`.

## 5. Thêm một hội quán mới — danh sách việc
1. Thêm `GymDef` vào `CORE_GYMS` hoặc `chapters/*` (có ít nhất một con `boss`).
2. Thêm huy hiệu (`BADGES`) và sprite thủ lĩnh.
3. (Tùy chọn) địa hình riêng ở `arenaArt.ts`.
4. Chạy thử: vào ải `gym-<id>`, xem log lỗi; mọi luật ở mục 2 tự áp dụng.

## 6. Kiểm thử nhanh
Playwright (xem `docs/SKILLS_GUIDE.md` mục quy trình): bắt đầu `Battle` với `{ kind: 'stage', stageId: 'gym-<id>', skipIntro: true }`, cho người chơi bất tử, theo dõi `b.gymRoster`, `b.enemies[i].rageOn / usesKit`, và lỗi console.
