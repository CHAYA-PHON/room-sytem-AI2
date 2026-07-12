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

// =========================================================================
// DIRECT OAUTH GOOGLE SHEETS & DRIVE API INTEGRATIONS
// =========================================================================

export const SHEETS_CONFIG: Record<string, { sheetName: string; headers: string[] }> = {
  rooms: {
    sheetName: "Rooms",
    headers: ["id", "name", "rent", "minWater", "minElec", "payMethod", "bankId", "note"]
  },
  tenants: {
    sheetName: "Tenants",
    headers: ["roomId", "name", "phone", "startDate", "startWater", "startElec", "status"]
  },
  meters: {
    sheetName: "Meters",
    headers: ["meterId", "roomId", "month", "prevWater", "currWater", "prevElec", "currElec", "note", "recordedBy", "recordedDate"]
  },
  added_items: {
    sheetName: "Added_Items",
    headers: ["id", "roomId", "month", "name", "amount", "note"]
  },
  bills: {
    sheetName: "Bills",
    headers: ["billId", "roomId", "roomName", "tenantName", "month", "waterUnits", "waterCost", "elecUnits", "elecCost", "rentCost", "addedCost", "prevUnpaid", "total", "paid", "balance", "status", "createdDate"]
  },
  banks: {
    sheetName: "Banks",
    headers: ["id", "bankName", "accountNumber", "accountName", "footerNote"]
  },
  payments: {
    sheetName: "Payments",
    headers: ["payId", "billId", "date", "amount", "method", "receiver", "note"]
  },
  admins: {
    sheetName: "Admins",
    headers: ["id", "username", "pin"]
  },
  owner_info: {
    sheetName: "Owner_Info",
    headers: ["name", "phone"]
  }
};

/**
 * Direct push using Google Sheets REST API
 */
export async function pushDirectToGoogleSheets(
  spreadsheetId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch spreadsheet metadata to check available sheets
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!metaRes.ok) {
      const errorData = await metaRes.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `ไม่สามารถดึงข้อมูลแผ่นงานได้ (รหัสตอบกลับ ${metaRes.status})`);
    }

    const metadata = await metaRes.json();
    const existingSheetNames = (metadata.sheets || []).map((s: any) => s.properties?.title);

    // 2. Detect and add missing sheets
    const sheetsToAdd = Object.values(SHEETS_CONFIG)
      .map(config => config.sheetName)
      .filter(name => !existingSheetNames.includes(name));

    if (sheetsToAdd.length > 0) {
      const addRequests = sheetsToAdd.map(name => ({
        addSheet: {
          properties: { title: name }
        }
      }));

      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests: addRequests })
      });

      if (!updateRes.ok) {
        throw new Error("ล้มเหลวในการสร้างชีตย่อยใหม่บนไฟล์ Google Sheets");
      }
    }

    // 3. Clear data ranges to prevent overlapping rows
    const clearRanges = Object.values(SHEETS_CONFIG).map(config => `${config.sheetName}!A2:Z1000`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ranges: clearRanges })
    });

    // 4. Construct payload for batch update values
    const dataUpdates = Object.entries(SHEETS_CONFIG).map(([apiKey, config]) => {
      const localKey = `dorm_${apiKey}`;
      const localData = getLocalTable(localKey);
      
      const rows: any[][] = [];
      // Row 1: Headers
      rows.push(config.headers);

      // Remaining rows: Data
      localData.forEach((item: any) => {
        const row: any[] = [];
        config.headers.forEach(header => {
          let val = item[header];
          if (val === undefined || val === null) {
            row.push("");
          } else if (typeof val === "boolean") {
            row.push(val ? "TRUE" : "FALSE");
          } else if (typeof val === "object") {
            row.push(JSON.stringify(val));
          } else {
            row.push(val);
          }
        });
        rows.push(row);
      });

      return {
        range: `${config.sheetName}!A1`,
        values: rows
      };
    });

    // Handle Owner Info separately since it is an object in local storage, not an array
    const ownerInfoIdx = dataUpdates.findIndex(u => u.range.startsWith("Owner_Info!"));
    if (ownerInfoIdx !== -1) {
      const info = getOwnerInfo();
      dataUpdates[ownerInfoIdx].values = [
        ["name", "phone"],
        [info.name || "", info.phone || ""]
      ];
    }

    const updateValuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: dataUpdates
      })
    });

    if (!updateValuesRes.ok) {
      const err = await updateValuesRes.json().catch(() => ({}));
      throw new Error(err.error?.message || "ล้มเหลวในการส่งข้อมูลดิบขึ้นเซลล์ชีต");
    }

    const timeStr = new Date().toLocaleString("th-TH");
    setLastSyncTime(timeStr);

    return {
      success: true,
      message: `บันทึกข้อมูลและซิงค์ตรงไปยัง Google Sheets สำเร็จเมื่อเวลา ${timeStr}`
    };
  } catch (error: any) {
    console.error("Direct sheet sync push failed:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets API"
    };
  }
}

/**
 * Direct pull using Google Sheets REST API
 */
export async function pullDirectFromGoogleSheets(
  spreadsheetId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const ranges = Object.values(SHEETS_CONFIG).map(config => `${config.sheetName}!A1:Z1000`);
    const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "ล้มเหลวในการอ่านข้อมูลจากชีต");
    }

    const data = await res.json();
    const valueRanges = data.valueRanges || [];

    const pulledPayload: Record<string, any[]> = {};

    Object.entries(SHEETS_CONFIG).forEach(([apiKey, config]) => {
      // Find the value range matching the sheet name
      const rangeObj = valueRanges.find((vr: any) => vr.range && vr.range.startsWith(`${config.sheetName}!`));
      if (!rangeObj || !rangeObj.values || rangeObj.values.length <= 1) {
        pulledPayload[apiKey] = [];
        return;
      }

      const fileRows = rangeObj.values;
      const headers = fileRows[0].map((h: any) => h ? h.toString().trim() : "");
      const records: any[] = [];

      for (let i = 1; i < fileRows.length; i++) {
        const row = fileRows[i];
        const record: Record<string, any> = {};
        let hasData = false;

        headers.forEach((h: string, colIdx: number) => {
          if (!h) return;
          const cellVal = row[colIdx];
          if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
            hasData = true;
            if (cellVal === "TRUE" || cellVal === true) {
              record[h] = true;
            } else if (cellVal === "FALSE" || cellVal === false) {
              record[h] = false;
            } else {
              record[h] = cellVal;
            }
          }
        });

        if (hasData) {
          records.push(record);
        }
      }

      pulledPayload[apiKey] = records;
    });

    // Direct apply of pulled data tables
    applyPulledData(pulledPayload);
    const timeStr = new Date().toLocaleString("th-TH");
    setLastSyncTime(timeStr);

    return {
      success: true,
      message: `ดึงข้อมูลตรงจาก Google Sheets ลงระบบสำเร็จเมื่อเวลา ${timeStr}`
    };
  } catch (error: any) {
    console.error("Direct sheet sync pull failed:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets API"
    };
  }
}

// Real-time automatic synchronization runner (debounced to protect Google APIs and limits)
let syncTimeout: any = null;

export function triggerRealtimeSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Dispatch event indicating sync is starting/pending
  window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
    detail: { status: "syncing", message: "กำลังบันทึกข้อมูลเรียลไทม์..." } 
  }));

  syncTimeout = setTimeout(async () => {
    // 1. Check if direct Google Sheets OAuth API is available and configured
    const directSheetId = localStorage.getItem("sabaidee_dorm_direct_sheet_id");
    const googleToken = localStorage.getItem("sabaidee_dorm_google_token");

    if (directSheetId && googleToken) {
      console.log("Realtime auto-sync: Pushing to Direct Google Sheets OAuth API...");
      try {
        const result = await pushDirectToGoogleSheets(directSheetId, googleToken);
        if (result.success) {
          console.log("Realtime auto-sync success (Direct API):", result.message);
          window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
            detail: { status: "success", time: new Date().toLocaleTimeString("th-TH") } 
          }));
        } else {
          console.warn("Realtime auto-sync failed (Direct API):", result.message);
          window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
            detail: { status: "error", message: result.message } 
          }));
        }
      } catch (error: any) {
        console.warn("Realtime auto-sync error (Direct API):", error);
        window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
          detail: { status: "error", message: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" } 
        }));
      }
      return;
    }

    // 2. Fallback to standard Apps Script Web App URL
    const gsUrl = getGsUrl();
    if (gsUrl) {
      console.log("Realtime auto-sync: Pushing to Google Sheets Web App...");
      try {
        const result = await pushToGoogleSheets(gsUrl);
        if (result.success) {
          console.log("Realtime auto-sync success (Apps Script):", result.message);
          window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
            detail: { status: "success", time: new Date().toLocaleTimeString("th-TH") } 
          }));
        } else {
          console.warn("Realtime auto-sync failed (Apps Script):", result.message);
          window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
            detail: { status: "error", message: result.message } 
          }));
        }
      } catch (error: any) {
        console.warn("Realtime auto-sync error (Apps Script):", error);
        window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
          detail: { status: "error", message: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" } 
        }));
      }
    } else {
      // No sync targets configured
      window.dispatchEvent(new CustomEvent("dorm_realtime_sync_status", { 
        detail: { status: "idle" } 
      }));
    }
  }, 1500); // Debounce for 1.5 seconds to batch rapid/consecutive writes
}


