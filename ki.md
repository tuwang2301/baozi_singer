# Knowledge Integration (KI) - LDR Space Bot

Tài liệu này lưu trữ tiến độ dự án, các bài học kinh nghiệm, cấu trúc hiện tại và kế hoạch phát triển tiếp theo của bot **Baozi Singer (LDR Space Bot)** để tránh mất dấu tiến trình khi chuyển ngữ cảnh.

---

## 📌 Tổng quan dự án
* **Mục tiêu:** Bot Discord dành cho cặp đôi yêu xa (Music, Diary, Countdown, Stats, Interactions, Lyrics).
* **Trạng thái:** Hoạt động tốt ở cả local và đám mây (Render). Dữ liệu được đồng bộ hóa an toàn trên cloud. GitHub cá nhân: [baozi_singer](https://github.com/tuwang2301/baozi_singer).

---

## 🛠️ Cấu trúc hệ thống & Tiến độ hiện tại

| Thành phần | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| **Database (`database.js`)** | ✅ Đã hoàn thành | Đã chuyển từ SQLite sang **PostgreSQL (Supabase)** kết nối qua Session Pooler (`6543`/`5432`) giải quyết triệt để vấn đề mạng IPv6 của Render và tránh mất dữ liệu khi restart container. |
| **Nhân Stream Nhạc (`music/player.js`)** | ✅ Đã hoàn thành | Chuyển sang **`yt-dlp`** để tránh lỗi 403. Đã gỡ thanh progress bar để giao diện gọn gàng, tối giản theo yêu cầu. |
| **Lệnh `/lyrics`** | ✅ Đã hoàn thành | Tìm lời bài hát tự động theo hàng đợi hoặc theo tên nhập vào. Phân trang tương tác và tích hợp tìm kiếm dự phòng từ **Genius.com** (dùng `cheerio` để cào dữ liệu) khi LRCLIB chưa có lời. |
| **Lệnh `/play`** | ✅ Đã hoàn thành | Phát nhạc từ URL hoặc tìm kiếm từ khóa. Đã sửa lỗi timeout lệnh bằng cách gọi `deferReply` và tải trước binary `yt-dlp` ngay khi bot khởi động. |
| **Lệnh `/history`, `/favorites`** | ✅ Đã hoàn thành | Hiển thị danh sách kèm Dropdown Select Menu để phát lại nhanh. |
| **Lệnh `/diary`** | ✅ Đã hoàn thành | Xem nhật ký lật trang, bấm nút mở Modal nhập nội dung trực tiếp trên Discord. |
| **Lệnh `/countdown`, `/set-meetup`, `/set-start-date`** | ✅ Đã hoàn thành | Đếm ngược ngày yêu và ngày gặp lại. |
| **Lệnh `/hug`, `/kiss`, `/miss`, `/stats`** | ✅ Đã hoàn thành | Tương tác ảnh GIF ngẫu nhiên và tích luỹ điểm thống kê. |

---

## 💡 Các sự cố lớn đã xử lý (Lessons Learned)

1. **Lỗi kết nối PostgreSQL (Supabase) từ Render:**
   * *Nguyên nhân:* Supabase miễn phí phân giải DNS là IPv6-only, trong khi Render chỉ hỗ trợ mạng IPv4 dẫn đến lỗi `ENETUNREACH`. Ngoài ra mật khẩu có ký tự đặc biệt `@` làm hỏng trình phân tách URL.
   * *Giải pháp:* Chuyển sang kết nối qua **Supabase Connection Pooler** (domain dạng `.pooler.supabase.com`) hỗ trợ IPv4, đổi cổng kết nối tương ứng và mã hóa ký tự `@` trong mật khẩu thành `%40`.
2. **Lỗi `Unknown interaction (10062)` khi chạy `/play` lần đầu:**
   * *Nguyên nhân:* Bot phải tải file binary `yt-dlp.exe` từ Github lần đầu nên mất hơn 3 giây, vượt quá giới hạn tương tác của Discord.
   * *Giải pháp:* Tải trước `yt-dlp` ngay khi bot khởi động (sự kiện `ready`) và đẩy lệnh `interaction.deferReply()` lên hàng đầu tiên trong logic xử lý lệnh để Acknowledge tương tác ngay lập tức.
3. **Lỗi 403 Forbidden khi stream nhạc từ YouTube:**
   * *Giải pháp:* Sử dụng `yt-dlp` và stream qua `stdout`. Nạp các tham số cookie YouTube thông qua biến môi trường `YOUTUBE_COOKIE`.
4. **Lỗi `Requested format is not available` trên yt-dlp:**
   * *Nguyên nhân:* Việc ép buộc cấu hình thiết bị giả lập `web,ios` để ẩn cảnh báo PO Token đã giới hạn định dạng âm thanh đầu ra của YouTube, làm yt-dlp không tìm thấy stream chất lượng tốt nhất.
   * *Giải pháp:* Loại bỏ tham số hạn chế thiết bị, trả về cấu hình tự động chọn thiết bị tốt nhất của yt-dlp.

---

## 🚀 Kế hoạch phát triển tiếp theo

### Xây dựng tính năng "Thư gửi tương lai" (Future Letter)
* **Mô tả:** Cho phép người dùng viết thư gửi đối phương và khóa lại, chỉ mở ra vào một ngày cụ thể trong tương lai.
* **Kế hoạch kỹ thuật:**
  * Tạo bảng `future_letters` trong PostgreSQL lưu nội dung thư, người gửi, người nhận, ngày mở khóa, và trạng thái mở.
  * Tạo lệnh `/send-letter` mở modal nhập thư và chọn ngày mở khóa.
  * Tạo lệnh `/letters` hiển thị danh sách thư đang chờ (bị khóa) và thư đã đến ngày được mở.
  * Tích hợp job chạy ngầm hàng ngày (cron/check) hoặc tự động check khi bot khởi động để gửi thông báo khi có thư được mở khóa.
