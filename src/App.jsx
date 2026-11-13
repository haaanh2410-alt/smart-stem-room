import React, { useEffect, useMemo, useState, useRef } from "react";
import { translations } from "./translations";
import {
  Activity, Archive, CalendarDays, Camera, CheckCircle2, ChevronRight, Cpu,
  DoorOpen, FileSpreadsheet, History, LayoutDashboard, Menu, Package,
  Plus, ShieldCheck, Users, Video, X, Lock, LockOpen, Clock3, ClipboardList,
  ArrowDownToLine, ArrowUpFromLine, AlertCircle, Search, Filter, Download,
  UserCheck, LogIn, LogOut, RefreshCw, Trash2, Edit, Play, Square, VideoOff
} from "lucide-react";
import { api } from "./api.js";
import WeeklySchedule from "./WeeklySchedule";

const sessionInfo = {
  morning: {
    label: "Buổi sáng",
    labelEn: "Morning",
    periods: 5,
    times: ["07:00–07:45", "07:50–08:35", "08:40–09:25", "09:40–10:25", "10:30–11:15"]
  },
  afternoon: {
    label: "Buổi chiều",
    labelEn: "Afternoon",
    periods: 3,
    times: ["13:00–13:45", "13:50–14:35", "14:40–15:25"]
  }
};

const navItems = [
  ["Tổng quan", "dashboard", LayoutDashboard, ["admin", "principal", "manager", "teacher", "student", "guest"]],
  ["Đăng ký lịch", "booking", CalendarDays, ["admin", "manager", "teacher", "student", "guest"]],
  ["Quản lý đăng ký", "manage", ClipboardList, ["admin", "manager"]],
  ["Giám sát hộc tủ", "lockers", Archive, ["admin", "manager", "teacher"]],
  ["Lịch sử hộc tủ", "locker-history", History, ["admin", "principal", "manager"]],
  ["Camera tổng quan", "camera", Camera, ["admin", "principal", "manager"]],
  ["Báo cáo ra/vào", "entry-report", Users, ["admin", "principal", "manager"]],
  ["Thiết bị STEM", "devices", Package, ["admin", "manager", "teacher", "student"]],
  ["Báo cáo thống kê", "reports", FileSpreadsheet, ["admin", "principal", "manager"]]
];

const mockUsers = [
  { id: 1, username: "admin", name: "Trần Hà Anh", role: "admin", department: "Quản trị hệ thống", departmentEn: "System Administration" },
  { id: 2, username: "bangiamhieu", name: "Cô Phạm Thị Thuận", role: "principal", department: "Hiệu Trưởng", departmentEn: "Principal" },
  { id: 3, username: "giaovien", name: "Cô Trần Thị Lan", role: "teacher", department: "Giáo viên Tin học - STEM", departmentEn: "Computer Science & STEM Teacher" },
  { id: 4, username: "quanli", name: "Mai Hồng Loan", role: "manager", department: "Quản lí Phòng STEM", departmentEn: "STEM Lab Manager" },
  { id: 5, username: "hocsinh", name: "Trần Hà Anh", role: "student", department: "Lớp 11 Tin", departmentEn: "Class 11 CS" },
  { id: 6, username: "khach", name: "Bông", role: "guest", department: "Khách tham quan", departmentEn: "Visitor / Guest" }
];

export default function App() {
  const [lang, setLang] = useState("vi"); // "vi" | "en"
  const t = translations[lang] || translations.vi;
  const isEn = lang === "en";

  const [page, setPage] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");

  // User Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("stem-current-user");
      return saved ? JSON.parse(saved) : mockUsers[0];
    } catch {
      return mockUsers[0];
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core Data States
  const [bookings, setBookings] = useState([]);
  const [lockers, setLockers] = useState([]);
  const [lockerLogs, setLockerLogs] = useState([]);
  const [entryLogs, setEntryLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [backendOnline, setBackendOnline] = useState(true);

  // Load all data on mount and refresh
  async function loadData() {
    try {
      const [bRes, lRes, llRes, eRes, dRes] = await Promise.allSettled([
        api.getBookings(),
        api.getLockers(),
        api.getLockerLogs(),
        api.getEntryLogs(),
        api.getDevices()
      ]);

      if (bRes.status === "fulfilled" && bRes.value.bookings) {
        setBookings(bRes.value.bookings);
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
      if (lRes.status === "fulfilled" && lRes.value.lockers) setLockers(lRes.value.lockers);
      if (llRes.status === "fulfilled" && llRes.value.logs) setLockerLogs(llRes.value.logs);
      if (eRes.status === "fulfilled" && eRes.value.logs) setEntryLogs(eRes.value.logs);
      if (dRes.status === "fulfilled" && dRes.value.devices) setDevices(dRes.value.devices);
    } catch (err) {
      console.warn("Backend offline, using local fallback:", err);
      setBackendOnline(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for sync
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("stem-current-user", JSON.stringify(currentUser));
  }, [currentUser]);

  function notify(msg, type = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 6000);
  }

  // --- Handlers ---
  async function handleAddBooking(form) {
    try {
      const res = await api.createBooking(form);
      if (res.success) {
        setBookings(prev => [res.booking, ...prev]);
        setPage("manage");
        notify(isEn ? "Room booking request submitted successfully!" : "Đã gửi yêu cầu đăng ký lịch sử dụng phòng thành công!");
        return true;
      }
    } catch (err) {
      notify(err.message || (isEn ? "Room booking error" : "Lỗi đăng ký lịch phòng"), "error");
      return false;
    }
  }

  async function handleUpdateBookingStatus(id, status) {
    try {
      await api.updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      const statusLabel = t.statuses[status] || status;
      notify(isEn ? `Updated booking status to: ${statusLabel}` : `Đã cập nhật trạng thái đăng ký thành: ${statusLabel}`);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleDeleteBooking(id) {
    const confirmMsg = isEn ? "Are you sure you want to delete this booking?" : "Bạn có chắc chắn muốn xóa lượt đăng ký này?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      notify(isEn ? "Booking request deleted" : "Đã xóa lượt đăng ký");
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleToggleLocker(id) {
    const target = lockers.find(l => l.id === id);
    if (!target) return;
    const nextState = target.state === "open" ? "closed" : "open";
    try {
      const res = await api.updateLocker(id, nextState, isEn ? "UI Simulation" : "Mô phỏng giao diện");
      if (res.success) {
        setLockers(prev => prev.map(l => l.id === id ? res.locker : l));
        const actionStr = nextState === "open" ? (isEn ? "OPENED" : "MỞ") : (isEn ? "CLOSED" : "ĐÓNG");
        notify(isEn ? `${target.name} is now ${actionStr} (Saved to SQLite)` : `Đã ${actionStr} ${target.name} (Đã ghi vào cơ sở dữ liệu SQLite)`);
        // Refresh logs
        const lRes = await api.getLockerLogs();
        if (lRes.logs) setLockerLogs(lRes.logs);
      }
    } catch (err) {
      notify(isEn ? "Error updating locker state" : "Lỗi cập nhật trạng thái hộc tủ", "error");
    }
  }

  async function handleAddEntryLog(direction, label, count = 1) {
    try {
      const res = await api.createEntryLog({ direction, label, count, camera: isEn ? "STEM Room AI Camera" : "Camera AI phòng STEM" });
      if (res.success) {
        setEntryLogs(prev => [res.log, ...prev]);
        notify(isEn ? `Recorded event: ${label} (${count} people)` : `Đã ghi nhận sự kiện: ${label} (${count} người)`);
      }
    } catch (err) {
      notify(isEn ? "Error recording camera event" : "Lỗi ghi nhận sự kiện camera", "error");
    }
  }

  // Devices handlers
  async function handleAddDevice(dev) {
    try {
      const res = await api.createDevice(dev);
      if (res.success) {
        setDevices(prev => [...prev, res.device]);
        notify(isEn ? `Added new equipment: ${res.device.name}` : `Đã thêm thiết bị mới: ${res.device.name}`);
        return true;
      }
    } catch (err) {
      notify(err.message, "error");
      return false;
    }
  }

  async function handleUpdateDevice(id, data) {
    try {
      const res = await api.updateDevice(id, data);
      if (res.success) {
        setDevices(prev => prev.map(d => d.id === id ? res.device : d));
        notify(isEn ? "Updated equipment info" : "Đã cập nhật thông tin thiết bị");
        return true;
      }
    } catch (err) {
      notify(err.message, "error");
      return false;
    }
  }

  async function handleDeleteDevice(id) {
    const confirmMsg = isEn ? "Are you sure you want to delete this equipment from the system?" : "Bạn có chắc chắn muốn xóa thiết bị này khỏi hệ thống?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      notify(isEn ? "Equipment removed from inventory" : "Đã xóa thiết bị khỏi danh mục");
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleBorrowDevice(id, borrower) {
    try {
      const res = await api.borrowDevice(id, borrower);
      if (res.success) {
        setDevices(prev => prev.map(d => d.id === id ? res.device : d));
        notify(isEn ? `Lent equipment: ${res.device.name} to ${borrower}` : `Đã cho mượn thiết bị: ${res.device.name} cho ${borrower}`);
        return true;
      }
    } catch (err) {
      notify(err.message, "error");
      return false;
    }
  }

  async function handleReturnDevice(id) {
    try {
      const res = await api.returnDevice(id);
      if (res.success) {
        setDevices(prev => prev.map(d => d.id === id ? res.device : d));
        notify(isEn ? `Returned equipment: ${res.device.name} to storage locker` : `Đã hoàn trả thiết bị: ${res.device.name} vào kho hộc tủ`);
      }
    } catch (err) {
      notify(err.message, "error");
    }
  }

  const pending = useMemo(() => bookings.filter(b => b.status === "Chờ duyệt").length, [bookings]);
  const openLockers = lockers.filter(x => x.state === "open").length;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Cpu size={23} /></div>
          <div><strong>SMART STEM</strong><span>ROOM MANAGEMENT</span></div>
          <button className="close-nav" onClick={() => setMobileNav(false)}><X size={19}/></button>
        </div>
        <div className="side-label">{t.common.workspace}</div>
        <nav>
          {navItems.filter((item) => item[3].includes(currentUser.role)).map(([label, key, Icon]) => (
            <button key={key} className={`nav-item ${page === key ? "active" : ""}`}
              onClick={() => { setPage(key); setMobileNav(false); }}>
              <Icon size={18}/><span>{t.nav[key] || label}</span>
              {key === "manage" && pending > 0 && <b className="nav-count">{pending}</b>}
              {key === "lockers" && openLockers > 0 && <b className="nav-count">{openLockers}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini" onClick={() => setShowAuthModal(true)} style={{ cursor: "pointer" }} title={isEn ? "Click to switch role" : "Nhấn để đổi vai trò"}>
            <div className="avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <b>{currentUser.name}</b>
              <span>{t.roles[currentUser.role] || currentUser.role}</span>
            </div>
          </div>
          <div className="sidebar-note">
            {t.common.dbStatus} ({backendOnline ? t.common.connected : t.common.offline})<br/>
            {t.common.version}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)}><Menu/></button>
          <div className="breadcrumb">
            SMART STEM ROOM <ChevronRight size={14}/> <b>{t.nav[page] || navItems.find(x => x[1] === page)?.[0] || t.common.system}</b>
          </div>
          <div className="top-right">
            {/* Nút chuyển đổi ngôn ngữ */}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="user-selector-btn"
              style={{ fontWeight: "700", minWidth: "75px", justifyContent: "center" }}
              title="Chuyển đổi ngôn ngữ / Switch Language"
            >
              {lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
            </button>

            <span className={backendOnline ? "online-dot" : "online-dot is-open"} style={backendOnline ? {} : { background: "#e55353" }}/>
            <span>{backendOnline ? t.common.serverConnected : t.common.serverDisconnected}</span>

            <button className="user-selector-btn" onClick={() => setShowAuthModal(true)}>
              <UserCheck size={14}/>
              <b>{currentUser.name}</b>
              <span className="user-badge-role">{t.roles[currentUser.role] || currentUser.role}</span>
            </button>
          </div>
        </header>

        <div className="content">
          {notice && (
            <div className="notice" style={noticeType === "error" ? { background: "#ffebee", color: "#c62828" } : {}}>
              <CheckCircle2 size={17}/>
              <span>{notice}</span>
              <button onClick={() => setNotice("")}><X size={16}/></button>
            </div>
          )}

          {page === "dashboard" && (
            <Dashboard
              bookings={bookings}
              pending={pending}
              lockers={lockers}
              entryLogs={entryLogs}
              devices={devices}
              backendOnline={backendOnline}
              onNavigate={setPage}
              lang={lang}
            />
          )}

          {page === "booking" && (
            <WeeklySchedule
              bookings={bookings}
              currentUser={currentUser}
              onAddBooking={handleAddBooking}
              lang={lang}
            />
          )}

          {page === "manage" && (
            <ManagePage
              bookings={bookings}
              currentUser={currentUser}
              onUpdate={handleUpdateBookingStatus}
              onDelete={handleDeleteBooking}
              lang={lang}
            />
          )}

          {page === "lockers" && (
            <LockersPage
              lockers={lockers}
              onToggle={handleToggleLocker}
              lang={lang}
            />
          )}

          {page === "locker-history" && (
            <LockerHistoryPage logs={lockerLogs} lang={lang} />
          )}

          {page === "camera" && (
            <CameraPage onRecordEntry={handleAddEntryLog} lang={lang} />
          )}

          {page === "entry-report" && (
            <EntryReportPage logs={entryLogs} lang={lang} />
          )}

          {page === "devices" && (
            <DevicesPage
              devices={devices}
              lockers={lockers}
              currentUser={currentUser}
              onAdd={handleAddDevice}
              onUpdate={handleUpdateDevice}
              onDelete={handleDeleteDevice}
              onBorrow={handleBorrowDevice}
              onReturn={handleReturnDevice}
              lang={lang}
            />
          )}

          {page === "reports" && (
            <ReportsPage
              bookings={bookings}
              lockerLogs={lockerLogs}
              entryLogs={entryLogs}
              lockers={lockers}
              devices={devices}
              lang={lang}
            />
          )}
        </div>

        <footer>
          {t.common.footerText}
        </footer>
      </main>

      {/* Modal Đổi tài khoản / Vai trò */}
      {showAuthModal && (
        <AuthModal
          currentUser={currentUser}
          onSelectUser={(u) => {
            setCurrentUser(u);
            setShowAuthModal(false);
            const roleName = t.roles[u.role] || u.role;
            notify(isEn ? `Switched role to: ${u.name} (${roleName})` : `Đã chuyển sang vai trò: ${u.name} (${roleName})`);
          }}
          onClose={() => setShowAuthModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}

// ==========================================
// COMPONENT: PAGE HEADING & REUSABLE CARDS
// ==========================================
function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={20}/></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

// ==========================================
// PAGE: DASHBOARD
// ==========================================
function Dashboard({ bookings, pending, lockers, entryLogs, devices, backendOnline, onNavigate, lang = "vi" }) {
  const t = translations[lang]?.dashboard || translations.vi.dashboard;
  const tc = translations[lang]?.common || translations.vi.common;
  const openCount = lockers.filter(x => x.state === "open").length;
  const readyDevices = devices.filter(d => d.status === "Sẵn sàng").length;

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <button className="primary-btn" onClick={() => onNavigate("booking")}>
            <Plus size={17}/> {t.bookBtn}
          </button>
        }
      />

      <div className="welcome-banner">
        <div>
          <div className="welcome-tag">{t.bannerTag}</div>
          <h2>
            {t.bannerTitle.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i === 0 && <br/>}
              </React.Fragment>
            ))}
          </h2>
          <p>{t.bannerDesc}</p>
        </div>
        <div className="banner-art">
          <div className="orbit orbit-one"/>
          <div className="orbit orbit-two"/>
          <Cpu size={76}/>
        </div>
      </div>

      <div className="section-title">{t.sectionTitle}</div>
      <div className="stats-grid">
        <Stat icon={CalendarDays} label={t.statTotalBookings} value={bookings.length} hint={t.statTotalBookingsHint} tone="blue"/>
        <Stat icon={Clock3} label={t.statPending} value={pending} hint={t.statPendingHint} tone="orange"/>
        <Stat icon={Archive} label={t.statOpenLockers} value={openCount} hint={t.statOpenLockersHint} tone="green"/>
        <Stat icon={Package} label={t.statReadyDevices} value={readyDevices} hint={t.statReadyDevicesHint.replace("{total}", devices.length)} tone="purple"/>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t.lockersTitle}</h3>
              <p>{t.lockersDesc}</p>
            </div>
            <button className="text-btn" onClick={() => onNavigate("lockers")}>{t.viewAll}</button>
          </div>
          {lockers.slice(0, 5).map(x => (
            <div className="status-line" key={x.id}>
              <div className="status-icon"><Archive size={17}/></div>
              <span><b>{x.name}</b> ({x.location})</span>
              <b>
                <i className={x.state === "closed" ? "is-on" : "is-open"}/>
                {x.state === "closed" ? tc.closed : tc.open}
              </b>
            </div>
          ))}
          <div className="info-callout">
            {t.lockersCallout}
          </div>
        </section>

        <section className="panel system-panel">
          <div className="panel-head">
            <div>
              <h3>{t.hardwareTitle}</h3>
              <p>{t.hardwareDesc}</p>
            </div>
            <ShieldCheck size={20} className="muted"/>
          </div>

          <div className="status-line">
            <div className="status-icon"><Cpu size={17}/></div>
            <span>{t.serverBackend}</span>
            <b><i className={backendOnline ? "is-on" : ""}/> {backendOnline ? t.serverOnline : t.serverOffline}</b>
          </div>
          <div className="status-line">
            <div className="status-icon"><Archive size={17}/></div>
            <span>{t.esp32Module}</span>
            <b><i className="is-on"/> {t.esp32Ready}</b>
          </div>
          <div className="status-line">
            <div className="status-icon"><Camera size={17}/></div>
            <span>{t.cameraAi}</span>
            <b><i className="is-on"/> {t.cameraReady}</b>
          </div>
          <div className="status-line">
            <div className="status-icon"><FileSpreadsheet size={17}/></div>
            <span>{t.csvExport}</span>
            <b><i className="is-on"/> {t.csvReady}</b>
          </div>

          <div style={{ marginTop: "18px", display: "flex", gap: "8px" }}>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={() => onNavigate("devices")}>
              <Package size={15}/> {t.btnDevices}
            </button>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={() => onNavigate("camera")}>
              <Camera size={15}/> {t.btnCamera}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// ==========================================
// PAGE: MANAGE BOOKINGS
// ==========================================
function ManagePage({ bookings, currentUser, onUpdate, onDelete, lang = "vi" }) {
  const t = translations[lang]?.manage || translations.vi.manage;
  const tc = translations[lang]?.common || translations.vi.common;
  const ts = translations[lang]?.statuses || translations.vi.statuses;
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = filterStatus === "all" || b.status === filterStatus;
      const matchSearch = !searchTerm ||
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [bookings, filterStatus, searchTerm]);

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <a href={api.getExportCsvUrl("bookings")} download className="secondary-btn" style={{ textDecoration: "none" }}>
            <Download size={15}/> {tc.exportCsv}
          </a>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t.listTitle.replace("{count}", filtered.length)}</h3>
            <p>{t.listDesc}</p>
          </div>
          <div className="filter-bar" style={{ margin: 0 }}>
            <input
              className="search-input"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "220px" }}
            />
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{tc.allStatus}</option>
              <option value="Chờ duyệt">{ts["Chờ duyệt"] || "Chờ duyệt"}</option>
              <option value="Đã duyệt">{ts["Đã duyệt"] || "Đã duyệt"}</option>
              <option value="Từ chối">{ts["Từ chối"] || "Từ chối"}</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.colApplicant}</th>
                <th>{t.colDate}</th>
                <th>{t.colSessionPeriod}</th>
                <th>{t.colPurpose}</th>
                <th>{t.colStatus}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <b>{b.name}</b>
                    <small>{b.class_name}</small>
                  </td>
                  <td>{b.date}</td>
                  <td>
                    <b>{b.session === "morning" ? tc.morning : tc.afternoon}</b>
                    <small>{(b.periods || []).map(p => `${tc.periodPrefix} ${p}`).join(", ")}</small>
                  </td>
                  <td className="purpose-cell">{b.purpose}</td>
                  <td>
                    <span className={`status-pill ${b.status === "Đã duyệt" ? "approved" : b.status === "Từ chối" ? "rejected" : "pending"}`}>
                      {ts[b.status] || b.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      {currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "teacher" ? (
                        <>
                          {b.status === "Chờ duyệt" ? (
                            <>
                              <button className="approve-btn" onClick={() => onUpdate(b.id, "Đã duyệt")}>{tc.approveBtn}</button>
                              <button className="reject-btn" onClick={() => onUpdate(b.id, "Từ chối")}>{tc.rejectBtn}</button>
                            </>
                          ) : (
                            <button className="reset-btn" onClick={() => onUpdate(b.id, "Chờ duyệt")}>{tc.resetBtn}</button>
                          )}
                          <button className="reset-btn" style={{ color: "#c62828" }} title={tc.deleteBtn} onClick={() => onDelete(b.id)}>
                            <Trash2 size={13}/>
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: "9px", color: "#8a98a8" }}>{tc.viewOnly}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#8a98a8" }}>
                    {t.noMatch}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ==========================================
// PAGE: LOCKERS MONITORING & IOT
// ==========================================
function LockersPage({ lockers, onToggle, lang = "vi" }) {
  const t = translations[lang]?.lockers || translations.vi.lockers;
  const tc = translations[lang]?.common || translations.vi.common;
  const [showGuide, setShowGuide] = useState(false);
  const openCount = lockers.filter(x => x.state === "open").length;

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <button className="secondary-btn" onClick={() => setShowGuide(!showGuide)}>
            <Cpu size={15}/> {showGuide ? t.guideBtnClose : t.guideBtnOpen}
          </button>
        }
      />

      <div className="locker-summary">
        <div><span>{t.totalLockers}</span><b>{lockers.length}</b></div>
        <div><span>{t.safeClosed}</span><b className="good-text">{lockers.length - openCount}</b></div>
        <div><span>{t.opening}</span><b className="warn-text">{openCount}</b></div>
      </div>

      {showGuide && (
        <section className="panel" style={{ marginBottom: "20px", background: "#f8fbff", borderColor: "#cde1f5" }}>
          <div className="panel-head">
            <div>
              <h3>{t.guideTitle}</h3>
              <p>{t.guideDesc}</p>
            </div>
            <span className="table-chip">REST API WEBHOOK</span>
          </div>
          <p style={{ fontSize: "11px", color: "#445566" }}>
            {t.guideText}
          </p>
          <div className="code-box">
            {t.codeComment}<br/>
            #include &lt;WiFi.h&gt;<br/>
            #include &lt;HTTPClient.h&gt;<br/>
            const char* serverUrl = "http://192.168.1.100:5000/api/lockers/L01";<br/>
            <br/>
            void sendLockerState(bool isOpen) &#123;<br/>
            &nbsp;&nbsp;HTTPClient http;<br/>
            &nbsp;&nbsp;http.begin(serverUrl);<br/>
            &nbsp;&nbsp;http.addHeader("Content-Type", "application/json");<br/>
            &nbsp;&nbsp;String payload = String("&#123;\"state\":\"") + (isOpen ? "open" : "closed") + "\",\"source\":\"" + {t.codeSource} + "\"&#125;";<br/>
            &nbsp;&nbsp;int httpResponseCode = http.PUT(payload);<br/>
            &nbsp;&nbsp;http.end();<br/>
            &#125;
          </div>
        </section>
      )}

      <div className="locker-grid">
        {lockers.map(x => (
          <section className="panel locker-card" key={x.id}>
            <div className="locker-card-top">
              <div className={`locker-icon ${x.state}`}>
                {x.state === "open" ? <LockOpen size={22}/> : <Lock size={22}/>}
              </div>
              <span className={`status-pill ${x.state === "open" ? "pending" : "approved"}`}>
                {x.state === "open" ? tc.open : tc.closed}
              </span>
            </div>
            <h3>{x.name}</h3>
            <p>{x.location}</p>
            <div className="locker-meta">
              <span>{t.codeId}: {x.id}</span>
              <span>{t.codeUpdated}: {x.updatedAt}</span>
            </div>
            <button className="secondary-btn simulate-btn" onClick={() => onToggle(x.id)}>
              {x.state === "open" ? <Lock size={15}/> : <LockOpen size={15}/>}
              {t.simulateBtnPrefix} {x.state === "open" ? t.simulateClose : t.simulateOpen}
            </button>
          </section>
        ))}
      </div>
    </>
  );
}

// ==========================================
// PAGE: LOCKER HISTORY
// ==========================================
function LockerHistoryPage({ logs, lang = "vi" }) {
  const t = translations[lang]?.lockerHistory || translations.vi.lockerHistory;
  const tc = translations[lang]?.common || translations.vi.common;
  const isEn = lang === "en";

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <a href={api.getExportCsvUrl("locker-logs")} download className="secondary-btn" style={{ textDecoration: "none" }}>
            <Download size={15}/> {tc.exportCsv}
          </a>
        }
      />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t.panelTitle.replace("{count}", logs.length)}</h3>
            <p>{t.panelDesc}</p>
          </div>
          <span className="table-chip">SQLITE LOGS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.colDate}</th>
                <th>{t.colTime}</th>
                <th>{t.colLocker}</th>
                <th>{t.colEvent}</th>
                <th>{t.colSource}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(x => (
                <tr key={x.id}>
                  <td>{x.date}</td>
                  <td><b>{x.time}</b></td>
                  <td><b>{x.locker_name}</b></td>
                  <td>
                    <span className={`status-pill ${x.event.includes("Mở") ? "pending" : "approved"}`}>
                      {isEn ? (x.event.includes("Mở") ? "Open Locker" : "Close Locker") : x.event}
                    </span>
                  </td>
                  <td>
                    {isEn ? (x.source === "Cảm biến từ" ? "Magnetic Sensor" : x.source === "Mô phỏng giao diện" ? "UI Simulation" : x.source) : (x.source || t.defaultSource)}
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#8a98a8" }}>
                    {t.noEvents}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ==========================================
// PAGE: CAMERA & AI DETECTION (WITH WEBCAM SUPPORT)
// ==========================================
function CameraPage({ onRecordEntry, lang = "vi" }) {
  const t = translations[lang]?.camera || translations.vi.camera;
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  async function startWebcam() {
    setWebcamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
      setIsWebcamActive(true);
    } catch (err) {
      console.error("Webcam error:", err);
      setWebcamError(t.webcamError);
    }
  }

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  function captureSnapshot() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = `STEM_Snapshot_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
      />

      <div className="camera-layout">
        <section className="panel camera-panel">
          <div className="panel-head">
            <div>
              <h3>{t.panelTitle}</h3>
              <p>{t.panelDesc}</p>
            </div>
            <span className={`status-pill ${isWebcamActive ? "approved" : "pending"}`}>
              {isWebcamActive ? t.liveStatus : t.offlineStatus}
            </span>
          </div>

          <div className="camera-active-container">
            {isWebcamActive ? (
              <>
                <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
                <div className="ai-badge">{t.aiBadge}</div>
                {/* Simulated AI Detection Bounding Box */}
                <div className="ai-box" style={{ width: "35%", height: "65%", top: "18%", left: "32%" }}>
                  <div className="ai-tag">{t.personTag}</div>
                </div>
              </>
            ) : (
              <div className="camera-screen-inner">
                <div className="camera-cross"><Camera size={42}/></div>
                <b>{t.notActiveTitle}</b>
                <span>
                  {t.notActiveHint}
                </span>
              </div>
            )}
            <div className="camera-overlay">
              CAM 01 <span>{isWebcamActive ? t.camOnline : t.camOffline}</span>
            </div>
          </div>

          {webcamError && <div className="form-error" style={{ marginTop: "10px" }}>{webcamError}</div>}

          <div className="camera-controls">
            {!isWebcamActive ? (
              <button className="primary-btn" onClick={startWebcam}>
                <Play size={16}/> {t.startWebcam}
              </button>
            ) : (
              <>
                <button className="secondary-btn" onClick={stopWebcam}>
                  <Square size={16}/> {t.stopWebcam}
                </button>
                <button className="secondary-btn" onClick={captureSnapshot}>
                  <Camera size={16}/> {t.snapshot}
                </button>
              </>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#667788" }}>{t.aiSimLabel}</span>
              <button
                className="secondary-btn"
                style={{ background: "#e5f7ef", color: "#168e7e" }}
                onClick={() => onRecordEntry("in", t.inEventLabel, 1)}
              >
                <ArrowDownToLine size={14}/> {t.recordInBtn}
              </button>
              <button
                className="secondary-btn"
                style={{ background: "#fff3e2", color: "#d58a2f" }}
                onClick={() => onRecordEntry("out", t.outEventLabel, 1)}
              >
                <ArrowUpFromLine size={14}/> {t.recordOutBtn}
              </button>
            </div>
          </div>
        </section>

        <aside className="panel tips-panel">
          <div className="tips-icon"><ShieldCheck/></div>
          <h3>{t.tipsTitle}</h3>
          <ol>
            <li>{t.tip1}</li>
            <li>{t.tip2}</li>
            <li>{t.tip3}</li>
            <li>{t.tip4}</li>
            <li>{t.tip5}</li>
          </ol>
          <div className="code-box">
            # Python OpenCV Webhook snippet:<br/>
            import requests<br/>
            requests.post("http://localhost:5000/api/entry-logs", json=&#123;<br/>
            &nbsp;&nbsp;"direction": "in",<br/>
            &nbsp;&nbsp;"label": "{t.inEventLabel}",<br/>
            &nbsp;&nbsp;"count": 1<br/>
            &#125;)
          </div>
        </aside>
      </div>
    </>
  );
}

// ==========================================
// PAGE: ENTRY REPORT
// ==========================================
function EntryReportPage({ logs, lang = "vi" }) {
  const t = translations[lang]?.entryReport || translations.vi.entryReport;
  const tc = translations[lang]?.common || translations.vi.common;
  const inCount = logs.filter(x => x.direction === "in").reduce((s,x) => s + (Number(x.count) || 1), 0);
  const outCount = logs.filter(x => x.direction === "out").reduce((s,x) => s + (Number(x.count) || 1), 0);

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <a href={api.getExportCsvUrl("entry-logs")} download className="secondary-btn" style={{ textDecoration: "none" }}>
            <Download size={15}/> {tc.exportCsv}
          </a>
        }
      />

      <div className="stats-grid entry-stats">
        <Stat icon={ArrowDownToLine} label={t.statIn} value={inCount} hint={t.statInHint} tone="green"/>
        <Stat icon={ArrowUpFromLine} label={t.statOut} value={outCount} hint={t.statOutHint} tone="orange"/>
        <Stat icon={Users} label={t.statPresent} value={Math.max(0, inCount - outCount)} hint={t.statPresentHint} tone="blue"/>
        <Stat icon={Camera} label={t.statTotal} value={logs.length} hint={t.statTotalHint} tone="purple"/>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t.panelTitle.replace("{count}", logs.length)}</h3>
            <p>{t.panelDesc}</p>
          </div>
          <span className="table-chip">CAMERA LOGS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.colDate}</th>
                <th>{t.colTime}</th>
                <th>{t.colDirection}</th>
                <th>{t.colDesc}</th>
                <th>{t.colCount}</th>
                <th>{t.colCamera}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(x => (
                <tr key={x.id}>
                  <td>{x.date}</td>
                  <td><b>{x.time}</b></td>
                  <td>
                    <span className={`status-pill ${x.direction === "in" ? "approved" : "pending"}`}>
                      {x.direction === "in" ? t.pillIn : t.pillOut}
                    </span>
                  </td>
                  <td>{x.label}</td>
                  <td><b>{x.count}</b></td>
                  <td>{x.camera || t.defaultCamera}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ==========================================
// PAGE: DEVICES MANAGEMENT (CRUD + BORROW/RETURN)
// ==========================================
function DevicesPage({ devices, lockers, currentUser, onAdd, onUpdate, onDelete, onBorrow, onReturn, lang = "vi" }) {
  const t = translations[lang]?.devices || translations.vi.devices;
  const tc = translations[lang]?.common || translations.vi.common;
  const tcat = translations[lang]?.categories || translations.vi.categories;
  const ts = translations[lang]?.statuses || translations.vi.statuses;

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [borrowingDevice, setBorrowingDevice] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(devices.map(d => d.category));
    return Array.from(set);
  }, [devices]);

  const filtered = useMemo(() => {
    return devices.filter(d => {
      const matchCat = categoryFilter === "all" || d.category === categoryFilter;
      const matchSearch = !searchTerm ||
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.locker_id?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [devices, categoryFilter, searchTerm]);

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <a href={api.getExportCsvUrl("devices")} download className="secondary-btn" style={{ textDecoration: "none" }}>
              <Download size={15}/> {tc.exportCsv}
            </a>
            {(currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "teacher") && (
              <button className="primary-btn" onClick={() => setShowAddModal(true)}>
                <Plus size={16}/> {t.addBtn}
              </button>
            )}
          </div>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t.panelTitle.replace("{count}", filtered.length)}</h3>
            <p>{t.panelDesc}</p>
          </div>
          <div className="filter-bar" style={{ margin: 0 }}>
            <input
              className="search-input"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "240px" }}
            />
            <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">{tc.allCategories}</option>
              {categories.map(c => <option key={c} value={c}>{tcat[c] || c}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.colCode}</th>
                <th>{t.colName}</th>
                <th>{t.colCategory}</th>
                <th>{t.colLocker}</th>
                <th>{t.colAvailable}</th>
                <th>{t.colStatus}</th>
                <th>{t.colBorrower}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><b>{d.code}</b></td>
                  <td>
                    <b>{d.name}</b>
                    <small>{d.description || t.noDesc}</small>
                  </td>
                  <td>{tcat[d.category] || d.category}</td>
                  <td>
                    <span className="table-chip">{d.locker_id || t.unassigned}</span>
                  </td>
                  <td>
                    <b>{d.available}</b> / {d.quantity}
                  </td>
                  <td>
                    <span className={`status-pill ${d.status === "Sẵn sàng" ? "approved" : d.status === "Đang sử dụng" ? "pending" : "rejected"}`}>
                      {ts[d.status] || d.status}
                    </span>
                  </td>
                  <td>
                    {d.borrower ? (
                      <div>
                        <b>{d.borrower}</b>
                        <small>{t.borrowDateLabel} {d.borrow_date}</small>
                      </div>
                    ) : (
                      <span style={{ color: "#a0aab7", fontSize: "9px" }}>{t.inStock}</span>
                    )}
                  </td>
                  <td>
                    <div className="action-group">
                      {d.available > 0 ? (
                        <button className="approve-btn" onClick={() => setBorrowingDevice(d)}>
                          {t.borrowBtn}
                        </button>
                      ) : (
                        <button className="reset-btn" onClick={() => onReturn(d.id)}>
                          {t.returnBtn}
                        </button>
                      )}
                      {(currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "teacher") && (
                        <>
                          <button className="reset-btn" onClick={() => setEditingDevice(d)} title={t.editTooltip}>
                            <Edit size={13}/>
                          </button>
                          {currentUser.role === "admin" && (
                            <button className="reset-btn" style={{ color: "#c62828" }} onClick={() => onDelete(d.id)} title={t.deleteTooltip}>
                              <Trash2 size={13}/>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#8a98a8" }}>
                    {t.noMatch}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Thêm thiết bị */}
      {showAddModal && (
        <DeviceFormModal
          title={t.addModalTitle}
          lockers={lockers}
          onSave={async (data) => {
            const ok = await onAdd(data);
            if (ok) setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
          lang={lang}
        />
      )}

      {/* Modal Sửa thiết bị */}
      {editingDevice && (
        <DeviceFormModal
          title={t.editModalTitle}
          initialData={editingDevice}
          lockers={lockers}
          onSave={async (data) => {
            const ok = await onUpdate(editingDevice.id, data);
            if (ok) setEditingDevice(null);
          }}
          onClose={() => setEditingDevice(null)}
          lang={lang}
        />
      )}

      {/* Modal Mượn thiết bị */}
      {borrowingDevice && (
        <BorrowModal
          device={borrowingDevice}
          currentUser={currentUser}
          onConfirm={async (borrower) => {
            const ok = await onBorrow(borrowingDevice.id, borrower);
            if (ok) setBorrowingDevice(null);
          }}
          onClose={() => setBorrowingDevice(null)}
          lang={lang}
        />
      )}
    </>
  );
}

function DeviceFormModal({ title, initialData = {}, lockers, onSave, onClose, lang = "vi" }) {
  const t = translations[lang]?.devices || translations.vi.devices;
  const tc = translations[lang]?.common || translations.vi.common;
  const tcat = translations[lang]?.categories || translations.vi.categories;

  const [formData, setFormData] = useState({
    code: initialData.code || "",
    name: initialData.name || "",
    category: initialData.category || "Thiết bị chế tạo",
    locker_id: initialData.locker_id || "L01",
    quantity: initialData.quantity || 1,
    description: initialData.description || ""
  });

  const change = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  function submit(e) {
    e.preventDefault();
    onSave(formData);
  }

  const categoryList = [
    "Thiết bị chế tạo",
    "Bộ kít lập trình",
    "Thiết bị điện tử",
    "Thiết bị nghiên cứu",
    "Dụng cụ chế tạo",
    "Linh kiện điện tử",
    "Vật tư tiêu hao"
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ marginTop: 0 }}>
            <label>
              {t.nameLabel}
              <input name="name" value={formData.name} onChange={change} placeholder={t.namePlaceholder} required/>
            </label>
            <label>
              {t.codeLabel}
              <input name="code" value={formData.code} onChange={change} placeholder={t.codePlaceholder}/>
            </label>
            <label>
              {t.categoryLabel}
              <select name="category" value={formData.category} onChange={change}>
                {categoryList.map(c => (
                  <option key={c} value={c}>{tcat[c] || c}</option>
                ))}
              </select>
            </label>
            <label>
              {t.lockerLabel}
              <select name="locker_id" value={formData.locker_id} onChange={change}>
                {lockers.map(l => (
                  <option key={l.id} value={l.id}>{l.id} - {l.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t.quantityLabel}
              <input type="number" min="1" name="quantity" value={formData.quantity} onChange={change} required/>
            </label>
            <label>
              {t.descLabel}
              <input name="description" value={formData.description} onChange={change} placeholder={t.descPlaceholder}/>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>{tc.cancel}</button>
            <button type="submit" className="primary-btn">{t.saveDeviceBtn}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BorrowModal({ device, currentUser, onConfirm, onClose, lang = "vi" }) {
  const t = translations[lang]?.devices || translations.vi.devices;
  const tc = translations[lang]?.common || translations.vi.common;
  const isEn = lang === "en";

  const [borrower, setBorrower] = useState(currentUser.name || "");

  function submit(e) {
    e.preventDefault();
    if (!borrower.trim()) return;
    onConfirm(borrower);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.borrowModalTitle.replace("{name}", device.name)}</h3>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit}>
          <p style={{ fontSize: "11px", color: "#506070", margin: "0 0 15px" }}>
            {isEn ? (
              <>Storage Location: <b>{device.locker_id}</b> · Available: <b>{device.available}</b></>
            ) : (
              <>Vị trí lấy: <b>{device.locker_id}</b> · Số lượng khả dụng: <b>{device.available}</b></>
            )}
          </p>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#334455", display: "block" }}>
            {t.borrowerLabel}
            <input
              style={{ width: "100%", padding: "10px", marginTop: "8px", border: "1px solid #dce4ed", borderRadius: "7px" }}
              value={borrower}
              onChange={e => setBorrower(e.target.value)}
              placeholder={t.borrowerPlaceholder}
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>{tc.cancel}</button>
            <button type="submit" className="primary-btn">{t.confirmBorrowBtn}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// PAGE: REPORTS & EXPORT
// ==========================================
function ReportsPage({ bookings, lockerLogs, entryLogs, lockers, devices, lang = "vi" }) {
  const t = translations[lang]?.reports || translations.vi.reports;
  const tc = translations[lang]?.common || translations.vi.common;
  const tcat = translations[lang]?.categories || translations.vi.categories;

  const borrowedDevices = devices.filter(d => d.status === "Đang sử dụng").length;

  const categories = [
    "Thiết bị chế tạo",
    "Bộ kít lập trình",
    "Thiết bị điện tử",
    "Dụng cụ chế tạo",
    "Linh kiện điện tử",
    "Vật tư tiêu hao"
  ];

  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        action={
          <button className="secondary-btn" onClick={() => window.print()}>
            <FileSpreadsheet size={15}/> {t.printBtn}
          </button>
        }
      />

      <div className="stats-grid">
        <Stat icon={CalendarDays} label={t.statBookings} value={bookings.length} hint={t.statBookingsHint} tone="blue"/>
        <Stat icon={Archive} label={t.statLockerLogs} value={lockerLogs.length} hint={t.statLockerLogsHint} tone="green"/>
        <Stat icon={Camera} label={t.statCameraLogs} value={entryLogs.length} hint={t.statCameraLogsHint} tone="purple"/>
        <Stat icon={Package} label={t.statBorrowed} value={borrowedDevices} hint={t.statBorrowedHint.replace("{total}", devices.length)} tone="orange"/>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t.chartTitle}</h3>
              <p>{t.chartDesc}</p>
            </div>
            <Package size={18} className="muted"/>
          </div>

          <div className="chart-bar-container">
            {categories.map(cat => {
              const count = devices.filter(d => d.category === cat).length;
              const percent = devices.length ? Math.round((count / devices.length) * 100) : 0;
              return (
                <div className="chart-row" key={cat}>
                  <div className="chart-label">{tcat[cat] || cat}</div>
                  <div className="chart-track">
                    <div className="chart-fill" style={{ width: `${percent}%` }}/>
                  </div>
                  <div className="chart-val">{count} {tc.itemsUnit}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t.exportTitle}</h3>
              <p>{t.exportDesc}</p>
            </div>
            <Download size={18} className="muted"/>
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "15px" }}>
            <a href={api.getExportCsvUrl("bookings")} download className="secondary-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>
              <CalendarDays size={16}/> {t.exportBookings}
            </a>
            <a href={api.getExportCsvUrl("devices")} download className="secondary-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>
              <Package size={16}/> {t.exportDevices}
            </a>
            <a href={api.getExportCsvUrl("locker-logs")} download className="secondary-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>
              <Archive size={16}/> {t.exportLockers}
            </a>
            <a href={api.getExportCsvUrl("entry-logs")} download className="secondary-btn" style={{ textDecoration: "none", justifyContent: "flex-start" }}>
              <Camera size={16}/> {t.exportCamera}
            </a>
          </div>

          <div className="info-callout" style={{ marginTop: "18px" }}>
            {t.exportCallout}
          </div>
        </section>
      </div>
    </>
  );
}

// ==========================================
// MODAL: SWITCH USER / AUTH
// ==========================================
function AuthModal({ currentUser, onSelectUser, onClose, lang = "vi" }) {
  const t = translations[lang]?.auth || translations.vi.auth;
  const tc = translations[lang]?.common || translations.vi.common;
  const tr = translations[lang]?.roles || translations.vi.roles;
  const isEn = lang === "en";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <p style={{ fontSize: "11px", color: "#667788", margin: "0 0 16px" }}>
          {t.desc}
        </p>
        <div style={{ display: "grid", gap: "10px" }}>
          {mockUsers.map(u => (
            <div
              key={u.id}
              onClick={() => onSelectUser(u)}
              style={{
                border: u.id === currentUser.id ? "2px solid #168e7e" : "1px solid #dce4ed",
                background: u.id === currentUser.id ? "#eff9f6" : "white",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "all .15s"
              }}
            >
              <div className="avatar" style={{ background: u.role === "admin" ? "#d7eee9" : "#e8f1ff", color: u.role === "admin" ? "#147a6b" : "#397ad1" }}>
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: "12px", color: "#17283d" }}>{u.name}</b>
                <span style={{ display: "block", fontSize: "10px", color: "#78889a" }}>
                  {isEn ? (u.departmentEn || u.department) : u.department}
                </span>
              </div>
              <span className={`status-pill ${u.role === "admin" ? "approved" : "pending"}`}>
                {tr[u.role] || u.role}
              </span>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>{tc.close}</button>
        </div>
      </div>
    </div>
  );
}
