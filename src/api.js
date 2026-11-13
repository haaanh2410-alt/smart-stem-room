const API_BASE = "/api";

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Lỗi máy chủ (${res.status})`);
    }
    return data;
  } catch (err) {
    console.warn(`[API] Không kết nối được ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  getUsers: () => request("/users"),

  // Stats
  getStats: () => request("/stats/summary"),

  // Bookings
  getBookings: () => request("/bookings"),
  createBooking: (booking) =>
    request("/bookings", { method: "POST", body: JSON.stringify(booking) }),
  updateBookingStatus: (id, status) =>
    request(`/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteBooking: (id) =>
    request(`/bookings/${id}`, { method: "DELETE" }),

  // Lockers
  getLockers: () => request("/lockers"),
  updateLocker: (id, state, source = "Mô phỏng") =>
    request(`/lockers/${id}`, { method: "PUT", body: JSON.stringify({ state, source }) }),
  getLockerLogs: () => request("/locker-logs"),

  // Entry logs
  getEntryLogs: () => request("/entry-logs"),
  createEntryLog: (entry) =>
    request("/entry-logs", { method: "POST", body: JSON.stringify(entry) }),

  // Devices
  getDevices: () => request("/devices"),
  createDevice: (device) =>
    request("/devices", { method: "POST", body: JSON.stringify(device) }),
  updateDevice: (id, device) =>
    request(`/devices/${id}`, { method: "PUT", body: JSON.stringify(device) }),
  deleteDevice: (id) =>
    request(`/devices/${id}`, { method: "DELETE" }),
  borrowDevice: (id, borrower) =>
    request(`/devices/${id}/borrow`, { method: "POST", body: JSON.stringify({ borrower }) }),
  returnDevice: (id) =>
    request(`/devices/${id}/return`, { method: "POST" }),

  // Export
  getExportCsvUrl: (type) => `${API_BASE}/export/csv?type=${type}`
};
