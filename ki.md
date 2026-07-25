# Knowledge Integration (KI) - LDR Space Bot

Tài liệu này lưu trữ tiến độ dự án, các bài học kinh nghiệm, cấu trúc hiện tại và kế hoạch phát triển tiếp theo của bot **Baozi Singer (LDR Space Bot)** để tránh mất dấu tiến trình khi chuyển ngữ cảnh.

---

## 📌 Tổng quan dự án
* **Mục tiêu:** Bot Discord dành cho cặp đôi yêu xa (Music, Diary, Countdown, Stats, Interactions, Lyrics, Future Letters).
* **Trạng thái:** Hoạt động tốt ở cả local và đám mây (Render). Dữ liệu được đồng bộ hóa an toàn trên cloud. GitHub cá nhân: [baozi_singer](https://github.com/tuwang2301/baozi_singer).

---

## 🛠️ Cấu trúc hệ thống & Tiến độ hiện tại

| Thành phần | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| **Database (`database.js`)** | ✅ Đã hoàn thành | Đã chuyển sang **PostgreSQL (Supabase)**. Bổ sung bảng `future_letters` lưu trữ thư tay hẹn giờ niêm phong, liên kết khóa ngoại và các hàm kiểm tra quyền truy cập/báo tin. |
| **Lệnh `/write-letter`** | ✅ Đã hoàn thành | Cho phép viết thư gửi tương lai cho đối phương, hẹn ngày mở (hỗ trợ nhập số ngày tương lai hoặc ngày YYYY-MM-DD cụ thể) và nhập tiêu đề/nội dung qua **Discord Modal**. |
| **Lệnh `/letters`** | ✅ Đã hoàn thành | Hiển thị hòm thư đến/đi. Thư đang khóa sẽ hiện khóa `🔒`, thư đã mở sẽ hiện `🔓` và có trình đơn **Dropdown String Select Menu** để chọn và đọc thư trực tiếp. |
| **Job báo tin thư mở (`index.js`)** | ✅ Đã hoàn thành | Tự động chạy ngầm mỗi 30 phút (và 15s sau khi khởi động) kiểm tra thư đến hạn để ping thông báo hai người trong kênh chat tương ứng. |
| **Lệnh `/lyrics`** | ✅ Đã hoàn thành | Tìm lời bài hát tự động theo hàng đợi hoặc theo tên nhập vào. Phân trang tương tác và tích hợp tìm kiếm dự phòng từ **Genius.com** (dùng `cheerio` để cào dữ liệu) khi LRCLIB chưa có lời. |
| **Nhân Stream Nhạc (`music/player.js`)** | ✅ Đã hoàn thành | Chuyển sang **`yt-dlp`** để tránh lỗi 403. Đã gỡ thanh progress bar để giao diện gọn gàng, tối giản theo yêu cầu. |
| **Lệnh `/play`** | ✅ Đã hoàn thành | Phát nhạc từ URL hoặc tìm kiếm từ khóa. Đã sửa lỗi timeout lệnh bằng cách gọi `deferReply` và tải trước binary `yt-dlp` ngay khi bot khởi động. |
| **Lệnh `/history`, `/favorites`** | ✅ Đã hoàn thành | Hiển thị danh sách kèm Dropdown Select Menu để phát lại nhanh. |
| **Lệnh `/diary`** | ✅ Đã hoàn thành | Xem nhật ký lật trang, bấm nút mở Modal nhập nội dung trực tiếp trên Discord. |
| **Lệnh `/countdown`, `/set-meetup`, `/set-start-date`** | ✅ Đã hoàn thành | Đếm ngược ngày yêu và ngày gặp lại. |
| **Lệnh `/hug`, `/kiss`, `/miss`, `/stats`** | ✅ Đã hoàn thành | Tương tác ảnh GIF ngẫu nhiên và tích luỹ điểm thống kê. |

---

## 💡 Các sự cố lớn đã xử lý (Lessons Learned)

1. **Lỗi `showModal` sau khi `deferReply`:**
   * *Nguyên nhân:* Discord không cho phép hiển thị Modal Popup cho người dùng nếu tương tác (Interaction) đã được Acknowledge (báo nhận/hoãn bằng `deferReply`).
   * *Giải pháp:* Trong lệnh `/write-letter`, không gọi `deferReply()` trước mà gọi trực tiếp `showModal()` ngay dòng cuối cùng của hàm thực thi chính.
2. **Hỗ trợ cập nhật hòm thư mượt mà từ nút bấm:**
   * *Nguyên nhân:* Khi người dùng đang đọc một bức thư và bấm nút "Quay lại hòm thư", bot cần hiển thị lại danh sách thư ban đầu.
   * *Giải pháp:* Tái cấu trúc hàm `execute` trong `letters.js` để tự động phát hiện loại tương tác (lệnh slash dùng `deferReply`, nút bấm dùng `deferUpdate`), giúp tái sử dụng mã nguồn hiển thị hòm thư mà không làm lỗi luồng Discord.
3. **Lỗi kết nối PostgreSQL (Supabase) từ Render:**
   * *Giải pháp:* Chuyển sang kết nối qua **Supabase Connection Pooler** (domain dạng `.pooler.supabase.com`) hỗ trợ IPv4, đổi cổng kết nối tương ứng và mã hóa ký tự `@` trong mật khẩu thành `%40`.
4. **Lỗi `Unknown interaction (10062)` khi chạy `/play` lần đầu:**
   * *Giải pháp:* Tải trước `yt-dlp` ngay khi bot khởi động (sự kiện `ready`) và đẩy lệnh `interaction.deferReply()` lên hàng đầu tiên trong logic xử lý lệnh.

---

## 🚀 Kế hoạch phát triển tiếp theo

### Bảo mật nội dung thư trong Database (Tùy chọn nâng cao)
* **Mô tả:** Mã hóa nội dung bức thư trước khi lưu vào database và chỉ giải mã bằng khóa bí mật khi hiển thị, ngăn chặn việc quản trị viên database (chủ dự án Supabase) đọc trộm nội dung thư tình.
