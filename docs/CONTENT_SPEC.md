# Đặc tả nội dung Kanto chương 4 → Liên đoàn (dành cho agent viết nội dung)

Dự án: Phaser 3 + TypeScript, game Pokémon pixel hành động theo bản đồ ải. Mọi chữ hiển thị là **tiếng Việt có dấu**.
Tên huấn luyện viên theo bản Nhật: Takeshi, Kasumi, Matis, **Erika, Kyo, Natsume, Katsura, Sakaki**, Tứ Thiên Vương **Kanna, Shiba, Kikuko, Wataru**, đối thủ **Shigeru**.

## 1. Quy tắc bắt buộc
- **Chỉ ghi file của bạn** (bảng ở mục 7). Không sửa file khác. Cần cơ chế mới → ghi chú trong câu trả lời cuối, đừng tự sửa engine.
- Kiểm tra: `npx tsc --noEmit` (cwd dự án). Chỉ sửa lỗi nằm trong file của bạn (agent khác có thể đang viết dở file của họ).
- Id chiêu mới phải có tiền tố module: `ch4_shadowBall`, `evo_solarBeam`, `league_dragonRage`... (tránh trùng giữa các agent). Được dùng lại mọi chiêu có sẵn (mục 4).
- Id loài = tên tiếng Anh viết thường (đã có sprite): xem mục 7. Mỗi loài bạn sở hữu phải có **cả** `species` và `enemyStats`.
- Không sao chép giai điệu/hình ảnh của game gốc; tên Pokémon/chiêu dịch sang tiếng Việt như các chiêu có sẵn.

## 2. Kiểu dữ liệu (đọc file gốc để biết chính xác)
- `src/data/chapters/types.ts` → `ChapterContent` (species, moves, enemyStats, stages, gyms, badges, bossPatterns, trainerPalettes, title, badgesAtStart).
- `src/data/pokemon.ts` → `PokemonSpecies` (dex, name, types, body {w,h} ~12–24 × 8–16, fallbackColor, scale? (to ×1.3–1.6 cho loài lớn), base {hp 80–150, atk 40–90, speed 80–150}, skills, evolution / evolutions[], catchRate 0–255, blurb?). Ví dụ: các loài chương 3 trong file.
- `src/data/kit.ts` → `sk(j, k, [l, lv], [u, lv])`, `s(species, lv)`, `A(species, lv)` (đầu đàn), `many(species, lv, n)`.
- `src/data/moveKit.ts` → `MoveDef` + hàm dựng `P` (đạn) `C` (cận chiến) `B` (quanh người/tại mục tiêu) `F` (tự cường hóa). **Đọc kỹ các trường**: status {burn,poison,paralyze,confuse,seed,sleep,freeze}, pierce, homing, boomerang, chain, explode, lunge, hits/randomHits, line, atTarget, strikes, zone, burrowMs, spinMs, guard/evade/reflect/buffMs, crit, halveHp, stack, money, fixedPerLevel, magnitude, selfCost, blink, **heal** (buff tự hồi % máu), **windupMs** (gồng trước khi ra đòn, dùng cho chiêu rất mạnh). Mỗi chiêu cần `desc` 1 câu nói rõ cơ chế. Ví dụ đầy đủ: `src/data/moves.ts`.
- `src/config/balance.ts` → `EnemyStats` { hp (20–90, tham chiếu Lv5), speed (40–150), contactDamage (8–20), xp (4–14), behavior, bossHp? (380–500, chỉ loài làm boss), ranged…: rangedDamage, rangedCooldownMs, rangedTelegraphMs, rangedProjectileSpeed, preferredRange, rangedTexture }.
  - behavior: `tank` (lì, chậm), `rusher` (lao vồ), `ranged` (bắn từ xa có báo hiệu), `burrow` (chui đất), `bomber` (lao tới tự nổ), `phantom` (Ma: xuyên vật cản, biến mất rồi hiện cạnh người chơi bắn; dùng rangedTexture 'shadowball'). **Không dùng 'boss'** (boss là lớp riêng, dùng `bossHp`).
- `src/entities/bossTypes.ts` → `BossPattern` (cho loài làm boss): type, dropTexture, ringTexture, ringCount 14–20, ringSpeed 160–210, glow, impact ('dust'|'bubble'|'bolt'|'flame'|'leaf'|'psy'|'poison'|'ice'|'shadow').
- `src/data/stages.ts` → `StageDef` (id, kind, name, area, x, y, label?, playable: true, biome, waves, gymId, catchable, levels, money, ballsFirstClear, parTimeS, itemFirstClear?, rival?). Ví dụ: chương 3 trong file.
- `src/data/trainers.ts` → `GymDef` (đọc gym 'vermilion' làm mẫu: intro/sendOut/winLines/afterLines tiếng Việt), `BadgeDef`. Tứ Thiên Vương dùng `GymDef` với `badgeId: ''`.
- `src/data/hazards.ts` → `HazardDef` ('pulse' | 'rain' | 'teleport' | 'ice' | 'darkness' | 'wind'), `Solid` (hidden = tường tàng hình), `ArenaLayout`.
- `src/art/chapters/types.ts` → `ArenaDef { draw(p: ArenaPainter), layout: ArenaLayout }`. ArenaPainter: W=640, H=360, set/disc/rect/hex/rng/noise, `paintBase(biome, props)` (forest/cave/beach/volcano/snow/blossom; props=true thì layout.solids phải gồm `BASE_PROP_SOLIDS` từ `src/art/arenaArt.ts` – chỉ import kiểu/hằng, không sửa file đó). Mẫu vẽ sân: `drawVermilionGym` trong `src/art/arenaArt.ts`. Sân phải có tường viền dày ~22px (inset 24) và **khớp vật cản với hình vẽ**.

## 3. Cân bằng
- `STAGE_TUNING` nhân máu địch ×3.8 và sát thương ×2.5 trong ải; gym ×3 máu. Đừng tự bù vào chỉ số.
- Ải thường: 4–5 đợt, mỗi đợt 6–9 con, đợt cuối có 1 con đầu đàn `A()`. Ải sự kiện: 3–4 đợt. Ải tinh anh: 4 đợt dày + 2 đầu đàn. Huyền thoại: `A('articuno', 50)` trong ải sự kiện, `catchRate: 15`.
- Tiền thưởng ải: chương 4 ~650–800, tăng ~120/chương; gym: 2400 → 5200; Liên đoàn 5000–6000; Nhà vô địch 10000.
- parTimeS: ải thường 120–140, sự kiện 100–120, tinh anh 160, gym/Liên đoàn 170–190.
- Loài học 3–4 chiêu (J, K từ Lv1; L, U mở dần); dạng tiến hóa giữ kit + chiêu U mạnh hơn. Mỗi loài phải có **cá tính riêng** (cơ chế khác nhau), đúng hệ.

## 4. Tài nguyên có sẵn
- Chiêu có sẵn (dùng lại thoải mái): ember thundershock razorLeaf waterGun stringShot poisonSting gust absorb rockThrow leechLife swift mudShot acid leechSeed waterPulse flameBurst payDay psybeam mudSlap sonicBoom peck furyAttack drillPeck wrap glare poisonFang karateChop lowKick crossChop headbutt hypnosis tackle scratch quickAttack hyperFang ironTail wingAttack flamethrower vineWhip bubbleBeam hornAttack hornDrill bite slash furyCutter doubleSlap bugBite fireFang supersonic rollout superFang thunderbolt thunder poisonPowder stunSpore confusion dig rapidSpin thunderWave magnitude earthquake selfDestruct harden minimize withdraw teleport metronome
- Icon chiêu (trường `icon`): heart star skull gym lock flame drop leaf bolt play crown sword fang claw wing shell spiral cloud shovel horn whirl wind rock seed note shield sparkle fist eye wave coin
- Texture đạn/hạt: fireball flamepuff zap zappuff leaf leafpuff bubble bubblepuff string needle wind windpuff seed poison poisonpuff dustpuff starshot mud psypuff psyball splash coinshot icepuff iceshard shadowball shadowpuff dragonflame dragonpuff bone petal sludge rockball boulder spark
- Âm (sfx): ember flame dash hit hurt pickup level warn boss win lose select zap thunder leaf whip water heal encounter badge talk super swap faint
- Huy hiệu (texture đã vẽ): badge-rainbow (Celadon), badge-soul (Fuchsia), badge-marsh (Saffron), badge-volcano (Cinnabar), badge-earth (Viridian).
- Đá tiến hóa (`item`): thunderStone moonStone fireStone waterStone leafStone. Phần thưởng `itemFirstClear` / `reward` dùng các id này.
- Bảng màu huấn luyện viên: thêm vào `trainerPalettes` (mẫu trong `src/art/townArt.ts`, TRAINER_PALETTES) cho thủ lĩnh của bạn.

## 5. Nút bản đồ (toạ độ trên bản đồ 640×360 — dùng đúng, theo đúng thứ tự)
Bản đồ tự khoét lối đi theo thứ tự nút. `label` chỉ đặt cho gym/địa danh lớn.

**CH4** (title 'Chương 4 · Lavender → Hội quán Celadon', badgesAtStart 3, Lv 27–33):
1. `ss-anne` kind 'rival', rival {tier: 1}, (580,226), name 'Tàu S.S. Anne', area 'Vermilion', biome 'ss-anne', money 1500, parTimeS 160, levels [28, 34]
2. `lavender-tower` kind 'elite', (572,196), label 'Lavender', biome 'pokemon-tower' (bóng tối) — Ma + Cubone/Marowak
3. `route8` kind 'stage', (548,206), biome 'blossom' hoặc sân riêng
4. `gym-celadon` kind 'gym', (505,206), label 'Celadon', biome 'gym-celadon', gymId 'celadon', badge `rainbow` 'Huy hiệu Cầu Vồng'. Erika: tangela 30, weepinbell 31, vileplume 33 (boss). reward leafStone 'Đá Lá'.

**CH5** (title 'Chương 5 · Đường Xe Đạp → Hội quán Fuchsia', badgesAtStart 4, Lv 31–38):
1. `rocket-hideout` 'event' (483,210) biome 'rocket-hideout', itemFirstClear fireStone 'Đá Lửa'
2. `cycling-road` 'stage' (462,214) biome 'cycling-road' (gió giật)
3. `snorlax-route` 'event' (441,218) — Snorlax đầu đàn chặn đường
4. `safari-zone` 'elite' (420,222) biome 'safari' — Eevee hiếm, Scyther/Pinsir đầu đàn
5. `route15` 'stage' (396,223)
6. `gym-fuchsia` 'gym' (372,224) label 'Fuchsia', biome 'gym-fuchsia' (tường tàng hình + mưa độc), gymId 'fuchsia', badge `soul` 'Huy hiệu Linh Hồn'. Kyo: koffing 36, muk 37, koffing 37, weezing 39 (boss). reward waterStone 'Đá Nước'.

**CH6** (title 'Chương 6 · Silph → Hội quán Saffron', badgesAtStart 5, Lv 36–43):
1. `silph-rival` 'rival' rival {tier: 2} (349,221) name 'Silph – Đụng độ Shigeru', biome 'silph-office', money 2200
2. `silph-co` 'stage' (326,218) biome 'silph-office' (ô dịch chuyển) — lính Hỏa Tiễn
3. `fighting-dojo` 'elite' (303,214) biome 'dojo'
4. `gym-saffron` 'gym' (280,210) label 'Saffron', biome 'gym-saffron' (ô dịch chuyển + sóng siêu linh), gymId 'saffron', badge `marsh` 'Huy hiệu Đầm Lầy'. Natsume: kadabra 41, mrmime 42, alakazam 44 (boss).

**CH7** (title 'Chương 7 · Biển Seafoam → Hội quán Cinnabar', badgesAtStart 6, Lv 41–49):
1. `sea-route` 'stage' (272,234) biome 'sea-route'
2. `seafoam` 'event' (252,244) biome 'seafoam' (băng trơn) — Articuno A Lv50, itemFirstClear waterStone
3. `cinnabar-mansion` 'elite' (236,228) biome 'mansion'
4. `gym-cinnabar` 'gym' (236,204) label 'Cinnabar', biome 'gym-cinnabar' (miệng lửa phun), gymId 'cinnabar', badge `volcano` 'Huy hiệu Núi Lửa'. Katsura: growlithe 46, ponyta 46, rapidash 47, arcanine 49 (boss). reward fireStone.

**CH8** (title 'Chương 8 · Nhà máy điện → Hội quán Viridian', badgesAtStart 7, Lv 46–55):
1. `power-plant` 'event' (216,184) biome 'power-plant' — Zapdos A Lv50
2. `route22` 'stage' (206,212)
3. `gym-viridian` 'gym' (190,200) label 'Viridian', biome 'gym-viridian' (mưa đá + cát lún), gymId 'viridian', badge `earth` 'Huy hiệu Đất'. Sakaki: dugtrio 50, nidoqueen 51, nidoking 52, rhydon 55 (boss).

**LEAGUE** (title 'Liên đoàn Indigo · Đường Chiến Thắng → Nhà vô địch', badgesAtStart 8, Lv 50–63):
1. `vr-rival` 'rival' {tier: 3} (165,199) name 'Cổng Đường Chiến Thắng', biome 'victory-road'
2. `victory-road-1` 'stage' (140,198) label 'Đường Chiến Thắng'
3. `victory-road-2` 'stage' (118,183)
4. `moltres-peak` 'event' (96,168) — Moltres A Lv55
5. `victory-road-3` 'stage' (94,148)
6. `victory-road-elite` 'elite' (92,128)
7. `indigo-plateau` 'event' (94,105) label 'Cao nguyên Indigo'
8. `e4-kanna` 'league' (136,66) label 'Sảnh Pha Lê', gymId 'kanna', biome 'e4-kanna' (sàn băng + mưa băng): dewgong 56, cloyster 56, jynx 57, lapras 59 (boss)
9. `e4-shiba` 'league' (248,64) label 'Sảnh Đá', gymId 'shiba', biome 'e4-shiba' (mưa đá): onix 56, hitmonchan 57, hitmonlee 57, machamp 59 (boss)
10. `e4-kikuko` 'league' (360,64) label 'Sảnh U Linh', gymId 'kikuko', biome 'e4-kikuko' (bóng tối + mưa bóng ma): gengar 57, golbat 57, haunter 58, arbok 58, gengar 61 (boss)
11. `e4-wataru` 'league' (472,66) label 'Sảnh Rồng', gymId 'wataru', biome 'e4-wataru' (gió giật): gyarados 58, dragonair 58, dragonair 58, aerodactyl 59, dragonite 62 (boss)
12. `champion` kind 'champion', rival {tier: 5} (590,58) label 'Nhà vô địch', biome 'champion-hall', money 10000
13. `cerulean-cave` 'event' (612,96) label 'Hang Cerulean', biome 'cerulean-cave' — sau Nhà vô địch: Mewtwo A Lv70 (catchRate 10), địch Lv 60–66

Trận đối thủ (kind 'rival'/'champion'): KHÔNG có waves/gymId; engine tự dựng đội Shigeru từ `rival.tier`. Cần biome + levels (ước lượng) + money + parTimeS.

## 6. Bẫy gợi ý theo sân
- Celadon: 'pulse' bồn hoa phun bào tử (spore, grass, damagePct 0.04, slowMs 1800, 3 nhóm).
- Pokémon Tower: 'darkness' radius 150. Fuchsia: tường hidden (mê cung thưa, chừa lối rộng ≥70px) + 'rain' độc (poison 0.06, slowMs 800).
- Silph/Saffron: 'teleport' 2–3 cặp ô (to = chỉ số ô đích, bán kính 14) + Saffron 'pulse' psychic 0.08.
- Seafoam: 'ice' vài vùng; Kanna: 'ice' toàn sân + 'rain' ice. Cinnabar/Mansion: 'rain' flame 0.1. Power plant: 'pulse' lightning. Viridian: 'rain' rock 0.09 + slowZones cát.
- Kikuko: 'darkness' 130 + 'rain' shadow. Wataru: 'wind' force 260. Cycling road: 'wind' 200. Shiba: 'rain' rock.
- Giữ bẫy vừa phải: periodMs ≥ 2600, warnMs ≥ 800.

## 7. Phân công (file + loài sở hữu)
| Module | File được ghi | Loài sở hữu (species + enemyStats) | Boss phải có bossHp + bossPattern |
|---|---|---|---|
| evo | src/data/chapters/evo.ts | venusaur charizard blastoise butterfree beedrill pidgeot golduck graveler golem persian primeape kadabra alakazam weepinbell victreebel vileplume parasect electrode magneton hypno | vileplume, alakazam (venusaur/charizard/blastoise: chỉ cần bossHp, pattern đã có) |
| ch4 | src/data/chapters/ch4.ts, src/art/chapters/ch4.ts | gastly haunter gengar cubone marowak growlithe arcanine vulpix ninetales tangela | gengar, arcanine |
| ch5 | src/data/chapters/ch5.ts, src/art/chapters/ch5.ts | koffing weezing grimer muk doduo dodrio tauros snorlax kangaskhan scyther pinsir chansey exeggcute exeggutor venonat venomoth nidoranf nidorina nidoqueen nidoranm nidorino nidoking eevee vaporeon jolteon flareon | weezing |
| ch6 | src/data/chapters/ch6.ts, src/art/chapters/ch6.ts | mrmime slowpoke slowbro machop machoke machamp hitmonlee hitmonchan ditto | machamp |
| ch7 | src/data/chapters/ch7.ts, src/art/chapters/ch7.ts | seel dewgong shellder cloyster horsea seadra krabby kingler tentacool tentacruel jynx ponyta rapidash magmar articuno poliwag poliwhirl poliwrath | — |
| ch8 | src/data/chapters/ch8.ts, src/art/chapters/ch8.ts | rhyhorn rhydon zapdos | rhydon |
| league | src/data/chapters/league.ts, src/art/chapters/league.ts | magikarp gyarados dratini dragonair dragonite aerodactyl lapras moltres mewtwo | lapras, dragonite |

Loài của module khác vẫn được dùng trong waves/gym (id ở bảng trên + loài chương 1–3 trong `src/data/pokemon.ts`). Tiến hóa: Eevee dùng `evolutions` (waterStone→vaporeon, thunderStone→jolteon, fireStone→flareon); growlithe/vulpix (fireStone), shellder (waterStone), exeggcute (leafStone), nidorina/nidorino (moonStone), các loài khác theo cấp.
