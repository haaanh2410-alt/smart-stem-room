import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "smart_stem.db");

export const db = new DatabaseSync(dbPath);

// Khởi tạo các bảng cơ sở dữ liệu
export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      date TEXT NOT NULL,
      session TEXT NOT NULL,
      periods TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Chờ duyệt',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS lockers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'closed',
      updated_at TEXT DEFAULT (time('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS locker_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_id TEXT NOT NULL,
      locker_name TEXT NOT NULL,
      event TEXT NOT NULL,
      source TEXT DEFAULT 'Mô phỏng',
      time TEXT,
      date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS entry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      label TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      camera TEXT DEFAULT 'Camera tổng quan',
      time TEXT,
      date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      locker_id TEXT,
      quantity INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Sẵn sàng',
      borrower TEXT,
      borrow_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  // Người dùng mặc định
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (username, password, name, role, department) VALUES (?, ?, ?, ?, ?)"
    );
    insertUser.run("admin", "admin123", "Quản trị viên STEM", "admin", "Tổ KHTN & Công nghệ");
    insertUser.run("giaovien", "123456", "Thầy Nguyễn Văn Đức", "teacher", "Giáo viên Tin học - STEM");
    insertUser.run("hocsinh", "123456", "Trần Hà Anh", "student", "Lớp 11 Tin - CLB STEM");
  }

  // Hộc tủ mẫu
  const lockerCount = db.prepare("SELECT COUNT(*) as count FROM lockers").get().count;
  if (lockerCount === 0) {
    const insertLocker = db.prepare(
      "INSERT INTO lockers (id, name, location, state, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    insertLocker.run("L01", "Hộc tủ 01", "Khu thiết bị điện tử & đo lường", "closed", "08:15");
    insertLocker.run("L02", "Hộc tủ 02", "Khu dụng cụ chế tạo cơ bản", "open", "09:20");
    insertLocker.run("L03", "Hộc tủ 03", "Khu cảm biến & linh kiện", "closed", "08:42");
    insertLocker.run("L04", "Hộc tủ 04", "Khu vi điều khiển Arduino / ESP32", "closed", "07:55");
    insertLocker.run("L05", "Hộc tủ 05", "Khu máy in 3D & dụng cụ in", "closed", "08:03");
    insertLocker.run("L06", "Hộc tủ 06", "Khu vật tư tiêu hao & dự phòng", "closed", "08:10");
  }

  // Nhật ký hộc tủ mẫu
  const lockerLogCount = db.prepare("SELECT COUNT(*) as count FROM locker_logs").get().count;
  if (lockerLogCount === 0) {
    const insertLockerLog = db.prepare(
      "INSERT INTO locker_logs (locker_id, locker_name, event, source, time, date) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertLockerLog.run("L01", "Hộc tủ 01", "Mở hộc tủ", "Cảm biến từ", "08:15", "12/11/2026");
    insertLockerLog.run("L01", "Hộc tủ 01", "Đóng hộc tủ", "Cảm biến từ", "08:17", "12/11/2026");
    insertLockerLog.run("L02", "Hộc tủ 02", "Mở hộc tủ", "Cảm biến từ", "09:20", "13/11/2026");
  }

  // Danh mục thiết bị mẫu
  const deviceCount = db.prepare("SELECT COUNT(*) as count FROM devices").get().count;
  if (deviceCount === 0) {
    const insertDevice = db.prepare(
      "INSERT INTO devices (code, name, category, locker_id, quantity, available, status, borrower, borrow_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    insertDevice.run("STEM-001", "Máy in 3D Creality Ender-3 V2", "Thiết bị chế tạo", "L05", 2, 2, "Sẵn sàng", null, null, "In các chi tiết mô hình nhựa PLA/ABS phục vụ dự án");
    insertDevice.run("STEM-002", "Bộ KIT học tập Arduino Uno R3 đầy đủ", "Bộ kít lập trình", "L04", 10, 8, "Sẵn sàng", "Nguyễn Tuấn Kiệt", "12/11/2026", "Gồm kit UNO, breadboard, led, trở, dây cắm");
    insertDevice.run("STEM-003", "Module ESP32 NodeMCU Wifi + Bluetooth", "Bộ kít lập trình", "L04", 8, 7, "Sẵn sàng", "CLB Nghiên cứu KHKT", "13/11/2026", "Phục vụ đề tài IoT Smart Home và trạm quan trắc");
    insertDevice.run("STEM-004", "Kính hiển vi quang học độ phóng đại 1600X", "Thiết bị nghiên cứu", "L01", 3, 3, "Sẵn sàng", null, null, "Dùng trong các bài thực hành Sinh học & Khoa học vật liệu");
    insertDevice.run("STEM-005", "Bộ nguồn DC đa năng lập trình (0-30V 5A)", "Thiết bị điện tử", "L01", 2, 2, "Sẵn sàng", null, null, "Cấp nguồn ổn định cho các mạch thử nghiệm");
    insertDevice.run("STEM-006", "Hộp dụng cụ chế tạo (Kìm, mỏ hàn, đồng hồ VOM)", "Dụng cụ chế tạo", "L02", 5, 4, "Sẵn sàng", "Quàng Bảo Trâm", "11/11/2026", "Trạm hàn mạch và lắp ráp mô hình robot");
    insertDevice.run("STEM-007", "Bộ cảm biến hỗn hợp (DHT22, Siêu âm, Gas, Rung)", "Linh kiện điện tử", "L03", 20, 20, "Sẵn sàng", null, null, "Cảm biến môi trường và an ninh");
    insertDevice.run("STEM-008", "Cuộn nhựa in 3D PLA 1.75mm (Trắng/Xanh/Đỏ)", "Vật tư tiêu hao", "L06", 6, 6, "Sẵn sàng", null, null, "Vật tư tiêu hao dùng cho máy in 3D");
  }

  // Lịch sử dụng phòng mẫu
  const bookingCount = db.prepare("SELECT COUNT(*) as count FROM bookings").get().count;
  if (bookingCount === 0) {
    const insertBooking = db.prepare(
      "INSERT INTO bookings (name, class_name, date, session, periods, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertBooking.run("Trần Hà Anh", "11 TIN", "2026-11-14", "afternoon", JSON.stringify([1, 2]), "Nghiên cứu khoa học kỹ thuật - Đề tài IoT", "Chờ duyệt");
    insertBooking.run("Quàng Bảo Trâm", "11 SINH", "2026-11-15", "morning", JSON.stringify([1, 2, 3]), "Sinh hoạt câu lạc bộ STEM - Mô hình sinh học", "Đã duyệt");
    insertBooking.run("Lê Hoàng Nam", "10 CHUYÊN TOÁN", "2026-11-16", "morning", JSON.stringify([4, 5]), "Lập trình Robot VEX và in 3D bánh răng", "Đã duyệt");
  }

  // Nhật ký ra/vào mẫu
  const entryCount = db.prepare("SELECT COUNT(*) as count FROM entry_logs").get().count;
  if (entryCount === 0) {
    const insertEntry = db.prepare(
      "INSERT INTO entry_logs (direction, label, count, camera, time, date) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertEntry.run("in", "Phát hiện người đi vào", 2, "Camera tổng quan", "07:58:12", "13/11/2026");
    insertEntry.run("out", "Phát hiện người đi ra", 1, "Camera tổng quan", "08:36:45", "13/11/2026");
    insertEntry.run("in", "Phát hiện người đi vào", 3, "Camera tổng quan", "09:02:08", "13/11/2026");
  }
}
