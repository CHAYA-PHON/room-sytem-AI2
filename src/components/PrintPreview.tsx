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
          <div 
            className="print-page bg-white p-10 shadow-2xl rounded-2xl border border-slate-200 w-full text-slate-800 relative"
            style={{ 
              maxWidth: "1000px", 
              minHeight: "700px",
              boxSizing: "border-box"
            }}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <span className="text-lg font-black text-slate-800">📊 ตารางสรุปงบการเงินและยอดจัดเก็บประจำรอบเดือน</span>
                <p className="text-xs text-slate-400 font-bold mt-1">ประจำปีงบประมาณและรอบจดมิเตอร์: {month}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-md no-print">
                  สรุปภาพรวม ({displaySummaryBills.length} ห้องพักที่จัดเก็บ)
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <th className="px-3 py-2.5 border-r border-slate-200">ห้อง</th>
                  <th className="px-3 py-2.5 border-r border-slate-200">ชื่อผู้เข้าเช่า</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200">ค่าเช่าตึก</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200">ค่าน้ำประปา</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200">ค่าไฟฟ้าหลัก</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200">รายจ่ายเสริมอื่นๆ</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200 text-rose-600">ค้างสะสมสะสมเดิม</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200 font-black text-blue-600">ยอดจัดเก็บสุทธิ</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-200 text-emerald-600 no-print">ชำระแล้วจริง</th>
                  <th className="px-3 py-2.5 text-right no-print">ยอดคงเหลือจ่าย</th>
                </tr>
              </thead>
              <tbody>
                {displaySummaryBills.map(b => (
                  <tr key={b.billId} className="border-b border-slate-200 text-xs text-slate-700 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 border-r border-slate-200 font-extrabold text-slate-800">ห้อง {b.roomName}</td>
                    <td className="px-3 py-2.5 border-r border-slate-200 font-bold text-slate-600">{b.tenantName}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200">{formatCurrency(b.rentCost)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200">{formatCurrency(b.waterCost)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200">{formatCurrency(b.elecCost)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200">{formatCurrency(b.addedCost)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200 font-bold text-rose-500">{formatCurrency(b.prevUnpaid)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200 font-black text-blue-600">{formatCurrency(b.total)}</td>
                    <td className="px-3 py-2.5 text-right border-r border-slate-200 font-bold text-emerald-600 no-print">{formatCurrency(b.paid)}</td>
                    <td className="px-3 py-2.5 text-right font-black text-rose-600 no-print">{formatCurrency(b.balance)}</td>
                  </tr>
                ))}
                
                {/* Grand summary row */}
                <tr className="bg-slate-100 font-black text-slate-800 border-b border-slate-900 text-[11px]">
                  <td colSpan={2} className="px-3 py-3 text-right border-r border-slate-200">รวมทั้งสิ้นในระบบ (Sum totals):</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.rentCost, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.waterCost, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.elecCost, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.addedCost, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200 text-rose-600">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.prevUnpaid, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200 text-blue-600">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.total, 0))}</td>
                  <td className="px-3 py-3 text-right border-r border-slate-200 text-emerald-600 no-print">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.paid, 0))}</td>
                  <td className="px-3 py-3 text-right text-rose-600 no-print">{formatCurrency(displaySummaryBills.reduce((sum, b) => sum + b.balance, 0))}</td>
                </tr>
              </tbody>
            </table>


          </div>
        </>
      )}
    </div>
  );
}
