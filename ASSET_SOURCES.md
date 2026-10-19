# Nguồn asset

Tài liệu này ghi lại nguồn gốc, tình trạng quyền sử dụng và nơi dùng của mọi asset trong demo.

## 1. Sprite Pokémon có animation: CHƯA ĐƯỢC PHÉP PHÁT HÀNH, chỉ dùng cho demo nội bộ

Mỗi loài nằm trong một thư mục `public/assets/pokemon/<loài>/`, gồm các sheet Walk, Idle, Attack, Charge/Shoot, Hurt, Faint và `credits.txt` gốc. Nguồn: `https://github.com/PMDCollab/SpriteCollab/tree/master/sprite/<số dex>`.

| Loài (số dex) | Dùng ở đâu |
|---|---|
| Pikachu (0025), Raichu (0026) | Bạn đồng hành; Pikachu hoang dã ở ải sự kiện; Raichu là dạng tiến hóa bằng Đá Sấm |
| Bulbasaur (0001), Ivysaur (0002) | Starter và dạng tiến hóa Lv 16 |
| Charmander (0004), Charmeleon (0005) | Starter và dạng tiến hóa Lv 16; chế độ Sinh tồn |
| Squirtle (0007), Wartortle (0008) | Starter và dạng tiến hóa Lv 16 |
| Caterpie (0010), Metapod (0011), Weedle (0013), Kakuna (0014) | Hoang dã ở Rừng Viridian; tiến hóa Lv 7 |
| Pidgey (0016), Pidgeotto (0017), Rattata (0019), Raticate (0020) | Hoang dã ở Đường 1 / Rừng |
| Oddish (0043), Gloom (0044) | Hoang dã ở Rừng / ải tinh anh |
| Geodude (0074), Onix (0095) | Hội quán Pewter; Sinh tồn; Geodude cũng ở Núi Moon |
| Zubat (0041), Golbat (0042), Paras (0046), Clefairy (0035), Sandshrew (0027), Sandslash (0028) | Hoang dã ở Núi Moon (chương 2) |
| Psyduck (0054), Goldeen (0118), Staryu (0120) | Hoang dã ở Đường 4; Goldeen và Staryu cũng ở Hội quán Cerulean |
| Starmie (0121) | Pokémon chủ lực của Kasumi (Hội quán Cerulean) |
| Clefable (0036) | Dạng tiến hóa của Clefairy bằng Đá Trăng |
| Spearow (0021), Fearow (0022), Ekans (0023), Arbok (0024), Meowth (0052), Mankey (0056), Bellsprout (0069) | Hoang dã ở Cầu Vàng / Đường 6 (chương 3) |
| Abra (0063), Drowzee (0096) | Ải Nhà Bill, Đường 6 |
| Diglett (0050), Dugtrio (0051) | Hang Diglett |
| Voltorb (0100), Magnemite (0081) | Đường 6; đội của Matis (Hội quán Vermilion) |

- **Kho nguồn:** PMDCollab SpriteCollab (https://github.com/PMDCollab/SpriteCollab), tải ngày 2026-10-16, nhánh `master`. Mỗi thư mục có `credits.txt` gốc. Kích thước khung và thời lượng từng khung được chép từ `AnimData.xml` sang `src/data/spriteSheets.ts`.
- **Định dạng:** mỗi `*-Anim.png` gồm 8 hàng hướng (Xuống, Xuống-phải, Phải, Lên-phải, Lên, Lên-trái, Trái, Xuống-trái) × N khung hình. Thời lượng tính theo tick 1/60 giây.
- **Tác giả:** theo `credits.txt`, các sprite này ghi nhận **CHUNSOFT**, nghĩa là được trích từ game Pokémon Mystery Dungeon chính thức.
- **Tình trạng quyền:** README của SpriteCollab áp dụng CC BY-NC 4.0 cho các bài đóng góp (phi thương mại, phải ghi công). Tuy vậy, sprite trích từ game gốc và nhân vật Pokémon vẫn là **IP của Nintendo / The Pokémon Company / Spike Chunsoft**, và giấy phép của kho không cấp quyền dùng thương hiệu Pokémon.
- **Kết luận:** chỉ dùng để thử cảm giác chơi trong nội bộ; không phát hành công khai, không dùng thương mại. Trước khi phát hành phải thay bằng nhân vật và hình gốc tự sáng tác.
- **Không hotlink:** mọi file đã lưu trong project; game không tải gì từ Internet khi chơi.
- **Tên nhân vật:** Satoshi, Takeshi, Kasumi, Matis, Bill, Joy, Giáo sư Okido, Shigeru cùng các địa danh (Pallet, Viridian, Pewter, Núi Moon, Cerulean, Vermilion, Indigo) là tên trong anime/game Pokémon, tức IP của bên thứ ba. Hình người trong game do dự án tự vẽ bằng code (xem mục 3), không lấy từ game gốc.
- **Thay thế bản trước:** các ảnh tĩnh từ PokeAPI/sprites (`charmander.png`, `geodude.png`…, ghi chú "Copyright The Pokémon Company") đã bị xóa khỏi project và không còn được dùng.

Chương 4 → Liên đoàn bổ sung 95 loài (cùng nguồn, cùng điều kiện ở trên), mỗi loài một thư mục `public/assets/pokemon/<loài>/` kèm `credits.txt` gốc: Venusaur, Charizard, Blastoise, Butterfree, Beedrill, Pidgeot, Nidoran♀/♂ và các dạng tiến hóa, Vulpix, Ninetales, Vileplume, Parasect, Venonat, Venomoth, Persian, Golduck, Primeape, Growlithe, Arcanine, Poliwag/Poliwhirl/Poliwrath, Kadabra, Alakazam, Machop/Machoke/Machamp, Weepinbell, Victreebel, Tentacool, Tentacruel, Graveler, Golem, Ponyta, Rapidash, Slowpoke, Slowbro, Magneton, Doduo, Dodrio, Seel, Dewgong, Grimer, Muk, Shellder, Cloyster, Gastly, Haunter, Gengar, Hypno, Krabby, Kingler, Electrode, Exeggcute, Exeggutor, Cubone, Marowak, Hitmonlee, Hitmonchan, Koffing, Weezing, Rhyhorn, Rhydon, Chansey, Tangela, Kangaskhan, Horsea, Seadra, Mr. Mime, Scyther, Jynx, Magmar, Pinsir, Tauros, Magikarp, Gyarados, Lapras, Ditto, Eevee, Vaporeon, Jolteon, Flareon, Aerodactyl, Snorlax, Articuno, Zapdos, Moltres, Dratini, Dragonair, Dragonite, Mewtwo. Lúc khởi động game chỉ nạp sheet Đi + Đứng; các sheet hành động nạp khi vào trận có loài đó (`src/systems/spriteLoader.ts`).

## 2. Hình dự phòng (placeholder): tự tạo bằng code

- `src/art/textures.ts` → `generateFallbackPokemon()`: khối tròn có mắt, tô màu theo loài, có dấu "?" ở góc. Không có animation; chuyển động được thay bằng nhún người.
- Tự động dùng khi sheet `Walk` của một loài tải lỗi. Nếu chỉ thiếu sheet phụ (Attack, Hurt…), loài đó bỏ qua animation tương ứng. Menu sẽ ghi dòng "Thiếu asset, đang dùng hình dự phòng…".
- Có thể giả lập lỗi tải bằng `?noassets` trên URL.

## 3. Môi trường, hiệu ứng, UI: tự tạo bằng code (thuộc dự án)

Sân đấu chương 4 → Liên đoàn (`src/art/chapters/*.ts`) và nội thất Trung tâm Pokémon (`src/art/centerArt.ts`) cũng vẽ từng pixel bằng code.

Tất cả được vẽ từng pixel bằng Canvas lúc khởi động trong `src/art/textures.ts` và `src/art/townArt.ts`. Không có file ảnh ngoài.

| Texture key | Mô tả | Dùng ở đâu |
|---|---|---|
| `tiles` | 12 ô 16×16: cỏ (3 biến thể), cỏ có hoa, cỏ đậm, đất (3 biến thể), bụi cỏ cao, đường lát đá, nước, sàn hội quán | Tilemap bản đồ vùng, đấu trường, nền menu |
| `house`, `lab`, `pokecenter`, `gym`, `gate`, `sign`, `fence` | Công trình của bản đồ đi bộ cũ | Hiện không dùng (giữ lại cho cảnh trong thành phố sau này) |
| `trainer-satoshi`, `trainer-takeshi`, `trainer-joy`, `trainer-oak` | Người 16×24, 4 hướng × 3 khung đi bộ (cùng một hàm vẽ, khác bảng màu) | Satoshi, NPC, menu |
| `zap`, `leaf`, `bubble` + `zappuff`, `leafpuff`, `bubblepuff` | Đạn và hạt hiệu ứng hệ Điện / Cỏ / Nước | Chiêu của Pikachu, Bulbasaur, Squirtle |
| `badge-boulder`, `badge-cascade`, `badge-thunder`, `badge-empty` | Huy hiệu Đá, Thác Nước, Sấm, ô huy hiệu trống | Bản đồ ải, màn hình chính, kết quả hội quán |
| `starshot`, `mud`, `psypuff`, `splash`, `coinshot`, `psyball` | Đạn ngôi sao (Swift), đạn bùn, hạt siêu linh, bọt nước bắn | Chiêu của Staryu/Starmie, Sandshrew, Psyduck/Clefairy, bể nước Cerulean, đồng xu Ném Xu, cầu siêu linh của Abra/Drowzee |
| `string`, `needle`, `wind`, `seed`, `poisonpuff`, `windpuff`, `dustpuff`, `shield`, `dizzy` | Đạn/hạt của Nhả Tơ, Kim Độc, Gió Xoáy, Hút Năng Lượng; khiên cường hóa; sao choáng | Chiêu và thu phục |
| `map-kanto` (`art/regionMapArt.ts`) | Bản đồ vùng Kanto 640×360 sinh từ noise | Màn bản đồ ải |
| `arena-*` (`art/arenaArt.ts`) | Sân đấu theo biome (rừng, hang, biển, núi lửa, tuyết, rừng hoa) , sàn Hội quán Pewter, Cerulean (bể nước) và Vermilion (sàn thép, tấm điện) | Trận đấu |
| `title-bg` (`art/titleArt.ts`) | Cảnh hoàng hôn Kanto | Màn hình chính |
| `tree`, `pine` | Cây tròn, cây thông | Vật cản (chỉ gốc cây chặn đường) |
| `rock`, `rock_big` | Đá nhỏ, đá lớn | Vật cản |
| `bush`, `tallgrass` | Bụi cây, cỏ cao | Trang trí, không va chạm |
| `fireball`, `flamepuff`, `spark` | Viên lửa, hạt lửa, tia sáng | Chiêu J/K, hiệu ứng trúng đòn |
| `poison`, `rockball`, `boulder` | Đạn độc, đạn đá, tảng đá rơi | Đòn của Oddish và Onix |
| `xp` | Viên kinh nghiệm | Rơi ra khi hạ địch |
| `shadow`, `arrow`, `pixel` | Bóng, mũi tên hướng bắn, hạt bụi | Nhân vật và hiệu ứng |
| `reticle` | Vòng ngắm 4 góc | Đánh dấu mục tiêu tự ngắm |

UI (khung, thanh máu/EXP, ô chiêu, nút) được vẽ bằng Phaser Graphics. Chữ dùng font pixel, xem mục 4.

## 4. Font chữ pixel

| File | Font | Nguồn | Giấy phép | Dùng ở đâu |
|---|---|---|---|---|
| `public/assets/fonts/Galmuri11.woff2` | Galmuri11 (lưới 12px) | https://github.com/quiple/galmuri (npm `galmuri` 2.40.3) | SIL OFL 1.1, không khai báo Reserved Font Name (`Galmuri-OFL.md`) | Toàn bộ chữ giao diện |
| `public/assets/fonts/Galmuri9.woff2` | Galmuri9 (lưới 10px) | như trên | như trên | Chữ nhỏ, số sát thương |
| `public/assets/fonts/PixelifySans-Pokeke.ttf` | Pixelify Sans (lưới 11px), bản sửa đổi | https://github.com/eifetx/Pixelify-Sans (Google Fonts) | SIL OFL 1.1, không khai báo Reserved Font Name (`PixelifySans-OFL.txt`) | Toàn bộ chữ giao diện khi chọn **English** (mặc định) |
| `public/assets/fonts/PressStart2P-Regular.ttf` | Press Start 2P | https://github.com/google/fonts/tree/main/ofl/pressstart2p | SIL OFL 1.1, **có** Reserved Font Name (`PressStart2P-OFL.txt`) | Chỉ logo "POKEKE" (không có dấu tiếng Việt) |

- Galmuri được **cắt bớt** chỉ còn Latin + tiếng Việt + ký hiệu (khoảng 20 KB mỗi file thay vì 5 MB). OFL cho phép vì font không khai báo Reserved Font Name.
- Pixelify Sans được **sửa đổi** (đổi tên họ font thành "Pixelify Sans Pokeke"): vẽ lại số 5 trên lưới pixel (bản gốc trông giống chữ S) và tắt ligature `liga`/`dlig` (bản gốc ghép "fi" sai thành "A"). Pixelify thiếu dấu tiếng Việt nên tiếng Việt vẫn dùng Galmuri.
- Press Start 2P giữ **nguyên file gốc, không chỉnh sửa**, vì font này có Reserved Font Name.
- Cỡ chữ được làm tròn về bội số của lưới pixel (12/24/36… và 10/20/30) để nét sắc, xem `pixelFont()` trong `src/ui/style.ts`.

## 5. Icon pixel: tự tạo bằng code

`src/art/icons.ts` gồm khoảng 50 icon 16×16 (đồng xu, Poké Ball, tim, sao, đầu lâu, hội quán, ổ khóa, đồng hồ, loa, bánh răng, sách, cúp, huy chương, biểu tượng hệ…, cùng 18 icon chiêu thức: nanh, vuốt, cánh, mai, xoắn siêu linh, mây, xẻng, sừng, lốc, gió, đá, hạt giống, nốt nhạc, sóng, khiên, lấp lánh, nắm đấm, con mắt). Mỗi icon được vẽ bằng bản đồ ký tự rồi tự thêm viền tối 1px cho đồng bộ. Không dùng emoji hay ảnh ngoài.

## 6. Âm thanh và nhạc nền: tự tổng hợp bằng code

Nhạc nền (`src/systems/music.ts`): 9 bài chiptune **tự sáng tác** cho dự án, phát bằng WebAudio (không có file âm thanh, không mô phỏng giai điệu của game gốc).

`src/systems/sfx.ts` tạo mọi hiệu ứng âm thanh bằng WebAudio oscillator. Không có file âm thanh.

## 7. Đã cân nhắc nhưng không dùng

- **Kenney Tiny Town** (https://kenney.nl/assets/tiny-town, CC0): phù hợp về giấy phép, nhưng chưa tải về. Tile tự vẽ đủ cho demo và giữ được bảng màu thống nhất (xanh rừng, đất nâu, điểm nhấn cam lửa). Nếu muốn đổi sang Kenney sau này, chỉ cần thay texture `tiles` và cập nhật bảng trên.
- **poke-survivor.io:** chỉ tham khảo phong cách nhìn từ trên xuống. Không lấy source, âm thanh hay asset nào từ game này.
