# Knowledge Integration (KI) - LDR Space Bot

Tài liệu này lưu trữ tiến độ dự án, các bài học kinh nghiệm, cấu trúc hiện tại và kế hoạch phát triển tiếp theo của bot **Baozi Singer (LDR Space Bot)** để tránh mất dấu tiến trình khi chuyển ngữ cảnh.

---

## 📌 Tổng quan dự án
* **Mục tiêu:** Bot Discord dành cho cặp đôi yêu xa (Music, Diary, Countdown, Stats, Interactions).
* **Trạng thái:** Toàn bộ tính năng cốt lõi đã chạy mượt mà trên máy tính của người dùng (Local). Đã được commit và đẩy lên GitHub cá nhân thành công tại: [baozi_singer](https://github.com/tuwang2301/baozi_singer).

---

## 🛠️ Cấu trúc hệ thống & Tiến độ hiện tại

| Thành phần | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| **Database (`database.js`)** | ✅ Đã hoàn thành | SQLite (`better-sqlite3`) lưu trữ: `music_history`, `favorites`, `diary`, `love_stats`. |
| **Nhân Stream Nhạc (`music/player.js`)** | ✅ Đã hoàn thành | Chuyển từ `play-dl` sang **`yt-dlp`** để tránh lỗi 403. Tự động tải binary và nạp ffmpeg vào `PATH`. |
| **Lệnh `/play`** | ✅ Đã hoàn thành | Phát nhạc từ URL hoặc tìm kiếm từ khóa. |
| **Lệnh `/history`, `/favorites`** | ✅ Đã hoàn thành | Hiển thị danh sách kèm Dropdown Select Menu để phát lại nhanh. |
| **Lệnh `/diary`** | ✅ Đã hoàn thành | Xem nhật ký lật trang, bấm nút mở Modal nhập nội dung trực tiếp trên Discord. |
| **Lệnh `/countdown`, `/set-meetup`, `/set-start-date`** | ✅ Đã hoàn thành | Đếm ngược ngày yêu và ngày gặp lại. |
| **Lệnh `/hug`, `/kiss`, `/miss`, `/stats`** | ✅ Đã hoàn thành | Tương tác ảnh GIF ngẫu nhiên và tích luỹ điểm thống kê. |

---

## 💡 Các sự cố lớn đã xử lý (Lessons Learned)

1. **Lỗi 403 Forbidden khi stream nhạc từ YouTube:**
   * *Nguyên nhân:* YouTube chặn các thư viện Node.js thông thường như `play-dl` hay `ytdl-core` tải stream.
   * *Giải pháp:* Tải và chạy trực tiếp binary **`yt-dlp`** (`yt-dlp.exe` trên Windows) và stream qua `stdout`. Đây là cách ổn định nhất hiện nay.
2. **Bot vào Voice Channel nhưng im lặng:**
   * *Nguyên nhân:* 
     1. Giao thức mã hoá giọng nói của Discord thay đổi, phiên bản `@discordjs/voice` cũ (`0.17.0`) gửi gói tin bị Discord server loại bỏ lặng lẽ.
     2. Gói `ffmpeg-static` được cấu hình quá muộn sau khi `@discordjs/voice` đã cache việc kiểm tra FFMPEG.
   * *Giải pháp:*
     1. Nâng cấp `@discordjs/voice` lên phiên bản mới nhất (`0.19.2`).
     2. Nạp FFMPEG vào `PATH` ngay dòng đầu tiên của `index.js` trước các import khác.
     3. Tắt hành vi tự động tạm dừng (`NoSubscriberBehavior.Play`) của `createAudioPlayer`.
3. **Lỗi sập bot `Missing Access` khi gõ lệnh trong Chat kênh thoại:**
   * *Nguyên nhân:* Bot không có quyền viết/gửi liên kết trong kênh chat thoại của Server.
   * *Giải pháp:* Bọc tất cả các hàm gửi tin nhắn (`queue.textChannel.send`) vào khối lệnh `try/catch` để tránh crash bot, chỉ cảnh báo ra console.

---

## 🚀 Kế hoạch phát triển tiếp theo (Đang chờ xác nhận)

### Tính năng Hỗ trợ Playlist YouTube trong `/play`
* **Mục tiêu:** Khi người dùng dán một liên kết Playlist YouTube, bot sẽ tự động nhận diện, trích xuất danh sách tất cả các bài hát trong playlist đó, đẩy toàn bộ vào hàng đợi (Queue) và lưu lịch sử tương ứng.
* **Giải pháp kỹ thuật dự kiến:**
  * Kiểm tra xem tham số đầu vào có chứa `list=` (Playlist ID) hay không.
  * Nếu có, chạy lệnh trích xuất nhanh dạng phẳng (flat) từ `yt-dlp`:
    `yt-dlp "<playlist_url>" --flat-playlist --dump-json --quiet`
  * Phân tách kết quả đầu ra theo dòng (JSON Lines), parse thành mảng bài hát để đẩy vào hàng đợi `queue.songs`.
