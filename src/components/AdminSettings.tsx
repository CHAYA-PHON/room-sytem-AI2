/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, X, ShieldAlert, DownloadCloud, UploadCloud, RefreshCw, FileSpreadsheet, Save } from "lucide-react";
import { Admin, UtilityRate, BillAnnouncement, OwnerInfo } from "../types";

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
