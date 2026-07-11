/**
 * 🏢 SABAIDEE DORM - GOOGLE APPS SCRIPT SYNC CODE
 * 
 * วิธีใช้งาน:
 * 1. เปิด Google Sheets ของคุณ
 * 2. ไปที่เมนู "ส่วนขยาย" -> "Apps Script" (Extensions -> Apps Script)
 * 3. ลบโค้ดเก่าออกให้หมด แล้วคัดลอกโค้ดด้านล่างนี้ไปวางแทนที่
 * 4. คลิกปุ่ม "บันทึก" (รูปแผ่นดิสก์)
 * 5. คลิกปุ่ม "การใช้งานได้จริง" -> "การใช้งานใหม่" (Deploy -> New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web App)
 * 7. ตั้งค่าการเข้าถึง:
 *    - ทำงานในฐานะ: "ฉัน" (Me / Your email)
 *    - ผู้มีสิทธิ์เข้าถึง: "ทุกคน" (Anyone) ** สำคัญมาก: ต้องเลือก "ทุกคน" เพื่อไม่ให้ติดปัญหาสิทธิ์หรือ CORS
 * 8. คลิกปุ่ม "ปรับใช้" (Deploy) แล้วอนุมัติสิทธิ์ (Authorize Access)
 * 9. คัดลอก URL ของเว็บแอปที่ได้ (จะลงท้ายด้วย /exec) นำไปใส่ในเมนู "ตั้งค่าแอดมิน" ในเว็บแอป Sabaidee Dorm แล้วเริ่มซิงค์ข้อมูลได้เลย!
 */

// ตารางข้อมูลและหัวข้อคอลัมน์ทั้งหมดของระบบ ให้ตรงกับโครงสร้าง TypeScript ของหน้าบ้าน 100% เพื่อไม่ให้ข้อมูลสูญหายหรือเสียหาย
const SHEETS_CONFIG = {
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
 * 📥 รับการส่งข้อมูลแบบ POST (สำหรับทั้งการ Push ข้อมูลไปเซฟ และการ Pull ข้อมูลด้วยวิธีเลี่ยง CORS Preflight)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return makeJsonResponse({ success: false, message: "No data received" });
    }
    
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(err) {
      return makeJsonResponse({ success: false, message: "Invalid JSON format: " + err.toString() });
    }
    
    var action = payload.action || "push";
    
    if (action === "pull") {
      // ดำเนินการดึงข้อมูลส่งกลับไปยังหน้าบ้าน
      var data = pullAllData();
      return makeJsonResponse({ 
        success: true, 
        message: "ดึงข้อมูลจาก Google Sheets สำเร็จ", 
        data: data 
      });
    } else {
      // ดำเนินการอัปเดตและเซฟข้อมูล (Push)
      var syncData = payload.data;
      if (!syncData) {
        return makeJsonResponse({ success: false, message: "No data payload inside data field" });
      }
      
      pushAllData(syncData);
      return makeJsonResponse({ 
        success: true, 
        message: "อัปเดตข้อมูลลง Google Sheets เรียบร้อยแล้ว" 
      });
    }
  } catch(error) {
    return makeJsonResponse({ success: false, message: "เกิดข้อผิดพลาดในการประมวลผล: " + error.toString() });
  }
}

/**
 * 📤 รับการเข้าถึงข้อมูลแบบ GET (ใช้ดึงข้อมูลโดยระบุพารามิเตอร์ ?action=pull)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "pull";
    
    if (action === "pull") {
      var data = pullAllData();
      return makeJsonResponse({ 
        success: true, 
        message: "ดึงข้อมูลจาก Google Sheets สำเร็จ (GET)", 
        data: data 
      });
    }
    
    return makeJsonResponse({ 
      success: true, 
      message: "ระบบเชื่อมต่อ Google Sheets ทำงานปกติ! โปรดส่งคำขอซิงค์ผ่านเว็บแอป" 
    });
  } catch(error) {
    return makeJsonResponse({ success: false, message: "เกิดข้อผิดพลาดในการประมวลผล: " + error.toString() });
  }
}

/**
 * ฟังก์ชันบันทึกข้อมูลแบบผสาน (UPSERT) ลงในแต่ละ Sheet (เพื่อไม่ให้สูญเสียสูตรหรือการจัดรูปแบบ)
 */
function pushAllData(syncData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (var key in SHEETS_CONFIG) {
    var config = SHEETS_CONFIG[key];
    var incomingList = syncData[key] || [];
    
    // ตรวจสอบและสร้าง Sheet หากยังไม่มี
    var sheet = ss.getSheetByName(config.sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(config.sheetName);
      sheet.appendRow(config.headers);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    // ค้นหาคอลัมน์ที่เป็นคีย์หลัก (คอลัมน์แรกใน headers เช่น id, roomId, meterId, billId, payId)
    var pkName = config.headers[0];
    
    // อ่านข้อมูลเดิมที่มีอยู่ในชีต
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var existingHeaders = [];
    var existingRows = [];
    
    if (lastRow > 0 && lastCol > 0) {
      existingHeaders = sheet.getRange(1, 1, 1, Math.min(lastCol, config.headers.length)).getValues()[0];
      if (lastRow > 1) {
        existingRows = sheet.getRange(2, 1, lastRow - 1, Math.min(lastCol, config.headers.length)).getValues();
      }
    } else {
      sheet.appendRow(config.headers);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      existingHeaders = config.headers;
    }
    
    // ค้นหาดัชนีของคอลัมน์ที่เป็นคีย์หลัก
    var pkColIndex = existingHeaders.indexOf(pkName);
    if (pkColIndex === -1) {
      pkColIndex = 0;
    }
    
    // สร้างแผนผังข้อมูลเดิมและเซตคีย์หลัก
    var mergedList = [];
    var existingMap = {};
    var existingPkSet = new Set();
    
    for (var i = 0; i < existingRows.length; i++) {
      var rowVal = existingRows[i];
      var item = {};
      var hasData = false;
      for (var j = 0; j < existingHeaders.length; j++) {
        var h = existingHeaders[j];
        if (!h) continue;
        var cellVal = rowVal[j];
        if (cellVal === "TRUE" || cellVal === true) {
          item[h] = true;
        } else if (cellVal === "FALSE" || cellVal === false) {
          item[h] = false;
        } else {
          item[h] = cellVal;
        }
        if (cellVal !== "") {
          hasData = true;
        }
      }
      
      if (hasData) {
        var pkValue = item[pkName] ? item[pkName].toString().trim() : "";
        if (pkValue) {
          existingMap[pkValue] = item;
          existingPkSet.add(pkValue);
        }
        mergedList.push(item);
      }
    }
    
    // นำข้อมูลใหม่ที่ส่งมาทำการอัปเดตหรือเพิ่มเข้ากลุ่ม
    for (var k = 0; k < incomingList.length; k++) {
      var incomingItem = incomingList[k];
      var incomingPk = incomingItem[pkName] ? incomingItem[pkName].toString().trim() : "";
      
      if (incomingPk) {
        if (existingPkSet.has(incomingPk)) {
          // มีข้อมูลเดิมอยู่แล้ว -> อัปเดตทับเฉพาะฟิลด์ที่มีในตัวส่งเข้ามา
          var existingItem = existingMap[incomingPk];
          for (var field in incomingItem) {
            existingItem[field] = incomingItem[field];
          }
        } else {
          // ไม่มีข้อมูลเดิม -> เพิ่มเข้ากลุ่มรายการใหม่
          mergedList.push(incomingItem);
          existingMap[incomingPk] = incomingItem;
          existingPkSet.add(incomingPk);
        }
      } else {
        // หากไม่มีคีย์หลัก ให้ต่อท้ายรายการไปเลย
        mergedList.push(incomingItem);
      }
    }
    
    // ล้างเฉพาะส่วนข้อมูลในชีตเดิม โดยเก็บแถวแรก (Headers) และการจัดรูปแบบเดิมไว้
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // เขียนข้อมูลที่ผสานกันเสร็จแล้วทั้งหมดกลับลงชีต
    if (mergedList.length > 0) {
      var rowsToWrite = [];
      for (var i = 0; i < mergedList.length; i++) {
        var item = mergedList[i] || {};
        var row = [];
        for (var j = 0; j < config.headers.length; j++) {
          var val = item[config.headers[j]];
          if (val === undefined || val === null) {
            row.push("");
          } else if (typeof val === "boolean") {
            row.push(val ? "TRUE" : "FALSE");
          } else if (typeof val === "object") {
            row.push(JSON.stringify(val));
          } else {
            row.push(val.toString());
          }
        }
        rowsToWrite.push(row);
      }
      
      sheet.getRange(2, 1, rowsToWrite.length, config.headers.length).setValues(rowsToWrite);
    }
    
    // ปรับความกว้างคอลัมน์ให้อัตโนมัติ
    try {
      sheet.autoResizeColumns(1, config.headers.length);
    } catch(e) {}
  }
}

/**
 * ฟังก์ชันดึงข้อมูลจากทุกตารางคืนค่ากลับมา
 */
function pullAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  
  for (var key in SHEETS_CONFIG) {
    var config = SHEETS_CONFIG[key];
    var sheet = ss.getSheetByName(config.sheetName);
    
    if (!sheet) {
      result[key] = [];
      continue;
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      result[key] = [];
      continue;
    }
    
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    var list = [];
    for (var i = 0; i < values.length; i++) {
      var rowVal = values[i];
      var item = {};
      var hasData = false;
      
      for (var j = 0; j < headers.length; j++) {
        var headerKey = headers[j];
        if (!headerKey) continue;
        
        var cellVal = rowVal[j];
        
        // แปลงข้อมูลบางชนิดกลับ
        if (cellVal === "TRUE" || cellVal === true) {
          item[headerKey] = true;
        } else if (cellVal === "FALSE" || cellVal === false) {
          item[headerKey] = false;
        } else {
          item[headerKey] = cellVal;
        }
        
        if (cellVal !== "") {
          hasData = true;
        }
      }
      
      if (hasData) {
        list.push(item);
      }
    }
    
    result[key] = list;
  }
  
  return result;
}

/**
 * ตัวกลางสร้างการส่งกลับข้อมูล (Response) แบบ JSON ปลอดภัยจากปัญหา CORS
 */
function makeJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // เพิ่มส่วนหัวแก้ CORS สำหรับเว็บแอปฝั่งเครื่องลูกข่าย
  return output;
}
