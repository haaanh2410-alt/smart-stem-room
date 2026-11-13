import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import http from "node:http";
import url from "node:url";
import { db, initDatabase } from "./database.js";

const PORT = process.env.PORT || 5000;

// Khởi tạo database
initDatabase();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    return res.end();
  }

  try {
    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    if (pathname === "/api/auth/login" && method === "POST") {
      const { username, password } = await parseBody(req);
      const user = db.prepare("SELECT id, username, name, role, department FROM users WHERE username = ? AND password = ?").get(username, password);
      if (!user) {
        return sendJson(res, 401, { success: false, message: "Sai tên đăng nhập hoặc mật khẩu" });
      }
      return sendJson(res, 200, {
        success: true,
        user,
        token: `token_${user.id}_${Date.now()}`
      });
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      const authHeader = req.headers.authorization || "";
      const match = authHeader.match(/^Bearer token_(\d+)_/);
      if (match) {
        const userId = Number(match[1]);
        const user = db.prepare("SELECT id, username, name, role, department FROM users WHERE id = ?").get(userId);
        if (user) return sendJson(res, 200, { success: true, user });
      }
      return sendJson(res, 401, { success: false, message: "Chưa đăng nhập" });
    }

    if (pathname === "/api/users" && method === "GET") {
      const users = db.prepare("SELECT id, username, name, role, department, created_at FROM users").all();
      return sendJson(res, 200, { success: true, users });
    }

    // ----------------------------------------------------
    // STATS / SUMMARY
    // ----------------------------------------------------
    if (pathname === "/api/stats/summary" && method === "GET") {
      const bookingsCount = db.prepare("SELECT COUNT(*) as count FROM bookings").get().count;
      const pendingCount = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Chờ duyệt'").get().count;
      const lockers = db.prepare("SELECT * FROM lockers").all();
      const openLockers = lockers.filter(l => l.state === "open").length;
      const entryCount = db.prepare("SELECT COUNT(*) as count FROM entry_logs").get().count;
      const devicesCount = db.prepare("SELECT COUNT(*) as count FROM devices").get().count;
      const borrowedDevices = db.prepare("SELECT COUNT(*) as count FROM devices WHERE status = 'Đang sử dụng'").get().count;

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalBookings: bookingsCount,
          pendingBookings: pendingCount,
          totalLockers: lockers.length,
          openLockers,
          entryEvents: entryCount,
          totalDevices: devicesCount,
          borrowedDevices
        }
      });
    }

    // ----------------------------------------------------
    // BOOKINGS
    // ----------------------------------------------------
    if (pathname === "/api/bookings" && method === "GET") {
      const bookings = db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
      const parsed = bookings.map(b => ({
        ...b,
        periods: JSON.parse(b.periods || "[]")
      }));
      return sendJson(res, 200, { success: true, bookings: parsed });
    }

    if (pathname === "/api/bookings" && method === "POST") {
      const { name, className, date, session, periods, purpose } = await parseBody(req);
      if (!name || !className || !date || !session || !periods || !periods.length) {
        return sendJson(res, 400, { success: false, message: "Vui lòng điền đầy đủ các thông tin bắt buộc" });
      }

      // Check conflict
      const existing = db.prepare("SELECT * FROM bookings WHERE date = ? AND session = ? AND status != 'Từ chối'").all();
      const requestedPeriods = Array.isArray(periods) ? periods : [periods];

      const conflict = existing.some(b => {
        try {
          const bookedPeriods = JSON.parse(b.periods || "[]");
          return bookedPeriods.some(p => requestedPeriods.includes(p));
        } catch {
          return false;
        }
      });

      if (conflict) {
        return sendJson(res, 409, {
          success: false,
          message: "Một hoặc nhiều tiết trong khung giờ này đã có người đăng ký. Vui lòng chọn tiết khác."
        });
      }

      const stmt = db.prepare(
        "INSERT INTO bookings (name, class_name, date, session, periods, purpose, status) VALUES (?, ?, ?, ?, ?, ?, 'Chờ duyệt')"
      );
      const result = stmt.run(name, className, date, session, JSON.stringify(requestedPeriods), purpose || "Học tập và thực hành STEM");

      const created = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid);
      created.periods = JSON.parse(created.periods || "[]");

      return sendJson(res, 201, { success: true, booking: created, message: "Đăng ký thành công, đang chờ duyệt" });
    }

    // Update booking status: PUT /api/bookings/:id/status
    const bookingStatusMatch = pathname.match(/^\/api\/bookings\/(\d+)\/status$/);
    if (bookingStatusMatch && method === "PUT") {
      const bookingId = Number(bookingStatusMatch[1]);
      const { status } = await parseBody(req);
      if (!["Chờ duyệt", "Đã duyệt", "Từ chối"].includes(status)) {
        return sendJson(res, 400, { success: false, message: "Trạng thái không hợp lệ" });
      }
      db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(status, bookingId);
      return sendJson(res, 200, { success: true, message: `Đã cập nhật trạng thái thành "${status}"` });
    }

    // Delete booking: DELETE /api/bookings/:id
    const bookingDeleteMatch = pathname.match(/^\/api\/bookings\/(\d+)$/);
    if (bookingDeleteMatch && method === "DELETE") {
      const bookingId = Number(bookingDeleteMatch[1]);
      db.prepare("DELETE FROM bookings WHERE id = ?").run(bookingId);
      return sendJson(res, 200, { success: true, message: "Đã xóa yêu cầu đăng ký" });
    }

    // ----------------------------------------------------
    // LOCKERS & SENSORS
    // ----------------------------------------------------
    if (pathname === "/api/lockers" && method === "GET") {
      const lockers = db.prepare("SELECT * FROM lockers ORDER BY id ASC").all();
      return sendJson(res, 200, { success: true, lockers });
    }

    // Update locker state: PUT /api/lockers/:id (from simulation or ESP32 webhook)
    const lockerUpdateMatch = pathname.match(/^\/api\/lockers\/([a-zA-Z0-9_-]+)$/);
    if (lockerUpdateMatch && (method === "PUT" || method === "POST")) {
      const lockerId = lockerUpdateMatch[1].toUpperCase();
      const body = await parseBody(req);
      const locker = db.prepare("SELECT * FROM lockers WHERE id = ?").get(lockerId);
      if (!locker) {
        return sendJson(res, 404, { success: false, message: "Không tìm thấy hộc tủ" });
      }

      const nextState = body.state || (locker.state === "open" ? "closed" : "open");
      const source = body.source || "Mô phỏng";
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = now.toLocaleDateString("vi-VN");

      db.prepare("UPDATE lockers SET state = ?, updated_at = ? WHERE id = ?").run(nextState, timeStr, lockerId);

      // Record log
      const eventName = nextState === "open" ? "Mở hộc tủ" : "Đóng hộc tủ";
      db.prepare(
        "INSERT INTO locker_logs (locker_id, locker_name, event, source, time, date) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(locker.id, locker.name, eventName, source, timeStr, dateStr);

      const updated = db.prepare("SELECT * FROM lockers WHERE id = ?").get(lockerId);
      return sendJson(res, 200, {
        success: true,
        locker: updated,
        message: `Đã cập nhật trạng thái ${locker.name}: ${nextState === "open" ? "Đang mở" : "Đang đóng"}`
      });
    }

    if (pathname === "/api/locker-logs" && method === "GET") {
      const logs = db.prepare("SELECT * FROM locker_logs ORDER BY id DESC LIMIT 100").all();
      return sendJson(res, 200, { success: true, logs });
    }

    // ----------------------------------------------------
    // CAMERA & ENTRY LOGS
    // ----------------------------------------------------
    if (pathname === "/api/entry-logs" && method === "GET") {
      const logs = db.prepare("SELECT * FROM entry_logs ORDER BY id DESC LIMIT 100").all();
      return sendJson(res, 200, { success: true, logs });
    }

    if (pathname === "/api/entry-logs" && method === "POST") {
      const { direction, label, count, camera } = await parseBody(req);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = now.toLocaleDateString("vi-VN");

      const stmt = db.prepare(
        "INSERT INTO entry_logs (direction, label, count, camera, time, date) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const result = stmt.run(
        direction || "in",
        label || (direction === "out" ? "Phát hiện người đi ra" : "Phát hiện người đi vào"),
        Number(count) || 1,
        camera || "Camera phòng STEM",
        timeStr,
        dateStr
      );

      const created = db.prepare("SELECT * FROM entry_logs WHERE id = ?").get(result.lastInsertRowid);
      return sendJson(res, 201, { success: true, log: created });
    }

    // ----------------------------------------------------
    // DEVICES MANAGEMENT (CRUD + BORROW / RETURN)
    // ----------------------------------------------------
    if (pathname === "/api/devices" && method === "GET") {
      const devices = db.prepare("SELECT * FROM devices ORDER BY id ASC").all();
      return sendJson(res, 200, { success: true, devices });
    }

    if (pathname === "/api/devices" && method === "POST") {
      const { code, name, category, locker_id, quantity, description } = await parseBody(req);
      if (!name || !category) {
        return sendJson(res, 400, { success: false, message: "Tên thiết bị và danh mục là bắt buộc" });
      }

      // Generate code if not provided
      let finalCode = code;
      if (!finalCode) {
        const last = db.prepare("SELECT id FROM devices ORDER BY id DESC LIMIT 1").get();
        const nextId = (last?.id || 0) + 1;
        finalCode = `STEM-${String(nextId).padStart(3, "0")}`;
      }

      try {
        const q = Number(quantity) || 1;
        const stmt = db.prepare(
          "INSERT INTO devices (code, name, category, locker_id, quantity, available, status, description) VALUES (?, ?, ?, ?, ?, ?, 'Sẵn sàng', ?)"
        );
        const result = stmt.run(finalCode, name, category, locker_id || "L01", q, q, description || "");
        const created = db.prepare("SELECT * FROM devices WHERE id = ?").get(result.lastInsertRowid);
        return sendJson(res, 201, { success: true, device: created, message: "Đã thêm thiết bị mới" });
      } catch (err) {
        if (err.message?.includes("UNIQUE")) {
          return sendJson(res, 400, { success: false, message: "Mã thiết bị đã tồn tại" });
        }
        throw err;
      }
    }

    // Edit device: PUT /api/devices/:id
    const deviceEditMatch = pathname.match(/^\/api\/devices\/(\d+)$/);
    if (deviceEditMatch && method === "PUT") {
      const deviceId = Number(deviceEditMatch[1]);
      const { name, category, locker_id, quantity, available, status, description } = await parseBody(req);
      db.prepare(`
        UPDATE devices
        SET name = COALESCE(?, name),
            category = COALESCE(?, category),
            locker_id = COALESCE(?, locker_id),
            quantity = COALESCE(?, quantity),
            available = COALESCE(?, available),
            status = COALESCE(?, status),
            description = COALESCE(?, description)
        WHERE id = ?
      `).run(name, category, locker_id, quantity, available, status, description, deviceId);

      const updated = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
      return sendJson(res, 200, { success: true, device: updated, message: "Đã cập nhật thiết bị" });
    }

    // Delete device: DELETE /api/devices/:id
    if (deviceEditMatch && method === "DELETE") {
      const deviceId = Number(deviceEditMatch[1]);
      db.prepare("DELETE FROM devices WHERE id = ?").run(deviceId);
      return sendJson(res, 200, { success: true, message: "Đã xóa thiết bị khỏi danh mục" });
    }

    // Borrow device: POST /api/devices/:id/borrow
    const deviceBorrowMatch = pathname.match(/^\/api\/devices\/(\d+)\/borrow$/);
    if (deviceBorrowMatch && method === "POST") {
      const deviceId = Number(deviceBorrowMatch[1]);
      const { borrower } = await parseBody(req);
      if (!borrower) return sendJson(res, 400, { success: false, message: "Vui lòng nhập tên người mượn" });

      const dev = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
      if (!dev) return sendJson(res, 404, { success: false, message: "Không tìm thấy thiết bị" });
      if (dev.available <= 0) return sendJson(res, 400, { success: false, message: "Thiết bị này hiện đã được mượn hết" });

      const newAvailable = dev.available - 1;
      const newStatus = newAvailable === 0 ? "Đang sử dụng" : dev.status;
      const today = new Date().toLocaleDateString("vi-VN");

      db.prepare("UPDATE devices SET available = ?, status = ?, borrower = ?, borrow_date = ? WHERE id = ?")
        .run(newAvailable, newStatus, borrower, today, deviceId);

      const updated = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
      return sendJson(res, 200, { success: true, device: updated, message: `Đã ghi nhận mượn thiết bị cho ${borrower}` });
    }

    // Return device: POST /api/devices/:id/return
    const deviceReturnMatch = pathname.match(/^\/api\/devices\/(\d+)\/return$/);
    if (deviceReturnMatch && method === "POST") {
      const deviceId = Number(deviceReturnMatch[1]);
      const dev = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
      if (!dev) return sendJson(res, 404, { success: false, message: "Không tìm thấy thiết bị" });

      const newAvailable = Math.min(dev.quantity, dev.available + 1);
      const newStatus = newAvailable > 0 ? "Sẵn sàng" : dev.status;

      db.prepare("UPDATE devices SET available = ?, status = ?, borrower = NULL, borrow_date = NULL WHERE id = ?")
        .run(newAvailable, newStatus, deviceId);

      const updated = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
      return sendJson(res, 200, { success: true, device: updated, message: "Đã hoàn trả thiết bị vào hộc tủ" });
    }

    // ----------------------------------------------------
    // CSV EXPORT (EXCEL COMPATIBLE UTF-8 WITH BOM)
    // ----------------------------------------------------
    if (pathname === "/api/export/csv" && method === "GET") {
      const type = parsedUrl.query.type || "bookings";
      let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

      if (type === "bookings") {
        csvContent += "ID,Người đăng ký,Lớp/Đơn vị,Ngày,Buổi,Tiết,Mục đích,Trạng thái,Thời gian tạo\n";
        const rows = db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
        rows.forEach(r => {
          let periods = "";
          try { periods = JSON.parse(r.periods).join("; "); } catch { periods = r.periods; }
          const sessionLabel = r.session === "morning" ? "Buổi sáng" : "Buổi chiều";
          csvContent += `"${r.id}","${r.name}","${r.class_name}","${r.date}","${sessionLabel}","${periods}","${r.purpose}","${r.status}","${r.created_at}"\n`;
        });
      } else if (type === "devices") {
        csvContent += "Mã TB,Tên thiết bị,Danh mục,Vị trí hộc tủ,Tổng số lượng,Khả dụng,Trạng thái,Người đang mượn,Ngày mượn\n";
        const rows = db.prepare("SELECT * FROM devices ORDER BY id ASC").all();
        rows.forEach(r => {
          csvContent += `"${r.code}","${r.name}","${r.category}","${r.locker_id}","${r.quantity}","${r.available}","${r.status}","${r.borrower || ''}","${r.borrow_date || ''}"\n`;
        });
      } else if (type === "locker-logs") {
        csvContent += "ID,Hộc tủ,Sự kiện,Nguồn,Thời gian,Ngày\n";
        const rows = db.prepare("SELECT * FROM locker_logs ORDER BY id DESC").all();
        rows.forEach(r => {
          csvContent += `"${r.id}","${r.locker_name}","${r.event}","${r.source}","${r.time}","${r.date}"\n`;
        });
      } else if (type === "entry-logs") {
        csvContent += "ID,Thời gian,Ngày,Hướng,Mô tả,Số người,Camera\n";
        const rows = db.prepare("SELECT * FROM entry_logs ORDER BY id DESC").all();
        rows.forEach(r => {
          const dir = r.direction === "in" ? "Đi vào" : "Đi ra";
          csvContent += `"${r.id}","${r.time}","${r.date}","${dir}","${r.label}","${r.count}","${r.camera}"\n`;
        });
      }

      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="smart_stem_${type}_${Date.now()}.csv"`,
        "Access-Control-Allow-Origin": "*"
      });
      return res.end(csvContent);
    }

    // Phục vụ giao diện React (thư mục dist) khi đưa lên mạng

    const distDir = path.join(__dirname, "../dist");
    let filePath = path.join(distDir, pathname === "/" ? "index.html" : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, "index.html");
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".json": "application/json"
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      return fs.createReadStream(filePath).pipe(res);
    }

    // Default 404
    sendJson(res, 404, { success: false, message: `Endpoint ${pathname} không tồn tại` });

  } catch (error) {
    console.error("Server Error:", error);
    sendJson(res, 500, { success: false, message: "Lỗi máy chủ nội bộ", error: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Smart STEM Backend] Server dang chay tai: http://localhost:${PORT}`);
  console.log(`[Smart STEM Backend] Ho tro ket noi ngoai mang LAN: http://0.0.0.0:${PORT}`);
  console.log(`[Smart STEM Backend] SQLite Database tai: ./smart_stem.db`);
});
