# Hướng dẫn thêm / chỉnh chiêu (skill system)

Mục tiêu: thêm Pokémon mới chỉ cần vài dòng cấu hình, không viết lại hiệu ứng.

## 1. Kiến trúc (thư mục `src/skills/`)
| File | Vai trò |
|---|---|
| `types.ts` | Kiểu dữ liệu: `ArchetypeId`, params từng khuôn, `TierDef`, `SkillSpec` |
| `archetypes.ts` | Cài đặt các khuôn chiêu (`castArchetype`, `castUltArchetype`) |
| `dialects.ts` | "Từ vựng hiệu ứng" theo hệ (fire / water / electric / grass / generic) |
| `host.ts` | `SkillHost`: những gì khuôn được phép dùng từ BattleScene |
| `kits.ts` | Cấu hình: `TYPE_KITS` (mặc định theo hệ), `SPECIES_KITS` (riêng từng loài), mốc cấp (tiers), `resolveSkill / resolveUlt` |

Khuôn có sẵn: `bolt` (đạn), `dashStrike` (lao chém), `stream` (tia/luồng; tham số `ringBeam` = tia là chuỗi vòng elip), `blast` (nổ có ngắm), `nova` (vòng sóng), `chain` (sét nảy), `rain` (đòn từ trời), `whip`, `cloud`, `tether` (Cỏ), `lance`/`gale`/`blizzard` (Băng: mũi tinh thể / gió ngang / mưa giá băng, `iceArchetypes.ts`), `telekinesis` (Siêu linh: vòng ma thuật → hút vào → nhấc lên → quật xuống, file `psyArchetypes.ts`). Ult: `inferno`, `tsunami`, `thunderstorm`, `bloom`. Còn là stub: `trap`, `summon`.

## 2. Thêm một chiêu mới cho loài
1. Khai báo move trong `src/data/moves.ts` (id, tên VI, type, power, cooldownMs, icon, `archetype: 'bolt' | ...`). Quy ước hậu tố id theo dạng: `C` = Charmeleon, `S` = Squirtle line, `P` = Pikachu line, `G1/G2/G3` = Grass 3 dạng, `F1/F3` = Fire dạng 1/3.
2. Thêm tên EN: `src/i18n/content/moves.en.ts` (`{ name, desc }`).
3. Gán vào loài: `src/data/pokemon.ts` (hoặc `chapters/evo.ts` cho dạng sau) bằng `sk('J','K',['L',10],['U',18])`.
4. Cấu hình hiển thị: `src/skills/kits.ts`
   ```ts
   // loài dùng sẵn khuôn của hệ
   SPECIES_KITS.vulpix = { slots: { J: { archetype: 'bolt' } } };
   // tinh chỉnh một chiêu theo loài + mốc cấp
   SPECIES_KITS.blastoise = { kitType: 'water', slots: { L: { params: { beams: 2 }, tiers: [{ minLevel: 36, widthMult: 1.5 }] } } };
   // ult riêng
   SPECIES_KITS.charizard = { ult: 'inferno', ultParams: { extraMeteors: 12 } };
   ```
5. Xem thử trong **Skill Lab** (menu chính, bản dev): chọn loài, chỉnh cấp, bấm J/K/L/U/I.

> Đọc thêm `docs/SKILL_FEEDBACK.md` (các góp ý thật của người làm game, mỗi hệ mới phải qua được).

## 3. Quy tắc thiết kế (đã chốt với người làm game)
- Mỗi loài, mỗi dạng tiến hóa, mỗi hệ phải KHÁC nhau nhìn là biết (hình dáng, màu, chuyển động, rung/hit-stop, âm thanh).
- Hệ có "hình dáng" riêng: Lửa = cầu lửa/luồng/nổ; Nước = giọt/tia/sóng + vũng; Điện = zig-zag/sét nảy/sét trời; Cỏ = LÁ xoay xuyên địch, dây leo quất, phấn bào tử, hạt giống, rễ (KHÔNG dùng quả cầu sáng tròn giống Lửa).
- Tham chiếu: chiêu trong anime (VD Bulbasaur: Razor Leaf, Vine Whip, Sleep Powder, Leech Seed, Solar Beam; Venusaur: Frenzy Plant, Petal Dance).
- Mỗi chiêu có: telegraph (vạch/vòng báo) cho đòn lớn, hit-stop và rung nhẹ khi trúng, KO chậm hình cho đòn kết liễu.

## 4. Quy tắc cân bằng
- Năng lượng chung 0–100, hồi 8/giây; giá mặc định J 7, K 18, L 32, U 45 (`COMBAT_PROFILES` trong `balance.ts`, có bộ PvP dựng sẵn).
- Tuyệt chiêu I: chỉ K/L/U trúng nạp, hồi 40 giây dùng chung cả đội, mạnh ×1,3; dạng gốc chưa tiến hóa không có.
- Mở khóa chiêu: K = Lv5 + J trúng 30 lần; L = Lv10 + nhiệm vụ theo hệ; U = Lv18 + Thử thách chiêu; I = tiến hóa + thắng hội quán hoặc 3 KO (`src/data/unlocks.ts`, `SKILL_UNLOCK` trong `balance.ts`).

## 5. Quy trình làm việc (tiết kiệm token)
- Sửa trực tiếp trong code, mỗi lần một chỗ nhỏ; kiểm tra nhanh bằng `npx tsc --noEmit` và Skill Lab.
- Chỉ test 1 màn với 1 Pokémon cho tới khi lối chơi được chốt; khi người làm game nói "update toàn bộ" mới nhân ra mọi loài và chạy đủ bộ test.
- Dùng agent chỉ cho việc lớn, độc lập (nhiều file, nhiều loài).

## 6. Mẫu bộ chiêu có tên (dùng lại bằng 1 dòng)
Trong `src/skills/kits.ts` có `KIT_TEMPLATES`; loài mới chỉ cần:
```ts
SPECIES_KITS.vulpix   = { template: 'fire.small' };                                   // dùng nguyên mẫu
SPECIES_KITS.arcanine = { template: 'fire.big', slots: { J: { params: { scale: 1.1 } } } }; // ghi đè một ô
```
| Mẫu | Nguồn (đã duyệt) | Phong cách |
|---|---|---|
| `fire.small` | Charmander | đốm lửa nhỏ · cào ngắn · luồng lửa mảnh · cầu lửa nhỏ |
| `fire.mid` | Charmeleon | đạn lửa có vệt · lao cắn · luồng lửa dày · nổ có ngắm · ult inferno |
| `fire.big` | Charizard | 3 cầu lửa · chém cánh · luồng khổng lồ quét · nổ sao 5 cánh · ult bay lên |
| `water.small` | Squirtle | giọt nước · xoáy bong bóng · tia mảnh · sóng nhỏ |
| `water.swift` | Wartortle | loạt 3 tia · xoáy chém bọt · tia quét · 2 vòng sóng · ult sóng thần quạt |
| `water.heavy` | Blastoise | pháo nặng · đập mai · 2 tia song song · 3 vòng sóng · ult sóng thần lớn |
| `grass.small` | Bulbasaur | Razor Leaf · Vine Whip · Sleep Powder · Leech Seed |
| `grass.mid` | Ivysaur | bão lá · Power Whip · phấn độc+tê · Solar Beam · Petal Dance |
| `grass.big` | Venusaur | Seed Bomb · Vine Slam · Solar Beam dày · Frenzy Plant · Overgrowth |
| `ghost.small` | Gastly | đốm ma nhỏ vệt khói · liếm lao ngắn · tia mê hoặc · đám khí ma tím (độc + rối loạn) |
| `ghost.mid` | Haunter | đốm ma tự đuổi · vuốt bóng có vệt cào tím · tia Hex xuyên địch · tàng hình tập kích (chiêu cũ) |
| `ghost.big` | Gengar | cầu bóng ma lớn · tàng hình tập kích · cột bóng tối dày (rung màn hình) · bùng bóng ma nổ sao 8 cánh |
| `psychic.small` | Abra | vòng ý nghĩ nhỏ · dịch chuyển (cũ) · sóng ripple đơn |
| `psychic.mid` | Kadabra | 2 vòng ý nghĩ · dịch chuyển · sóng ripple đôi · thìa bay |
| `psychic.big` | Alakazam | vòng lớn vệt dày · dịch chuyển · tia Psybeam rộng đổi màu · Psystrike cầu gai nổ sao 6 cánh |
| `ice.small` | Seel | mảnh băng đơn vỡ vụn · nanh băng + 3 tinh thể · Mũi Băng (cột tinh thể mảnh) · Gió Tuyết (đường gió ngang) |
| `ice.big` | Dewgong | 3 mảnh băng xòe xuyên · đập băng + hàng gai · Mũi Băng Lớn (lăng trụ có nhánh) · Mưa Băng (giá băng rơi + gió) · ult Kỷ Băng Hà (vết nứt lan khắp sân, tinh thể nhốt địch, vỡ tung) |
| `fighting.small` | Machop | chặt đơn · Phản Đòn · Quật Đất · Chặt Chéo |
| `fighting.mid` | Machoke | chặt đôi · Phản Đòn Nặng · Siết & Quật · Chặt Chéo Nặng · ult Loạt Đấm |
| `fighting.big` | Machamp | 4 nắm đấm bay · Phản Đòn 4 tay · Đấm Động Lực (nắm đấm khổng lồ) · Trăm Cú Đấm · ult Đấm Hạ Gục (K.O.) |
| `electric.small` | Pikachu | sét zig-zag mảnh · lao sét · sét nảy 3 · 3 tia sét trời |
| `electric.big` | Raichu | sét 2 lõi · lao 8 bóng sét · nảy 5 · 5 tia sét trời · ult bão sét |

Lưu ý: khuôn lấy số (tầm, bề rộng tia, bán kính nổ…) từ chính move, nên move của loài mới nên sao chép từ move mẫu cùng ô (ví dụ move L của `water.heavy` là `hydroPumpS`) rồi đổi tên/số.

Hệ chưa có mẫu: Normal, Bug, Poison, Flying, Rock, Ground, Dragon (đang dùng chiêu cũ). Mỗi hệ mới = viết `TYPE_KITS.<hệ>` + dialect hiệu ứng, rồi làm 1–3 mẫu theo dạng nhỏ/vừa/lớn.

## 7. Nguồn asset
- Sprite Pokémon (đi, đứng yên, tấn công): **PMD SpriteCollab** (CC BY-NC), đang dùng trong game.
- Hiệu ứng chiêu trong game này được **vẽ bằng code** (hạt, đường, vòng), không dùng ảnh ngoài, nên không phải xin phép nguồn nào và đổi màu/kích thước rất nhanh.

## 8. Cơ chế hệ Băng (áp dụng cho MỌI chiêu hệ Băng, trong `BattleScene.damageEnemy`)
- **Lạnh:** mỗi đòn băng trúng cộng điểm Lạnh (`MoveDef.chill`, mặc định 1; tia/vùng cộng ít mỗi nhịp), địch chậm dần; đủ 3 điểm → **Đóng băng** 2,4 giây (boss chỉ bị chậm).
- **Vỡ nát:** đòn băng kế tiếp trúng địch đang đóng băng → sát thương ×1,6, mảnh băng văng gây sát thương lan (và cộng Lạnh) cho địch trong 52px.
- Chiêu băng cũ của các Pokémon khác (Articuno, Jynx…) cũng có cơ chế này vì chỉ cần `type: 'ice'`.
- **Hình của hệ Băng:** chỉ dùng hình góc cạnh, chiều thẳng đứng, hướng gió (lăng trụ, giá băng, vết nứt phân nhánh, mảng băng rách). KHÔNG dùng vòng tròn/elip/sigil xoay (giống Siêu linh).

## 9. Cơ chế hệ Giác đấu (trong `BattleScene`)
- **Phản Đòn (K):** `armCounter` – trong lúc đỡ, lần đầu người chơi bị đánh trúng: nhận sát thương × `reduce`, gọi hàm phản (đánh mọi địch gần), và `setCounterBuff` → L/U ×1,5 trong vài giây.
- **Va chạm:** đòn Giác đấu có `knockback ≥ 150` đặt `bangUntil` lên địch; trong 0,45s nếu địch đó đâm vào địch khác (`updateCollisions`) thì cả hai chịu sát thương.
- Hệ Giác đấu và Băng KHÔNG dùng vòng tròn trong `skillFlair`.

## 10. Huyền thoại (dữ liệu trong `src/data/legendary.ts`)
Thêm một huyền thoại = 1 mục trong `LEGENDARY` + bộ chiêu riêng trong `SPECIES_KITS` + base stat cao (HP/ATK) + `TRAITS` (haste/crit) + `catchRate: 3`.
Đặc quyền tự động áp dụng: thanh năng lượng lớn + hồi nhanh (`Fighter.refreshStats`), tuyệt chiêu luôn mở + nạp nhanh + hồi ngắn (`isLearned`, `gainUlt`, `castUltimate`), hào quang lơ lửng + lá chắn lục giác tự động (`BattleScene.updateLegend`, `damageFighter`).
Mẫu đã làm: **Mewtwo** (lưỡi liềm quay lại · lá chắn lục giác · giếng trọng lực · tia xoắn gen · Mind Break). Khuôn: `boomerang`, `barrier`, `singularity`, `stream.helix`, ult `mindbreak` (`legendArchetypes.ts`).
