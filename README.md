# SMART STEM ROOM - Hệ Thống Quản Lý Không Gian STEM Thông Minh (V3.0)

Hệ thống phần mềm quản lý toàn diện phòng học STEM thông minh tích hợp Cơ sở dữ liệu SQLite, giám sát cảm biến từ hộc tủ IoT (ESP32), Camera AI phát hiện người ra/vào và quản lý mượn trả thiết bị.

---

## 🚀 Cách khởi động nhanh (1-Click)

Bạn có thể chạy ứng dụng bằng file `Chay_Phan_Mem.bat` ngay tại thư mục gốc:

1. **Nhấp đúp chuột vào file `Chay_Phan_Mem.bat`**.
2. Hệ thống sẽ tự động khởi động:
   - **Máy chủ Backend & Cơ sở dữ liệu SQLite** tại `http://localhost:5000`
   - **Giao diện Web Frontend** tại `http://localhost:5173`
3. Trình duyệt mặc định sẽ tự động mở lên giao diện hệ thống.

*(Hoặc mở Terminal và chạy lệnh: `npm run server` và `npm run dev`)*

---

## 🌟 Các chức năng chính đã hoàn thiện

### 1. 🗄️ Cơ sở dữ liệu SQLite & Backend RESTful API
- Lưu trữ lâu dài vào tệp database `server/smart_stem.db` với Node.js built-in SQLite (`node:sqlite`).
- Không cần cài đặt server SQL phức tạp, hoạt động hoàn toàn offline và tự động khởi tạo dữ liệu mẫu.
- Bộ API chuẩn RESTful cho Lịch đăng ký, Hộc tủ cảm biến, Thiết bị, Camera và Thống kê.

### 2. 🔐 Đăng nhập & Phân quyền người dùng (Role-Based Access)
- **Quản trị viên (Admin)**: Toàn quyền duyệt/từ chối lịch, thêm/sửa/xóa thiết bị, quản lý hộc tủ, cấu hình.
- **Giáo viên (Teacher)**: Đăng ký phòng, mượn/trả thiết bị, xem báo cáo thống kê.
- **Học sinh (Student)**: Đăng ký lịch sử dụng phòng, xem danh mục thiết bị và trạng thái hộc tủ.
- Chuyển đổi nhanh vai trò trực tiếp từ thanh Topbar.

### 3. 📦 Quản lý Thiết bị & Linh kiện STEM (Full CRUD & Mượn/Trả)
- Danh mục trang thiết bị phân loại theo danh mục: *Thiết bị chế tạo, Bộ kít lập trình, Thiết bị điện tử, Thiết bị nghiên cứu, Linh kiện điện tử, Vật tư tiêu hao...*
- **Tìm kiếm** theo tên, mã thiết bị (STEM-001, STEM-002...).
- **Lọc** theo danh mục và tình trạng khả dụng.
- **Mượn & Trả thiết bị**: Nhập tên người mượn, hệ thống tự động trừ/cộng lại số lượng khả dụng trong kho hộc tủ.
- Thêm mới, chỉnh sửa thông tin hoặc xóa thiết bị khỏi hệ thống.

### 4. 📹 Camera Giám Sát & Trực Tiếp Webcam Máy Tính
- **Bật/Tắt Webcam thực tế**: Kết nối trực tiếp webcam laptop/PC với một nút bấm.
- **Khung nhận diện AI (Bounding Box)**: Mô phỏng phát hiện người và hướng di chuyển.
- **Chụp ảnh minh chứng**: Chụp ảnh ngay từ luồng video và tải về máy.
- **Ghi nhận sự kiện vào/ra**: Ghi nhận trực tiếp vào cơ sở dữ liệu `entry_logs`.
- Hỗ trợ Webhook API cho các kịch bản Python OpenCV/YOLO bên ngoài.

### 5. 🧲 Giám sát Hộc tủ Cảm biến IoT (ESP32)
- Theo dõi trạng thái đóng/mở của từng hộc tủ (`L01` đến `L06`).
- Tích hợp nút mô phỏng đóng/mở, tự động ghi nhận nhật ký thời gian thực vào SQLite.
- Hướng dẫn kèm code mẫu Arduino C++ cho vi điều khiển ESP32 gửi tín hiệu qua HTTP REST Webhook (`/api/lockers/:id`).

### 6. 📊 Báo cáo Thống kê & Xuất Excel (.CSV)
- Biểu đồ phân bổ tỷ lệ sử dụng thiết bị và phòng học.
- **Xuất file Excel (.CSV)** với chuẩn mã hóa UTF-8 BOM, mở trực tiếp bằng Microsoft Excel không bị lỗi font tiếng Việt:
  - Xuất danh sách Lịch đăng ký phòng
  - Xuất danh mục Trang thiết bị STEM
  - Xuất nhật ký đóng/mở Hộc tủ
  - Xuất nhật ký lưu lượng Camera ra/vào
- Nút **In báo cáo A4** chuẩn định dạng tài liệu nộp ban giám hiệu hoặc ban tổ chức KHKT.

---

## 🛠️ Công nghệ sử dụng
- **Frontend**: React 18, Vite 6, Lucide Icons, Pure Responsive CSS
- **Backend**: Node.js HTTP Server, Native SQLite Database (`node:sqlite`)
- **Kết nối ngoại vi**: REST API Webhook, WebRTC Camera
