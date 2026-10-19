# Góp ý của người làm game về chiêu thức (đọc trước khi làm hệ mới)

Ghi lại các nhận xét thật trong quá trình làm. Mỗi hệ / loài mới phải qua được những điểm dưới đây.

## 1. Quy trình làm một hệ mới
1. **Làm hình xem trước TRƯỚC khi viết code** (ảnh mockup từng chiêu J/K/L/U/I, ghi rõ mô tả). Chỉ khi người làm game nói "ok làm" mới code.
2. Làm mẫu **một dòng tiến hóa** (3 dạng nếu có) và test nhanh trong Skill Lab; chốt rồi mới nhân ra toàn bộ loài.
3. Sửa trực tiếp từng bước nhỏ, tránh dùng agent cho việc nhỏ (tốn token). Commit git sau mỗi hệ đã duyệt.
4. Tham khảo chiêu **trong anime/game** của chính Pokémon đó (cá nhân hóa), không bịa chung chung.

## 2. Hình dáng phải thuộc về hệ, không chỉ đổi màu
- **Cỏ (lần đầu bị chê):** "J phải quăng LÁ, không phải quả cầu y chang quả cầu của Lửa; K, U cũng giống Lửa". → Cỏ dùng lá nhọn xoay xuyên địch, dây leo quất, phấn bào tử, hạt giống, rễ. Cấm quả cầu sáng tròn và vòng nổ tròn.
- **Siêu linh (bị chê):** "chưa có gì đặc biệt, gần như giống các Pokémon trước". → đổi màu + vòng thôi là KHÔNG đủ. Cần **cơ chế riêng** (nhấc bổng rồi quật, tia là chuỗi vòng elip, vòng ma thuật xoay).
- Quy tắc: nhìn ảnh chụp bỏ màu đi vẫn phải nhận ra hệ nhờ **hình dáng + chuyển động + cơ chế**.
- Mỗi hệ có bộ hình riêng: Lửa = cầu/luồng/nổ sao · Nước = giọt/tia/sóng + vũng · Điện = zig-zag/sét nảy/sét trời · Cỏ = lá/dây/phấn/rễ · Ma = khói tím/đốm tự đuổi/cột bóng tối · Siêu linh = vòng ma thuật/tia vòng/nhấc bổng.

- **Băng (bị chê lần 1):** "chiêu giống hệ siêu linh, chỉ khác màu" vì dùng vòng tròn xoay trên nền + elip + địch bị nhấc/bọc hộp. → Băng chỉ dùng hình góc cạnh, thẳng đứng, hướng gió. **Trước khi code phải tự kiểm tra: bỏ màu đi, có giống hệ nào đã làm không?**

## 3. Mỗi dạng tiến hóa phải khác hẳn nhau
- **Nước (bị chê):** "3 level của hệ nước chưa có sự khác nhau, y chang nhau luôn". Khác nhau vài thông số nhỏ KHÔNG đủ.
- Mỗi dạng một "tính cách": nhỏ/nhẹ → nhanh/mềm → to/nặng. Khác ở **hình, số lượng, độ dày, chuyển động, rung màn hình, âm thanh**, nhận ra ngay trên ảnh chụp.
- Dạng gốc chưa có tuyệt chiêu; dạng giữa và cuối có.

## 4. Tuyệt chiêu (I) phải ấn tượng
- "Chiêu ulti của con này không ấn tượng lắm" (Siêu linh bản đầu chỉ là vài vòng). → Tuyệt chiêu phải là **một cảnh**: tối màn hình / chớp sáng, hiệu ứng phủ cả sân, nhiều pha (gom → phóng → kết liễu), rung + khựng hình, tên chiêu riêng theo loài.
- Ví dụ đã được duyệt: Inferno (Charmeleon/Charizard bay lên), Time Stop (Alakazam: vòng ma thuật phủ sân, đóng băng + nhấc bổng, dao tâm linh, quật xuống).

## 5. Chiêu thường (J/K/L/U) phải khác nhau về vai trò
- J: đòn nhanh, nhẹ · K: áp sát/lao · L: tia hoặc vùng có báo trước · U: đòn lớn vùng, nổ đẹp.
- J không được là "bấm giữ chạy vòng thắng"; có thanh năng lượng chung, hồi chiêu, mở khóa theo điều kiện.

## 6. Chất lượng hiển thị
- Icon chiêu phải hiện trên thanh chiêu (từng bị mất vì lỗi thứ tự vẽ).
- Chữ/tên chiêu theo ngôn ngữ đã chọn (EN mặc định, VI tùy chọn).
- Phần Lửa (Charmander/Charmeleon/Charizard) đã được duyệt: **giữ nguyên Charmeleon** làm chuẩn chất lượng.

## 7. Asset ngoài và âm thanh
- Bộ "Gen 9 Move Animation Project": thử thay hiệu ứng Fire Blast → "xấu, âm thanh to và hỗn tạp" → **chỉ để tham khảo, không dùng**. Hiệu ứng vẽ bằng code.
- Âm thanh: từng bị "to, đục". Đã xử lý bằng kênh trộn có nén âm + nhiễu lọc (xem `src/systems/sfx.ts`). Âm mới nên nhẹ, ngắn, ít sóng răng cưa tần thấp.

## 8. Việc còn mở
- J của Siêu linh 3 dạng còn giống nhau.
- Chưa làm: Thường, Bọ, Độc, Bay, Đá, Đất, Giác đấu, Băng, Rồng.
- Tuyệt chiêu cho Ma và Điện (Raichu đã có, Ma dùng bản mặc định).
