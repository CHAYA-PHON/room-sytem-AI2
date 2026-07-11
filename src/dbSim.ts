/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Tenant, MeterReading, AddedItem, Bill, BankAccount, PaymentRecord, Admin, UtilityRate, BillAnnouncement, OwnerInfo } from "./types";

// คีย์สำหรับเก็บข้อมูลใน LocalStorage
const KEYS = {
  ROOMS: "dorm_rooms",
  TENANTS: "dorm_tenants",
  METERS: "dorm_meters",
  ADDED_ITEMS: "dorm_added_items",
  BILLS: "dorm_bills",
  BANKS: "dorm_banks",
  PAYMENTS: "dorm_payments",
  ADMIN: "dorm_admins",
  RATES: "dorm_utility_rates",
  ANNOUNCEMENTS: "dorm_bill_announcements",
  OWNER_INFO: "dorm_owner_info"
};

/**
 * ปรับรูปแบบเดือนให้อยู่ในรูป YYYY-MM เสมอ (แก้ไขปัญหาข้อมูล Timezone จาก Google Sheets)
 */
export function normalizeMonth(val: string): string {
  if (!val || typeof val !== "string") return val;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
      });
      const parts = formatter.formatToParts(d);
      const year = parts.find(p => p.type === "year")?.value;
      const month = parts.find(p => p.type === "month")?.value;
      if (year && month) {
        return `${year}-${month}`;
      }
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 7);
  }

  return trimmed;
}

/**
 * ปรับรูปแบบวันให้อยู่ในรูป YYYY-MM-DD เสมอ (แก้ไขปัญหาข้อมูล Timezone จาก Google Sheets)
 */
export function normalizeDate(val: string): string {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const parts = formatter.formatToParts(d);
      const year = parts.find(p => p.type === "year")?.value;
      const month = parts.find(p => p.type === "month")?.value;
      const day = parts.find(p => p.type === "day")?.value;
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  return trimmed;
}

/**
 * ตรวจสอบว่าผู้เช่าเริ่มเข้าอยู่อาศัยแล้วหรือยัง ณ เดือนที่เลือกบันทึกมิเตอร์
 * - ถ้าวันเริ่มเข้าอยู่ (startDate) อยู่หลังเดือนปัจจุบัน -> ยังไม่เข้าอยู่ (ไม่ต้องแสดง)
 * - ถ้าวันเริ่มเข้าอยู่ (startDate) อยู่ในเดือนปัจจุบัน แต่เริ่มตั้งแต่วันที่ 25 เป็นต้นไป (สิ้นเดือน) -> ถือเป็นยอดเดือนถัดไป (ไม่ต้องแสดงในเดือนปัจจุบัน)
 */
export function shouldShowMeterRecording(startDateStr: string, currentMonthStr: string): boolean {
  if (!startDateStr || !currentMonthStr) return true;
  
  const normStart = normalizeDate(startDateStr);
  const normMonth = normalizeMonth(currentMonthStr);
  
  const startParts = normStart.split("-");
  const monthParts = normMonth.split("-");
  if (startParts.length < 3 || monthParts.length < 2) return true;
  
  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10);
  const startDay = parseInt(startParts[2], 10);
  
  const currentYear = parseInt(monthParts[0], 10);
  const currentMonth = parseInt(monthParts[1], 10);
  
  if (startYear < currentYear) return true;
  if (startYear > currentYear) return false;
  
  if (startMonth < currentMonth) return true;
  if (startMonth > currentMonth) return false;
  
  // Same year and month
  if (startDay >= 25) {
    return false;
  }
  
  return true;
}

/**
 * ฟังก์ชันสร้างข้อมูลเริ่มต้น (Seed Data) ป้องกันข้อมูลหน้าโล่ง
 */
export function seedDatabase() {
  if (!localStorage.getItem(KEYS.ROOMS)) {
    // 1. เพิ่มห้องพักตัวอย่าง
    const rooms: Room[] = [
      { id: "R101", name: "101", rent: 3200, minWater: 100, minElec: 100, payMethod: "โอนธนาคาร", bankId: "B001", note: "ห้ามเลี้ยงสัตว์" },
      { id: "R102", name: "102", rent: 3200, minWater: 100, minElec: 100, payMethod: "โอนธนาคาร", bankId: "B001", note: "สูบบุหรี่ปรับ 2,000 บ." },
      { id: "R103", name: "103", rent: 3500, minWater: 120, minElec: 120, payMethod: "เงินสด", bankId: "", note: "" },
      { id: "R104", name: "104", rent: 3500, minWater: 120, minElec: 120, payMethod: "โอนธนาคาร", bankId: "B001", note: "" },
      { id: "R105", name: "105", rent: 3500, minWater: 120, minElec: 120, payMethod: "โอนธนาคาร", bankId: "B001", note: "" },
      { id: "R201", name: "201", rent: 3800, minWater: 150, minElec: 150, payMethod: "โอนธนาคาร", bankId: "B001", note: "แอร์ประหยัดไฟ" },
      { id: "R202", name: "202", rent: 3800, minWater: 150, minElec: 150, payMethod: "โอนธนาคาร", bankId: "B001", note: "" },
      { id: "R203", name: "203", rent: 4000, minWater: 150, minElec: 150, payMethod: "เงินสด", bankId: "", note: "" }
    ];
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));

    // 2. บัญชีรับเงินเริ่มต้น
    const banks: BankAccount[] = [
      { id: "B001", bankName: "ธนาคารกสิกรไทย", accountNumber: "045-8-91243-7", accountName: "น.ส.กมลทิพย์ ขวัญใจดี", footerNote: "โปรดชำระเงินไม่เกินวันที่ 5 ของเดือน ขอบพระคุณอย่างสูงค่ะ" }
    ];
    localStorage.setItem(KEYS.BANKS, JSON.stringify(banks));

    // 3. ผู้เช่าตัวอย่าง
    const tenants: Tenant[] = [
      { roomId: "R101", name: "นายสมชาย ตั้งมั่น", phone: "081-234-5678", startDate: "2026-01-01", startWater: 10, startElec: 120, status: "ใช้งาน" },
      { roomId: "R102", name: "นางสร้อยดี ใจดี", phone: "089-876-5432", startDate: "2026-02-15", startWater: 5, startElec: 80, status: "ใช้งาน" },
      { roomId: "R103", name: "นายประหยัด ประหยัดจริง", phone: "086-555-1122", startDate: "2026-03-01", startWater: 0, startElec: 50, status: "ใช้งาน" },
      { roomId: "R104", name: "น.ส.อรวี แสนหวาน", phone: "092-444-8899", startDate: "2026-04-10", startWater: 12, startElec: 240, status: "ใช้งาน" }
    ];
    localStorage.setItem(KEYS.TENANTS, JSON.stringify(tenants));

    // 4. บัญชี Admin เริ่มต้น
    const admins: Admin[] = [
      { id: "ADM001", username: "admin", pin: "123400" }
    ];
    localStorage.setItem(KEYS.ADMIN, JSON.stringify(admins));

    // 5. บันทึกมิเตอร์เดือนก่อนหน้า (2026-06) และ สร้างบิลเสร็จสิ้น
    // เพื่อให้รอบเดือนปัจจุบันมีเลขมิเตอร์ "ก่อนหน้า" ดึงอัตโนมัติ
    const prevMonth = "2026-06";
    const meters: MeterReading[] = [
      { meterId: "MR101-202606", roomId: "R101", month: prevMonth, prevWater: 10, currWater: 18, prevElec: 120, currElec: 210, note: "บันทึกเริ่มต้นรอบ", recordedBy: "system", recordedDate: "2026-06-30 18:00:00" },
      { meterId: "MR102-202606", roomId: "R102", month: prevMonth, prevWater: 5, currWater: 12, prevElec: 80, currElec: 155, note: "บันทึกเริ่มต้นรอบ", recordedBy: "system", recordedDate: "2026-06-30 18:00:00" },
      { meterId: "MR103-202606", roomId: "R103", month: prevMonth, prevWater: 0, currWater: 6, prevElec: 50, currElec: 110, note: "บันทึกเริ่มต้นรอบ", recordedBy: "system", recordedDate: "2026-06-30 18:00:00" },
      { meterId: "MR104-202606", roomId: "R104", month: prevMonth, prevWater: 12, currWater: 22, prevElec: 240, currElec: 325, note: "บันทึกเริ่มต้นรอบ", recordedBy: "system", recordedDate: "2026-06-30 18:00:00" }
    ];
    localStorage.setItem(KEYS.METERS, JSON.stringify(meters));

    // คำนวณบิลของเดือนที่แล้ว
    localStorage.setItem(KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(KEYS.ADDED_ITEMS, JSON.stringify([]));
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify([]));

    recalcBill("R101", prevMonth);
    recalcBill("R102", prevMonth);
    recalcBill("R103", prevMonth);
    recalcBill("R104", prevMonth);

    // ยอดจ่ายของเดือนที่แล้ว (ตัวอย่างว่าห้อง 101 จ่ายเรียบร้อย, 102 ยังค้างอยู่เต็ม ๆ, 103 จ่ายบางส่วน)
    payBillsFIFO("R101", 3200 + 8 * 25 + 90 * 9, "โอนธนาคาร", "admin", "โอนเรียบร้อย");
    payBillsFIFO("R103", 2000, "เงินสด", "admin", "จ่ายเงินสดล่วงหน้าบางส่วน");
  }
}

/**
 * ล้างข้อมูลใน LocalStorage ทั้งหมดและรัน seed database ใหม่
 */
export function resetToDefaultSeedData() {
  localStorage.removeItem(KEYS.ROOMS);
  localStorage.removeItem(KEYS.TENANTS);
  localStorage.removeItem(KEYS.METERS);
  localStorage.removeItem(KEYS.ADDED_ITEMS);
  localStorage.removeItem(KEYS.BILLS);
  localStorage.removeItem(KEYS.BANKS);
  localStorage.removeItem(KEYS.PAYMENTS);
  localStorage.removeItem(KEYS.RATES);
  localStorage.removeItem(KEYS.ANNOUNCEMENTS);
  localStorage.removeItem(KEYS.OWNER_INFO);
  seedDatabase();
}

/**
 * ดึงรายการชีต ห้อง
 */
export function getRooms(): Room[] {
  return JSON.parse(localStorage.getItem(KEYS.ROOMS) || "[]");
}

export function saveRoom(room: Room) {
  const rooms = getRooms();
  if (!room.id) {
    room.id = "R" + Math.random().toString(36).substr(2, 5).toUpperCase();
    rooms.push(room);
  } else {
    const idx = rooms.findIndex(r => r.id === room.id);
    if (idx !== -1) rooms[idx] = room;
  }
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
  return { success: true };
}

export function deleteRoom(id: string) {
  const rooms = getRooms();
  const updated = rooms.filter(r => r.id !== id);
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(updated));
  return { success: true };
}

/**
 * ดึงรายการชีต ผู้เช่า
 */
export function getTenants(): Tenant[] {
  const list: Tenant[] = JSON.parse(localStorage.getItem(KEYS.TENANTS) || "[]");
  return list.map(t => ({
    ...t,
    startDate: normalizeDate(t.startDate)
  }));
}

export function saveTenant(tenant: Tenant) {
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.roomId === tenant.roomId);
  if (idx !== -1) {
    tenants[idx] = tenant;
  } else {
    tenants.push(tenant);
  }
  localStorage.setItem(KEYS.TENANTS, JSON.stringify(tenants));
  return { success: true };
}

export function deleteTenant(roomId: string) {
  const tenants = getTenants();
  const updated = tenants.filter(t => t.roomId !== roomId);
  localStorage.setItem(KEYS.TENANTS, JSON.stringify(updated));
  return { success: true };
}

/**
 * ดึงรายการชีต บัญชีธนาคาร
 */
export function getBankAccounts(): BankAccount[] {
  return JSON.parse(localStorage.getItem(KEYS.BANKS) || "[]");
}

export function saveBankAccount(bank: BankAccount) {
  const banks = getBankAccounts();
  if (!bank.id) {
    bank.id = "B" + Math.random().toString(36).substr(2, 5).toUpperCase();
    banks.push(bank);
  } else {
    const idx = banks.findIndex(b => b.id === bank.id);
    if (idx !== -1) banks[idx] = bank;
  }
  localStorage.setItem(KEYS.BANKS, JSON.stringify(banks));
  return { success: true };
}

export function deleteBankAccount(id: string) {
  const banks = getBankAccounts();
  const updated = banks.filter(b => b.id !== id);
  localStorage.setItem(KEYS.BANKS, JSON.stringify(updated));
  return { success: true };
}

/**
 * ดึงรายการชีต รายการเพิ่ม
 */
export function getAddedItems(roomId: string, month: string): AddedItem[] {
  const items: AddedItem[] = JSON.parse(localStorage.getItem(KEYS.ADDED_ITEMS) || "[]");
  return items
    .map(it => ({ ...it, month: normalizeMonth(it.month) }))
    .filter(it => it.roomId === roomId && it.month === month);
}

export function getAllAddedItems(): AddedItem[] {
  const list: AddedItem[] = JSON.parse(localStorage.getItem(KEYS.ADDED_ITEMS) || "[]");
  return list.map(it => ({
    ...it,
    month: normalizeMonth(it.month)
  }));
}

export function saveAddedItem(item: AddedItem) {
  const items: AddedItem[] = JSON.parse(localStorage.getItem(KEYS.ADDED_ITEMS) || "[]");
  if (!item.id) {
    item.id = "ADD" + Date.now().toString().slice(-6);
    items.push(item);
  } else {
    const idx = items.findIndex(it => it.id === item.id);
    if (idx !== -1) items[idx] = item;
  }
  localStorage.setItem(KEYS.ADDED_ITEMS, JSON.stringify(items));
  recalcBill(item.roomId, item.month);
  return { success: true };
}

export function deleteAddedItem(id: string, roomId: string, month: string) {
  const items: AddedItem[] = JSON.parse(localStorage.getItem(KEYS.ADDED_ITEMS) || "[]");
  const updated = items.filter(it => it.id !== id);
  localStorage.setItem(KEYS.ADDED_ITEMS, JSON.stringify(updated));
  recalcBill(roomId, month);
  return { success: true };
}

/**
 * ดึงรายการชีต มิเตอร์น้ำ-ไฟ
 */
export function getMeters(): MeterReading[] {
  const list: MeterReading[] = JSON.parse(localStorage.getItem(KEYS.METERS) || "[]");
  return list.map(m => ({
    ...m,
    month: normalizeMonth(m.month)
  }));
}

export function getMeterEntryList(month: string) {
  const rooms = getRooms();
  const tenants = getTenants();
  
  // กรองเฉพาะห้องที่ติดสัญญาและมีสถานะใช้งาน และเข้าอยู่แล้วตามวันเริ่มเข้าพักของเดือนนี้
  const rentedRooms = rooms.filter(r => {
    const tenant = tenants.find(t => t.roomId === r.id && t.status === "ใช้งาน");
    if (!tenant) return false;
    return shouldShowMeterRecording(tenant.startDate, month);
  });

  const meters = getMeters();
  const currentMonthMeters = meters.filter(m => m.month === month);
  const prevMonth = getPreviousMonthStr(month);
  const prevMonthMeters = meters.filter(m => m.month === prevMonth);

  return rentedRooms.map(room => {
    const tenant = tenants.find(t => t.roomId === room.id);
    const existingMeter = currentMonthMeters.find(m => m.roomId === room.id);

    let defaultPrevWater = tenant ? tenant.startWater : 0;
    let defaultPrevElec = tenant ? tenant.startElec : 0;

    const prevMeter = prevMonthMeters.find(m => m.roomId === room.id);
    if (prevMeter) {
      defaultPrevWater = prevMeter.currWater;
      defaultPrevElec = prevMeter.currElec;
    }

    return {
      roomId: room.id,
      roomName: room.name,
      tenantName: tenant ? tenant.name : "ไม่ระบุ",
      isRecorded: !!existingMeter,
      meterId: existingMeter ? existingMeter.meterId : "",
      prevWater: existingMeter ? existingMeter.prevWater : defaultPrevWater,
      currWater: existingMeter ? existingMeter.currWater : "",
      prevElec: existingMeter ? existingMeter.prevElec : defaultPrevElec,
      currElec: existingMeter ? existingMeter.currElec : "",
      note: existingMeter ? existingMeter.note : "",
      originalPrevWater: defaultPrevWater,
      originalPrevElec: defaultPrevElec
    };
  });
}

export function saveMetersBatch(month: string, items: any[], recordedBy: string) {
  const meters = getMeters();
  
  items.forEach(item => {
    const currWater = Number(item.currWater) || 0;
    const currElec = Number(item.currElec) || 0;
    const prevWater = Number(item.prevWater) || 0;
    const prevElec = Number(item.prevElec) || 0;

    const meterId = item.meterId || `M${item.roomId}-${month.replace("-", "")}`;
    const idx = meters.findIndex(m => m.meterId === meterId);

    const row: MeterReading = {
      meterId: meterId,
      roomId: item.roomId,
      month: month,
      prevWater,
      currWater,
      prevElec,
      currElec,
      note: item.note || "",
      recordedBy: recordedBy,
      recordedDate: new Date().toLocaleString("th-TH")
    };

    if (idx !== -1) {
      meters[idx] = row;
    } else {
      meters.push(row);
    }

    localStorage.setItem(KEYS.METERS, JSON.stringify(meters));
    recalcBill(item.roomId, month);
  });

  return { success: true };
}

export function deleteMeterReading(roomId: string, month: string) {
  const meters = getMeters();
  const filtered = meters.filter(m => !(m.roomId === roomId && m.month === month));
  localStorage.setItem(KEYS.METERS, JSON.stringify(filtered));
  recalcBill(roomId, month);
  return { success: true };
}

/**
 * ดึงรายการชีต บิล
 */
export function getBills(): Bill[] {
  const list: Bill[] = JSON.parse(localStorage.getItem(KEYS.BILLS) || "[]");
  return list.map(b => ({
    ...b,
    month: normalizeMonth(b.month)
  }));
}

export function getBillsList(month: string) {
  const bills = getBills();
  const rooms = getRooms();
  const tenants = getTenants();

  const monthlyBills = bills.filter(b => b.month === month);

  return monthlyBills.map(b => {
    const room = rooms.find(r => r.id === b.roomId);
    const tenant = tenants.find(t => t.roomId === b.roomId);
    return {
      billId: b.billId,
      roomId: b.roomId,
      roomName: room ? room.name : b.roomId,
      tenantName: tenant ? tenant.name : "ไม่มีผู้เช่า",
      month: b.month,
      waterUnits: b.waterUnits,
      waterCost: b.waterCost,
      elecUnits: b.elecUnits,
      elecCost: b.elecCost,
      rentCost: b.rentCost,
      addedCost: b.addedCost,
      prevUnpaid: b.prevUnpaid,
      total: b.total,
      paid: b.paid,
      balance: b.balance,
      status: b.status,
      createdDate: b.createdDate
    };
  });
}

/**
 * 🧾 คำนวณบิลใหม่ (recalcBill) ตามกฎธุรกิจ
 */
export function recalcBill(roomId: string, month: string) {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;

  const meters = getMeters();
  const meter = meters.find(m => m.roomId === roomId && m.month === month);
  const billId = `B${roomId}-${month.replace("-", "")}`;

  // บิลสรุปประจำงวด ถ้ายังไม่ได้ รับค่า เลขที่ มิเตอร์ ยังไม่ต้องสร้างบิล เมื่อได้รับค่าแล้ว ค่อยสร้าง
  if (!meter) {
    const bills = getBills();
    const idx = bills.findIndex(b => b.billId === billId);
    if (idx !== -1) {
      bills.splice(idx, 1);
      localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
    }
    return;
  }

  let waterUnits = 0;
  let waterCost = 0;
  let elecUnits = 0;
  let elecCost = 0;

  const { waterRate, elecRate } = getUtilityRateForMonth(month);
  waterUnits = Math.max(0, meter.currWater - meter.prevWater);
  waterCost = Math.max(room.minWater, waterUnits * waterRate);

  elecUnits = Math.max(0, meter.currElec - meter.prevElec);
  elecCost = Math.max(room.minElec, elecUnits * elecRate);

  const rentCost = room.rent;

  // รวมค่าใช้จ่ายเสริม
  const addedItems = getAddedItems(roomId, month);
  const addedCost = addedItems.reduce((sum, item) => sum + item.amount, 0);

  // คำนวณยอดค้างสะสม (สะสมจากทุกบิลของเดือนก่อนหน้านี้ที่ยังไม่ชำระ)
  const bills = getBills();
  const prevUnpaid = bills.reduce((sum, b) => {
    if (b.roomId === roomId && b.month < month && b.status !== "ชำระแล้ว") {
      return sum + b.balance;
    }
    return sum;
  }, 0);

  const total = waterCost + elecCost + rentCost + addedCost + prevUnpaid;

  // หา Paid Amount จาก ประวัติรับชำระ
  const payments = getPaymentHistory();
  const paid = payments.reduce((sum, p) => p.billId === billId ? sum + p.amount : sum, 0);

  const balance = Math.max(0, total - paid);
  let status: "ค้างชำระ" | "ชำระบางส่วน" | "ชำระแล้ว" = "ค้างชำระ";
  if (paid >= total) {
    status = "ชำระแล้ว";
  } else if (paid > 0) {
    status = "ชำระบางส่วน";
  }

  const rowValues: Bill = {
    billId,
    roomId,
    month,
    waterUnits,
    waterCost,
    elecUnits,
    elecCost,
    rentCost,
    addedCost,
    prevUnpaid,
    total,
    paid,
    balance,
    status,
    createdDate: new Date().toLocaleString("th-TH")
  };

  const idx = bills.findIndex(b => b.billId === billId);
  if (idx !== -1) {
    bills[idx] = rowValues;
  } else {
    bills.push(rowValues);
  }
  localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
}

/**
 * ดึงรายการประวัติการจ่าย
 */
export function getPaymentHistory(month?: string): PaymentRecord[] {
  const payments: PaymentRecord[] = JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || "[]");
  
  // ป้องกันคีย์ซ้ำกัน (เช่น P7030330) ที่อาจจะบันทึกไปก่อนหน้า โดยแก้ให้มี unique suffix แบบไดนามิก
  const seenIds = new Set<string>();
  let hasDuplicates = false;
  const cleansedPayments = payments.map((p, idx) => {
    if (!p.payId) {
      p.payId = "P" + Date.now() + "_" + idx;
      hasDuplicates = true;
    }
    if (seenIds.has(p.payId)) {
      p.payId = p.payId + "_" + idx + "_" + Math.floor(Math.random() * 100);
      hasDuplicates = true;
    }
    seenIds.add(p.payId);
    return p;
  });

  if (hasDuplicates) {
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(cleansedPayments));
  }

  const normalized = cleansedPayments.map(p => ({
    ...p,
    date: normalizeDate(p.date)
  }));
  const bills = getBills();

  if (!month) return normalized;

  // กรองตามรอบเดือนของบิล
  return normalized.filter(p => {
    const bill = bills.find(b => b.billId === p.billId);
    return bill && bill.month === month;
  });
}

/**
 * 💰 บันทึกรับชำระเงินแบบ FIFO (First-In, First-Out)
 */
export function payBillsFIFO(roomId: string, amountPaid: number, paymentMethod: "เงินสด" | "โอนธนาคาร", receiver: string, note: string) {
  let remainingPaid = Number(amountPaid) || 0;
  if (remainingPaid <= 0) return { success: false, message: "ยอดเงินต้องมากกว่า 0" };

  const bills = getBills();
  const unpaidBills = bills
    .filter(b => b.roomId === roomId && b.status !== "ชำระแล้ว")
    .sort((a, b) => a.month.localeCompare(b.month)); // เรียงจากเก่าไปใหม่

  if (unpaidBills.length === 0) {
    return { success: false, message: "ไม่มีบิลค้างชำระสำหรับห้องนี้" };
  }

  const payments: PaymentRecord[] = JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || "[]");

  for (let i = 0; i < unpaidBills.length; i++) {
    if (remainingPaid <= 0) break;

    const bill = unpaidBills[i];
    const billOwed = bill.balance;
    const paymentForThisBill = Math.min(remainingPaid, billOwed);

    remainingPaid -= paymentForThisBill;

    // 1. บันทึกประวัติชำระ
    const payId = "P" + Date.now().toString().slice(-6) + "_" + Math.floor(1000 + Math.random() * 9000) + "_" + i;
    payments.push({
      payId,
      billId: bill.billId,
      date: new Date().toLocaleString("th-TH"),
      amount: paymentForThisBill,
      method: paymentMethod,
      receiver,
      note: note
    });

    // 2. ปรับค่าในบิลหลักชั่วคราว
    bill.paid += paymentForThisBill;
    bill.balance = Math.max(0, bill.total - bill.paid);
    if (bill.paid >= bill.total) {
      bill.status = "ชำระแล้ว";
    } else {
      bill.status = "ชำระบางส่วน";
    }

    // ซิงค์การปรับในอาร์เรย์หลัก
    const mainIdx = bills.findIndex(b => b.billId === bill.billId);
    if (mainIdx !== -1) {
      bills[mainIdx] = bill;
    }
  }

  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));

  // อัปเดตยอดค้างสะสมและยอดคงเหลือของบิลเดือนย่อยถัดไปทั้งหมดสำหรับห้องนี้
  const allUserRooms = bills.filter(b => b.roomId === roomId).map(b => b.month);
  allUserRooms.forEach(m => {
    recalcBill(roomId, m);
  });

  return { success: true, remainingChange: remainingPaid };
}

/**
 * ลบประวัติการชำระเงิน (ยกเลิกรายการชำระ)
 */
export function deletePayment(payId: string) {
  const payments: PaymentRecord[] = JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || "[]");
  const idx = payments.findIndex(p => p.payId === payId);
  if (idx === -1) return { success: false, message: "ไม่พบข้อมูลประวัติการชำระเงินนี้" };

  const payment = payments[idx];
  payments.splice(idx, 1);
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));

  // ค้นหาบิลเพื่อนำ roomId ไป recalc
  const bills = getBills();
  const bill = bills.find(b => b.billId === payment.billId);
  if (bill) {
    const roomId = bill.roomId;
    const allUserRooms = bills.filter(b => b.roomId === roomId).map(b => b.month);
    allUserRooms.sort().forEach(m => {
      recalcBill(roomId, m);
    });
  }
  return { success: true };
}

/**
 * แก้ไขประวัติการชำระเงิน
 */
export function updatePayment(payId: string, updatedFields: Partial<PaymentRecord>) {
  const payments: PaymentRecord[] = JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || "[]");
  const idx = payments.findIndex(p => p.payId === payId);
  if (idx === -1) return { success: false, message: "ไม่พบข้อมูลประวัติการชำระเงินนี้" };

  payments[idx] = {
    ...payments[idx],
    ...updatedFields
  };
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));

  // ค้นหาบิลเพื่อนำ roomId ไป recalc
  const bills = getBills();
  const bill = bills.find(b => b.billId === payments[idx].billId);
  if (bill) {
    const roomId = bill.roomId;
    const allUserRooms = bills.filter(b => b.roomId === roomId).map(b => b.month);
    allUserRooms.sort().forEach(m => {
      recalcBill(roomId, m);
    });
  }
  return { success: true };
}

/**
 * 🔐 จัดการ ADMIN
 */
export function getAdmins(): Admin[] {
  const admins: Admin[] = JSON.parse(localStorage.getItem(KEYS.ADMIN) || "[]");
  let migrated = false;
  const updatedAdmins = admins.map(a => {
    if (a.pin && a.pin.trim().length === 4) {
      a.pin = a.pin.trim() + "00";
      migrated = true;
    }
    return a;
  });
  if (migrated && admins.length > 0) {
    localStorage.setItem(KEYS.ADMIN, JSON.stringify(updatedAdmins));
  }
  return updatedAdmins;
}

export function saveAdmin(admin: Admin) {
  const admins = getAdmins();
  if (!admin.id) {
    admin.id = "ADM" + Math.random().toString(36).substr(2, 5).toUpperCase();
    admins.push(admin);
  } else {
    const idx = admins.findIndex(a => a.id === admin.id);
    if (idx !== -1) admins[idx] = admin;
  }
  localStorage.setItem(KEYS.ADMIN, JSON.stringify(admins));
  return { success: true };
}

export function deleteAdmin(id: string) {
  const admins = getAdmins();
  if (admins.length <= 1) {
    return { success: false, message: "ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้" };
  }
  const updated = admins.filter(a => a.id !== id);
  localStorage.setItem(KEYS.ADMIN, JSON.stringify(updated));
  return { success: true };
}

export function loginUser(username: string, pin: string) {
  const admins = getAdmins();
  const found = admins.find(a => a.username.trim() === username.trim() && a.pin.trim() === pin.trim());
  if (found) {
    return { success: true, user: { id: found.id, username: found.username } };
  }
  return { success: false, message: "ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง" };
}

/**
 * สรุปสถิติสำหรับ Dashboard
 */
export function getDashboardData(month: string) {
  const rooms = getRooms();
  const tenants = getTenants();
  const bills = getBills();

  const totalRooms = rooms.length;
  const activeTenants = tenants.filter(t => t.status === "ใช้งาน").length;

  const monthlyBills = bills.filter(b => b.month === month);
  const monthlyTotal = monthlyBills.reduce((sum, b) => sum + b.total, 0);
  const monthlyPaid = monthlyBills.reduce((sum, b) => sum + b.paid, 0);
  const monthlyUnpaid = monthlyBills.reduce((sum, b) => sum + b.balance, 0);

  // คำนวณยอดค้างสะสมสะสมทั้งหมด (ทุกรอบเดือนที่ยังจ่ายไม่ครบ)
  const totalOutstandingUnpaid = bills.reduce((sum, b) => b.status !== "ชำระแล้ว" ? sum + b.balance : sum, 0);

  const roomList = rooms.map(r => ({
    id: r.id,
    name: r.name,
    rent: r.rent,
    status: tenants.some(t => t.roomId === r.id && t.status === "ใช้งาน") ? "มีผู้เช่า" : "ห้องว่าง"
  }));

  return {
    totalRooms,
    rentedRooms: activeTenants,
    vacantRooms: totalRooms - activeTenants,
    monthlyTotal,
    monthlyPaid,
    monthlyUnpaid,
    totalOutstandingUnpaid,
    roomList
  };
}

/**
 * ดึงรายการก่อนหน้าของเดือน YYYY-MM
 */
function getPreviousMonthStr(monthStr: string): string {
  const parts = monthStr.split("-");
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);

  month--;
  if (month === 0) {
    month = 12;
    year--;
  }

  return year + "-" + (month < 10 ? "0" + month : month);
}

/**
 * อัตราค่าน้ำ-ค่าไฟ ต่อหน่วย (Utility Rates)
 */
export function getUtilityRates(): UtilityRate[] {
  const rates = localStorage.getItem(KEYS.RATES);
  if (!rates) {
    // default seed rate
    const defaultRates: UtilityRate[] = [
      { id: "RATE-INIT", waterRate: 25, elecRate: 9, startMonth: "2026-01", createdDate: "01/01/2026, 00:00:00" }
    ];
    localStorage.setItem(KEYS.RATES, JSON.stringify(defaultRates));
    return defaultRates;
  }
  const parsed: UtilityRate[] = JSON.parse(rates);
  return parsed.map(r => ({
    ...r,
    startMonth: normalizeMonth(r.startMonth)
  }));
}

export function saveUtilityRate(rate: UtilityRate) {
  const rates = getUtilityRates();
  if (!rate.id) {
    rate.id = "RATE" + Date.now().toString().slice(-6);
    rate.createdDate = new Date().toLocaleString("th-TH");
    rates.push(rate);
  } else {
    const idx = rates.findIndex(r => r.id === rate.id);
    if (idx !== -1) {
      rates[idx] = { ...rate, createdDate: new Date().toLocaleString("th-TH") };
    }
  }
  localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
  
  // Recalculate bills for this month and onwards
  const bills = getBills();
  bills.forEach(b => {
    if (b.month >= rate.startMonth) {
      recalcBill(b.roomId, b.month);
    }
  });
  
  return { success: true };
}

export function deleteUtilityRate(id: string) {
  const rates = getUtilityRates();
  if (rates.length <= 1) {
    return { success: false, message: "ไม่สามารถลบอัตราค่าบริการรายการสุดท้ายได้" };
  }
  const target = rates.find(r => r.id === id);
  if (!target) return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };

  const updated = rates.filter(r => r.id !== id);
  localStorage.setItem(KEYS.RATES, JSON.stringify(updated));
  
  // Recalculate bills starting from the deleted month to restore previous/default rate calculations
  const bills = getBills();
  bills.forEach(b => {
    if (b.month >= target.startMonth) {
      recalcBill(b.roomId, b.month);
    }
  });
  
  return { success: true };
}

export function getUtilityRateForMonth(month: string): { waterRate: number; elecRate: number; startMonth: string } {
  const rates = getUtilityRates();
  // Sort startMonth desc, so we check most recent first
  const sorted = [...rates].sort((a, b) => b.startMonth.localeCompare(a.startMonth));
  
  // Find first rate where startMonth <= month
  const found = sorted.find(r => r.startMonth <= month);
  if (found) {
    return { waterRate: found.waterRate, elecRate: found.elecRate, startMonth: found.startMonth };
  }
  
  // Otherwise return the earliest config available
  if (sorted.length > 0) {
    const earliest = sorted[sorted.length - 1];
    return { waterRate: earliest.waterRate, elecRate: earliest.elecRate, startMonth: earliest.startMonth };
  }
  
  return { waterRate: 25, elecRate: 9, startMonth: "2026-01" };
}

/**
 * ประกาศท้ายบิล (Bill Announcements)
 */
export function getBillAnnouncements(): BillAnnouncement[] {
  const anncs = localStorage.getItem(KEYS.ANNOUNCEMENTS);
  if (!anncs) {
    // Initial dummy announcement
    const defaultAnncs: BillAnnouncement[] = [
      { id: "ANNC-INIT", message: "กรุณาชำระเงินค่าน้ำค่าไฟภายในวันที่ 5 ของทุกเดือน ขอบคุณค่ะ", startMonth: "2026-01", endMonth: "2026-12", createdDate: "01/01/2026, 00:00:00" }
    ];
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(defaultAnncs));
    return defaultAnncs;
  }
  const parsed: BillAnnouncement[] = JSON.parse(anncs);
  return parsed.map(a => ({
    ...a,
    startMonth: normalizeMonth(a.startMonth),
    endMonth: normalizeMonth(a.endMonth)
  }));
}

export function saveBillAnnouncement(annc: BillAnnouncement) {
  const anncs = getBillAnnouncements();
  if (!annc.id) {
    annc.id = "ANNC" + Date.now().toString().slice(-6);
    annc.createdDate = new Date().toLocaleString("th-TH");
    anncs.push(annc);
  } else {
    const idx = anncs.findIndex(a => a.id === annc.id);
    if (idx !== -1) {
      anncs[idx] = { ...annc, createdDate: new Date().toLocaleString("th-TH") };
    }
  }
  localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(anncs));
  return { success: true };
}

export function deleteBillAnnouncement(id: string) {
  const anncs = getBillAnnouncements();
  const updated = anncs.filter(a => a.id !== id);
  localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
  return { success: true };
}

export function getOwnerInfo(): OwnerInfo {
  const info = localStorage.getItem(KEYS.OWNER_INFO);
  if (!info) {
    return { name: "คุณวิภาวรรณ สุขประเสริฐ", phone: "081-234-5678" };
  }
  try {
    return JSON.parse(info);
  } catch (e) {
    return { name: "คุณวิภาวรรณ สุขประเสริฐ", phone: "081-234-5678" };
  }
}

export function saveOwnerInfo(info: OwnerInfo) {
  localStorage.setItem(KEYS.OWNER_INFO, JSON.stringify(info));
  return { success: true };
}

