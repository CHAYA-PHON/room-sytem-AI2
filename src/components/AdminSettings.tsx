/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  ShieldAlert, 
  DownloadCloud, 
  UploadCloud, 
  RefreshCw, 
  FileSpreadsheet, 
  Save,
  LogOut,
  Check,
  AlertTriangle,
  ExternalLink,
  Key,
  FolderOpen
} from "lucide-react";
import { Admin, UtilityRate, BillAnnouncement, OwnerInfo } from "../types";
import { pushDirectToGoogleSheets, pullDirectFromGoogleSheets } from "../sheetsSync";

interface AdminSettingsProps {
  admins: Admin[];
  onSave: (admin: Admin) => void;
  onDelete: (id: string) => void;
  gsUrl: string;
  onSaveGsUrl: (url: string) => void;
  onPushToSheets: (url: string) => Promise<void>;
  onPullFromSheets: (url: string) => Promise<void>;
  lastSyncTime: string;
  isSyncing: boolean;
  utilityRates: UtilityRate[];
  onSaveUtilityRate: (rate: UtilityRate) => void;
  onDeleteUtilityRate: (id: string) => void;
  billAnnouncements: BillAnnouncement[];
  onSaveBillAnnouncement: (annc: BillAnnouncement) => void;
  onDeleteBillAnnouncement: (id: string) => void;
  ownerInfo: OwnerInfo;
  onSaveOwnerInfo: (info: OwnerInfo) => void;
  onResetLocalDatabase?: () => void;
}

export default function AdminSettings({ 
  admins, 
  onSave, 
  onDelete,
  gsUrl,
  onSaveGsUrl,
  onPushToSheets,
  onPullFromSheets,
  lastSyncTime,
  isSyncing,
  utilityRates,
  onSaveUtilityRate,
  onDeleteUtilityRate,
  billAnnouncements,
  onSaveBillAnnouncement,
  onDeleteBillAnnouncement,
  ownerInfo,
  onSaveOwnerInfo,
  onResetLocalDatabase
}: AdminSettingsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [inputGsUrl, setInputGsUrl] = useState(gsUrl);

  // =========================================================================
  // GOOGLE WORKSPACE DIRECT AUTH & SYNC STATES & HANDLERS
  // =========================================================================
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Direct Sheet Sync States
  const [directSheetId, setDirectSheetId] = useState<string>(() => {
    return localStorage.getItem("sabaidee_dorm_direct_sheet_id") || "";
  });
  const [directSheetName, setDirectSheetName] = useState<string>(() => {
    return localStorage.getItem("sabaidee_dorm_direct_sheet_name") || "";
  });
  const [directLastSync, setDirectLastSync] = useState<string>(() => {
    return localStorage.getItem("sabaidee_dorm_direct_last_sync") || "ยังไม่ได้ซิงค์แบบตรง";
  });
  const [isDirectSyncing, setIsDirectSyncing] = useState<boolean>(false);
  const [showDirectConfirmModal, setShowDirectConfirmModal] = useState<"push" | "pull" | null>(null);

  // Initialize and Sync google session from localStorage
  React.useEffect(() => {
    try {
      const savedUser = localStorage.getItem("sabaidee_dorm_google_user");
      const savedToken = localStorage.getItem("sabaidee_dorm_google_token");
      if (savedUser && savedToken) {
        setGoogleUser(JSON.parse(savedUser));
        setGoogleToken(savedToken);
      }
    } catch (err) {
      console.error("Error loading Google Auth state:", err);
    }
  }, []);

  // Listen to any tab logins or updates in localStorage
  React.useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = localStorage.getItem("sabaidee_dorm_google_user");
      const savedToken = localStorage.getItem("sabaidee_dorm_google_token");
      if (savedUser && savedToken) {
        setGoogleUser(JSON.parse(savedUser));
        setGoogleToken(savedToken);
      } else {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleDirectGoogleLogin = async () => {
    setIsLoggingIn(true);
    setGoogleError(null);
    try {
      const response = await fetch("/api/auth/url");
      if (!response.ok) {
        throw new Error("ล้มเหลวในการดึงลิงก์เชื่อมต่อ Google");
      }
      const data = await response.json();
      
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.url,
        "google-oauth-popup",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error("ไม่สามารถเปิดหน้าต่างป๊อปอัปได้ กรุณาปิดการบล็อกป๊อปอัปของเบราว์เซอร์");
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          const { accessToken, profile } = event.data;
          setGoogleUser(profile);
          setGoogleToken(accessToken);
          localStorage.setItem("sabaidee_dorm_google_user", JSON.stringify(profile));
          localStorage.setItem("sabaidee_dorm_google_token", accessToken);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        } else if (event.data?.type === "OAUTH_AUTH_ERROR") {
          setGoogleError(`การเชื่อมต่อบัญชีล้มเหลว: ${event.data.error}`);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setGoogleError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อด้วยบัญชี Google");
      setIsLoggingIn(false);
    }
  };

  const handleDirectGoogleLogout = () => {
    setGoogleUser(null);
    setGoogleToken(null);
    localStorage.removeItem("sabaidee_dorm_google_user");
    localStorage.removeItem("sabaidee_dorm_google_token");
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!googleToken) return;
    setIsDirectSyncing(true);
    setGoogleError(null);
    try {
      const title = `Sabaidee Dormitory Backup - ${new Date().toLocaleDateString("th-TH")}`;
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: { title }
        })
      });

      if (!res.ok) {
        throw new Error("ล้มเหลวในการส่งคำขอสร้างไฟล์ใหม่ไปยัง Google Sheets API");
      }

      const data = await res.json();
      const newSheetId = data.spreadsheetId;
      const newSheetName = data.properties?.title || title;

      setDirectSheetId(newSheetId);
      setDirectSheetName(newSheetName);
      localStorage.setItem("sabaidee_dorm_direct_sheet_id", newSheetId);
      localStorage.setItem("sabaidee_dorm_direct_sheet_name", newSheetName);

      alert(`สร้างไฟล์ Google Sheet ใหม่บน Google Drive สำเร็จ!\nชื่อไฟล์: ${newSheetName}`);
    } catch (err: any) {
      console.error("Create spreadsheet failed:", err);
      alert(err.message || "เกิดข้อผิดพลาดในการสร้างไฟล์ Google Sheets");
    } finally {
      setIsDirectSyncing(false);
    }
  };

  const handleOpenPicker = () => {
    if (!googleToken) return;
    try {
      const onPickerLoad = () => {
        const pickerOrigin =
          window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
            ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
            : window.location.origin;

        const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.SPREADSHEETS);
        view.setMimeTypes("application/vnd.google-apps.spreadsheet");

        const picker = new (window as any).google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(googleToken)
          .setCallback((data: any) => {
            if (data.action === (window as any).google.picker.Action.PICKED) {
              const file = data.docs[0];
              setDirectSheetId(file.id);
              setDirectSheetName(file.name);
              localStorage.setItem("sabaidee_dorm_direct_sheet_id", file.id);
              localStorage.setItem("sabaidee_dorm_direct_sheet_name", file.name);
            }
          })
          .setOrigin(pickerOrigin)
          .build();
        picker.setVisible(true);
      };

      if ((window as any).gapi) {
        (window as any).gapi.load("picker", { callback: onPickerLoad });
      } else {
        alert("กำลังโหลดปลั๊กอินของ Google กรุณารอสักครู่แล้วลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Picker error:", err);
      alert("เกิดข้อผิดพลาดในการเปิดระบบคัดเลือกไฟล์ Google Picker");
    }
  };

  const executeDirectPush = async () => {
    if (!googleToken || !directSheetId) return;
    setIsDirectSyncing(true);
    setShowDirectConfirmModal(null);
    try {
      const res = await pushDirectToGoogleSheets(directSheetId, googleToken);
      if (res.success) {
        const timeStr = new Date().toLocaleString("th-TH");
        setDirectLastSync(timeStr);
        localStorage.setItem("sabaidee_dorm_direct_last_sync", timeStr);
        alert("ส่งข้อมูลดิบระบบไปยังเซลล์ชีตบนคลาวด์สำเร็จแล้ว!");
      } else {
        alert(`เกิดข้อผิดพลาด: ${res.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("ไม่สามารถซิงค์ขึ้นไปยังชีตได้");
    } finally {
      setIsDirectSyncing(false);
    }
  };

  const executeDirectPull = async () => {
    if (!googleToken || !directSheetId) return;
    setIsDirectSyncing(true);
    setShowDirectConfirmModal(null);
    try {
      const res = await pullDirectFromGoogleSheets(directSheetId, googleToken);
      if (res.success) {
        const timeStr = new Date().toLocaleString("th-TH");
        setDirectLastSync(timeStr);
        localStorage.setItem("sabaidee_dorm_direct_last_sync", timeStr);
        alert("ดึงข้อมูลและปรับเปลี่ยนฐานข้อมูลระบบสำเร็จแล้ว! หน้าเว็บจะรีโหลดอัตโนมัติเพื่อแสดงการเปลี่ยนแปลง");
        // Reload page to re-initialize App component states
        window.location.reload();
      } else {
        alert(`เกิดข้อผิดพลาด: ${res.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("ไม่สามารถดึงข้อมูลจากชีตได้");
    } finally {
      setIsDirectSyncing(false);
    }
  };
  // =========================================================================

  // Owner Info states
  const [ownerName, setOwnerName] = useState(ownerInfo?.name || "");
  const [ownerPhone, setOwnerPhone] = useState(ownerInfo?.phone || "");

  React.useEffect(() => {
    setInputGsUrl(gsUrl);
  }, [gsUrl]);

  React.useEffect(() => {
    setOwnerName(ownerInfo?.name || "");
    setOwnerPhone(ownerInfo?.phone || "");
  }, [ownerInfo?.name, ownerInfo?.phone]);

  // Form states
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  // Rate states
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState<UtilityRate | null>(null);
  const [waterRate, setWaterRate] = useState<number>(25);
  const [elecRate, setElecRate] = useState<number>(9);
  const [startMonth, setStartMonth] = useState<string>("2026-07");

  // Announcement states
  const [isAnncModalOpen, setIsAnncModalOpen] = useState(false);
  const [currentAnnc, setCurrentAnnc] = useState<BillAnnouncement | null>(null);
  const [anncMessage, setAnncMessage] = useState("");
  const [anncStartMonth, setAnncStartMonth] = useState("2026-07");
  const [anncEndMonth, setAnncEndMonth] = useState("2026-12");

  const handleOpenAddRate = () => {
    setCurrentRate(null);
    setWaterRate(25);
    setElecRate(9);
    setStartMonth(new Date().toISOString().slice(0, 7));
    setIsRateModalOpen(true);
  };

  const handleOpenEditRate = (rate: UtilityRate) => {
    setCurrentRate(rate);
    setWaterRate(rate.waterRate);
    setElecRate(rate.elecRate);
    setStartMonth(rate.startMonth);
    setIsRateModalOpen(true);
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (waterRate <= 0 || elecRate <= 0 || !startMonth) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      return;
    }
    onSaveUtilityRate({
      id: currentRate?.id || "",
      waterRate,
      elecRate,
      startMonth,
      createdDate: ""
    });
    setIsRateModalOpen(false);
  };

  const handleOpenAddAnnc = () => {
    setCurrentAnnc(null);
    setAnncMessage("");
    const curMonth = new Date().toISOString().slice(0, 7);
    setAnncStartMonth(curMonth);
    setAnncEndMonth(curMonth);
    setIsAnncModalOpen(true);
  };

  const handleOpenEditAnnc = (annc: BillAnnouncement) => {
    setCurrentAnnc(annc);
    setAnncMessage(annc.message);
    setAnncStartMonth(annc.startMonth);
    setAnncEndMonth(annc.endMonth);
    setIsAnncModalOpen(true);
  };

  const handleAnncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anncMessage.trim() || !anncStartMonth || !anncEndMonth) {
      alert("กรุณากรอกข้อมูลประกาศและรอบเดือนให้ครบถ้วน");
      return;
    }
    if (anncStartMonth > anncEndMonth) {
      alert("รอบเดือนที่เริ่มประกาศ ห้ามมีค่ามากกว่ารอบเดือนสุดท้าย");
      return;
    }
    onSaveBillAnnouncement({
      id: currentAnnc?.id || "",
      message: anncMessage,
      startMonth: anncStartMonth,
      endMonth: anncEndMonth,
      createdDate: ""
    });
    setIsAnncModalOpen(false);
  };

  const handleOpenAdd = () => {
    setCurrentAdmin(null);
    setUsername("");
    setPin("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin: Admin) => {
    setCurrentAdmin(admin);
    setUsername(admin.username);
    setPin(admin.pin);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) return;

    if (pin.length !== 6 || isNaN(Number(pin))) {
      alert("PIN ต้องประกอบด้วยตัวเลข 6 หลักเท่านั้น!");
      return;
    }

    onSave({
      id: currentAdmin?.id || "",
      username: username.trim(),
      pin: pin.trim()
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-slate-500 text-sm font-medium">
          ระบบจัดการรายชื่อผู้เข้าใช้และรหัสล็อกอิน PIN 6 หลัก ปลอดภัยด้วยกลไกการเซฟเข้า LocalStorage
        </span>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มบัญชีแอดมิน</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-6 py-4">ผู้ใช้งาน (Username)</th>
                <th className="px-6 py-4">รหัส PIN 6 หลัก</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {admins.map(adm => (
                <tr key={adm.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{adm.username}</td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">•••• (รหัสผ่านลับ)</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button 
                        onClick={() => handleOpenEdit(adm)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                        title="แก้ไขรหัสผ่าน"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (admins.length <= 1) {
                            alert("ไม่สามารถลบบัญชีผู้ใช้แอดมินคนสุดท้ายได้!");
                            return;
                          }
                          if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีแอดมิน "${adm.username}"`)) {
                            onDelete(adm.id);
                          }
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="ลบบัญชี"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Utility Rates Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mt-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-none">ปรับอัตราค่าน้ำ-ค่าไฟ ต่อหน่วย</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">กำหนดอัตราค่าน้ำ ค่าไฟ และระบุรอบเดือนที่เริ่มใช้งาน</p>
            </div>
          </div>
          <button
            onClick={handleOpenAddRate}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มอัตราใหม่</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase border-b border-slate-100">
                <th className="px-4 py-2.5">เดือนที่เริ่มใช้</th>
                <th className="px-4 py-2.5 text-center">ค่าน้ำ (บาท/หน่วย)</th>
                <th className="px-4 py-2.5 text-center">ค่าไฟ (บาท/หน่วย)</th>
                <th className="px-4 py-2.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-xs">
              {utilityRates.map(rate => (
                <tr key={rate.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 font-mono">{rate.startMonth}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600 font-mono">{rate.waterRate} บ.</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-600 font-mono">{rate.elecRate} บ.</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenEditRate(rate)}
                        className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-all cursor-pointer"
                        title="แก้ไขอัตรา"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (utilityRates.length <= 1) {
                            alert("ไม่สามารถลบอัตราค่าบริการรายการสุดท้ายได้!");
                            return;
                          }
                          if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบอัตราค่าบริการรอบเดือน ${rate.startMonth}? การลบจะมีผลต่อการคำนวณบิลใหม่ทั้งหมด`)) {
                            onDeleteUtilityRate(rate.id);
                          }
                        }}
                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-all cursor-pointer"
                        title="ลบอัตรา"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Announcements Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mt-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Plus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-none">ประกาศท้ายบิล</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">กำหนดข้อความแจ้งเตือนหรือประกาศที่ต้องการพิมพ์ท้ายใบแจ้งหนี้</p>
            </div>
          </div>
          <button
            onClick={handleOpenAddAnnc}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-500/10 cursor-pointer flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มประกาศใหม่</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase border-b border-slate-100">
                <th className="px-4 py-2.5">ข้อความประกาศ</th>
                <th className="px-4 py-2.5 text-center">เริ่มใช้</th>
                <th className="px-4 py-2.5 text-center">สิ้นสุด</th>
                <th className="px-4 py-2.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-xs">
              {billAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-semibold">
                    ไม่มีรายการประกาศท้ายบิล
                  </td>
                </tr>
              ) : (
                billAnnouncements.map(annc => (
                  <tr key={annc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 max-w-xs truncate" title={annc.message}>
                      {annc.message}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600 font-mono">{annc.startMonth}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600 font-mono">{annc.endMonth}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenEditAnnc(annc)}
                          className="p-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-md transition-all cursor-pointer"
                          title="แก้ไขประกาศ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้?`)) {
                              onDeleteBillAnnouncement(annc.id);
                            }
                          }}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-all cursor-pointer"
                          title="ลบประกาศ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dorm Owner Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mt-8 space-y-4">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-none">ข้อมูลผู้ติดต่อ / เจ้าของหอพัก</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">ตั้งค่าชื่อเจ้าของและเบอร์โทรศัพท์เพื่อใช้แสดงบนใบแจ้งหนี้เมื่อเลือกชำระด้วยเงินสด</p>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!ownerName.trim() || !ownerPhone.trim()) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
          }
          onSaveOwnerInfo({ name: ownerName.trim(), phone: ownerPhone.trim() });
          alert("บันทึกข้อมูลเจ้าของหอพักเรียบร้อยแล้ว!");
        }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">ชื่อเจ้าของหอพัก</label>
              <input 
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold text-slate-800"
                placeholder="เช่น คุณวิภาวรรณ สุขประเสริฐ"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">เบอร์ติดต่อ</label>
              <input 
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold text-slate-800"
                placeholder="เช่น 081-234-5678"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูลผู้ติดต่อ</span>
            </button>
          </div>
        </form>
      </div>

      {/* Google Sheets Sync Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mt-8 space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-none">เชื่อมต่อฐานข้อมูล Google Sheets</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">ตั้งค่า Google Apps Script เพื่อบันทึกข้อมูลแบบเรียลไทม์</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Google Apps Script Web App URL</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={inputGsUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputGsUrl(val);
                  onSaveGsUrl(val); // Auto-save on every keystroke to keep App state and localStorage perfectly synchronized
                }}
                onBlur={() => {
                  onSaveGsUrl(inputGsUrl);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-mono text-slate-800"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              <button
                type="button"
                onClick={() => {
                  onSaveGsUrl(inputGsUrl);
                  alert("บันทึกที่อยู่ URL สำเร็จ!");
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>บันทึก URL</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">สถานะการทำงาน</span>
              <span className="text-xs font-bold text-slate-700">ซิงค์ล่าสุด: <strong className="text-[#2563eb] font-mono">{lastSyncTime}</strong></span>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPullFromSheets(inputGsUrl)}
                disabled={isSyncing}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563eb]" /> : <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />}
                <span>ดึงข้อมูล (Pull)</span>
              </button>

              <button
                type="button"
                onClick={() => onPushToSheets(inputGsUrl)}
                disabled={isSyncing}
                className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> : <UploadCloud className="w-3.5 h-3.5 text-white" />}
                <span>ส่งข้อมูล (Push)</span>
              </button>
            </div>
          </div>

          {/* Configuration Instructions */}
          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 text-xs text-slate-800 space-y-3">
            <h4 className="font-extrabold flex items-center gap-1.5 text-blue-950 text-sm">
              <ShieldAlert className="w-4 h-4 text-[#2563eb] shrink-0" />
              <span>แนะนำการใช้งานระบบบริหารจัดการหอพัก</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 font-semibold">
              <li><strong className="text-slate-900 font-bold">จัดการห้องพัก:</strong> เพิ่มห้องพัก ตั้งค่าอัตราค่าเช่ารายเดือน และขั้นต่ำน้ำ-ไฟสำหรับแต่ละห้องพักในระบบ</li>
              <li><strong className="text-slate-900 font-bold">ทำสัญญาผู้เช่าอาศัย:</strong> ลงทะเบียนสัญญาผู้เช่าใหม่ ระบุชื่อ เบอร์โทร และบันทึกเลขมิเตอร์น้ำและไฟฟ้าเริ่มต้นให้ถูกต้อง</li>
              <li><strong className="text-slate-900 font-bold">บันทึกจดมิเตอร์น้ำ-ไฟ:</strong> ป้อนเลขจดบันทึกของหน่วยล่าสุดประจำรอบเดือน ระบบจะคำนวณส่วนต่างค่าน้ำและค่าไฟฟ้าและออกยอดจัดเก็บให้ทันที</li>
              <li><strong className="text-slate-900 font-bold">ตรวจสอบและออกบิลสรุป:</strong> เรียกดูและสั่งพิมพ์ใบแจ้งหนี้แบบเดี่ยวรายห้อง หรือพิมพ์สรุปงบการเงินแบบรวม 15 ห้องต่อหน้าเพื่อความสะดวกรวดเร็ว</li>
              <li><strong className="text-slate-900 font-bold">ชำระเงินแบบตัดบิล FIFO:</strong> บันทึกรับชำระเงินโดยระบบจะหักลบยอดหนี้ค้างเก่าตามลำดับประวัติบิลก่อนหลังอย่างถูกต้องแม่นยำ</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Google Workspace Direct REST API Sync Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl mt-8 space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-none">เชื่อมต่อ Google Workspace ด้วยบัญชีตรง (แนะนำ)</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">สำรองข้อมูล บันทึกข้อมูล และดึงประวัติผ่าน Google Drive, Google Sheets, และ Google Picker API โดยตรง</p>
          </div>
        </div>

        {googleError && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{googleError}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Account Status Block */}
          {!googleUser ? (
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center text-center space-y-3">
              <Key className="w-8 h-8 text-slate-400 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-slate-700">ยังไม่ได้เชื่อมต่อบัญชี Google</p>
                <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">เชื่อมต่อบัญชี Google เพื่อให้ระบบเข้าถึง Google Drive และสร้าง/เลือกแผ่นงาน Google Sheets ได้แบบไร้รอยต่อ</p>
              </div>
              <button
                type="button"
                onClick={handleDirectGoogleLogin}
                disabled={isLoggingIn}
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                )}
                <span>{isLoggingIn ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อด้วยบัญชี Google"}</span>
              </button>
            </div>
          ) : (
            <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-50/50 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt="Google avatar" className="w-10 h-10 rounded-full border border-blue-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {googleUser.name?.charAt(0) || "G"}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{googleUser.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">{googleUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDirectGoogleLogout}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}

          {/* Connected Google Drive / Sheets Selector Block */}
          {googleUser && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">ไฟล์บัญชีรับส่งข้อมูลปัจจุบัน</span>
                
                {directSheetId ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800 truncate" title={directSheetName}>{directSheetName}</p>
                        <p className="text-[9px] font-mono font-bold text-[#2563eb] mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded inline-block truncate max-w-full" title={directSheetId}>ID: {directSheetId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenPicker}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>เปลี่ยนไฟล์ (Picker)</span>
                      </button>
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${directSheetId}/edit`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg transition-all flex items-center"
                        title="เปิดในแท็บใหม่"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleOpenPicker}
                      className="flex-1 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-[#2563eb]" />
                      <span>เลือก Google Sheet จาก Drive (Picker)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isDirectSyncing}
                      className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isDirectSyncing ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Plus className="w-4 h-4 text-white" />
                      )}
                      <span>สร้าง Google Sheet แผ่นใหม่บน Drive</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sync Action Buttons */}
              {directSheetId && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">ซิงค์แบบส่งตรง (OAuth REST)</span>
                    <span className="text-xs font-bold text-slate-700">ซิงค์ล่าสุด: <strong className="text-blue-600 font-mono">{directLastSync}</strong></span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDirectConfirmModal("pull")}
                      disabled={isDirectSyncing}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDirectSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563eb]" /> : <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>ดึงข้อมูลคืน (Pull Direct)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDirectConfirmModal("push")}
                      disabled={isDirectSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isDirectSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> : <UploadCloud className="w-3.5 h-3.5 text-white" />}
                      <span>ส่งข้อมูลดิบ (Push Direct)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal for Direct Sync Actions (Destructive operations protection) */}
      {showDirectConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>{showDirectConfirmModal === "pull" ? "ยืนยันการดึงข้อมูลคืน (Pull Direct)" : "ยืนยันการส่งข้อมูล (Push Direct)"}</span>
              </h3>
              <button 
                onClick={() => setShowDirectConfirmModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600 font-bold leading-relaxed">
                {showDirectConfirmModal === "pull" ? (
                  <>
                    คุณต้องการดึงข้อมูลจากไฟล์ <strong className="text-[#2563eb]">{directSheetName}</strong> ลงมาเขียนทับฐานข้อมูลในเครื่องนี้ใช่หรือไม่?
                    <br />
                    <span className="text-rose-600 font-extrabold mt-2 block">⚠️ คำเตือน: ข้อมูลที่มีอยู่ในเครื่องนี้จะถูกเขียนทับทั้งหมดและสูญหาย ไม่สามารถย้อนกลับได้!</span>
                  </>
                ) : (
                  <>
                    คุณต้องการเขียนข้อมูลจากเครื่องนี้ขึ้นไปทับบนแผ่นงานไฟล์ <strong className="text-[#2563eb]">{directSheetName}</strong> บนคลาวด์ใช่หรือไม่?
                    <br />
                    <span className="text-rose-600 font-extrabold mt-2 block">⚠️ คำเตือน: ข้อมูลในแผ่นงานย่อยทั้งหมดบนชีตปัจจุบันจะถูกล้างและเขียนทับด้วยข้อมูลปัจจุบัน!</span>
                  </>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setShowDirectConfirmModal(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button"
                  onClick={showDirectConfirmModal === "pull" ? executeDirectPull : executeDirectPush}
                  className={`px-5 py-2.5 ${showDirectConfirmModal === "pull" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/10" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"} text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer`}
                >
                  {showDirectConfirmModal === "pull" ? "ฉันเข้าใจ ยืนยันการดึงข้อมูล" : "ยืนยันส่งข้อมูลขึ้นคลาวด์"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Card */}
      {onResetLocalDatabase && (
        <div className="bg-red-50/50 rounded-2xl border border-red-100 shadow-sm p-6 max-w-2xl mt-8 space-y-4 animate-in fade-in">
          <div className="flex items-center space-x-2.5 pb-2">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-red-900 leading-none">พื้นที่จัดการความปลอดภัย (Danger Zone)</h3>
              <p className="text-xs text-red-500 font-semibold mt-1">การกระทำที่ส่งผลต่อข้อมูลทั้งหมดในอุปกรณ์เครื่องนี้</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">รีเซ็ตระบบกลับสู่ชุดข้อมูลตัวอย่างเริ่มต้น (Reset Demo Data)</p>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed max-w-md">ล้างข้อมูลห้องพัก ผู้เช่า ประวัติมิเตอร์ และประวัติการรับชำระทั้งหมดที่มีอยู่ เพื่อเริ่มใช้งานชุดข้อมูลตัวอย่าง 4 ห้องพักที่มีการคำนวณเรียบร้อยแล้วใหม่อีกครั้ง</p>
            </div>
            <button
              type="button"
              onClick={onResetLocalDatabase}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-500/10 cursor-pointer flex items-center space-x-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างและรีเซ็ตข้อมูลเริ่มต้น</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">
                {currentAdmin ? "แก้ไขข้อมูลรหัสผ่านแอดมิน" : "เพิ่มแอดมินผู้ดูแลใหม่"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อผู้ใช้ล็อกอิน (Username) *</label>
                <input 
                  type="text" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-bold"
                  placeholder="เช่น admin_kate"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสพินส่วนตัว (PIN 6 หลัก) *</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-mono font-bold text-center tracking-widest text-blue-600"
                  placeholder="123400"
                />
                <p className="text-[10px] text-slate-400 mt-1">ต้องใช้รหัสตัวเลขล้วน 6 หลัก เพื่อความปลอดภัยระดับมาตรฐานสูง</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  บันทึกแอดมิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Utility Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">
                {currentRate ? "แก้ไขอัตราค่าน้ำ-ค่าไฟ" : "เพิ่มอัตราค่าน้ำ-ค่าไฟรอบใหม่"}
              </h3>
              <button 
                onClick={() => setIsRateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เดือนที่เริ่มมีผลใช้งาน (Start Month) *</label>
                <input 
                  type="month" 
                  required 
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ค่าน้ำ (บาท/หน่วย) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1}
                    value={waterRate}
                    onChange={(e) => setWaterRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-bold text-center text-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ค่าไฟ (บาท/หน่วย) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1}
                    value={elecRate}
                    onChange={(e) => setElecRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-bold text-center text-amber-600 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  บันทึกอัตรา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Announcement Modal */}
      {isAnncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">
                {currentAnnc ? "แก้ไขประกาศท้ายบิล" : "เพิ่มประกาศท้ายบิลรอบใหม่"}
              </h3>
              <button 
                onClick={() => setIsAnncModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAnncSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ข้อความประกาศท้ายบิล *</label>
                <textarea
                  required
                  rows={3}
                  value={anncMessage}
                  onChange={(e) => setAnncMessage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm text-slate-800 font-bold"
                  placeholder="เช่น กรุณางดส่งเสียงดังรบกวนผู้อื่นหลังเวลา 22:00 น. ขอบคุณค่ะ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เริ่มรอบเดือน *</label>
                  <input 
                    type="month" 
                    required 
                    value={anncStartMonth}
                    onChange={(e) => setAnncStartMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">สิ้นสุดรอบเดือน *</label>
                  <input 
                    type="month" 
                    required 
                    value={anncEndMonth}
                    onChange={(e) => setAnncEndMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setIsAnncModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 cursor-pointer"
                >
                  บันทึกประกาศ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
