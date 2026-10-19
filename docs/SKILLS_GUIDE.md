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

## 11. Bảy hệ còn lại (Rồng · Đá · Đất · Bay · Độc · Bọ · Thường)

Khuôn ở `src/skills/typeArchetypes.ts`, hiệu ứng chung `src/fx/TypeFx.ts`, texture `src/art/typeArt.ts`, bộ chiêu từng loài trong `kits.ts` (khối `TK`, gắn khuôn theo ô, không đụng move gốc).

| Hệ | Khuôn thường | Ult | Nhận diện |
|---|---|---|---|
| Rồng | fan (quạt vảy), sweep (đuôi), twister, serpent, dive | draco (Draco Meteor) | vảy thoi xanh/vàng, thiên thạch |
| Đá | lob, roll, fallers (phiến chéo) | wavefront rock | mảnh đá đục + gân quặng, nặng |
| Đất | lob (bùn), ambush (đào hố), ridge (gờ đất), quicksand | chasm (vực nứt) | vàng cát, hố, chìm |
| Bay | bolt lông vũ, sweep cánh, dive (lên trời, bóng + dấu X rồi lao), twister | flock (đàn chim + V) | lông vũ, bóng chim, sóng V |
| Độc | bolt kim, lob (vũng độc), fallers axit | wavefront sludge | xanh lá + vàng, bong bóng |
| Bọ | web (tơ, kéo mục tiêu), swarm (bầy tự cắn), bolt kim đôi | wavefront swarm | tơ nhện, bầy côn trùng |
| Thường | dashStrike trơn, triattack (chọn Lửa/Băng/Điện theo hệ khắc), beam | hyperbeam | sao trắng, tia trắng; không vòng tròn |

Loài đã gắn: dratini/dragonair/dragonite, geodude/graveler/golem, sandshrew/sandslash/diglett/dugtrio, pidgey/pidgeotto/pidgeot, ekans/arbok, grimer/muk, caterpie/butterfree, weedle/beedrill, rattata/raticate/meowth/persian/eevee/snorlax.
Ult nhớ có `windupMs` trong `ULT_DEFAULTS`, thiếu thì ult không bao giờ bắn.
Cơ chế riêng (BattleScene.typeMechanicsOnHit): Rồng – Cơn giận (100 điểm → 4s sát thương ×1,6); Đá – Da đá (≤5 tầng, −8% sát thương nhận mỗi tầng, 6s, đủ 5 tầng → xung chấn Pháo đài); Độc – cộng dồn ≤5 tầng, sát thương mỗi giây theo tầng, đủ 5 → Ăn mòn (+20% sát thương nhận); Thường – không bao giờ bị kháng (≥×1). Bay: bất tử khi ở trên không (dive). CHƯA: Bọ bầy đàn làm đồng minh, Đất lún chặn cả di chuyển, Thích nghi nâng cao.

### Bọ "Bầy đàn" + HUD cơ chế + cân bằng (7 hệ mới)
- Bọ – Bầy đàn (`BattleScene.spawnSwarm/updateSwarm`): đòn Bọ trúng gọi 3–5 con bọ đồng minh (Lv25 +1, Lv40 +1) bám theo, tự cắn địch gần nhất 6s, hồi 10s.
- Đất – Cát Lún: vào vùng cát thì chìm dần, chậm tới 75%, chìm đủ 1,2s thì bị kẹt (boss chỉ bị chậm).
- HUD (`HudScene`): thanh mảnh dưới thanh năng lượng cho Rồng (Cơn giận, nhấp nháy khi đang bùng), Đá (5 vạch Da đá), Bọ (thời gian/hồi Bầy đàn).
- Cân bằng: `SPECIES_DMG_MULT` trong kits.ts nhân sát thương người chơi theo loài. Đo 1 vòng J-K-L-U Lv40 trên 5 hình nộm: trước 960–1900 (Dragonite 1124), sau 2550–3650 (Fire/Grass/Psychic ~3800–4600, Machamp ~5900). Đo lại bằng t7dps trong scratchpad khi đổi kit.

### Hiệu ứng trúng nặng + chiêu đặc trưng của địch (ải, hội quán, boss)
- Chí mạng / rất hiệu quả: `BattleScene.impactFlash` (đốm trắng + tia tỏa), số chí mạng to có viền trắng (`damageNumber(..., crit)`), nhãn "Critical hit!" cạnh số.
- Địch: `src/entities/EnemySkills.ts` – mỗi Pokémon địch (ải, hội quán, boss) có 2 chiêu luân phiên theo HỆ chính (Pidgey = Bay): đạn xòe cùng hệ (volley), ô nổ báo trước theo hệ (zone), sóng xung kích quanh thân (nova). Cooldown: boss hội quán 2,6s · boss thường 3,6s · hội quán 3,0s (báo trước ngắn 30%) · đầu đàn 6,5s · hoang dã 9,5s (nhân rangedCdMult của độ khó). Đòn nào cũng có báo trước; hình nổ dùng chính dialect của hệ đó. Chỉnh bảng `T` trong file để đổi số lượng/tốc độ/màu từng hệ.

### Độ khó tăng dần theo ải (`STAGE_RAMP`, `stageRamp` trong config/balance.ts)
Trước đây ải dùng hệ số phẳng (máu ×4,4, sát thương ×2,9) từ ải đầu. Giờ nhân thêm độ dốc theo vị trí ải trong STAGES: ải 1 = sát thương ×0,5, máu ×0,7, địch ra đòn thưa gấp đôi; tăng đều tới vị trí 9 thì đủ. Hội quán không xuống dưới ×0,8. Pokémon hoang dã chỉ có chiêu đặc trưng từ ải vị trí 4 trở đi (`wildSkillsFromIndex`).

### Chiêu địch theo từng loài (`EnemySkills.profileFor`)
Mỗi loài có hồ sơ chiêu riêng thay vì chỉ theo hệ: bộ chiêu xoay vòng 2–3 loại (đạn xòe · ô nổ · sóng quanh thân · **Lao** (vạch báo rồi phóng thẳng) · **Hàng nổ** (đường ô nổ nối tiếp tới người chơi)) suy từ kiểu hành vi (rusher→Lao, ranged→đạn, tank→sóng…), hệ, cỡ (HP: nhỏ/vừa/lớn → số đạn, bán kính, tầm tăng) và độ lệch cố định theo tên loài (thứ tự mở đầu, góc xòe, tốc độ). Bảng `OVERRIDE` ghi đè cho loài đặc biệt (Onix, Golem, Starmie, Gyarados, Dragonite, Raichu…); thêm loài = thêm 1 dòng. Sát thương mỗi chiêu đã hạ (đạn ×0,7 · nổ ×0,8 · sóng ×0,9 · lao ×0,9 · hàng nổ ×0,5/ô) để không một đòn mất gần nửa máu.
