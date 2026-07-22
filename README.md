# 🎶 Baozi Singer (LDR Space Bot)

**Baozi Singer** (Ca sĩ Bánh Bao) là một Discord Bot được thiết kế đặc biệt dành riêng cho các cặp đôi yêu xa (LDR - Long Distance Relationship). Bot giúp kết nối và nâng cấp trải nghiệm gọi điện của hai bạn thông qua trình phát nhạc thông minh và các tính năng tương tác tình yêu trực tiếp ngay trong giao diện Discord.

---

## ✨ Tính năng nổi bật

### 🎵 1. Trình phát nhạc thông minh (Smart Music Player)
*   **Phát nhạc mạnh mẽ:** Phát nhạc từ liên kết YouTube hoặc tìm kiếm từ khóa thông qua nhân độc lập **`yt-dlp`** kết hợp **`@discordjs/voice`**, giải quyết hoàn toàn lỗi 403 Forbidden và lỗi mã hóa âm thanh mới nhất của Discord.
*   **Bảng điều khiển trực quan (Player UI):** Mỗi bài hát phát lên sẽ gửi kèm một Embed đẹp mắt hiển thị ảnh bìa, uploader, thời lượng, người yêu cầu phát và thanh tiến trình thời gian thực dạng chữ (`▬●▬▬▬▬▬▬▬▬▬ [0:30 / 3:15]`).
*   **Nút bấm tương tác:**
    *   `⏸️ Tạm dừng` / `▶️ Tiếp tục` nhạc linh hoạt.
    *   `⏭️ Bỏ qua` (Skip) bài hát hiện tại.
    *   `⏹️ Dừng phát` (Stop) và cho bot rời phòng voice.
    *   `⭐ Yêu thích` để lưu nhanh bài hát vào danh sách yêu thích chung.
*   **Lịch sử & Yêu thích:**
    *   Lệnh `/history` hiển thị 25 bài hát đã nghe gần nhất.
    *   Lệnh `/favorites` hiển thị danh sách bài hát yêu thích chung.
    *   Cả hai lệnh đều đi kèm **Dropdown Select Menu** để chọn và phát lại nhanh ngay lập tức.

### 📖 2. Nhật ký tình yêu chung (Love Diary)
*   Gõ lệnh `/diary` để mở trang nhật ký chung của hai bạn.
*   Hỗ trợ đọc nhật ký với các nút bấm chuyển trang (`◀️ Trang trước`, `▶️ Trang sau`).
*   Bấm nút `✍️ Viết nhật ký` sẽ hiển thị một **Modal Popup** trực tiếp trên màn hình Discord để nhập tiêu đề và nội dung kỷ niệm, tự động lưu lại tác giả và thời gian vào cơ sở dữ liệu.

### ⏳ 3. Đếm ngược & Kỷ niệm (Love Countdowns)
*   Lệnh `/set-start-date [YYYY-MM-DD]` để lưu lại ngày hai bạn bắt đầu yêu nhau.
*   Lệnh `/set-meetup [YYYY-MM-DD]` để cập nhật ngày hẹn gặp lại tiếp theo.
*   Lệnh `/countdown` hiển thị số ngày hai bạn đã bên nhau và đếm ngược số ngày còn lại đến khi được gặp nhau.

### 🫂 4. Tương tác đôi dễ thương (Cute Interactions)
*   Gõ các lệnh `/hug`, `/kiss`, `/miss` gửi kèm các ảnh GIF hoạt hình dễ thương ngẫu nhiên để bày tỏ tình cảm với người ấy.
*   Tự động cộng dồn số lần ôm, hôn, nhớ nhung vào cơ sở dữ liệu.
*   Xem tổng quan tất cả cột mốc và điểm tương tác qua lệnh `/stats`.

---

## 🛠️ Công nghệ sử dụng
*   **Ngôn ngữ:** Node.js (ES Modules).
*   **Thư viện Discord:** `discord.js` v14.
*   **Xử lý âm thanh:** `@discordjs/voice` v0.19.2 (mã hóa GCM mới), `ffmpeg-static`, và nhân giải mã `yt-dlp`.
*   **Cơ sở dữ liệu:** SQLite thông qua `better-sqlite3` đảm bảo lưu trữ dữ liệu cục bộ an toàn, không sử dụng bộ nhớ tạm.

---

## 🚀 Hướng dẫn cài đặt & Chạy Bot

### 1. Chuẩn bị
*   Đã cài đặt [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản LTS mới nhất, >= 18).
*   Tạo một ứng dụng Bot trên [Discord Developer Portal](https://discord.com/developers/applications) và bật đầy đủ các **Intents** trong mục Bot.

### 2. Tải mã nguồn & Cài đặt thư viện
Tại thư mục dự án, chạy lệnh cài đặt các thư viện cần thiết:
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo một file `.env` từ file mẫu `.env.example` và điền thông tin của bạn:
```ini
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_application_id
GUILD_ID=your_testing_server_id
```

### 4. Đăng ký Slash Commands
Trước khi chạy bot lần đầu hoặc khi thêm lệnh mới, đăng ký các lệnh gạch chéo lên Discord:
```bash
npm run deploy
```

### 5. Khởi động Bot
Chạy lệnh khởi động bot cục bộ:
```bash
npm start
```

---

## 🔒 Giấy phép & Bảo mật
*   Dự án sử dụng cơ sở dữ liệu SQLite cục bộ (`ldr_space.db`). Hãy sao lưu tệp tin này nếu bạn muốn chuyển đổi máy chủ chạy bot để giữ nguyên nhật ký và chỉ số.
*   **Lưu ý bảo mật:** Tuyệt đối không chia sẻ file `.env` chứa Discord Token của bạn lên các kho mã nguồn công cộng như GitHub.
