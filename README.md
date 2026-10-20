# Pokeke – Hành trình của Satoshi (bản thử nghiệm)

Game Pokémon pixel nhìn từ trên xuống, chạy trên trình duyệt, chơi theo kiểu **bản đồ ải**: vượt từng ải để cày cấp và thu phục Pokémon, cứ vài ải lại đấu một Hội quán để lấy huy hiệu, đủ huy hiệu thì vào Liên đoàn. Trận đấu diễn ra theo thời gian thực: dùng WASD để di chuyển, chiêu tự khóa vào đối thủ.

> **Fan-game miễn phí, phi thương mại.** Pokeke không chính thức, không liên kết với Nintendo / Game Freak / Creatures / The Pokémon Company / Spike Chunsoft; Pokémon và các tên, nhân vật liên quan là (C) chủ sở hữu tương ứng.
> Sprite Pokémon lấy từ [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab) (trích từ Pokémon Mystery Dungeon, CC BY-NC 4.0, ghi công theo `credits.txt` từng loài). Phông chữ theo SIL OFL 1.1. Phần còn lại (bản đồ, hiệu ứng, UI, nhạc, âm thanh) tự làm bằng code. Chi tiết nguồn: [ASSET_SOURCES.md](ASSET_SOURCES.md); trong game: nút ✦ ở góc phải màn hình chính ("Giới thiệu & Ghi công").
> Vui lòng **không bán, không kiếm tiền, không phân phối lại**. Nếu bạn là chủ sở hữu quyền và muốn gỡ nội dung nào, hãy mở issue.

## Cài đặt và chạy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # kiểm tra type rồi build ra dist/
npm run typecheck  # chỉ kiểm tra type
npm run preview    # chạy thử bản build
```

Game chạy hoàn toàn trên trình duyệt, không cần backend, và lưu tiến trình bằng `localStorage`. Nếu trình duyệt chặn `localStorage`, game vẫn chơi được nhưng không lưu lại.

## Vòng chơi (trọn Kanto: 8 hội quán → Liên đoàn)

```
Menu → Chọn vùng (Kanto) → Phòng lab: chọn **1 trong 4** con khởi đầu (Pikachu / Bulbasaur / Charmander / Squirtle, Lv 6). Đối thủ Shigeru chọn con khắc chế (Pikachu → Eevee/Jolteon)
  → BẢN ĐỒ ẢI KANTO
      Pallet (Trung tâm Pokémon) → Đường 1 (2 ải) → Rừng Viridian (2 ải + ★ sự kiện + 💀 tinh anh)
      → 🏛 Hội quán Pewter (Takeshi: Geodude Lv12, Geodude Lv13 → Onix Lv15) → Huy hiệu Đá
      → Núi Moon (2 ải + 💀 tinh anh) → Đường 4 (1 ải + ★ sự kiện)
      → 🏛 Hội quán Cerulean (Kasumi: Goldeen Lv19, Staryu Lv20 → Starmie Lv22) → Huy hiệu Thác + Đá Sấm
      → Cầu Vàng → ★ Nhà Bill (thưởng Đá Trăng) → 💀 Hang Diglett → Đường 6
      → 🏛 Hội quán Vermilion (Matis: Voltorb Lv25, Magnemite Lv26 → Raichu Lv29) → Huy hiệu Sấm
      → ⚔ Tàu S.S. Anne (Shigeru) → 💀 Tháp Lavender → Đường 8 → 🏛 Celadon (Erika) → Huy hiệu Cầu Vồng
      → ★ Hang ổ Hỏa Tiễn → Đường Xe Đạp → ★ Snorlax → 💀 Safari → Đường 15 → 🏛 Fuchsia (Kyo) → Huy hiệu Linh Hồn
      → ⚔ Silph (Shigeru) → Silph → 💀 Võ đường → 🏛 Saffron (Natsume) → Huy hiệu Đầm Lầy
      → Đường biển → ★ Seafoam (Articuno) → 💀 Dinh thự Cinnabar → 🏛 Cinnabar (Katsura) → Huy hiệu Núi Lửa
      → ★ Nhà máy điện (Zapdos) → Đường 22 → 🏛 Viridian (Sakaki) → Huy hiệu Đất
      → ⚔ Cổng Đường Chiến Thắng (Shigeru) → Đường Chiến Thắng (Moltres) → Cao nguyên Indigo
      → 👑 Tứ Thiên Vương: Kanna (Băng) → Shiba (Giác Đấu) → Kikuko (Ma) → Wataru (Rồng)
      → 🏆 Nhà vô địch: Shigeru → ★ Hang Cerulean (Mewtwo, sau khi vô địch)
  Mỗi ải: Chuẩn bị đội (tối đa 3) → trận đấu theo đợt → kết quả (sao, tiền, EXP, Pokémon bắt được) → tiến hóa
```

| Hệ thống | Cách hoạt động |
|---|---|
| **Đội hình** | Mang tối đa 3 Pokémon, mỗi lúc 1 con trên sân. Đổi bằng **1/2/3** (hồi 3 giây). Con trên sân gục thì tự đổi sang con còn lại. Các con khác nằm trong **Hộp**. |
| **Lên cấp** | Hạ địch rơi viên EXP: con trên sân nhận 100%, con dự bị nhận 50%. **Giới hạn cấp** theo huy hiệu: 0 huy hiệu tối đa Lv 15, 1 huy hiệu Lv 20… |
| **Chiêu** | Mỗi loài có tối đa 4 ô chiêu **J / K / L / U**, mở dần theo cấp. Mỗi chiêu có **cơ chế riêng**: đạn xuyên, boomerang (Lá Sắc), tự đuổi (Sao Băng), nảy điện (Điện Giật, Sấm Sét), nổ vùng (Bùng Lửa, Sóng Nước), lao tới (Tấn Công Nhanh, Húc Sừng), đánh liên hoàn (Cào, Tát Liên Hoàn), roi quất thẳng (Roi Dây Leo), mây độc/bào tử tại chỗ địch, chui đất (Đào Đất), xoay tít (Xoay Tốc Độ), phản đòn (Thủ Mai), né (Thu Nhỏ), cắt nửa máu (Siêu Nanh), chiêu ngẫu nhiên (Phẩy Ngón Tay), nhặt tiền (Ném Xu), dịch chuyển (Dịch Chuyển), sát thương cố định (Sóng Âm), cường độ ngẫu nhiên (Cường Độ), tự nổ mất máu (Tự Nổ), thôi miên (Thôi Miên). Mô tả từng chiêu xem ở màn Đội hình. |
| **Trạng thái** | **Bỏng** / **Nhiễm độc**: mất máu mỗi 0,5 giây · **Hạt hút máu**: mất máu và hồi cho bạn · **Tê liệt**: đứng im · **Ngủ**: đứng im, đòn đầu tiên đánh thức và gây ×1,5 · **Rối loạn**: đi lung tung, không tấn công. Boss không bị Tê liệt / Ngủ / Rối loạn mà chỉ bị chậm. |
| **Nâng cấp chiêu** | Ở màn **Đội hình**, mỗi Pokémon nâng riêng từng ô chiêu bằng tiền, tối đa +5 (nút "Nâng" hoặc phím **1–4**). Mỗi cấp: +14% sát thương, −5% hồi chiêu. **+3** và **+5** mở hiệu ứng riêng của chiêu (vd. nảy thêm 1 địch, thêm 1 viên đạn, mây rộng hơn, +15% tỉ lệ Bỏng…). Giá 200 → 2.000₽ mỗi cấp, ô L/U đắt hơn. Giữ nguyên khi tiến hóa. |
| **Thu phục** | Đánh Pokémon hoang dã xuống dưới 25% máu, nó sẽ **choáng** 4,5 giây (có sao xoay). Lại gần bấm **E** để ném bóng; bóng lắc 1–3 lần rồi bắt được hoặc thoát. Tỷ lệ phụ thuộc loài, máu còn lại và loại bóng. Pokémon của thủ lĩnh không bắt được. |
| **Tiến hóa** | Theo cấp, xảy ra sau trận, có thể **hủy** (B/Esc). Ví dụ: Caterpie/Weedle Lv 7, Pidgey Lv 18, các starter Lv 16 (tức sau khi có huy hiệu). Pikachu cần Đá Sấm (thưởng của Hội quán Cerulean), Clefairy cần Đá Trăng (thưởng ải Nhà Bill). |
| **Sao** | ★ thắng · ★ không con nào gục · ★ thắng trong thời gian chuẩn. Sao làm tăng tiền thưởng; lần đầu thắng thưởng ×1,5. |
| **Tiền** | Dùng để nâng cấp chiêu, mua Poké Ball (200₽) và Great Ball (600₽, cần 1 huy hiệu) ở Trung tâm Pokémon. Con nào **gục ở hội quán** sẽ bị thương, phải trả **30₽ × cấp** để chăm sóc. Ở ải thường, cả đội tự hồi đầy sau trận. |
| **Khắc hệ** | Bảng hệ trong `src/data/types.ts` (có thêm hệ Siêu Linh và Giác Đấu). Đòn rất hiệu quả hiện chữ vàng. |
| **Độ khó** | Địch trong ải trâu và đánh đau hơn nhiều so với Sinh tồn, EXP mỗi con ít hơn, và đợt sau kéo tới khi đợt trước còn 2 con. Mỗi ải có **con đầu đàn** (vương miện, to, máu ×4, khó bắt hơn). Hội quán: Pokémon thủ lĩnh trâu thêm ×1,5. Số liệu nằm ở `STAGE_TUNING` trong `config/balance.ts`. |
| **Thuốc hồi máu** | Bấm **F** để hồi 50% máu cho con trên sân (hồi chiêu 4 giây). Bắt đầu với 2 lọ, mua thêm ở Trung tâm Pokémon (300₽). |
| **Tuyệt chiêu (I)** | Chỉ mở khi **đã tiến hóa**: dạng gốc của một dòng tiến hóa (Pikachu, Charmander, Caterpie...) bị khóa; loài không tiến hóa (Snorlax, Lapras, huyền thoại) luôn có. Mỗi Pokémon có thanh năng lượng (ô vàng cuối thanh chiêu), đầy dần khi đánh trúng, hạ địch, bị đánh và khi liên hoàn. Đầy thì bấm **I**: cảnh cắt + đòn toàn sân theo hệ (Bão Sét Vạn Vôn, Mưa Thiên Thạch Lửa, Đại Hồng Thủy, Kỷ Băng Hà, Long Tinh Quần...). |
| **Chỉ số** | Máu · Tấn công · Phòng thủ · Tốc độ · Chí mạng (×1,5) · Hồi chiêu · Hồi máu (`src/data/stats.ts`). Tiến hóa: chỉ số gốc đổi theo loài mới, cấp / nâng chiêu / huấn luyện giữ nguyên. |
| **Huấn luyện** | Màn Đội hình → thẻ Huấn luyện: 8 dòng (Vitality, Strength, Armor, Stride, Reflexes, Synthesis, Critical, Wisdom) mua bằng tiền; cấp tối đa mở dần theo số huy hiệu. Nâng chiêu cũng giới hạn 1 + số huy hiệu. |
| **EXP** | Chỉ Pokémon **đang ra sân** nhận EXP. |
| **Hội quán** | Mở màn: thủ lĩnh chào → ném bóng ra Pokémon → bạn chọn Pokémon và ném ra (Esc bỏ qua). Pokémon thủ lĩnh ngang giới hạn cấp, con chủ lực cao hơn 3–4 cấp, máu ×5, sát thương ×1,35; dưới 40% máu thì **nổi giận**. Tối đa 2 bình thuốc mỗi trận. |
| **Tiền** | Đánh lại ải đã qua chỉ được ~30% tiền. |
| **Liên hoàn** | Dùng các chiêu **khác ô** nối tiếp trong 1,5 giây (vd. J → K → L → U): mỗi bậc +10% sát thương (tối đa +40%), từ ×3 còn nạp thêm tuyệt chiêu. Chiêu L/U hiện tên lớn và rung máy quay. |
| **Trung tâm Pokémon** | Bước vào bên trong: Pokémon bị thương nằm trên giường (bấm giường để chữa, **H** chữa tất cả), quầy Poké Mart bán bóng / thuốc. |
| **Đối thủ Shigeru** | 4 trận (S.S. Anne, Silph, Cổng Đường Chiến Thắng, Nhà vô địch). Shigeru chọn starter khắc chế starter của bạn, đội lớn dần theo bậc, cấp độ bám theo cấp trung bình đội bạn. |
| **Pokédex** | Bản đồ → **Pokédex (P)**: loài đã gặp / đã bắt, chỉ số, bộ chiêu, tiến hóa, nơi gặp. Bắt đủ 10 / 20 / 30 / 45 / 60 / 80 / 100 loài để nhận thưởng (bóng, đá tiến hóa, tiền). |
| **Nhạc nền** | 9 bài chiptune tự sáng tác bằng WebAudio (màn chính, bản đồ, trận, hội quán, Liên đoàn, Nhà vô địch, chiến thắng, tiến hóa, Pokédex). Phím **M** tắt/bật mọi âm thanh. |
| **Sân & bẫy** | Mỗi hội quán / Tứ Thiên Vương có bẫy riêng: sàn điện, bào tử, tường tàng hình + khí độc, ô dịch chuyển, sàn băng trơn, miệng lửa, đá rơi, bóng tối, gió giật. Ô sáng màu là sắp kích hoạt. |
| **Huyền thoại** | Articuno, Zapdos, Moltres (con đầu đàn ở ải sự kiện), Mewtwo ở Hang Cerulean sau khi vô địch. Dùng **Q** để ném bóng tốt nhất; Ultra Ball bán ở Trung tâm khi có 5 huy hiệu. |
| **Hội quán Vermilion** | Sàn có 6 tấm đồng chia 2 nhóm: nhóm nào sáng vàng 0,9 giây là sắp phóng điện (10% máu, hệ Nước/Bay chịu gấp đôi, hệ Đất gần như miễn nhiễm, đang Đào Đất thì né được). Voltorb của Matis tự nổ khi còn dưới nửa máu. Raichu dùng sét giáng, vòng tia điện và lao điện. |
| **Địch mới (chương 3)** | Diglett/Dugtrio **chui đất** rồi trồi lên dưới chân (vòng đỏ báo trước), lúc dưới đất không đánh được. Voltorb hoang dã **lao tới tự nổ**. Abra, Drowzee, Magnemite bắn từ xa. |
| **Hội quán Cerulean** | Bể nước giữa sân làm chậm Pokémon không phải hệ Nước. Starmie có bộ chiêu riêng: sao xoay vòng, lao tới, vòng nước. Thắng được **Đá Sấm**: vào Đội hình, chọn Pikachu, bấm "Dùng Đá Sấm" để tiến hóa thành Raichu (có thể hủy, đá được trả lại). |

Ngoài ra vẫn có chế độ **Thử thách sinh tồn**: 3 phút đánh theo đợt rồi boss Onix, có lưu kỷ lục.

## Điều khiển

| | Phím |
|---|---|
| Bản đồ ải | ←/→ hoặc click để chọn ải · Enter vào ải · **T** Đội hình · **P** Pokédex · **H** Trung tâm Pokémon · Esc menu |
| Đội hình | Click chọn, click lần nữa hoặc Space để đưa vào / bỏ ra đội · mũi tên để chọn (Hộp chia trang) · **1–4** nâng chiêu J/K/L/U · Enter vào ải · Esc quay lại |
| Trong trận | **WASD**/mũi tên đi · **J K L U** chiêu (tự khóa địch gần nhất) · **I** tuyệt chiêu · **Space** lướt né · **1 2 3** đổi Pokémon · **F** thuốc · **E** ném bóng rẻ nhất · **Q** ném bóng tốt nhất · **R** rút lui · Esc tạm dừng |
| Cài đặt | **T** đổi cách ngắm (Tự ngắm / Chuột / Hướng quay) · **M** âm thanh · **N** giảm rung |

**Ngôn ngữ & Cài đặt:** mặc định **tiếng Anh** (font Pixelify Sans). Đổi sang **tiếng Việt** (font Galmuri, đủ dấu) ở menu chính → ⚙ Settings → Language, hoặc trong trận: Esc → Settings. Bảng Cài đặt có các thẻ Sound (thanh trượt Nhạc / Hiệu ứng, Tắt hết), Graphics, Controls, Language, Account, About.
- Chuỗi giao diện: `src/i18n/strings/<màn>.ts` (mỗi file có `en` + `vi`), gọi bằng `t('khóa')`.
- Nội dung game (chiêu, ải, hội quán, mô tả loài, huy hiệu...): dữ liệu gốc tiếng Việt trong `src/data/`, bản tiếng Anh ở `src/i18n/content/*.en.ts`, đọc qua các hàm trong `src/i18n/content.ts` (`moveName`, `stageName`, `gymText`...).

Ở chế độ ngắm Chuột: rê chuột để ngắm, chuột trái = J, chuột phải = K.

## Kiểm thử nhanh (chỉ `npm run dev`)

| Cách | Tác dụng |
|---|---|
| `window.__game` | Đối tượng Phaser.Game để kiểm tra từ DevTools |
| Phím B trong Sinh tồn · `?boss` | Gọi boss ngay · bắt đầu ở mốc 2:57 |
| `?noassets` · `?nostorage` | Giả lập lỗi tải sprite · giả lập không lưu được (hoạt động cả bản build) |

Ảnh bản mẫu giao diện nằm trong [docs/mockups/](docs/mockups/).

## Cấu trúc project

```
src/
  main.ts                 cấu hình Phaser, chờ font pixel tải xong rồi mới khởi động
  config/balance.ts       ★ số liệu cân bằng: chỉ số theo cấp, giới hạn cấp, đổi Pokémon, thu phục, tiền, boss...
  data/
    pokemon.ts            loài chương 1–3 (+ chapters/* → tổng 139 loài): hệ, chỉ số, ô chiêu J/K/L/U theo cấp, tiến hóa, tỷ lệ bắt
    moves.ts              chiêu chương 1–3 (+ chapters/* → tổng 243 chiêu), cơ chế đặc trưng, trạng thái, bảng nâng cấp (+3/+5)
    stages.ts             các ải trên bản đồ: biome, đợt địch, loài bắt được, thưởng, vị trí nút
    trainers.ts           hội quán, thủ lĩnh, lời thoại, huy hiệu
    types.ts · waves.ts · regions.ts · spriteSheets.ts
    chapters/*.ts         nội dung chương 4 → Liên đoàn + dạng tiến hóa (loài, chiêu, chỉ số địch, ải, thủ lĩnh)
    rival.ts · kit.ts · moveKit.ts · hazards.ts
  game/state.ts · dex.ts · items.ts           lưu game v2: Hộp, đội, tiền, bóng, huy hiệu, kết quả ải (tự chuyển từ bản lưu cũ)
  scenes/
    MenuScene             màn hình chính
    RegionSelect · StarterSelect
    StageMapScene         bản đồ ải + Trung tâm Pokémon (chăm sóc, cửa hàng)
    TeamScene             chọn đội từ Hộp
    BattleScene · HudScene  trận đấu (ải thường / hội quán / sinh tồn), thu phục, kết quả
    EvolutionScene        hoạt cảnh tiến hóa
  entities/               Fighter (Pokémon phe ta), Enemy, Boss, PokemonSprite, Projectiles
  art/chapters/*.ts       sân đấu tự vẽ của từng chương (gym, Tứ Thiên Vương, ải đặc biệt)
  art/                    vẽ pixel bằng code: bản đồ vùng, đấu trường theo biome, nền màn hình chính, icon, nhà, người
  ui/                     font pixel, khung, nút, icon, hộp thoại, chân dung Pokémon
  fx/ · systems/ · world/
```

### Mở rộng
- **Chương mới:** thêm file vào `data/chapters/` (+ `art/chapters/`) theo `ChapterContent`, rồi đăng ký trong `index.ts`. Đặc tả chi tiết: [docs/CONTENT_SPEC.md](docs/CONTENT_SPEC.md).
- **Hội quán mới:** thêm vào `GYMS`/`BADGES`, rồi tạo một ải `kind: 'gym'` có `gymId` và `biome` (sàn đấu riêng vẽ trong `art/arenaArt.ts`).
- **Pokémon mới:** tải sheet PMD, rồi thêm vào `spriteSheets.ts`, `POKEMON` và `ENEMY_STATS`.

## Giới hạn hiện tại

- Chưa có điều khiển cảm ứng; chưa có vùng thứ hai (Johto...).
- Phiến đá ở hội quán chặn đạn nhưng chưa vỡ được.
- Đối thủ chưa biết né đòn; Pokémon của thủ lĩnh chưa biết tự đổi.
- Độ khó mới được đo bằng bot tự chơi (bot đi ngẫu nhiên, không né đòn, không nâng chiêu), chưa có người chơi thử thật.
- Sprite và tên nhân vật là IP của bên thứ ba, chỉ dùng cho thử nghiệm.
