/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ระบบจัดการหอพัก (Google Apps Script Backend)
 */

const DB_SHEETS = {
  ROOMS: "ห้อง",
  TENANTS: "ผู้เช่า",
  METERS: "มิเตอร์",
  ADDED_ITEMS: "รายการเพิ่ม",
  BILLS: "บิล",
  BANKS: "บัญชี",
  PAYMENTS: "ประวัติชำระ",
  ADMIN: "ADMIN"
};

/**
 * เสิร์ฟหน้าเว็บหลัก Web App
 */
function doGet(e) {
  // บังคับสร้างสเปรดชีตและชีตย่อยหากยังไม่มี
  initDatabase();
  
  const template = HtmlService.createTemplateFromFile("Index");
  return template.evaluate()
    .setTitle("ระบบจัดการหอพัก")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสำหรับ include ไฟล์ HTML ย่อยเข้ามาใน Index.html
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ดึง Spreadsheet Object
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  if (spreadsheetId) {
    try {
      return SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      // หากเปิดด้วย ID ไม่สำเร็จ ให้ใช้ Active Spreadsheet
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * ตรวจสอบและสร้างชีตย่อยทั้ง 8 ชีตหากยังไม่มี
 */
function initDatabase() {
  const ss = getSpreadsheet();
  
  // 1. ชีตห้อง
  getOrCreateSheet(ss, DB_SHEETS.ROOMS, [
    "ห้อง ID", "ชื่อห้อง", "ค่าเช่า", "ค่าน้ำขั้นต่ำ", "ค่าไฟขั้นต่ำ", "วิธีชำระ", "ธนาคาร ID", "หมายเหตุ"
  ]);
  
  // 2. ชีตผู้เช่า
  getOrCreateSheet(ss, DB_SHEETS.TENANTS, [
    "ห้อง ID", "ชื่อผู้เช่า", "เบอร์โทร", "วันเข้าอยู่", "เลขมิเตอร์น้ำเริ่ม", "เลขมิเตอร์ไฟเริ่ม", "สถานะ"
  ]);
  
  // 3. ชีตมิเตอร์
  getOrCreateSheet(ss, DB_SHEETS.METERS, [
    "มิเตอร์ ID", "ห้อง ID", "รอบเดือน", "เลขมิเตอร์น้ำก่อนหน้า", "เลขมิเตอร์น้ำล่าสุด", "เลขมิเตอร์ไฟก่อนหน้า", "เลขมิเตอร์ไฟล่าสุด", "หมายเหตุการแก้ไขเลขก่อนหน้า", "ผู้บันทึก", "วันที่บันทึก"
  ]);
  
  // 4. ชีตรายการเพิ่ม
  getOrCreateSheet(ss, DB_SHEETS.ADDED_ITEMS, [
    "รายการ ID", "ห้อง ID", "รอบเดือน", "ชื่อรายการ", "จำนวนเงิน", "หมายเหตุ"
  ]);
  
  // 5. ชีตบิล
  getOrCreateSheet(ss, DB_SHEETS.BILLS, [
    "บิล ID", "ห้อง ID", "รอบเดือน", "หน่วยน้ำที่ใช้", "ค่าน้ำ", "หน่วยไฟที่ใช้", "ค่าไฟ", "ค่าเช่า", "ค่ารายการเพิ่ม", "ยอดค้างชำระยกมา", "ยอดรวมสุทธิ", "ยอดที่ชำระแล้ว", "ยอดคงเหลือ", "สถานะ", "วันที่สร้างบิล"
  ]);
  
  // 6. ชีตบัญชี
  getOrCreateSheet(ss, DB_SHEETS.BANKS, [
    "บัญชี ID", "ธนาคาร", "เลขบัญชี", "ชื่อบัญชี", "หมายเหตุท้ายบิล"
  ]);
  
  // 7. ชีตประวัติชำระ
  getOrCreateSheet(ss, DB_SHEETS.PAYMENTS, [
    "ชำระ ID", "บิล ID", "วันที่ชำระ", "จำนวนเงินที่จ่าย", "ช่องทางชำระ", "ผู้รับเงิน", "หมายเหตุ"
  ]);
  
  // 8. ชีต ADMIN
  const adminSheet = getOrCreateSheet(ss, DB_SHEETS.ADMIN, [
    "ID", "USER", "PIN"
  ]);
  
  // สร้างบัญชี Admin เริ่มต้นถ้าชีตว่าง
  if (adminSheet.getLastRow() === 1) {
    adminSheet.appendRow(["ADM001", "admin", "1234"]);
  }
}

/**
 * ฟังก์ชันช่วยเหลือ: ดึงหรือสร้างชีตพร้อมหัวตาราง
 */
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // ตกแต่งหัวตารางเล็กน้อย
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#e0f2fe")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }
  return sheet;
}

/**
 * 🔐 เข้าสู่ระบบ (Login)
 */
function loginUser(username, pin) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADMIN);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(username).trim() && String(data[i][2]).trim() === String(pin).trim()) {
      return {
        success: true,
        user: {
          id: data[i][0],
          username: data[i][1]
        }
      };
    }
  }
  return { success: false, message: "ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง" };
}

/**
 * CRUD: จัดการข้อมูล ADMIN
 */
function getAdmins() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADMIN);
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0],
      username: data[i][1],
      pin: data[i][2]
    });
  }
  return list;
}

function saveAdmin(admin) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADMIN);
  const data = sheet.getDataRange().getValues();
  
  if (admin.id) {
    // อัปเดต
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === admin.id) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[admin.username, admin.pin]]);
        return { success: true };
      }
    }
  } else {
    // เพิ่มใหม่
    const newId = "ADM" + String(new Date().getTime()).slice(-6);
    sheet.appendRow([newId, admin.username, admin.pin]);
    return { success: true };
  }
  return { success: false, message: "ไม่พบข้อมูล ADMIN" };
}

function deleteAdmin(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADMIN);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 2) {
    return { success: false, message: "ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้" };
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบข้อมูล ADMIN" };
}

/**
 * 📋 Dashboard Data
 */
function getDashboardData(month) {
  const ss = getSpreadsheet();
  
  // ข้อมูลห้อง
  const roomsSheet = ss.getSheetByName(DB_SHEETS.ROOMS);
  const roomsData = roomsSheet.getLastRow() > 1 ? roomsSheet.getRange(2, 1, roomsSheet.getLastRow() - 1, 8).getValues() : [];
  const totalRooms = roomsData.length;
  
  // ข้อมูลผู้เช่ากระชับ
  const tenantsSheet = ss.getSheetByName(DB_SHEETS.TENANTS);
  const tenantsData = tenantsSheet.getLastRow() > 1 ? tenantsSheet.getRange(2, 1, tenantsSheet.getLastRow() - 1, 7).getValues() : [];
  const activeTenants = tenantsData.filter(r => r[6] === "ใช้งาน" || r[6] === true || String(r[6]).trim() === "ใช้งาน").length;
  
  // ข้อมูลบิลประจำเดือน
  const billsSheet = ss.getSheetByName(DB_SHEETS.BILLS);
  const billsData = billsSheet.getLastRow() > 1 ? billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 15).getValues() : [];
  
  // กรองตามรอบเดือนที่เลือก
  const monthlyBills = billsData.filter(b => b[2] === month);
  
  let monthlyTotal = 0;
  let monthlyPaid = 0;
  let monthlyUnpaid = 0;
  
  monthlyBills.forEach(b => {
    monthlyTotal += Number(b[10]) || 0;
    monthlyPaid += Number(b[11]) || 0;
    monthlyUnpaid += Number(b[12]) || 0;
  });
  
  // คำนวณยอดค้างชำระสะสมทั้งหมด (ทุกรอบเดือนที่ยังไม่จ่ายครบ)
  let totalOutstandingUnpaid = 0;
  billsData.forEach(b => {
    if (b[13] !== "ชำระแล้ว") {
      totalOutstandingUnpaid += Number(b[12]) || 0;
    }
  });

  return {
    totalRooms: totalRooms,
    rentedRooms: activeTenants,
    vacantRooms: totalRooms - activeTenants,
    monthlyTotal: monthlyTotal,
    monthlyPaid: monthlyPaid,
    monthlyUnpaid: monthlyUnpaid,
    totalOutstandingUnpaid: totalOutstandingUnpaid,
    roomList: roomsData.map(r => ({
      id: r[0],
      name: r[1],
      rent: r[2],
      status: tenantsData.some(t => t[0] === r[0] && (t[6] === "ใช้งาน" || t[6] === true || String(t[6]).trim() === "ใช้งาน")) ? "มีผู้เช่า" : "ห้องว่าง"
    }))
  };
}

/**
 * CRUD: จัดการข้อมูลห้อง
 */
function getRooms() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ROOMS);
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return data.map(r => ({
    id: r[0],
    name: r[1],
    rent: Number(r[2]) || 0,
    minWater: Number(r[3]) || 0,
    minElec: Number(r[4]) || 0,
    payMethod: r[5],
    bankId: r[6],
    note: r[7]
  }));
}

function saveRoom(room) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ROOMS);
  const data = sheet.getDataRange().getValues();
  
  const rowValues = [
    room.id || "R" + String(new Date().getTime()).slice(-5),
    room.name,
    Number(room.rent) || 0,
    Number(room.minWater) || 0,
    Number(room.minElec) || 0,
    room.payMethod || "เงินสด",
    room.bankId || "",
    room.note || ""
  ];
  
  if (room.id) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === room.id) {
        sheet.getRange(i + 1, 1, 1, 8).setValues([rowValues]);
        return { success: true };
      }
    }
  } else {
    sheet.appendRow(rowValues);
    return { success: true };
  }
  return { success: false, message: "ไม่พบห้องที่ระบุ" };
}

function deleteRoom(roomId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ROOMS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roomId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบห้อง" };
}

/**
 * CRUD: จัดการข้อมูลผู้เช่า
 */
function getTenants() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.TENANTS);
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return data.map(r => ({
    roomId: r[0],
    name: r[1],
    phone: r[2],
    startDate: r[3] instanceof Date ? Utilities.formatDate(r[3], Session.getScriptTimeZone(), "yyyy-MM-dd") : r[3],
    startWater: Number(r[4]) || 0,
    startElec: Number(r[5]) || 0,
    status: r[6]
  }));
}

function saveTenant(tenant) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.TENANTS);
  const data = sheet.getDataRange().getValues();
  
  const rowValues = [
    tenant.roomId,
    tenant.name,
    tenant.phone || "",
    tenant.startDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    Number(tenant.startWater) || 0,
    Number(tenant.startElec) || 0,
    tenant.status || "ใช้งาน"
  ];
  
  let foundIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tenant.roomId) {
      foundIndex = i;
      break;
    }
  }
  
  if (foundIndex !== -1) {
    sheet.getRange(foundIndex + 1, 1, 1, 7).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return { success: true };
}

function deleteTenant(roomId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.TENANTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roomId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบผู้เช่า" };
}

/**
 * 📑 มิเตอร์น้ำ-ไฟ: โหลดและบันทึกแบบกลุ่ม
 */
function getMeterEntryList(month) {
  const ss = getSpreadsheet();
  
  const rooms = getRooms();
  const tenants = getTenants();
  
  // กรองเฉพาะห้องที่มีผู้เช่าและใช้งานอยู่
  const rentedRooms = rooms.filter(r => 
    tenants.some(t => t.roomId === r.id && (t.status === "ใช้งาน" || t.status === true || String(t.status).trim() === "ใช้งาน"))
  );
  
  // โหลดมิเตอร์ของเดือนนี้
  const metersSheet = ss.getSheetByName(DB_SHEETS.METERS);
  const metersData = metersSheet.getLastRow() > 1 ? metersSheet.getRange(2, 1, metersSheet.getLastRow() - 1, 10).getValues() : [];
  const currentMonthMeters = metersData.filter(m => m[2] === month);
  
  // โหลดมิเตอร์เดือนก่อนหน้าเพื่อมาแสดงเลขก่อนหน้าแบบ auto
  // หรอบเดือนก่อนหน้า: หักลบเดือน
  const prevMonth = getPreviousMonthStr(month);
  const prevMonthMeters = metersData.filter(m => m[2] === prevMonth);
  
  const list = rentedRooms.map(room => {
    const tenant = tenants.find(t => t.roomId === room.id);
    const existingMeter = currentMonthMeters.find(m => m[1] === room.id);
    
    // หาเลขก่อนหน้า
    let defaultPrevWater = tenant ? tenant.startWater : 0;
    let defaultPrevElec = tenant ? tenant.startElec : 0;
    
    const prevMeter = prevMonthMeters.find(m => m[1] === room.id);
    if (prevMeter) {
      defaultPrevWater = Number(prevMeter[4]) || defaultPrevWater; // เอาเลขมิเตอร์น้ำล่าสุดของเดือนที่แล้ว
      defaultPrevElec = Number(prevMeter[6]) || defaultPrevElec; // เอาเลขมิเตอร์ไฟล่าสุดของเดือนที่แล้ว
    }
    
    return {
      roomId: room.id,
      roomName: room.name,
      tenantName: tenant ? tenant.name : "ไม่ระบุ",
      isRecorded: !!existingMeter,
      meterId: existingMeter ? existingMeter[0] : "",
      prevWater: existingMeter ? Number(existingMeter[3]) : defaultPrevWater,
      currWater: existingMeter ? Number(existingMeter[4]) : "",
      prevElec: existingMeter ? Number(existingMeter[5]) : defaultPrevElec,
      currElec: existingMeter ? Number(existingMeter[6]) : "",
      note: existingMeter ? existingMeter[7] : "",
      originalPrevWater: defaultPrevWater, // เก็บค่าเดิมเอาไว้เปรียบเทียบเผื่อแก้ไข
      originalPrevElec: defaultPrevElec
    };
  });
  
  return list;
}

/**
 * บันทึกมิเตอร์แบบกลุ่ม
 */
function saveMetersBatch(month, items, recordedBy) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.METERS);
  const data = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues() : [];
  
  items.forEach(item => {
    const currWater = Number(item.currWater) || 0;
    const currElec = Number(item.currElec) || 0;
    const prevWater = Number(item.prevWater) || 0;
    const prevElec = Number(item.prevElec) || 0;
    
    // ตรวจสอบความปลอดภัย: มีการแก้ไขเลขก่อนหน้าหรือไม่ ถ้าใช่ต้องการเหตุผล
    const note = item.note || "";
    
    let foundRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === item.roomId && data[i][2] === month) {
        foundRowIndex = i + 2; // +2 เพราะแถว 1 คือ Header และ index 0 คือ แถว 2
        break;
      }
    }
    
    const rowValues = [
      item.meterId || "M" + item.roomId + "-" + month.replace("-", ""),
      item.roomId,
      month,
      prevWater,
      currWater,
      prevElec,
      currElec,
      note,
      recordedBy || "System",
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    ];
    
    if (foundRowIndex !== -1) {
      sheet.getRange(foundRowIndex, 1, 1, 10).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    
    // คำนวณบิลทันทีหลังบันทึกมิเตอร์
    recalcBill(item.roomId, month);
  });
  
  return { success: true };
}

/**
 * ➕ รายการเพิ่ม: เพิ่ม / แก้ไข / ลบ
 */
function getAddedItems(roomId, month) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADDED_ITEMS);
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  return data
    .filter(r => r[1] === roomId && r[2] === month)
    .map(r => ({
      id: r[0],
      roomId: r[1],
      month: r[2],
      name: r[3],
      amount: Number(r[4]) || 0,
      note: r[5]
    }));
}

function saveAddedItem(item) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADDED_ITEMS);
  const data = sheet.getDataRange().getValues();
  
  const id = item.id || "ADD" + String(new Date().getTime()).slice(-6);
  const rowValues = [
    id,
    item.roomId,
    item.month,
    item.name,
    Number(item.amount) || 0,
    item.note || ""
  ];
  
  let foundIndex = -1;
  if (item.id) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.id) {
        foundIndex = i;
        break;
      }
    }
  }
  
  if (foundIndex !== -1) {
    sheet.getRange(foundIndex + 1, 1, 1, 6).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  // บังคับคำนวณบิลใหม่
  recalcBill(item.roomId, item.month);
  return { success: true };
}

function deleteAddedItem(id, roomId, month) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.ADDED_ITEMS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  // คำนวณบิลใหม่
  recalcBill(roomId, month);
  return { success: true };
}

/**
 * 🧾 คำนวณบิล / สร้างบิล (recalcBill)
 */
function recalcBill(roomId, month) {
  const ss = getSpreadsheet();
  
  // 1. ดึงรายละเอียดห้อง
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  
  // 2. ดึงมิเตอร์ของห้องในเดือนนี้
  const metersSheet = ss.getSheetByName(DB_SHEETS.METERS);
  const metersData = metersSheet.getLastRow() > 1 ? metersSheet.getRange(2, 1, metersSheet.getLastRow() - 1, 10).getValues() : [];
  const meter = metersData.find(m => m[1] === roomId && m[2] === month);
  
  let waterUnits = 0;
  let waterCost = 0;
  let elecUnits = 0;
  let elecCost = 0;
  
  if (meter) {
    const prevWater = Number(meter[3]) || 0;
    const currWater = Number(meter[4]) || 0;
    const prevElec = Number(meter[5]) || 0;
    const currElec = Number(meter[6]) || 0;
    
    waterUnits = Math.max(0, currWater - prevWater);
    // ค่าน้ำ: หน่วยละ 25 บาท หรือ ค่าน้ำขั้นต่ำในห้อง
    waterCost = Math.max(room.minWater, waterUnits * 25);
    
    elecUnits = Math.max(0, currElec - prevElec);
    // ค่าไฟ: หน่วยละ 9 บาท หรือ ค่าไฟขั้นต่ำในห้อง
    elecCost = Math.max(room.minElec, elecUnits * 9);
  }
  
  // 3. ค่าเช่าคงที่จากห้อง
  const rentCost = room.rent;
  
  // 4. ดึงรายการเพิ่ม
  const addedItems = getAddedItems(roomId, month);
  let addedItemsCost = 0;
  addedItems.forEach(item => {
    addedItemsCost += item.amount;
  });
  
  // 5. ค้นหายอดค้างยกมา (สะสมจากเดือนที่ผ่าน ๆ มาทั้งหมดที่ยังค้างจ่ายอยู่)
  const billsSheet = ss.getSheetByName(DB_SHEETS.BILLS);
  const billsData = billsSheet.getLastRow() > 1 ? billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 15).getValues() : [];
  
  let unpaidPrevious = 0;
  billsData.forEach(b => {
    // เอายอดคงเหลือของบิลเดือนอื่น (ก่อนเดือนนี้) ที่ยังไม่เรียบร้อย
    if (b[1] === roomId && b[2] < month && b[13] !== "ชำระแล้ว") {
      unpaidPrevious += Number(b[12]) || 0;
    }
  });
  
  // 6. คำนวณยอดสุทธิ
  const totalAmount = waterCost + elecCost + rentCost + addedItemsCost + unpaidPrevious;
  
  // 7. ดึงประวัติชำระของบิลนี้เพื่อหา Paid Amount
  const billId = "B" + roomId + "-" + month.replace("-", "");
  const paymentsSheet = ss.getSheetByName(DB_SHEETS.PAYMENTS);
  const paymentsData = paymentsSheet.getLastRow() > 1 ? paymentsSheet.getRange(2, 1, paymentsSheet.getLastRow() - 1, 7).getValues() : [];
  
  let paidAmount = 0;
  paymentsData.forEach(p => {
    if (p[1] === billId) {
      paidAmount += Number(p[3]) || 0;
    }
  });
  
  const unpaidBalance = Math.max(0, totalAmount - paidAmount);
  
  // สถานะบิล: ชำระแล้ว / ชำระบางส่วน / ค้างชำระ
  let status = "ค้างชำระ";
  if (paidAmount >= totalAmount) {
    status = "ชำระแล้ว";
  } else if (paidAmount > 0) {
    status = "ชำระบางส่วน";
  }
  
  // บันทึก/อัปเดตลงตารางบิล
  const rowValues = [
    billId,
    roomId,
    month,
    waterUnits,
    waterCost,
    elecUnits,
    elecCost,
    rentCost,
    addedItemsCost,
    unpaidPrevious,
    totalAmount,
    paidAmount,
    unpaidBalance,
    status,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
  ];
  
  let foundBillIndex = -1;
  for (let i = 0; i < billsData.length; i++) {
    if (billsData[i][0] === billId) {
      foundBillIndex = i + 2;
      break;
    }
  }
  
  if (foundBillIndex !== -1) {
    billsSheet.getRange(foundBillIndex, 1, 1, 15).setValues([rowValues]);
  } else {
    billsSheet.appendRow(rowValues);
  }
}

/**
 * ดึงรายการบิลทั้งหมดของเดือนที่เลือก
 */
function getBillsList(month) {
  const ss = getSpreadsheet();
  const rooms = getRooms();
  const tenants = getTenants();
  
  const billsSheet = ss.getSheetByName(DB_SHEETS.BILLS);
  if (billsSheet.getLastRow() <= 1) return [];
  const billsData = billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 15).getValues();
  
  const currentMonthBills = billsData.filter(b => b[2] === month);
  
  return currentMonthBills.map(b => {
    const room = rooms.find(r => r.id === b[1]);
    const tenant = tenants.find(t => t.roomId === b[1]);
    return {
      billId: b[0],
      roomId: b[1],
      roomName: room ? room.name : b[1],
      tenantName: tenant ? tenant.name : "ไม่มีผู้เช่า",
      month: b[2],
      waterUnits: Number(b[3]) || 0,
      waterCost: Number(b[4]) || 0,
      elecUnits: Number(b[5]) || 0,
      elecCost: Number(b[6]) || 0,
      rentCost: Number(b[7]) || 0,
      addedCost: Number(b[8]) || 0,
      prevUnpaid: Number(b[9]) || 0,
      total: Number(b[10]) || 0,
      paid: Number(b[11]) || 0,
      balance: Number(b[12]) || 0,
      status: b[13],
      createdDate: b[14]
    };
  });
}

/**
 * 💳 บัญชีธนาคาร & ข้อมูลหมายเหตุท้ายบิล
 */
function getBankAccounts() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.BANKS);
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  return data.map(r => ({
    id: r[0],
    bankName: r[1],
    accountNumber: r[2],
    accountName: r[3],
    footerNote: r[4]
  }));
}

function saveBankAccount(bank) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.BANKS);
  const data = sheet.getDataRange().getValues();
  
  const id = bank.id || "BANK" + String(new Date().getTime()).slice(-4);
  const rowValues = [
    id,
    bank.bankName,
    bank.accountNumber,
    bank.accountName,
    bank.footerNote || ""
  ];
  
  let foundIndex = -1;
  if (bank.id) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === bank.id) {
        foundIndex = i;
        break;
      }
    }
  }
  
  if (foundIndex !== -1) {
    sheet.getRange(foundIndex + 1, 1, 1, 5).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return { success: true };
}

function deleteBankAccount(id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(DB_SHEETS.BANKS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบบัญชีธนาคาร" };
}

/**
 * 💰 บันทึกการชำระเงิน (FIFO หลายบิลพร้อมกัน)
 */
function payBillsFIFO(roomId, amountPaid, paymentMethod, receiver, note) {
  const ss = getSpreadsheet();
  let remainingPaid = Number(amountPaid) || 0;
  if (remainingPaid <= 0) return { success: false, message: "ยอดเงินต้องมากกว่า 0" };
  
  const billsSheet = ss.getSheetByName(DB_SHEETS.BILLS);
  if (billsSheet.getLastRow() <= 1) return { success: false, message: "ไม่มีบิลในระบบ" };
  
  const billsRange = billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 15);
  const billsData = billsRange.getValues();
  
  // ค้นหาบิลที่ค้างชำระของห้องนี้ เรียงตามรอบเดือน (เดือนเก่ามาก่อน -> FIFO)
  const unpaidBills = [];
  for (let i = 0; i < billsData.length; i++) {
    const row = billsData[i];
    if (row[1] === roomId && row[13] !== "ชำระแล้ว") {
      unpaidBills.push({
        rowIndex: i + 2, // แถวจริงในชีต
        billId: row[0],
        month: row[2],
        total: Number(row[10]) || 0,
        paid: Number(row[11]) || 0,
        balance: Number(row[12]) || 0
      });
    }
  }
  
  // เรียงลำดับตามรอบเดือน (เก่า -> ใหม่)
  unpaidBills.sort((a, b) => a.month.localeCompare(b.month));
  
  if (unpaidBills.length === 0) {
    return { success: false, message: "ไม่มีบิลค้างชำระสำหรับห้องนี้" };
  }
  
  const paymentsSheet = ss.getSheetByName(DB_SHEETS.PAYMENTS);
  
  for (let i = 0; i < unpaidBills.length; i++) {
    if (remainingPaid <= 0) break;
    
    const bill = unpaidBills[i];
    const billOwed = bill.balance;
    const paymentForThisBill = Math.min(remainingPaid, billOwed);
    
    remainingPaid -= paymentForThisBill;
    
    // 1. บันทึกประวัติการจ่าย
    const payId = "P" + String(new Date().getTime()).slice(-6) + i;
    paymentsSheet.appendRow([
      payId,
      bill.billId,
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      paymentForThisBill,
      paymentMethod,
      receiver,
      note || ""
    ]);
    
    // 2. ปรับปรุงบิลใน Sheet บิล
    const newPaidAmount = bill.paid + paymentForThisBill;
    const newBalance = Math.max(0, bill.total - newPaidAmount);
    let newStatus = "ชำระบางส่วน";
    if (newPaidAmount >= bill.total) {
      newStatus = "ชำระแล้ว";
    }
    
    // ดึงค่าแถวนั้นอัปเดตช่อง Paid (คอลัมน์ L/12), Balance (คอลัมน์ M/13), Status (คอลัมน์ N/14)
    billsSheet.getRange(bill.rowIndex, 12).setValue(newPaidAmount);
    billsSheet.getRange(bill.rowIndex, 13).setValue(newBalance);
    billsSheet.getRange(bill.rowIndex, 14).setValue(newStatus);
  }
  
  // อัปเดตยอดค้างสะสมและยอดคงเหลือของบิลเดือนถัด ๆ ไป (หากมี) เพื่อความถูกต้อง
  // เช่น ถ้าจ่ายบิลเก่าไป ยอดค้างสะสมในบิลเดือนใหม่ต้องเปลี่ยนไปตามสถานะปัจจุบัน
  const allUserRooms = billsData.filter(b => b[1] === roomId).map(b => b[2]);
  allUserRooms.forEach(m => {
    recalcBill(roomId, m);
  });

  return { success: true, remainingChange: remainingPaid };
}

/**
 * ดึงประวัติชำระเงินทั้งหมดของเดือนหรือตามห้อง
 */
function getPaymentHistory(month) {
  const ss = getSpreadsheet();
  const rooms = getRooms();
  
  const paymentsSheet = ss.getSheetByName(DB_SHEETS.PAYMENTS);
  if (paymentsSheet.getLastRow() <= 1) return [];
  const paymentsData = paymentsSheet.getRange(2, 1, paymentsSheet.getLastRow() - 1, 7).getValues();
  
  const billsSheet = ss.getSheetByName(DB_SHEETS.BILLS);
  const billsData = billsSheet.getLastRow() > 1 ? billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 15).getValues() : [];
  
  return paymentsData.map(p => {
    const bill = billsData.find(b => b[0] === p[1]);
    const roomId = bill ? bill[1] : "ไม่ระบุ";
    const roomMonth = bill ? bill[2] : "";
    const room = rooms.find(r => r.id === roomId);
    
    return {
      payId: p[0],
      billId: p[1],
      roomName: room ? room.name : roomId,
      billMonth: roomMonth,
      date: p[2],
      amount: Number(p[3]) || 0,
      method: p[4],
      receiver: p[5],
      note: p[6]
    };
  }).filter(p => !month || p.billMonth === month);
}

/**
 * ฟังก์ชันผู้ช่วย: ดึงข้อมูลเดือนก่อนหน้าของรูปแบบ YYYY-MM
 */
function getPreviousMonthStr(monthStr) {
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
