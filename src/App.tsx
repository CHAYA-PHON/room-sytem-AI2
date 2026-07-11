/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building, 
  DoorClosed, 
  Users, 
  Gauge, 
  FileSpreadsheet, 
  DollarSign, 
  History, 
  Settings, 
  LogOut, 
  Lock, 
  Eye, 
  ChevronRight,
  ChevronLeft,
  Info,
  Layers,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Import simulated DB layers
import { 
  seedDatabase, 
  getRooms, 
  saveRoom, 
  deleteRoom,
  getTenants,
  saveTenant,
  deleteTenant,
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
  getMeterEntryList,
  saveMetersBatch,
  deleteMeterReading,
  getBillsList,
  recalcBill,
  getPaymentHistory,
  payBillsFIFO,
  deletePayment,
  updatePayment,
  getAdmins,
  saveAdmin,
  deleteAdmin,
  loginUser,
  getDashboardData,
  getAllAddedItems,
  getAddedItems,
  saveAddedItem,
  deleteAddedItem,
  getUtilityRates,
  saveUtilityRate,
  deleteUtilityRate,
  getBillAnnouncements,
  saveBillAnnouncement,
  deleteBillAnnouncement,
  getOwnerInfo,
  saveOwnerInfo
} from "./dbSim";

import { Room, Tenant, BankAccount, AddedItem, Bill, PaymentRecord, Admin, UtilityRate, BillAnnouncement, OwnerInfo } from "./types";

// Import Sub Components
import Dashboard from "./components/Dashboard";
import Rooms from "./components/Rooms";
import Tenants from "./components/Tenants";
import Meters from "./components/Meters";
import Bills from "./components/Bills";
import Banks from "./components/Banks";
import PaymentHistory from "./components/PaymentHistory";
import AdminSettings from "./components/AdminSettings";
import PrintPreview from "./components/PrintPreview";

// Import Google Sheets sync service
import { 
  getGsUrl, 
  saveGsUrl, 
  getLastSyncTime, 
  pushToGoogleSheets, 
  pullFromGoogleSheets,
  DEFAULT_GS_URL
} from "./sheetsSync";

export default function App() {
  // Authentication session
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // System general month selection
  const [month, setMonth] = useState<string>("2026-07");

  // Current selected tab index
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Sidebar collapsed state for desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("dorm_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("dorm_sidebar_collapsed", isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // State caches for reactive UI binding
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [metersList, setMetersList] = useState<any[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [utilityRates, setUtilityRates] = useState<UtilityRate[]>([]);
  const [billAnnouncements, setBillAnnouncements] = useState<BillAnnouncement[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo>({ name: "", phone: "" });
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Counter to notify real-time sheets database drawer of updates
  const [refreshSheetsTrigger, setRefreshSheetsTrigger] = useState<number>(0);

  // Google Sheets integration state variables
  const [gsUrl, setGsUrl] = useState<string>("");
  const [lastSyncTime, setLastSyncTimeState] = useState<string>("ยังไม่ได้ซิงค์");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Print system overlay states
  const [printConfig, setPrintConfig] = useState<{
    isOpen: boolean;
    type: "invoices" | "summary";
    selectedRoomIds: string[];
  }>({
    isOpen: false,
    type: "invoices",
    selectedRoomIds: []
  });

  // Seed database once at load time
  useEffect(() => {
    seedDatabase();
    refreshAllState();

    // Initialize Google Sheets state
    const initialUrl = getGsUrl();
    setGsUrl(initialUrl);
    setLastSyncTimeState(getLastSyncTime());

    // Recover login session from local storage if existing and validate it
    const session = localStorage.getItem("dorm_user_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const currentAdmins = getAdmins();
        const stillExists = currentAdmins.some(a => a.id === parsed.id && a.username === parsed.username);
        if (stillExists) {
          setUser(parsed);
        } else {
          localStorage.removeItem("dorm_user_session");
          setUser(null);
        }
      } catch (e) {
        localStorage.removeItem("dorm_user_session");
      }
    }

    // Auto pull from Google Sheets immediately on app open or reboot/reload!
    // Skip auto-pull if using the default placeholder URL to avoid unnecessary/failing network requests
    if (initialUrl && initialUrl !== DEFAULT_GS_URL) {
      const autoPullOnLoad = async () => {
        setIsSyncing(true);
        console.log("App startup: Automatically pulling latest database from Google Sheets...");
        try {
          const result = await pullFromGoogleSheets(initialUrl);
          if (result.success) {
            console.log("App startup: Google Sheets auto-pull succeeded!");
            setLastSyncTimeState(getLastSyncTime());
            refreshAllState();
          } else {
            console.warn("App startup: Google Sheets auto-pull failed:", result.message);
          }
        } catch (error) {
          console.warn("App startup: Error during auto-pull from Google Sheets:", error);
        } finally {
          setIsSyncing(false);
        }
      };
      autoPullOnLoad();
    }
  }, []);

  // Whenever the month or general mutations occur, reload dependent states
  useEffect(() => {
    refreshAllState();
  }, [month, user]);

  const refreshAllState = () => {
    const loadedRooms = getRooms();
    const loadedTenants = getTenants();
    const loadedBanks = getBankAccounts();
    const loadedMeters = getMeterEntryList(month);
    
    // Ensure all bills are recalculated dynamically
    loadedRooms.forEach(r => {
      // Run recalculation to ensure current addedItems, FIFO changes and old balances match perfectly
      recalcBill(r.id, month);
    });

    const loadedBills = getBillsList(month);
    const loadedPayments = getPaymentHistory(month);
    const loadedAdmins = getAdmins();
    const loadedRates = getUtilityRates();
    const loadedAnncs = getBillAnnouncements();
    const loadedOwnerInfo = getOwnerInfo();
    const loadedDashboard = getDashboardData(month);

    setRooms(loadedRooms);
    setTenants(loadedTenants);
    setBanks(loadedBanks);
    setMetersList(loadedMeters);
    setBills(loadedBills);
    setPayments(loadedPayments);
    setAdmins(loadedAdmins);
    setUtilityRates(loadedRates);
    setBillAnnouncements(loadedAnncs);
    setOwnerInfo(loadedOwnerInfo);
    setDashboardStats(loadedDashboard);

    setRefreshSheetsTrigger(prev => prev + 1);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const res = loginUser(loginUsername, loginPin);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem("dorm_user_session", JSON.stringify(res.user));
    } else {
      setLoginError(res.message || "ล้มเหลว");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("dorm_user_session");
  };

  // --- MUTATION WRAPPERS WITH REACTIVE REFRESH ---
  const triggerAutoPush = async () => {
    const currentUrl = getGsUrl();
    if (!currentUrl) return;
    
    // Skip auto-push if using the default template URL to avoid failing network requests
    if (currentUrl === DEFAULT_GS_URL) {
      console.log("Auto-sync: Skipping push as the Google Sheets URL is set to the default template.");
      return;
    }

    setIsSyncing(true);
    console.log("Auto-sync: Saving updates to Google Sheets...");
    try {
      const result = await pushToGoogleSheets(currentUrl);
      setLastSyncTimeState(getLastSyncTime());
      console.log("Auto-sync success:", result.message);
    } catch (error) {
      console.warn("Auto-sync failed to push to Google Sheets:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRoom = (room: Room) => {
    saveRoom(room);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteRoom = (id: string) => {
    deleteRoom(id);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveTenant = (tenant: Tenant) => {
    saveTenant(tenant);
    // Auto recalc bills on new contract creation
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteTenant = (roomId: string) => {
    deleteTenant(roomId);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveBanks = (bank: BankAccount) => {
    saveBankAccount(bank);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteBanks = (id: string) => {
    deleteBankAccount(id);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveMetersBatch = (items: any[]) => {
    saveMetersBatch(month, items, user?.username || "admin");
    alert(`บันทึกค่ามิเตอร์จำนวน ${items.length} ห้อง และประมวลผลจัดเก็บสำเร็จ!`);
    refreshAllState();
    triggerAutoPush();
    setActiveTab("payments"); // Auto transition to payments (Transaction History)
  };

  const handleDeleteMeterReading = (roomId: string) => {
    if (window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลมิเตอร์และการบันทึกค่าในรอบเดือนนี้? บิลสรุปค่าใช้จ่ายของห้องนี้จะถูกลบไปด้วย")) {
      deleteMeterReading(roomId, month);
      refreshAllState();
      triggerAutoPush();
    }
  };

  const handleUpdateMeterReading = (item: any) => {
    saveMetersBatch(month, [item], user?.username || "admin");
    refreshAllState();
    triggerAutoPush();
  };

  const handlePayFIFO = (roomId: string, amount: number, method: "เงินสด" | "โอนธนาคาร", receiver: string, note: string) => {
    const result = payBillsFIFO(roomId, amount, method, receiver, note);
    if (result.success) {
      alert("บันทึกรับเงินตัดบิล FIFO เรียบร้อย!");
    } else {
      alert(result.message || "เกิดข้อผิดพลาด");
    }
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeletePayment = (payId: string) => {
    if (window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการยกเลิกและลบประวัติการชำระเงินรายการนี้? ยอดเงินที่จ่ายในบิลจะถูกปรับลดลง และยอดหนี้คงเหลืออาจเพิ่มขึ้น")) {
      const result = deletePayment(payId);
      if (result.success) {
        alert("ลบประวัติการชำระเงินและอัปเดตยอดบิลที่เกี่ยวข้องเรียบร้อยแล้ว!");
      } else {
        alert(result.message || "เกิดข้อผิดพลาดในการลบ");
      }
      refreshAllState();
      triggerAutoPush();
    }
  };

  const handleUpdatePayment = (payId: string, updatedFields: Partial<PaymentRecord>) => {
    const result = updatePayment(payId, updatedFields);
    if (result.success) {
      alert("แก้ไขข้อมูลประวัติการชำระเงินเรียบร้อยแล้ว!");
    } else {
      alert(result.message || "เกิดข้อผิดพลาดในการแก้ไข");
    }
    refreshAllState();
    triggerAutoPush();
  };

  const handleBulkPay = (payments: { roomId: string; amount: number; method: "เงินสด" | "โอนธนาคาร"; receiver: string; note: string }[]) => {
    let successRooms: string[] = [];
    let errorRooms: string[] = [];

    payments.forEach(p => {
      const result = payBillsFIFO(p.roomId, p.amount, p.method, p.receiver, p.note);
      if (result.success) {
        successRooms.push(p.roomId);
      } else {
        errorRooms.push(p.roomId);
      }
    });

    if (successRooms.length > 0) {
      alert(`บันทึกชำระเงินตัดบิล FIFO สำเร็จเรียบร้อยสำหรับ ${successRooms.length} ห้อง!${errorRooms.length > 0 ? ` (ล้มเหลว ${errorRooms.length} ห้อง)` : ""}`);
    } else {
      alert("ไม่สามารถบันทึกการชำระเงินได้");
    }
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveAdmin = (admin: Admin) => {
    saveAdmin(admin);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveOwnerInfo = (info: OwnerInfo) => {
    saveOwnerInfo(info);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteAdmin = (id: string) => {
    deleteAdmin(id);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveUtilityRate = (rate: UtilityRate) => {
    saveUtilityRate(rate);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteUtilityRate = (id: string) => {
    const res = deleteUtilityRate(id);
    if (!res.success) {
      alert(res.message);
    } else {
      refreshAllState();
      triggerAutoPush();
    }
  };

  const handleSaveBillAnnouncement = (annc: BillAnnouncement) => {
    saveBillAnnouncement(annc);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteBillAnnouncement = (id: string) => {
    deleteBillAnnouncement(id);
    refreshAllState();
    triggerAutoPush();
  };

  const handleSaveAddedItemWrapper = (item: AddedItem) => {
    saveAddedItem(item);
    refreshAllState();
    triggerAutoPush();
  };

  const handleDeleteAddedItemWrapper = (id: string, roomId: string, month: string) => {
    deleteAddedItem(id, roomId, month);
    refreshAllState();
    triggerAutoPush();
  };

  // --- GOOGLE SHEETS SYNC ACTIONS ---
  const handleSaveGsUrl = (url: string) => {
    saveGsUrl(url);
    setGsUrl(url);
  };

  const handlePushToSheets = async () => {
    setIsSyncing(true);
    const result = await pushToGoogleSheets(gsUrl);
    setIsSyncing(false);
    setLastSyncTimeState(getLastSyncTime());
  };

  const handlePullFromSheets = async () => {
    setIsSyncing(true);
    const result = await pullFromGoogleSheets(gsUrl);
    setIsSyncing(false);
    setLastSyncTimeState(getLastSyncTime());
    if (result.success) {
      alert("ดึงข้อมูลจาก Google Sheets สำเร็จ! ระบบกำลังอัปเดตหน้าจอหลัก...");
      refreshAllState();
    } else {
      alert(result.message);
    }
  };

  // Render Login overlay if session does not exist
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-800 animate-in fade-in duration-300">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 px-4">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">นิติบุคคล ระบบบริหารจัดการหอพัก</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Dormitory Smart Manager Portal</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 space-y-6">
            
            {/* Quick Credentials Info Alert */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start space-x-2 text-xs text-blue-800 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
              <div>
                <strong className="block text-slate-800 font-bold mb-1">แนะนำการใช้งานระบบนิติบุคคล</strong>
                <p className="text-slate-600 font-medium">
                  เข้าสู่ระบบนิติบุคคลเพื่อทดสอบและใช้งานการจัดการหอพัก จัดการสัญญาผู้เช่า บันทึกหน่วยน้ำ-ไฟล่าสุด และพิมพ์บิลหรือใบแจ้งหนี้แบบสรุปยอดค้างชำระ
                </p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">ชื่อผู้ใช้นิติบุคคล</label>
                <input 
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800 font-semibold text-sm"
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">รหัส PIN 6 หลัก</label>
                <input 
                  type="password"
                  required
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-center font-mono tracking-widest text-lg font-black text-slate-800"
                  placeholder="••••••"
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg border border-rose-100">
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/15 cursor-pointer"
              >
                ยืนยันเพื่อความปลอดภัยล็อกอิน
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Define sidebar menu options
  const sidebarItems = [
    { id: "dashboard", label: "หน้าภาพรวมหลัก", icon: Building },
    { id: "rooms", label: "จัดการห้องพัก", icon: DoorClosed },
    { id: "tenants", label: "สัญญาผู้เช่าอาศัย", icon: Users },
    { id: "meters", label: "จดจดมิเตอร์กลุ่ม", icon: Gauge },
    { id: "bills", label: "บิลสรุปประจำงวด", icon: FileSpreadsheet },
    { id: "banks", label: "บัญชีรับโอนฝาก", icon: DollarSign },
    { id: "payments", label: "ประวัติทำรายการ", icon: History },
    { id: "admin", label: "ตั้งค่าแอดมิน", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans antialiased text-slate-800">
      
      {/* Mobile Top Header */}
      <div className="md:hidden no-print bg-[#2563eb] text-white flex items-center justify-between px-5 py-4 sticky top-0 z-40 shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <Building className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight leading-none text-white">SABAIDEE DORM</h1>
            <p className="text-[9px] text-white/70 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5">
              <span>Dorm Ops Portal</span>
              <span className="text-[8px] bg-white/20 text-white px-1 py-0.5 rounded font-mono font-bold tracking-normal leading-none">V.2026-PB02_0.0</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-all focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden no-print"
            />
            {/* Slide-out Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-[#2563eb] text-white flex flex-col z-50 p-5 shadow-2xl md:hidden overflow-y-auto no-print"
            >
              {/* Brand Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-md">
                    <Building className="w-5 h-5 text-[#2563eb]" />
                  </div>
                  <div>
                    <h1 className="text-base font-extrabold tracking-tight leading-none text-white">SABAIDEE DORM</h1>
                    <p className="text-[10px] text-white/70 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Dorm Ops Portal</span>
                      <span className="text-[8px] bg-white/20 text-white px-1 py-0.5 rounded font-mono font-bold tracking-normal leading-none">V.2026-PB02_0.0</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-white/10 active:bg-white/25 rounded-lg text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu lists */}
              <nav className="flex-1 space-y-1">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? "bg-white/15 text-white shadow-sm" 
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "opacity-100 translate-x-0.5" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </nav>

              {/* Profile/Logout footer */}
              <div className="border-t border-white/10 mt-auto pt-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-400/30 border-2 border-white/20 flex items-center justify-center text-white font-extrabold text-xs uppercase shadow-inner shrink-0">
                    {user.username.slice(0, 2)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold truncate text-white">{user.username}</p>
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">ผู้จัดการหอพัก</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="p-2 bg-white/10 hover:bg-rose-600/30 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Navigation Left Sidebar (Desktop Only) */}
      <aside className={`hidden md:flex no-print ${isSidebarCollapsed ? "w-20 px-3 py-6" : "w-64 p-4 md:p-6"} bg-[#2563eb] text-white flex-col shrink-0 border-r border-[#1e40af] transition-all duration-300 relative`}>
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-white text-[#2563eb] border border-slate-200 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer z-50"
          title={isSidebarCollapsed ? "ขยายแถบเมนู" : "ย่อ/ซ้อนแถบเมนู"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Brand Header */}
        <div className={`p-2 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} border-b border-white/10 pb-5 mb-5 shrink-0`}>
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <Building className="w-5 h-5 text-[#2563eb]" />
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden transition-all duration-300">
              <h1 className="text-base font-extrabold tracking-tight leading-none text-white whitespace-nowrap">SABAIDEE DORM</h1>
              <p className="text-[10px] text-white/70 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <span>Dorm Ops Portal</span>
                <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-normal leading-none">V.2026-PB02_0.0</span>
              </p>
            </div>
          )}
        </div>

        {/* Navigation links list */}
        <nav className="flex-1 space-y-1.5">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "justify-between px-4"} py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "opacity-100 translate-x-0.5" : "opacity-0"}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile and Logout footer */}
        <div className={`border-t border-white/10 mt-auto pt-4 shrink-0 ${isSidebarCollapsed ? "px-1" : "p-2 md:p-3"}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-4 justify-center" : "gap-3"}`}>
            <div className="w-10 h-10 rounded-full bg-blue-400/30 border-2 border-white/20 flex items-center justify-center text-white font-extrabold text-xs uppercase shadow-inner shrink-0" title={user.username}>
              {user.username.slice(0, 2)}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold truncate text-white">{user.username}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">ผู้จัดการหอพัก</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className={`p-2 bg-white/10 hover:bg-rose-600/30 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer ${isSidebarCollapsed ? "w-full flex justify-center" : ""}`}
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area Shell */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Editorial Sub-Header for Active Tab and controls */}
        <header className="no-print bg-white border-b border-slate-200 md:sticky md:top-0 z-30 px-6 md:px-8 py-4 md:py-0 md:h-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wide">
              {sidebarItems.find(item => item.id === activeTab)?.label || "ภาพรวมสรุปผล"}
            </h2>
            
            {/* Elegant Month Picker Input */}
            <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-2.5 shrink-0">เลือกเดือน</span>
              <input 
                type="month" 
                value={month}
                onChange={(e) => {
                  if (e.target.value) setMonth(e.target.value);
                }}
                className="bg-transparent border-none text-xs font-black text-slate-700 focus:outline-none font-mono cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#2563eb]/5 px-3 py-1.5 rounded-lg border border-[#2563eb]/10 text-xs text-[#2563eb] font-bold">
              งวดเดือน: <span className="font-mono">{month}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Panel Canvas */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && dashboardStats && (
                <Dashboard 
                  data={dashboardStats} 
                  month={month}
                  onNavigateToRooms={() => setActiveTab("rooms")}
                  lastSyncTime={lastSyncTime}
                  onSync={handlePushToSheets}
                  isSyncing={isSyncing}
                />
              )}
              {activeTab === "rooms" && (
                <Rooms 
                  rooms={rooms} 
                  banks={banks} 
                  onSave={handleSaveRoom} 
                  onDelete={handleDeleteRoom} 
                />
              )}
              {activeTab === "tenants" && (
                <Tenants 
                  tenants={tenants} 
                  rooms={rooms} 
                  onSave={handleSaveTenant} 
                  onDelete={handleDeleteTenant} 
                />
              )}
              {activeTab === "meters" && (
                <Meters 
                  list={metersList} 
                  month={month} 
                  onSaveBatch={handleSaveMetersBatch}
                  onGetAddedItems={getAddedItems}
                  onSaveAddedItem={handleSaveAddedItemWrapper}
                  onDeleteAddedItem={handleDeleteAddedItemWrapper}
                />
              )}
              {activeTab === "bills" && (
                <Bills 
                  bills={bills} 
                  banks={banks} 
                  month={month} 
                  onPayFIFO={handlePayFIFO}
                  onBulkPay={handleBulkPay}
                  onPrintInvoices={(roomIds) => {
                    setPrintConfig({
                      isOpen: true,
                      type: "invoices",
                      selectedRoomIds: roomIds
                    });
                  }}
                  onPrintSummary={(roomIds) => {
                    setPrintConfig({
                      isOpen: true,
                      type: "summary",
                      selectedRoomIds: roomIds || []
                    });
                  }}
                />
              )}
              {activeTab === "banks" && (
                <Banks 
                  banks={banks} 
                  onSave={handleSaveBanks} 
                  onDelete={handleDeleteBanks} 
                />
              )}
              {activeTab === "payments" && (
                <PaymentHistory 
                  payments={payments} 
                  bills={bills} 
                  month={month} 
                  metersList={metersList}
                  onDeleteMeter={handleDeleteMeterReading}
                  onUpdateMeter={handleUpdateMeterReading}
                  onDeletePayment={handleDeletePayment}
                  onUpdatePayment={handleUpdatePayment}
                />
              )}
              {activeTab === "admin" && (
                <AdminSettings 
                  admins={admins} 
                  onSave={handleSaveAdmin} 
                  onDelete={handleDeleteAdmin} 
                  gsUrl={gsUrl}
                  onSaveGsUrl={handleSaveGsUrl}
                  onPushToSheets={handlePushToSheets}
                  onPullFromSheets={handlePullFromSheets}
                  lastSyncTime={lastSyncTime}
                  isSyncing={isSyncing}
                  utilityRates={utilityRates}
                  onSaveUtilityRate={handleSaveUtilityRate}
                  onDeleteUtilityRate={handleDeleteUtilityRate}
                  billAnnouncements={billAnnouncements}
                  onSaveBillAnnouncement={handleSaveBillAnnouncement}
                  onDeleteBillAnnouncement={handleDeleteBillAnnouncement}
                  ownerInfo={ownerInfo}
                  onSaveOwnerInfo={handleSaveOwnerInfo}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* A4 Portrait / Landscape Print System Render overlay */}
      {printConfig.isOpen && (
        <PrintPreview 
          type={printConfig.type}
          selectedRoomIds={printConfig.selectedRoomIds}
          bills={bills}
          rooms={rooms}
          tenants={tenants}
          banks={banks}
          month={month}
          utilityRates={utilityRates}
          billAnnouncements={billAnnouncements}
          ownerInfo={ownerInfo}
          onClose={() => setPrintConfig(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
