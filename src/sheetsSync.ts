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
      message: `ซิงค์นำเข้า Google Sheets สำเร็จเมื่อเวลา ${timeStr} ${result?.message ? `(${result.message})` : ""}` 
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

  Object.entries(tables).forEach(([apiKey, localKey]) => {
    if (data[apiKey] && Array.isArray(data[apiKey])) {
      let array = data[apiKey];
      // Normalize monthly and date strings depending on the entity type
      if (apiKey === "meters") {
        array = array.map((m: any) => ({ 
          ...m, 
          month: normalizeMonth(m.month),
          recordedDate: m.recordedDate ? normalizeDate(m.recordedDate) : undefined
        }));
      } else if (apiKey === "added_items") {
        array = array.map((it: any) => ({ ...it, month: normalizeMonth(it.month) }));
      } else if (apiKey === "bills") {
        array = array.map((b: any) => ({ ...b, month: normalizeMonth(b.month) }));
      } else if (apiKey === "tenants") {
        array = array.map((t: any) => ({ ...t, startDate: normalizeDate(t.startDate) }));
      } else if (apiKey === "payments") {
        array = array.map((p: any) => ({ ...p, date: normalizeDate(p.date) }));
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
