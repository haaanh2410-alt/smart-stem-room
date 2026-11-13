import React, { useState } from "react";
import { translations } from "./translations";

const DAYS_VI = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIODS = [
  { id: 1, sessionVi: "Sáng", sessionEn: "Morning", labelVi: "Tiết 1", labelEn: "Period 1", time: "07:20 - 08:10" },
  { id: 2, sessionVi: "Sáng", sessionEn: "Morning", labelVi: "Tiết 2", labelEn: "Period 2", time: "08:25 - 09:10" },
  { id: 3, sessionVi: "Sáng", sessionEn: "Morning", labelVi: "Tiết 3", labelEn: "Period 3", time: "09:15 - 10:00" },
  { id: 4, sessionVi: "Sáng", sessionEn: "Morning", labelVi: "Tiết 4", labelEn: "Period 4", time: "10:05 - 10:50" },
  { id: 5, sessionVi: "Sáng", sessionEn: "Morning", labelVi: "Tiết 5", labelEn: "Period 5", time: "10:55 - 11:40" },
  { id: 6, sessionVi: "Chiều", sessionEn: "Afternoon", labelVi: "Tiết 6", labelEn: "Period 6", time: "14:00 - 14:45" },
  { id: 7, sessionVi: "Chiều", sessionEn: "Afternoon", labelVi: "Tiết 7", labelEn: "Period 7", time: "14:50 - 15:35" },
  { id: 8, sessionVi: "Chiều", sessionEn: "Afternoon", labelVi: "Tiết 8", labelEn: "Period 8", time: "15:40 - 16:25" },
];

function getWeekDates(weekOffset = 0, isEn = false) {
  const today = new Date();
  const currentDay = today.getDay(); // 0 là Chủ nhật, 1 là Thứ 2
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);

  const daysList = isEn ? DAYS_EN : DAYS_VI;

  return daysList.map((dayName, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const isoDate = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { dayName, isoDate, displayDate };
  });
}

export default function WeeklySchedule({ bookings = [], currentUser, onAddBooking, lang = "vi" }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [guestName, setGuestName] = useState(currentUser?.name || "");
  const [guestPhone, setGuestPhone] = useState("");
  const isEn = lang === "en";
  const t = translations[lang]?.schedule || translations.vi.schedule;
  const [purpose, setPurpose] = useState(t.defaultPurpose);

  const weekDates = getWeekDates(weekOffset, isEn);

  const findBooking = (isoDate, periodId) => {
    return bookings.find(
      (b) =>
        b.date === isoDate &&
        Number(b.period) === periodId &&
        b.status !== "rejected"
    );
  };

  const handleOpenModal = (dayObj, periodObj) => {
    setSelectedSlot({ ...dayObj, ...periodObj });
    setGuestName(currentUser?.role === "guest" ? "" : currentUser?.name || "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const newBooking = {
      id: Date.now(),
      date: selectedSlot.isoDate,
      period: selectedSlot.id,
      session: selectedSlot.sessionVi === "Sáng" ? "morning" : "afternoon",
      userName: guestName,
      phone: guestPhone,
      role: currentUser?.role || "guest",
      purpose: purpose,
      status: "pending",
    };

    if (onAddBooking) {
      onAddBooking(newBooking);
    }
    setSelectedSlot(null);
    alert(t.successAlert);
  };

  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
      {/* Thanh điều hướng tuần */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a" }}>{t.title}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            {t.subtitle}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setWeekOffset((w) => w - 1)} style={navBtnStyle}>{t.prevWeek}</button>
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, background: "#0f172a", color: "#fff" }}>{t.thisWeek}</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} style={navBtnStyle}>{t.nextWeek}</button>
        </div>
      </div>

      {/* Bảng thời khóa biểu */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={thStyle}>{t.periodCol}</th>
              {weekDates.map((d) => (
                <th key={d.isoDate} style={thStyle}>
                  <div>{d.dayName}</div>
                  <div style={{ fontSize: "12px", fontWeight: "normal", color: "#64748b" }}>{d.displayDate}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px", fontWeight: "600", background: "#f8fafc", width: "130px" }}>
                  <div>{isEn ? p.labelEn : p.labelVi} ({isEn ? p.sessionEn : p.sessionVi})</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>{p.time}</div>
                </td>

                {weekDates.map((d) => {
                  const existing = findBooking(d.isoDate, p.id);
                  return (
                    <td key={d.isoDate} style={{ padding: "6px", borderLeft: "1px solid #f1f5f9", textAlign: "center" }}>
                      {existing ? (
                        <div style={{
                          padding: "8px 6px", borderRadius: "6px",
                          background: existing.status === "pending" ? "#fef3c7" : "#fee2e2",
                          color: existing.status === "pending" ? "#92400e" : "#991b1b",
                          fontSize: "12px", fontWeight: "500"
                        }}>
                          {existing.status === "pending" ? t.pendingSlot : t.booked}
                          {currentUser?.role !== "guest" && (
                            <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.85 }}>
                              ({existing.userName})
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(d, p)}
                          style={{
                            width: "100%", padding: "8px 6px", borderRadius: "6px",
                            border: "1px dashed #22c55e", background: "#f0fdf4",
                            color: "#15803d", cursor: "pointer", fontWeight: "600", fontSize: "12px"
                          }}
                        >
                          {t.available}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Đăng ký khung giờ trống */}
      {selectedSlot && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <form onSubmit={handleSubmit} style={{
            background: "#fff", padding: "24px", borderRadius: "12px",
            width: "90%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>{t.modalTitle}</h3>
            <p style={{ fontSize: "13px", color: "#475569", background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px" }}>
              {t.timeLabel} <strong>{selectedSlot.dayName} ({selectedSlot.displayDate})</strong> - <strong>{isEn ? selectedSlot.labelEn : selectedSlot.labelVi}</strong> ({selectedSlot.time})
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>{t.nameLabel}</label>
              <input
                type="text" required value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t.namePlaceholder}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>{t.phoneLabel}</label>
              <input
                type="tel" required value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>{t.purposeLabel}</label>
              <input
                type="text" value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" onClick={() => setSelectedSlot(null)} style={navBtnStyle}>{translations[lang]?.common?.cancel || "Hủy"}</button>
              <button type="submit" style={{ ...navBtnStyle, background: "#16a34a", color: "#fff", border: "none" }}>
                {t.submitBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "12px 8px", textAlign: "center", color: "#334155" };
const navBtnStyle = { padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "500" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px", color: "#334155" };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" };
