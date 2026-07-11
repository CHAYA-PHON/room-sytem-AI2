/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Tenant, MeterReading, AddedItem, Bill, BankAccount, PaymentRecord, Admin, OwnerInfo } from "./types";
import { normalizeMonth, normalizeDate, getOwnerInfo, saveOwnerInfo } from "./dbSim";

export const DEFAULT_GS_URL = "https://script.google.com/macros/s/AKfycbxo_b5leHt6XINqSHaOwEcpo3fhzLa905gmOBwq-3GEx9cx6o9bu0KrXGaBTpz9rJ39/exec";
const GS_URL_KEY = "dorm_gs_url";
const LAST_SYNC_KEY = "dorm_last_sync_time";

export function getGsUrl(): string {
  return localStorage.getItem(GS_URL_KEY) || DEFAULT_GS_URL;
}

export function saveGsUrl(url: string) {
  localStorage.setItem(GS_URL_KEY, url.trim());
}

export function getLastSyncTime(): string {
  return localStorage.getItem(LAST_SYNC_KEY) || "ยังไม่มีการซิงค์";
}

export function setLastSyncTime(timeStr: string) {
  localStorage.setItem(LAST_SYNC_KEY, timeStr);
}

// Helper to get local storage parsed arrays
function getLocalTable(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Push current local database state to Google Sheets via the Web App URL
 */
export async function pushToGoogleSheets(url: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url.trim() || getGsUrl();
  if (!targetUrl) {
    return { success: false, message: "ไม่พบ URL ของ Google Apps Script" };
  }

  const payload = {
    action: "push",
    timestamp: new Date().toISOString(),
    data: {
      rooms: getLocalTable("dorm_rooms"),
      tenants: getLocalTable("dorm_tenants"),
      meters: getLocalTable("dorm_meters"),
      added_items: getLocalTable("dorm_added_items"),
      bills: getLocalTable("dorm_bills"),
      banks: getLocalTable("dorm_banks"),
      payments: getLocalTable("dorm_payments"),
      admins: getLocalTable("dorm_admins"),
      owner_info: [getOwnerInfo()]
    }
  };

  try {
    // Send POST using text/plain to avoid preflight CORS issues in certain Apps Script configurations
    const response = await fetch(targetUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    // If the server returned redirect or processed successfully
    const text = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch {
      // Sometimes no-cors mode returns empty or raw response
    }

    const timeStr = new Date().toLocaleString("th-TH");
    setLastSyncTime(timeStr);

    return { 
      success: true, 
      message: `ส่งข้อมูลไปยัง Google Sheets (Push) สำเร็จเมื่อเวลา ${timeStr} ${result?.message ? `(${result.message})` : ""}` 
    };
  } catch (error: any) {
    console.warn("Push to Google Sheets failed:", error);
    
    // Fallback if CORS/no-cors mode is restricted but request might have still gone through
    // For Google Apps Script, no-cors still executes the doPost script on Google's side!
    try {
      await fetch(targetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      const timeStr = new Date().toLocaleString("th-TH");
      setLastSyncTime(timeStr);
      return { 
        success: true, 
        message: `ส่งข้อมูลไปยังเซิร์ฟเวอร์เสร็จสิ้นเมื่อเวลา ${timeStr} (แบบช่องทางสำรอง No-CORS)` 
      };
    } catch (fallbackError: any) {
      return { 
        success: false, 
        message: `ล้มเหลวในการเชื่อมต่อ: ${error.message || error}. โปรดตรวจสอบว่า Apps Script เปิดให้ทุกคนเข้าถึงได้ (Anyone) หรือยัง` 
      };
    }
  }
}

/**
 * Pull database state from Google Sheets
 */
export async function pullFromGoogleSheets(url: string): Promise<{ success: boolean; message: string; data?: any }> {
  const targetUrl = url.trim() || getGsUrl();
  if (!targetUrl) {
    return { success: false, message: "ไม่พบ URL ของ Google Apps Script" };
  }

  // We will first try to load via POST with action: "pull" to bypass the doGet Index.html error!
  try {
    const postResponse = await fetch(targetUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ action: "pull" })
    });

    const text = await postResponse.text();
    const result = JSON.parse(text);

    if (result && result.data) {
      applyPulledData(result.data);
      const timeStr = new Date().toLocaleString("th-TH");
      setLastSyncTime(timeStr);
      return { success: true, message: `ดึงข้อมูลจาก Google Sheets สำเร็จเมื่อ ${timeStr}` };
    }
  } catch (e) {
    console.warn("POST pull failed, trying GET pull:", e);
  }

  // Fallback to GET with action=pull
  try {
    const getUrl = targetUrl.includes("?") ? `${targetUrl}&action=pull` : `${targetUrl}?action=pull`;
    const response = await fetch(getUrl);
    const text = await response.text();

    if (text.includes("Exception: No HTML file named Index was found")) {
      return {
        success: false,
        message: "สคริปต์ Google Apps Script แจ้งข้อผิดพลาด 'No HTML file named Index was found' ในฟังก์ชัน doGet. โปรดแก้ไข Apps Script ให้ส่งกลับ ContentService.createTextOutput() แทน หรือตรวจสอบคู่มือการตั้งค่า"
      };
    }

    const result = JSON.parse(text);
    if (result && result.data) {
      applyPulledData(result.data);
      const timeStr = new Date().toLocaleString("th-TH");
      setLastSyncTime(timeStr);
      return { success: true, message: `ดึงข้อมูลสำเร็จเมื่อ ${timeStr}` };
    }

    return { success: false, message: "ดึงข้อมูลสำเร็จแต่ไม่พบโครงสร้าง data ที่ถูกต้อง" };
  } catch (error: any) {
    console.warn("GET pull failed:", error);
    return {
      success: false,
      message: `ไม่สามารถดึงข้อมูลได้: ${error.message || error}. เนื่องจาก Google Apps Script บนเบราว์เซอร์ติดปัญหา CORS หรือต้องการการเข้าสู่ระบบ`
    };
  }
}

/**
 * Apply the pulled Sheets data tables back into LocalStorage
 */
function applyPulledData(data: any) {
  if (!data) return;

  // Safety guard: If the pulled Google Sheets has 0 records in core tables (rooms/tenants),
  // we do NOT want to overwrite the local storage and wipe the user's data.
  const roomCount = data.rooms?.length || 0;
  const tenantCount = data.tenants?.length || 0;
  if (roomCount === 0 && tenantCount === 0) {
    throw new Error("แผ่นงาน Google Sheets นี้ไม่มีข้อมูลห้องพักและผู้เช่าอาศัยอยู่เลย เพื่อป้องกันข้อมูลสูญหายระบบจะไม่เขียนทับข้อมูลเดิมของคุณด้วยข้อมูลว่างเปล่า กรุณาใช้ปุ่ม 'ส่งข้อมูล (Push)' ในหน้าตั้งค่าแอดมินก่อน เพื่อเริ่มส่งชุดข้อมูลตั้งต้นจากเครื่องคุณขึ้นไปเก็บไว้บนแผ่นงาน Google Sheets");
  }

  const tables = {
    rooms: "dorm_rooms",
    tenants: "dorm_tenants",
    meters: "dorm_meters",
    added_items: "dorm_added_items",
    bills: "dorm_bills",
    banks: "dorm_banks",
    payments: "dorm_payments",
    admins: "dorm_admins"
  };

  // Pre-calculate room tenantId mapping for old schemas to preserve relationships
  const tenantToRoomMap: Record<string, string> = {};
  if (Array.isArray(data.rooms)) {
    data.rooms.forEach((r: any) => {
      if (r.id && r.tenantId) {
        tenantToRoomMap[r.tenantId.toString()] = r.id.toString();
      }
    });
  }

  Object.entries(tables).forEach(([apiKey, localKey]) => {
    if (data[apiKey] && Array.isArray(data[apiKey])) {
      let array = data[apiKey];
      // Normalize and sanitize fields depending on the entity type to guarantee strict types
      if (apiKey === "rooms") {
        array = array.map((r: any) => ({
          ...r,
          id: r.id ? r.id.toString() : "",
          name: r.name ? r.name.toString() : "",
          rent: r.rent !== undefined ? (Number(r.rent) || 0) : (Number(r.monthlyRent) || 0),
          minWater: Number(r.minWater) || 0,
          minElec: Number(r.minElec) || 0,
          payMethod: r.payMethod || "โอนธนาคาร",
          bankId: r.bankId ? r.bankId.toString() : "",
          note: r.note || r.notes || ""
        })).filter((r: any) => r.id !== "");
      } else if (apiKey === "meters") {
        array = array.map((m: any) => {
          const roomId = m.roomId ? m.roomId.toString() : "";
          const month = normalizeMonth(m.month);
          return {
            ...m, 
            meterId: m.meterId || m.id || (roomId && month ? `M${roomId}-${month.replace("-", "")}` : `M${Date.now()}`),
            roomId,
            month,
            recordedDate: m.recordedDate ? normalizeDate(m.recordedDate) : undefined,
            prevWater: Number(m.prevWater) || 0,
            currWater: m.currWater !== undefined ? (Number(m.currWater) || 0) : (Number(m.waterValue) || 0),
            prevElec: Number(m.prevElec) || 0,
            currElec: m.currElec !== undefined ? (Number(m.currElec) || 0) : (Number(m.electricityValue) || 0),
            note: m.note || "",
            recordedBy: m.recordedBy || "แอดมิน"
          };
        }).filter((m: any) => m.roomId !== "");
      } else if (apiKey === "added_items") {
        array = array.map((it: any) => ({ 
          ...it, 
          id: it.id ? it.id.toString() : `ADD${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          roomId: it.roomId ? it.roomId.toString() : "",
          month: normalizeMonth(it.month),
          name: it.name ? it.name.toString() : "",
          amount: it.amount !== undefined ? (Number(it.amount) || 0) : ((Number(it.unitPrice) * (it.isMultiplier ? 1 : 1)) || 0),
          note: it.note || ""
        })).filter((it: any) => it.roomId !== "");
      } else if (apiKey === "bills") {
        array = array.map((b: any) => {
          const roomId = b.roomId ? b.roomId.toString() : "";
          const month = normalizeMonth(b.month);
          const billId = b.billId || b.id || (roomId && month ? `B${roomId}-${month.replace("-", "")}` : `B${Date.now()}`);
          const total = b.total !== undefined ? (Number(b.total) || 0) : (Number(b.totalAmount) || 0);
          const paid = b.paid !== undefined ? (Number(b.paid) || 0) : (b.isPaid === true || b.isPaid === "TRUE" ? total : 0);
          const balance = b.balance !== undefined ? (Number(b.balance) || 0) : (total - paid);
          const status = b.status || (balance <= 0 ? "ชำระแล้ว" : "ค้างชำระ");
          return { 
            ...b, 
            billId,
            roomId,
            month,
            roomName: b.roomName ? b.roomName.toString() : "",
            tenantName: b.tenantName ? b.tenantName.toString() : "",
            waterUnits: Number(b.waterUnits) || 0,
            waterCost: Number(b.waterCost) || Number(b.waterCost) || 0,
            elecUnits: Number(b.elecUnits) || 0,
            elecCost: Number(b.elecCost) || Number(b.electricityCost) || 0,
            rentCost: b.rentCost !== undefined ? (Number(b.rentCost) || 0) : (Number(b.monthlyRent) || 0),
            addedCost: b.addedCost !== undefined ? (Number(b.addedCost) || 0) : (Number(b.addedItemsCost) || 0),
            prevUnpaid: Number(b.prevUnpaid) || 0,
            total,
            paid,
            balance,
            status,
            createdDate: b.createdDate ? normalizeDate(b.createdDate) : (b.paidDate ? normalizeDate(b.paidDate) : "")
          };
        }).filter((b: any) => b.roomId !== "");
      } else if (apiKey === "tenants") {
        array = array.map((t: any) => {
          const tid = t.id ? t.id.toString() : "";
          const roomId = t.roomId ? t.roomId.toString() : (tid ? tenantToRoomMap[tid] : "");
          return { 
            ...t, 
            roomId,
            name: t.name ? t.name.toString() : "",
            phone: t.phone ? t.phone.toString() : "",
            startDate: normalizeDate(t.startDate),
            startWater: Number(t.startWater) || 0,
            startElec: Number(t.startElec) || 0,
            status: t.status === "ใช้งาน" || t.status === "ยกเลิกสัญญา" ? t.status : "ใช้งาน"
          };
        }).filter((t: any) => t.roomId !== "");
      } else if (apiKey === "banks") {
        array = array.map((bank: any) => ({
          ...bank,
          id: bank.id ? bank.id.toString() : "",
          bankName: bank.bankName ? bank.bankName.toString() : "",
          accountNumber: bank.accountNumber ? bank.accountNumber.toString() : "",
          accountName: bank.accountName || bank.accountHolder || "",
          footerNote: bank.footerNote || bank.qrCodeUrl || ""
        })).filter((bank: any) => bank.id !== "");
      } else if (apiKey === "payments") {
        array = array.map((p: any) => ({ 
          ...p, 
          payId: p.payId || p.id || `P${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          billId: p.billId ? p.billId.toString() : "",
          date: normalizeDate(p.date),
          amount: Number(p.amount) || 0,
          method: p.method || "โอนธนาคาร",
          receiver: p.receiver || "แอดมิน",
          note: p.note || p.notes || p.proofUrl || ""
        })).filter((p: any) => p.billId !== "");
      }
      localStorage.setItem(localKey, JSON.stringify(array));
    }
  });

  if (data.owner_info && Array.isArray(data.owner_info) && data.owner_info.length > 0) {
    const info = data.owner_info[0];
    if (info && (info.name || info.phone)) {
      saveOwnerInfo({
        name: info.name || "",
        phone: info.phone || ""
      });
    }
  }
}
