/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Printer, X, ShieldAlert } from "lucide-react";
import { Bill, Room, Tenant, BankAccount, UtilityRate, BillAnnouncement, OwnerInfo } from "../types";
import { getMeters, getAllAddedItems, getUtilityRateForMonth } from "../dbSim";

function getThaiMonthYear(monthStr: string, offsetMonths = 0) {
  if (!monthStr) return "";
  try {
    const [yearStr, monthStrPart] = monthStr.split("-");
    let year = parseInt(yearStr);
    let month = parseInt(monthStrPart);
    
    month += offsetMonths;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    
    const thaiYear = year + 543;
    return `${month}-${thaiYear}`;
  } catch {
    return monthStr;
  }
}

function formatAdMonthYear(monthStr: string) {
  if (!monthStr) return "";
  try {
    const [year, month] = monthStr.split("-");
    return `${parseInt(month)}-${year}`;
  } catch {
    return monthStr;
  }
}

function formatThaiDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const shortMonthsThai = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    if (dateStr.includes("-")) {
      const cleanDate = dateStr.split(" ")[0]; // Get YYYY-MM-DD
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const thaiYearShort = (year + (year < 2500 ? 543 : 0)) % 100;
          return `${day} ${shortMonthsThai[month - 1]} ${thaiYearShort}`;
        }
      }
    } else if (dateStr.includes("/")) {
      const cleanDate = dateStr.split(" ")[0].replace(",", ""); // Get D/M/YYYY or DD/MM/YYYY
      const parts = cleanDate.split("/");
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        
        // If year is the first part (e.g., YYYY/MM/DD)
        if (parts[0].length === 4) {
          year = parseInt(parts[0]);
          day = parseInt(parts[2]);
        }
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const thaiYearShort = (year + (year < 2500 ? 543 : 0)) % 100;
          return `${day} ${shortMonthsThai[month - 1]} ${thaiYearShort}`;
        }
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getThaiDisplayDate(monthStr: string) {
  if (!monthStr) return "";
  try {
    const [yearStr, monthStrPart] = monthStr.split("-");
    const year = parseInt(yearStr);
    const monthVal = parseInt(monthStrPart);
    const thaiYear = year + 543;
    return `27/${monthVal}/${thaiYear}`;
  } catch {
    return "27/5/2569";
  }
}

interface PrintPreviewProps {
  type: "invoices" | "summary";
  selectedRoomIds?: string[];
  bills: Bill[];
  rooms: Room[];
  tenants: Tenant[];
  banks: BankAccount[];
  month: string;
  utilityRates?: UtilityRate[];
  billAnnouncements?: BillAnnouncement[];
  ownerInfo?: OwnerInfo;
  onClose: () => void;
}

export default function PrintPreview({ 
  type, 
  selectedRoomIds = [], 
  bills, 
  rooms, 
  tenants, 
  banks, 
  month, 
  utilityRates = [], 
  billAnnouncements = [], 
  ownerInfo,
  onClose 
}: PrintPreviewProps) {
  const [billsPerPage, setBillsPerPage] = React.useState<number>(4);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  // ดึงรายละเอียดข้อมูลผู้เช่าและห้องของบิลแนวตั้ง
  const selectedBills = bills.filter(b => selectedRoomIds.includes(b.roomId));

  // ดึงบิลที่ต้องแสดงในรายงานสรุปบิลประจำเดือน (หากมีการเลือกห้อง ก็แสดงเฉพาะห้องนั้นๆ หากไม่มีเลือก ก็แสดงทั้งหมด)
  const displaySummaryBills = type === "summary" && selectedRoomIds && selectedRoomIds.length > 0
    ? bills.filter(b => selectedRoomIds.includes(b.roomId))
    : bills;

  const allMeters = getMeters();
  const allAdded = getAllAddedItems();
  const appliedRate = getUtilityRateForMonth(month);

  // Auto-detect if any selected bill has many added items, and default to 3 bills per page to prevent overflow
  React.useEffect(() => {
    if (type === "invoices" && selectedBills.length > 0) {
      const allAdded = getAllAddedItems();
      const hasManyAddedItems = selectedBills.some(b => {
        const billAddedItems = allAdded.filter(item => item.roomId === b.roomId && item.month === b.month);
        return billAddedItems.length > 1; // More than 1 added item can make 4 bills overflow A4
      });
      if (hasManyAddedItems) {
        setBillsPerPage(3);
      }
    }
  }, [selectedBills, type]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 flex flex-col items-center print-preview-overlay">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${type === "invoices" ? "A4 portrait" : "A4 landscape"} !important;
            margin: ${type === "invoices" ? "0 !important" : "8mm 12mm 8mm 12mm !important"};
          }
          
          /* Force colors and background elements to render exactly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* General document resets for high quality paper/PDF print */
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Completely hide all default page structures during print except preview */
          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
            background: transparent !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            box-shadow: none !important;
          }

          .min-h-screen > div:not(.print-preview-overlay) {
            display: none !important;
          }

          /* Transform overlay container during print to remove fixed centering & scrolling */
          .print-preview-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: transparent !important;
            background-color: #ffffff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            display: block !important;
            z-index: auto !important;
          }

          /* Hide interactive controls, scrollbars, headers, and buttons */
          .no-print, [class*="no-print"], button {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Specific styles for print pages to avoid page breaks in the middle of a bill */
          .print-page {
            width: ${type === "invoices" ? "794px" : "100%"} !important;
            max-width: ${type === "invoices" ? "794px" : "100%"} !important;
            height: ${type === "invoices" ? "1123px" : "auto"} !important;
            min-height: ${type === "invoices" ? "1123px" : "0"} !important;
            padding: ${type === "invoices" ? (billsPerPage === 4 ? "8px 16px" : "20px 24px") : "0"} !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            break-after: always !important;
            overflow: hidden !important;
          }

          /* SNUG space between multiple bills on paper */
          div[id^="bill-card-"] {
            margin-bottom: ${billsPerPage === 4 ? "4px" : "12px"} !important;
          }
          div[id^="bill-card-"]:last-child {
            margin-bottom: 0 !important;
          }

          /* Sharper, higher-contrast table line colors for paper prints */
          table, th, td, tr {
            border-color: #334155 !important; /* Tailwind slate-700 */
          }
        }
      `}} />
      
      {/* Print Preview Top Controls - Hidden during real print */}
      <div className="no-print w-full max-w-4xl bg-white rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between border border-slate-100 flex-wrap gap-4">
        <div>
          <span className="text-sm font-black text-slate-800 block">🌐 ตัวอย่างหน้าก่อนสั่งพิมพ์ (A4 Print Layout Preview)</span>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            ระบบจัดวางขนาดและสีตามมาตรฐานโรงพิมพ์ 100% • ท่านสามารถกดยืนยันสั่งพิมพ์เป็นกระดาษหรือบันทึก PDF ได้ทันที
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-2">
          {type === "invoices" && (
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-500 px-2 text-[10px]">บิลต่อหน้า A4:</span>
              <button
                onClick={() => setBillsPerPage(4)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${billsPerPage === 4 ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-600 hover:text-slate-900"}`}
              >
                4 บิล
              </button>
              <button
                onClick={() => setBillsPerPage(3)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${billsPerPage === 3 ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-600 hover:text-slate-900"}`}
              >
                3 บิล (ลดความแน่น)
              </button>
            </div>
          )}
          <button 
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/15 flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>ยืนยันพิมพ์ (Print)</span>
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            ปิดหน้าต่างนี้
          </button>
        </div>
      </div>

      {/* Render logic based on type */}
      {type === "invoices" ? (
        <div className="print-area space-y-6 w-full max-w-[794px]">
          {(() => {
            const CHUNK_SIZE = billsPerPage;
            const billChunks = [];
            for (let i = 0; i < selectedBills.length; i += CHUNK_SIZE) {
              billChunks.push(selectedBills.slice(i, i + CHUNK_SIZE));
            }
            
            const allMeters = getMeters();
            const allAdded = getAllAddedItems();

            if (billChunks.length === 0) {
              return (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 font-bold">
                  ไม่มีใบแจ้งหนี้ที่เลือกสำหรับพิมพ์
                </div>
              );
            }

            return billChunks.map((chunk, pageIndex) => (
              <div 
                key={pageIndex}
                className="print-page bg-white p-5 shadow-2xl rounded-2xl border border-slate-200 w-full relative flex flex-col justify-between"
                style={{ 
                  maxWidth: "794px", 
                  height: billsPerPage === 4 ? "1123px" : "auto",
                  minHeight: billsPerPage === 4 ? "1123px" : "0",
                  boxSizing: "border-box"
                }}
              >
                <div className="flex-1 flex flex-col justify-between py-1">
                  {(() => {
                    const paddedChunk = [...chunk];
                    while (paddedChunk.length < CHUNK_SIZE) {
                      paddedChunk.push(null);
                    }
                    return paddedChunk.map((b, bIndex) => {
                      if (!b) {
                        return (
                          <React.Fragment key={`empty-${pageIndex}-${bIndex}`}>
                            <div className="w-full opacity-30 border-[1.5px] border-dashed border-slate-300 rounded-lg flex items-center justify-center select-none" style={{ height: billsPerPage === 4 ? "230px" : "310px" }}>
                              <span className="text-[10px] text-slate-400 font-bold font-sans">✂️ ช่องว่างสำหรับใบแจ้งหนี้ใบที่ {bIndex + 1} (ไม่มีข้อมูล)</span>
                            </div>
                            {bIndex < CHUNK_SIZE - 1 && (
                              <div className={`w-full border-t border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-500 select-none ${billsPerPage === 4 ? "my-1" : "my-2.5"}`}>
                                <span className="bg-white px-2 font-mono flex items-center gap-1">✂️ ตัดตามรอยประ (แผ่นที่ {pageIndex + 1})</span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      }

                      const room = rooms.find(r => r.id === b.roomId);
                      const tenant = tenants.find(t => t.roomId === b.roomId && t.status === "ใช้งาน");
                      const recommendedBank = banks.find(bk => bk.id === room?.bankId) || banks[0];
                      
                      const meter = allMeters.find(m => m.roomId === b.roomId && m.month === b.month);
                      const prevWater = meter ? meter.prevWater : (tenant ? tenant.startWater : 0);
                      const currWater = meter ? meter.currWater : prevWater + b.waterUnits;
                      const prevElec = meter ? meter.prevElec : (tenant ? tenant.startElec : 0);
                      const currElec = meter ? meter.currElec : prevElec + b.elecUnits;

                      // Query added items names
                      const roomAdded = allAdded.filter(item => item.roomId === b.roomId && item.month === b.month);
                      const addedNames = roomAdded.map(item => item.name).join(", ") || "-";

                      const appliedRate = getUtilityRateForMonth(b.month);

                      const isCompact = billsPerPage === 4;
                      const textClass = isCompact ? "text-[9px]" : "text-[11px]";
                      const textClassSmall = isCompact ? "text-[8.5px]" : "text-[10px]";
                      const textClassHeader = isCompact ? "text-[11px]" : "text-xs";
                      const paddingClassY = isCompact ? "py-[2px]" : "py-1";
                      const paddingClassYTight = isCompact ? "py-[1px]" : "py-0.5";
                      const paddingClassYHeader = isCompact ? "py-1" : "py-1.5";

                      return (
                        <React.Fragment key={b.billId}>
                          <div className="w-full" id={`bill-card-${b.billId}`}>
                            <table className="w-full text-left text-[11px] border-collapse border-[1.5px] border-black font-sans leading-tight">
                              <tbody>
                                {/* Row 1: Header */}
                                <tr>
                                  <td colSpan={6} className={`text-center font-bold bg-[#b4c6e7] border border-black ${paddingClassYHeader} ${textClassHeader} uppercase tracking-wider text-black`}>
                                    ใบแจ้งหนี้
                                  </td>
                                </tr>

                                {/* Row 2: Tenant Info */}
                                <tr className={`bg-white text-black font-bold ${textClassSmall}`}>
                                  <td className={`px-2 ${paddingClassY} border border-black bg-slate-50 w-[22%]`}>ชื่อ-นามสกุล ผู้เช่า</td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-center font-bold text-blue-800 w-[28%] truncate`}>
                                    {tenant ? tenant.name : "ทั่วไป"}
                                  </td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-center bg-slate-50 w-[12%]`}>
                                    วันที่บันทึก
                                  </td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-center w-[18%]`}>
                                    <span className="font-mono">{formatThaiDate(b.createdDate)}</span>
                                  </td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-center bg-slate-50 w-[10%]`}>รอบบิล</td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-center font-mono font-black text-blue-700 w-[10%]`}>
                                    {formatAdMonthYear(b.month)}
                                  </td>
                                </tr>

                                {/* Row 3: List Header */}
                                <tr className={`bg-slate-50 font-bold text-center ${isCompact ? "text-[8px]" : "text-[9px]"} border-b border-black text-slate-800`}>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-left`}>รายการ</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black`}>เลขครั้งก่อน</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black`}>เลขครั้งหลัง</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black`}>หน่วยละ</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black`}>จำนวนที่ใช้</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right`}>จำนวนเงิน (บาท)</td>
                                </tr>

                                {/* Row 4: Water */}
                                <tr className={`text-black ${textClassSmall}`}>
                                  <td className={`px-2 ${paddingClassYTight} border border-black font-medium`}>ค่าน้ำ</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{prevWater}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{currWater}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>25</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{b.waterUnits}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-bold`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.waterCost)}
                                  </td>
                                </tr>

                                {/* Row 5: Electricity */}
                                <tr className={`text-black ${textClassSmall}`}>
                                  <td className={`px-2 ${paddingClassYTight} border border-black font-medium`}>ค่าไฟฟ้า</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{prevElec}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{currElec}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>9</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-center font-mono`}>{b.elecUnits}</td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-bold`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.elecCost)}
                                  </td>
                                </tr>

                                {/* Row 6: Rent */}
                                <tr className={`text-black ${textClassSmall}`}>
                                  <td colSpan={5} className={`px-2 ${paddingClassYTight} border border-black font-medium`}>
                                    ค่าเช่า {new Intl.NumberFormat("th-TH").format(Math.max(0, b.rentCost - 30))} บาท / ค่าขยะ 30 บาท
                                  </td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-bold`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.rentCost)}
                                  </td>
                                </tr>

                                {/* Row 7: Added items / WiFi / Trash */}
                                <tr className={`text-black ${textClassSmall}`}>
                                  <td className={`px-2 ${paddingClassYTight} border border-black font-medium`}>อื่นๆ</td>
                                  <td colSpan={4} className={`px-2 ${paddingClassYTight} border border-black text-center font-semibold text-slate-500`}>
                                    {addedNames}
                                  </td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-bold`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.addedCost)}
                                  </td>
                                </tr>

                                {/* Row 8: Unpaid prev month (Red text) */}
                                <tr className={`text-rose-600 font-bold ${textClassSmall}`}>
                                  <td className={`px-2 ${paddingClassYTight} border border-black`}>ยอดค้างชำระ</td>
                                  <td colSpan={4} className={`px-2 ${paddingClassYTight} border border-black text-center font-mono font-bold`}>
                                    {getThaiMonthYear(b.month, -1)}
                                  </td>
                                  <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.prevUnpaid)}
                                  </td>
                                </tr>

                                {/* Row 9: Total (Yellow bg, Red bold number) */}
                                <tr className={`bg-[#fff2cc] text-black font-extrabold ${textClass}`}>
                                  <td colSpan={5} className={`px-2 ${paddingClassY} border border-black text-center ${isCompact ? "text-[11px]" : "text-xs"} font-black`}>
                                    รวมเป็นเงิน
                                  </td>
                                  <td className={`px-2 ${paddingClassY} border border-black text-right font-mono ${isCompact ? "text-[11px]" : "text-xs"} font-black text-rose-600`}>
                                    {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.total)}
                                  </td>
                                </tr>

                                {/* Row 10: Paid already */}
                                {b.paid > 0 && (
                                  <tr className={`text-black ${textClassSmall}`}>
                                    <td colSpan={5} className={`px-2 ${paddingClassYTight} border border-black font-medium`}>ยอดที่ชำระแล้ว</td>
                                    <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-semibold`}>
                                      {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.paid)}
                                    </td>
                                  </tr>
                                )}

                                {/* Row 11: Balance */}
                                {b.paid > 0 && (
                                  <tr className={`text-black ${textClassSmall}`}>
                                    <td colSpan={5} className={`px-2 ${paddingClassYTight} border border-black font-medium`}>คงเหลือ</td>
                                    <td className={`px-2 ${paddingClassYTight} border border-black text-right font-mono font-bold`}>
                                      {new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.balance)}
                                    </td>
                                  </tr>
                                )}

                                {/* Row 12: Footer */}
                                <tr className={`bg-slate-100 text-black ${isCompact ? "text-[8px]" : "text-[9px]"} font-bold`}>
                                  <td colSpan={2} className={`px-2 ${paddingClassY} border border-black leading-tight`}>
                                    <div className="font-extrabold text-slate-700">หมายเหตุ:</div>
                                    <div className={`font-mono ${isCompact ? "text-[9px]" : "text-[10px]"} font-black leading-none`}>{room?.name || b.roomId}</div>
                                    
                                    {/* ค่าน้ำ/ค่าไฟขั้นต่ำ */}
                                    {room && (
                                      <div className="text-[8px] text-rose-700 font-extrabold mt-0.5 space-y-0.5 leading-tight">
                                        {room.minWater > 0 && b.waterCost === room.minWater && (
                                          <div>* ค่าน้ำคิดราคาขั้นต่ำ {room.minWater} บ.</div>
                                        )}
                                        {room.minElec > 0 && b.elecCost === room.minElec && (
                                          <div>* ค่าไฟคิดราคาขั้นต่ำ {room.minElec} บ.</div>
                                        )}
                                      </div>
                                    )}

                                    {(() => {
                                      const futureRates = utilityRates.filter(r => b.month <= r.startMonth && r.startMonth !== "2026-01");
                                      const nextRate = [...futureRates].sort((a, b) => a.startMonth.localeCompare(b.startMonth))[0];
                                      if (!nextRate) return null;
                                      return (
                                        <div className="text-[7.5px] text-blue-800 font-extrabold mt-1 leading-none">
                                          *น้ำ {nextRate.waterRate}บ./ไฟ {nextRate.elecRate}บ. (เริ่มรอบ {formatAdMonthYear(nextRate.startMonth)})
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td colSpan={4} className={`px-2 ${paddingClassY} border border-black text-center align-middle bg-white`}>
                                    {room?.payMethod === "โอนธนาคาร" && recommendedBank ? (
                                      <div className={`${isCompact ? "text-[8.5px]" : "text-[10px]"} leading-tight py-0.5`}>
                                        <div>โอนเงิน: <strong className="text-blue-700 font-extrabold">{recommendedBank.bankName}</strong> บัญชี <strong className="font-mono text-blue-700">{recommendedBank.accountNumber}</strong></div>
                                        <div className={`${isCompact ? "text-[7.5px]" : "text-[9px]"} text-slate-700 mt-0.5`}>ชื่อบัญชี: <strong className="font-semibold">{recommendedBank.accountName}</strong></div>
                                        {recommendedBank.footerNote && (
                                          <div className={`${isCompact ? "text-[7.5px]" : "text-[8.5px]"} text-rose-700 font-bold mt-1 border-t border-dotted border-slate-300 pt-0.5 leading-tight`}>
                                            {recommendedBank.footerNote}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`text-slate-800 font-extrabold ${isCompact ? "text-[8.5px]" : "text-[10px]"} leading-tight py-1`}>
                                        <div>ชำระเงินสด: <strong className="text-blue-700 font-extrabold">{ownerInfo?.name || "คุณวิภาวรรณ สุขประเสริฐ"}</strong></div>
                                        <div className={`${isCompact ? "text-[7.5px]" : "text-[9px]"} text-slate-700 mt-0.5`}>ติดต่อ: <strong className="font-mono text-blue-700">{ownerInfo?.phone || "081-234-5678"}</strong></div>
                                      </div>
                                    )}
                                  </td>
                                </tr>

                                {/* Row 13: Future Rates Notification & Custom Announcements */}
                                {(() => {
                                  const futureRates = utilityRates.filter(r => r.startMonth > b.month);
                                  const nextFutureRate = [...futureRates].sort((a, b) => a.startMonth.localeCompare(b.startMonth))[0];
                                  const activeAnnouncements = billAnnouncements.filter(annc => b.month >= annc.startMonth && b.month <= annc.endMonth);

                                  if (!nextFutureRate && activeAnnouncements.length === 0) return null;

                                  return (
                                    <tr className="bg-amber-50/40 text-black text-[9px]">
                                      <td colSpan={6} className="px-2.5 py-1.5 border border-black font-semibold leading-normal">
                                        {nextFutureRate && (
                                          <div className="text-blue-800 font-extrabold flex items-start gap-1 mt-0.5">
                                            <span>📢</span>
                                            <span>ตั้งแต่รอบบิล {getThaiMonthYear(nextFutureRate.startMonth)} เป็นต้นไป จะปรับอัตราค่าน้ำเป็น {nextFutureRate.waterRate} บ./หน่วย และค่าไฟเป็น {nextFutureRate.elecRate} บ./หน่วย</span>
                                          </div>
                                        )}
                                        {activeAnnouncements.map((annc) => (
                                          <div key={annc.id} className="text-purple-900 font-extrabold flex items-start gap-1 mt-0.5">
                                            <span>📌</span>
                                            <span>{annc.message}</span>
                                          </div>
                                        ))}
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Divider showing scissors only between bills inside the page */}
                          {bIndex < CHUNK_SIZE - 1 && (
                            <div className={`w-full border-t border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-500 select-none ${isCompact ? "my-1" : "my-2.5"}`}>
                              <span className="bg-white px-2 font-mono flex items-center gap-1">✂️ ตัดตามรอยประ (แผ่นที่ {pageIndex + 1})</span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>

                {/* Page info tag - hidden in print */}
                <div className="absolute bottom-1 left-0 right-0 text-center no-print text-[8px] text-slate-300 font-bold">
                  📄 หน้าพิมพ์ที่ {pageIndex + 1} / {billChunks.length} • 1 หน้ากระดาษ บรรจุ {billsPerPage} ใบแจ้งหนี้ตามมาตรฐาน
                </div>
              </div>
            ));
          })()}
        </div>
      ) : (
        /* Landscape monthly report summary layout */
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 landscape !important;
                margin: 4mm 6mm !important;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-page-landscape {
                padding: 12px 14px !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
              }
              .print-page-landscape table {
                width: 100% !important;
                margin-bottom: 6px !important;
              }
              .print-page-landscape td, .print-page-landscape th {
                padding-top: 4.5px !important;
                padding-bottom: 4.5px !important;
                font-size: 11.5px !important;
                line-height: 1.15 !important;
              }
              .print-page-landscape th {
                font-size: 10px !important;
                padding-top: 4px !important;
                padding-bottom: 4px !important;
              }
              .print-page-landscape .grand-total-row td {
                padding-top: 6px !important;
                padding-bottom: 6px !important;
                font-size: 12px !important;
              }
              .print-page-landscape .grand-total-cell {
                font-size: 13.5px !important;
              }
            }
          `}} />

          <div 
            className="print-page print-page-landscape bg-white p-6 shadow-2xl rounded-2xl border border-slate-200 w-full text-slate-800 relative"
            style={{ 
              maxWidth: "1123px", 
              minHeight: "794px",
              boxSizing: "border-box"
            }}
          >
            {/* Header table block */}
            <table className="w-full border-collapse border border-black mb-3 bg-[#fff2cc] text-xs font-bold text-black font-sans">
              <tbody>
                <tr className="border-b border-black">
                  <td colSpan={4} className="text-center py-2 text-base md:text-lg font-black uppercase bg-[#fff2cc]">
                    บันทึกค่าเช่า
                  </td>
                </tr>
                <tr className="text-center text-[10.5px] md:text-[11.5px]">
                  <td className="border-r border-black py-1 bg-[#fff2cc] font-black w-[20%]">วันที่บันทึก</td>
                  <td className="border-r border-black py-1 bg-white font-mono text-[#2563eb] text-xs md:text-sm w-[30%]">{getThaiDisplayDate(month)}</td>
                  <td className="border-r border-black py-1 bg-[#fff2cc] font-black w-[20%]">รอบบิล</td>
                  <td className="py-1 bg-white font-mono text-[#2563eb] text-xs md:text-sm w-[30%]">{formatAdMonthYear(month)}</td>
                </tr>
              </tbody>
            </table>

            {/* Main Billing Summary Table */}
            <table className="w-full border-collapse border border-black text-xs md:text-sm font-sans leading-normal">
              <colgroup>
                <col className="w-[16%]" /> {/* ชื่อ-นามสกุล */}
                <col className="w-[8%]" />  {/* ค่าเช่า / ค่าขยะ */}
                <col className="w-[4.5%]" /> {/* ค่าน้ำ เลขก่อน */}
                <col className="w-[4.5%]" /> {/* ค่าน้ำ เลขหลัง */}
                <col className="w-[4.5%]" /> {/* ค่าน้ำ จำนวนที่ใช้ */}
                <col className="w-[8%]" /> {/* ค่าน้ำ เป็นจำนวน */}
                <col className="w-[4.5%]" /> {/* ค่าไฟ เลขก่อน */}
                <col className="w-[4.5%]" /> {/* ค่าไฟ เลขหลัง */}
                <col className="w-[4.5%]" /> {/* ค่าไฟ จำนวนที่ใช้ */}
                <col className="w-[8%]" /> {/* ค่าไฟ เป็นจำนวน */}
                <col className="w-[8%]" />   {/* ยอดค้างชำระ */}
                <col className="w-[9%]" />   {/* อื่นๆ รายการ */}
                <col className="w-[5.5%]" />   {/* อื่นๆ จำนวนเงิน */}
                <col className="w-[10.5%]" />   {/* รวม */}
              </colgroup>
              <thead className="bg-[#f2f2f2] text-black text-[10.5px] md:text-xs font-bold border border-black leading-normal">
                <tr className="border-b border-black bg-slate-50">
                  <th rowSpan={2} className="border-r border-black text-left align-middle pl-2 pr-1 py-3 font-black text-black">
                    ชื่อ-นามสกุล
                  </th>
                  <th rowSpan={2} className="border-r border-black text-center align-middle px-1 py-1 font-black text-black leading-tight">
                    <div className="font-black">ค่าเช่า</div>
                    <div className="text-[9px] text-slate-500 font-bold mt-1">ค่าขยะ</div>
                  </th>
                  
                  {/* ค่าน้ำ */}
                  <th colSpan={2} className="border-r border-black text-center bg-[#b4c6e7] text-black font-black py-2">
                    ค่าน้ำ
                  </th>
                  <th className="border-r border-black text-center bg-[#d9e1f2] text-black font-bold py-2">
                    หน่วยละ
                  </th>
                  <th className="border-r border-black text-center bg-[#f2f2f2] text-blue-800 font-black py-2 text-xs md:text-sm">
                    {appliedRate.waterRate}
                  </th>

                  {/* ค่าไฟฟ้า */}
                  <th colSpan={2} className="border-r border-black text-center bg-[#c6e0b4] text-black font-black py-2">
                    ค่าไฟฟ้า
                  </th>
                  <th className="border-r border-black text-center bg-[#e2efda] text-black font-bold py-2">
                    หน่วยละ
                  </th>
                  <th className="border-r border-black text-center bg-[#f2f2f2] text-blue-800 font-black py-2 text-xs md:text-sm">
                    {appliedRate.elecRate}
                  </th>

                  {/* ยอดค้างชำระ */}
                  <th className="border-r border-black text-center bg-[#fff2cc] text-black font-black py-2">
                    ยอดค้างชำระ
                  </th>

                  {/* อื่นๆ */}
                  <th colSpan={2} className="border-r border-black text-center bg-[#f2f2f2] text-black font-black py-2">
                    อื่นๆ
                  </th>

                  {/* รวม */}
                  <th rowSpan={2} className="text-center align-middle bg-[#1f4e79] text-white font-black px-2 py-3 w-[10%] text-xs md:text-sm">
                    รวม
                  </th>
                </tr>

                <tr className="border-b border-black bg-slate-50">
                  {/* ค่าน้ำ subheadings */}
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">เลขครั้งก่อน</th>
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">เลขครั้งหลัง</th>
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">จำนวนที่ใช้</th>
                  <th className="border-r border-black text-center py-1 text-[9.5px] md:text-[10.5px] font-black text-blue-800 bg-[#d9e1f2]">เป็นจำนวน</th>

                  {/* ค่าไฟฟ้า subheadings */}
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">เลขครั้งก่อน</th>
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">เลขครั้งหลัง</th>
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600">จำนวนที่ใช้</th>
                  <th className="border-r border-black text-center py-1 text-[9.5px] md:text-[10.5px] font-black text-blue-800 bg-[#e2efda]">เป็นจำนวน</th>

                  {/* ยอดค้างชำระ subheading */}
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-black text-rose-700 bg-[#fff2cc]">
                    {getThaiMonthYear(month, -1)}
                  </th>

                  {/* อื่นๆ subheadings */}
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600 font-sans">รายการ</th>
                  <th className="border-r border-black text-center py-1 text-[9px] md:text-[10px] font-bold text-slate-600 font-sans">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {displaySummaryBills.map((b) => {
                  const room = rooms.find(r => r.id === b.roomId);
                  const tenant = tenants.find(t => t.roomId === b.roomId && t.status === "ใช้งาน");
                  
                  const meter = allMeters.find(m => m.roomId === b.roomId && m.month === b.month);
                  const prevWater = meter ? meter.prevWater : (tenant ? tenant.startWater : 0);
                  const currWater = meter ? meter.currWater : prevWater + b.waterUnits;
                  const prevElec = meter ? meter.prevElec : (tenant ? tenant.startElec : 0);
                  const currElec = meter ? meter.currElec : prevElec + b.elecUnits;

                  const roomAdded = allAdded.filter(item => item.roomId === b.roomId && item.month === b.month);
                  const addedNames = roomAdded.map(item => item.name).join(", ") || "";

                  const formatVal = (amount: number, showDashIfZero = true) => {
                    if (showDashIfZero && amount === 0) return "-";
                    return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
                  };

                  return (
                    <tr key={b.billId} className="border-b border-black hover:bg-slate-50/50 text-slate-950 font-bold text-[12px] md:text-[13.5px]">
                      {/* Name / Room - Left-aligned with minimal padding ("ชิดหน้า") */}
                      <td className="pl-2 pr-1 py-2 md:py-2.5 border-r border-black font-extrabold text-black font-sans text-left leading-tight">
                        {room ? room.name : `ห้อง ${b.roomName}`} {tenant ? `(${tenant.name})` : ""}
                      </td>
                      
                      {/* Rent */}
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black text-right font-mono font-bold text-slate-950">
                        {formatVal(b.rentCost)}
                      </td>

                      {/* Water: prev, curr, units, amount */}
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-800">{prevWater}</td>
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-800">{currWater}</td>
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-950 font-black text-xs md:text-[13.5px]">{b.waterUnits}</td>
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black text-right font-mono font-black text-[#c00000] bg-[#d9e1f2]/20">
                        {formatVal(b.waterCost)}
                      </td>

                      {/* Elec: prev, curr, units, amount */}
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-800">{prevElec}</td>
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-800">{currElec}</td>
                      <td className="px-1 py-2 md:py-2.5 border-r border-black text-center font-mono text-slate-950 font-black text-xs md:text-[13.5px]">{b.elecUnits}</td>
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black text-right font-mono font-black text-[#c00000] bg-[#e2efda]/20">
                        {formatVal(b.elecCost)}
                      </td>

                      {/* Overdue */}
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black text-right font-mono text-[#c00000] font-black bg-amber-50/10">
                        {formatVal(b.prevUnpaid)}
                      </td>

                      {/* Others: list names & cost */}
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black font-sans text-[10px] md:text-xs leading-normal text-slate-700">
                        {addedNames || ""}
                      </td>
                      <td className="px-1.5 py-2 md:py-2.5 border-r border-black text-right font-mono text-[#c00000] font-bold">
                        {formatVal(b.addedCost)}
                      </td>

                      {/* Total */}
                      <td className="px-1.5 py-2 md:py-2.5 text-right font-mono font-black text-[#c00000] bg-slate-50 text-xs md:text-[14px]">
                        {formatVal(b.total, false)}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Summary Row */}
                {(() => {
                  const totalRent = displaySummaryBills.reduce((sum, b) => sum + b.rentCost, 0);
                  const totalWaterUnits = displaySummaryBills.reduce((sum, b) => sum + b.waterUnits, 0);
                  const totalWaterCost = displaySummaryBills.reduce((sum, b) => sum + b.waterCost, 0);
                  const totalElecUnits = displaySummaryBills.reduce((sum, b) => sum + b.elecUnits, 0);
                  const totalElecCost = displaySummaryBills.reduce((sum, b) => sum + b.elecCost, 0);
                  const totalPrevUnpaid = displaySummaryBills.reduce((sum, b) => sum + b.prevUnpaid, 0);
                  const totalAddedCost = displaySummaryBills.reduce((sum, b) => sum + b.addedCost, 0);
                  const totalSum = displaySummaryBills.reduce((sum, b) => sum + b.total, 0);

                  const formatVal = (amount: number, showDashIfZero = true) => {
                    if (showDashIfZero && amount === 0) return "-";
                    return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
                  };

                  return (
                    <tr className="bg-[#fff2cc] grand-total-row font-black text-slate-950 text-xs md:text-sm border-t-2 border-black border-b border-black">
                      {/* รวม label - Left-aligned with padding ("ชิดหน้า") */}
                      <td className="pl-2 pr-1 py-3 border-r border-black text-left font-black text-slate-950 font-sans">
                        รวม
                      </td>

                      {/* Total rent */}
                      <td className="px-1.5 py-3 border-r border-black text-right font-mono font-black text-[#c00000] text-xs md:text-sm">
                        {formatVal(totalRent, false)}
                      </td>

                      {/* ค่าน้ำ prefix & units */}
                      <td colSpan={2} className="px-1 py-3 border-r border-black text-center text-[#2e75b6] font-sans font-black text-[11px] md:text-xs">
                        ค่าน้ำ
                      </td>
                      <td className="px-1 py-3 border-r border-black text-center font-mono font-black text-[#2e75b6] text-[11px] md:text-xs">
                        {totalWaterUnits} หน่วย
                      </td>
                      {/* ค่าน้ำ total cost */}
                      <td className="px-1.5 py-3 border-r border-black text-right font-mono font-black text-[#c00000] text-xs md:text-sm">
                        {formatVal(totalWaterCost, false)}
                      </td>

                      {/* ค่าไฟฟ้า prefix & units */}
                      <td colSpan={2} className="px-1 py-3 border-r border-black text-center text-[#548235] font-sans font-black text-[11px] md:text-xs">
                        ค่าไฟฟ้า
                      </td>
                      <td className="px-1 py-3 border-r border-black text-center font-mono font-black text-[#548235] text-[11px] md:text-xs">
                        {totalElecUnits} หน่วย
                      </td>
                      {/* ค่าไฟฟ้า total cost */}
                      <td className="px-1.5 py-3 border-r border-black text-right font-mono font-black text-[#c00000] text-xs md:text-sm">
                        {formatVal(totalElecCost, false)}
                      </td>

                      {/* Overdue total */}
                      <td className="px-1.5 py-3 border-r border-black text-right font-mono font-black text-[#c00000] text-xs md:text-sm">
                        {formatVal(totalPrevUnpaid)}
                      </td>

                      {/* Others items empty */}
                      <td className="px-1 py-3 border-r border-black text-center font-sans"></td>
                      {/* Others total cost */}
                      <td className="px-1.5 py-3 border-r border-black text-right font-mono font-black text-[#c00000] text-xs md:text-sm">
                        {formatVal(totalAddedCost)}
                      </td>

                      {/* Grand sum total of totals */}
                      <td className="px-1.5 py-3 text-right font-mono font-black text-[#c00000] grand-total-cell text-sm md:text-base bg-[#ffe699] border-l border-black">
                        {formatVal(totalSum, false)}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
