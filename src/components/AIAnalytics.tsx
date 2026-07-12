import React, { useState, useMemo } from "react";
import { Room, Bill, MeterReading, PaymentRecord, Tenant } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Droplet, 
  Zap, 
  Activity, 
  Calendar, 
  Info, 
  DoorClosed,
  ChevronRight,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  Gauge,
  Search,
  SlidersHorizontal,
  Clock,
  User
} from "lucide-react";

interface AIAnalyticsProps {
  rooms: Room[];
  bills: Bill[];
  meters: MeterReading[];
  payments: PaymentRecord[];
  tenants: Tenant[];
}

export default function AIAnalytics({ rooms, bills, meters, payments, tenants }: AIAnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCalendarMonthTab, setSelectedCalendarMonthTab] = useState<"water" | "elec">("water");
  const [activeAnalysisView, setActiveAnalysisView] = useState<"comparison" | "seasonal" | "rooms">("comparison");
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>("06");
  const [showDetailedRooms, setShowDetailedRooms] = useState<boolean>(false);

  // Retrieve list of unique months sorted chronologically
  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    bills.forEach(b => {
      if (b.month) monthsSet.add(b.month);
    });
    meters.forEach(m => {
      if (m.month) monthsSet.add(m.month);
    });
    return Array.from(monthsSet).sort();
  }, [bills, meters]);

  // Default comparison months: latest month and the one before it
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    return uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : "2026-07";
  });
  
  const [compareMonth, setCompareMonth] = useState<string>(() => {
    if (uniqueMonths.length > 1) {
      return uniqueMonths[uniqueMonths.length - 2];
    }
    return "2026-06";
  });

  // Sync state if uniqueMonths list changes or is loaded
  React.useEffect(() => {
    if (uniqueMonths.length > 0 && !uniqueMonths.includes(targetMonth)) {
      setTargetMonth(uniqueMonths[uniqueMonths.length - 1]);
    }
    if (uniqueMonths.length > 1 && !uniqueMonths.includes(compareMonth)) {
      setCompareMonth(uniqueMonths[uniqueMonths.length - 2]);
    }
  }, [uniqueMonths]);

  // =========================================================================
  // MATH & CALCULATIONS
  // =========================================================================

  // 1. Overall monthly average (เฉลี่ยรายเดือนทั้งหมดของทั้งหอพัก)
  const overallAverages = useMemo(() => {
    if (bills.length === 0) {
      return { avgWater: 0, avgElec: 0, totalMonthsCount: 0 };
    }
    
    // Group units by month
    const monthTotals: Record<string, { water: number; elec: number }> = {};
    bills.forEach(b => {
      if (!monthTotals[b.month]) {
        monthTotals[b.month] = { water: 0, elec: 0 };
      }
      monthTotals[b.month].water += b.waterUnits || 0;
      monthTotals[b.month].elec += b.elecUnits || 0;
    });

    const months = Object.keys(monthTotals);
    if (months.length === 0) return { avgWater: 0, avgElec: 0, totalMonthsCount: 0 };

    let sumWater = 0;
    let sumElec = 0;
    months.forEach(m => {
      sumWater += monthTotals[m].water;
      sumElec += monthTotals[m].elec;
    });

    return {
      avgWater: Math.round((sumWater / months.length) * 10) / 10,
      avgElec: Math.round((sumElec / months.length) * 10) / 10,
      totalMonthsCount: months.length
    };
  }, [bills]);

  // 2. Calendar Month Averages Across All Years (เดือนที่ใช้ใน ทุก ๆ ปี เฉลี่ยเท่าไหร่ เช่น มกราคม, กุมภาพันธ์)
  const calendarMonthAverages = useMemo(() => {
    // We group by the 2-digit month string "01", "02", etc.
    const monthGroups: Record<string, { waterSum: number; elecSum: number; distinctYearMonths: Set<string> }> = {};
    
    // Initialize 12 months
    for (let i = 1; i <= 12; i++) {
      const key = i.toString().padStart(2, "0");
      monthGroups[key] = { waterSum: 0, elecSum: 0, distinctYearMonths: new Set<string>() };
    }

    bills.forEach(b => {
      if (b.month && b.month.includes("-")) {
        const [year, monthPart] = b.month.split("-");
        if (monthGroups[monthPart]) {
          monthGroups[monthPart].waterSum += b.waterUnits || 0;
          monthGroups[monthPart].elecSum += b.elecUnits || 0;
          monthGroups[monthPart].distinctYearMonths.add(b.month);
        }
      }
    });

    // Compute averages
    return Object.entries(monthGroups).map(([monthCode, data]) => {
      const occurrences = data.distinctYearMonths.size || 1;
      return {
        monthCode,
        monthNameTh: getThaiMonthName(monthCode),
        avgWater: Math.round((data.waterSum / occurrences) * 10) / 10,
        avgElec: Math.round((data.elecSum / occurrences) * 10) / 10,
        yearsRecorded: occurrences
      };
    }).sort((a, b) => a.monthCode.localeCompare(b.monthCode));
  }, [bills]);

  // Helper to translate code to Thai month name
  function getThaiMonthName(code: string): string {
    const names: Record<string, string> = {
      "01": "มกราคม",
      "02": "กุมภาพันธ์",
      "03": "มีนาคม",
      "04": "เมษายน",
      "05": "พฤษภาคม",
      "06": "มิถุนายน",
      "07": "กรกฎาคม",
      "08": "สิงหาคม",
      "09": "กันยายน",
      "10": "ตุลาคม",
      "11": "พฤศจิกายน",
      "12": "ธันวาคม"
    };
    return names[code] || `เดือน ${code}`;
  }

  // Helper to calculate active occupancy duration for current tenant in room
  const getRoomDuration = (roomId: string) => {
    const tenant = tenants?.find(t => t.roomId === roomId && t.status === "ใช้งาน");
    if (!tenant || !tenant.startDate) return "ไม่มีข้อมูลผู้เช่า";
    const start = new Date(tenant.startDate);
    const end = new Date("2026-07-11"); // Current system local time July 11, 2026
    if (isNaN(start.getTime())) return "ไม่ทราบระยะเวลา";

    // Calculate difference in months based on calendar months
    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1; // 1-indexed (1 to 12)
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1; // 1-indexed (1 to 12)

    const totalMonths = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth));
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;

    if (years > 0) {
      if (remainingMonths > 0) {
        return `เข้าพัก ${years} ปี ${remainingMonths} เดือน`;
      }
      return `เข้าพัก ${years} ปี`;
    }
    return `เข้าพัก ${totalMonths} เดือน`;
  };

  // 3. Compare Selected Month vs. Previous Month (เปรียบเทียบข้อมูลการใช้ของแต่ละห้องและภาพรวม)
  const comparisonResults = useMemo(() => {
    // Filter bills for target and compare months
    const targetBills = bills.filter(b => b.month === targetMonth);
    const compareBills = bills.filter(b => b.month === compareMonth);

    // Sum overall units
    const targetWaterTotal = targetBills.reduce((sum, b) => sum + (b.waterUnits || 0), 0);
    const targetElecTotal = targetBills.reduce((sum, b) => sum + (b.elecUnits || 0), 0);

    const compareWaterTotal = compareBills.reduce((sum, b) => sum + (b.waterUnits || 0), 0);
    const compareElecTotal = compareBills.reduce((sum, b) => sum + (b.elecUnits || 0), 0);

    // Math deltas
    const waterDelta = targetWaterTotal - compareWaterTotal;
    const waterDeltaPct = compareWaterTotal > 0 ? (waterDelta / compareWaterTotal) * 100 : 0;

    const elecDelta = targetElecTotal - compareElecTotal;
    const elecDeltaPct = compareElecTotal > 0 ? (elecDelta / compareElecTotal) * 100 : 0;

    // Room-by-room details
    const roomDetailsList = rooms.map(room => {
      const targetBill = targetBills.find(b => b.roomId === room.id);
      const compareBill = compareBills.find(b => b.roomId === room.id);

      const targetWater = targetBill?.waterUnits || 0;
      const compareWater = compareBill?.waterUnits || 0;
      const waterDiff = targetWater - compareWater;

      const targetElec = targetBill?.elecUnits || 0;
      const compareElec = compareBill?.elecUnits || 0;
      const elecDiff = targetElec - compareElec;

      const activeTenant = tenants?.find(t => t.roomId === room.id && t.status === "ใช้งาน");
      const tenantName = activeTenant ? activeTenant.name : (targetBill?.tenantName || compareBill?.tenantName || "ไม่มีผู้เช่า");

      return {
        roomId: room.id,
        roomName: room.id, // Use id for display as room name
        tenantName,
        targetWater,
        compareWater,
        waterDiff,
        targetElec,
        compareElec,
        elecDiff
      };
    });

    return {
      targetWaterTotal,
      compareWaterTotal,
      waterDelta,
      waterDeltaPct: Math.round(waterDeltaPct * 10) / 10,
      targetElecTotal,
      compareElecTotal,
      elecDelta,
      elecDeltaPct: Math.round(elecDeltaPct * 10) / 10,
      roomDetailsList
    };
  }, [rooms, bills, targetMonth, compareMonth, tenants]);

  // 4. Per Room average across all available bills (เฉลี่ยรายห้องเพื่อนำเสนอ)
  const roomAveragesList = useMemo(() => {
    return rooms.map(room => {
      const roomBills = bills.filter(b => b.roomId === room.id);
      const billCount = roomBills.length;
      
      const totalWater = roomBills.reduce((sum, b) => sum + (b.waterUnits || 0), 0);
      const totalElec = roomBills.reduce((sum, b) => sum + (b.elecUnits || 0), 0);

      const activeTenant = tenants?.find(t => t.roomId === room.id && t.status === "ใช้งาน");
      const tenantName = activeTenant ? activeTenant.name : (roomBills[roomBills.length - 1]?.tenantName || "ไม่มีผู้เช่า");

      return {
        roomId: room.id,
        tenantName,
        avgWater: billCount > 0 ? Math.round((totalWater / billCount) * 10) / 10 : 0,
        avgElec: billCount > 0 ? Math.round((totalElec / billCount) * 10) / 10 : 0,
        billCount
      };
    });
  }, [rooms, bills, tenants]);

  // 5. Per-room averages specifically for selectedCalendarMonth across all years
  const roomCalendarMonthAverages = useMemo(() => {
    return rooms.map(room => {
      // Find all bills for this room matching the selected calendar month (e.g. month ends with "-06" for June)
      const roomBills = bills.filter(
        b => b.month && b.month.endsWith("-" + selectedCalendarMonth) && b.roomId === room.id
      );
      const billCount = roomBills.length;

      const totalWaterUnits = roomBills.reduce((sum, b) => sum + (b.waterUnits || 0), 0);
      const totalWaterCost = roomBills.reduce((sum, b) => sum + (b.waterCost || 0), 0);
      const totalElecUnits = roomBills.reduce((sum, b) => sum + (b.elecUnits || 0), 0);
      const totalElecCost = roomBills.reduce((sum, b) => sum + (b.elecCost || 0), 0);

      const activeTenant = tenants?.find(t => t.roomId === room.id && t.status === "ใช้งาน");
      const tenantName = activeTenant ? activeTenant.name : (roomBills[roomBills.length - 1]?.tenantName || "ไม่มีผู้เช่าปัจจุบัน");

      return {
        roomId: room.id,
        tenantName,
        durationTh: getRoomDuration(room.id),
        avgWaterUnits: billCount > 0 ? Math.round((totalWaterUnits / billCount) * 10) / 10 : 0,
        avgWaterCost: billCount > 0 ? Math.round(totalWaterCost / billCount) : 0,
        avgElecUnits: billCount > 0 ? Math.round((totalElecUnits / billCount) * 10) / 10 : 0,
        avgElecCost: billCount > 0 ? Math.round(totalElecCost / billCount) : 0,
        billCount
      };
    });
  }, [rooms, bills, selectedCalendarMonth, tenants]);

  // Search filter
  const filteredRoomComparison = useMemo(() => {
    return comparisonResults.roomDetailsList.filter(item => {
      const query = searchTerm.toLowerCase();
      return (
        item.roomId.toLowerCase().includes(query) ||
        (item.tenantName && item.tenantName.toLowerCase().includes(query))
      );
    });
  }, [comparisonResults.roomDetailsList, searchTerm]);

  const filteredRoomAverages = useMemo(() => {
    return roomAveragesList.filter(item => {
      const query = searchTerm.toLowerCase();
      return (
        item.roomId.toLowerCase().includes(query) ||
        (item.tenantName && item.tenantName.toLowerCase().includes(query))
      );
    });
  }, [roomAveragesList, searchTerm]);

  const filteredRoomCalendarMonthAverages = useMemo(() => {
    return roomCalendarMonthAverages.filter(item => {
      const query = searchTerm.toLowerCase();
      return (
        item.roomId.toLowerCase().includes(query) ||
        (item.tenantName && item.tenantName.toLowerCase().includes(query))
      );
    });
  }, [roomCalendarMonthAverages, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-48 h-48 -mr-12 -mt-12" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2 bg-white/15 px-3 py-1 rounded-full text-xs font-bold w-fit tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>แนะนำการใช้งาน</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">ระบบเปรียบเทียบการใช้งานน้ำไฟ (Local Analytics)</h2>
          <p className="text-xs md:text-sm text-blue-100 font-semibold max-w-2xl">
            ประมวลผลข้อมูลมิเตอร์และบิลค่าห้องจากฐานข้อมูลโดยตรง เพื่อวิเคราะห์เปรียบเทียบหาความแตกต่างการใช้สาธารณูปโภคได้อย่างแม่นยำ ไม่ต้องพึ่งพาอินเทอร์เน็ตหรือกุญแจ API ภายนอก
          </p>
        </div>
        <div className="shrink-0 flex items-center bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 relative z-10 text-right">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-200 block">ช่วงวิเคราะห์หลัก</span>
            <span className="text-sm font-black font-mono">{targetMonth} เทียบกับ {compareMonth}</span>
          </div>
        </div>
      </div>

      {/* Top 4 Stats Highlights (เฉลี่ยรายเดือน / ความต่างจากเดือนที่แล้ว) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: ใช้น้ำเฉลี่ยต่อเดือน */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400">ค่าน้ำเฉลี่ยรวม / เดือน</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-slate-800">
              {overallAverages.avgWater.toLocaleString("th-TH")}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              คำนวณจากประวัติการจดบันทึก {overallAverages.totalMonthsCount} เดือนย้อนหลัง
            </p>
          </div>
        </div>

        {/* Stat 2: ใช้ไฟเฉลี่ยต่อเดือน */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400">ค่าไฟเฉลี่ยรวม / เดือน</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-slate-800">
              {overallAverages.avgElec.toLocaleString("th-TH")}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              คำนวณจากประวัติการจดบันทึก {overallAverages.totalMonthsCount} เดือนย้อนหลัง
            </p>
          </div>
        </div>

        {/* Stat 3: ผลต่างการใช้น้ำจากรอบเดือนที่แล้ว */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400">ผลต่างค่าน้ำประปา</span>
            <div className={`p-2 rounded-xl ${comparisonResults.waterDelta >= 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {comparisonResults.waterDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-black font-mono text-slate-800">
                {comparisonResults.waterDelta >= 0 ? "+" : ""}{comparisonResults.waterDelta.toLocaleString("th-TH")}
              </p>
              <span className="text-xs font-black">หน่วย</span>
            </div>
            <p className={`text-[10px] font-black mt-1 ${comparisonResults.waterDelta >= 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {comparisonResults.waterDelta >= 0 ? "เพิ่มขึ้น" : "ลดลง"} {Math.abs(comparisonResults.waterDeltaPct)}% จากรอบเดือน {compareMonth}
            </p>
          </div>
        </div>

        {/* Stat 4: ผลต่างการใช้ไฟจากรอบเดือนที่แล้ว */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400">ผลต่างกระแสไฟฟ้า</span>
            <div className={`p-2 rounded-xl ${comparisonResults.elecDelta >= 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {comparisonResults.elecDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-black font-mono text-slate-800">
                {comparisonResults.elecDelta >= 0 ? "+" : ""}{comparisonResults.elecDelta.toLocaleString("th-TH")}
              </p>
              <span className="text-xs font-black">หน่วย</span>
            </div>
            <p className={`text-[10px] font-black mt-1 ${comparisonResults.elecDelta >= 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {comparisonResults.elecDelta >= 0 ? "เพิ่มขึ้น" : "ลดลง"} {Math.abs(comparisonResults.elecDeltaPct)}% จากรอบเดือน {compareMonth}
            </p>
          </div>
        </div>

      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex gap-1 shadow-sm max-w-md">
        <button
          type="button"
          onClick={() => {
            setActiveAnalysisView("comparison");
            setSearchTerm("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeAnalysisView === "comparison"
              ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/10"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>เปรียบเทียบเทียบรายงวด</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveAnalysisView("seasonal");
            setSearchTerm("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeAnalysisView === "seasonal"
              ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/10"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>เฉลี่ยรายเดือนทุกปี</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveAnalysisView("rooms");
            setSearchTerm("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeAnalysisView === "rooms"
              ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/10"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          <DoorClosed className="w-3.5 h-3.5" />
          <span>วิเคราะห์รายห้อง</span>
        </button>
      </div>

      {/* Views Content Panels */}
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: COMPARISON REPORT */}
        {activeAnalysisView === "comparison" && (
          <motion.div
            key="comparison-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Months custom period selectors */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#2563eb]" />
                  <h3 className="text-xs font-extrabold text-slate-800">กำหนดช่วงเวลาเปรียบเทียบ</h3>
                </div>
                <p className="text-[10px] text-slate-400 font-bold">กรุณาเลือกงวดเดือนที่ต้องการนำมาจับคู่เปรียบเทียบในรายละเอียด</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase">งวดเดือนตรวจสอบหลัก (ล่าสุด)</label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {uniqueMonths.map(m => (
                      <option key={`target-${m}`} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 block uppercase">งวดเดือนเปรียบเทียบ (ก่อนหน้า)</label>
                  <select
                    value={compareMonth}
                    onChange={(e) => setCompareMonth(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {uniqueMonths.map(m => (
                      <option key={`compare-${m}`} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Room details breakdown table card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">รายละเอียดผลต่างแยกรายห้องพัก</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    ตารางสรุปผลการเปรียบเทียบความแตกต่าง (ต่างกันเท่าไหร่) ประจำงวดห้องพักรายบุคคล
                  </p>
                </div>

                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="ค้นหาตามรหัสห้อง หรือ ชื่อผู้เช่า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-xs font-bold rounded-xl pl-9 pr-3.5 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredRoomComparison.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-300 animate-bounce" />
                  <p className="text-xs font-bold">ไม่พบข้อมูลบิลที่มีคุณสมบัติตามที่ค้นหาในช่วงเดือนนี้</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-5">เลขห้อง / ผู้เช่า</th>
                        <th className="py-3 px-5 text-center">ใช้น้ำ {compareMonth} (หน่วย)</th>
                        <th className="py-3 px-5 text-center">ใช้น้ำ {targetMonth} (หน่วย)</th>
                        <th className="py-3 px-5 text-center">ต่างกันเท่าไหร่ (น้ำ)</th>
                        <th className="py-3 px-5 text-center">ใช้ไฟ {compareMonth} (หน่วย)</th>
                        <th className="py-3 px-5 text-center">ใช้ไฟ {targetMonth} (หน่วย)</th>
                        <th className="py-3 px-5 text-center">ต่างกันเท่าไหร่ (ไฟ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRoomComparison.map((item) => {
                        const waterUp = item.waterDiff >= 0;
                        const elecUp = item.elecDiff >= 0;

                        return (
                          <tr key={`comp-${item.roomId}`} className="hover:bg-slate-50/50 transition-all font-bold">
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-2">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono shrink-0">
                                  {item.roomId}
                                </span>
                                <span className="text-slate-600 truncate max-w-[120px]" title={item.tenantName}>
                                  {item.tenantName}
                                </span>
                              </div>
                            </td>
                            
                            {/* Water comparative cells */}
                            <td className="py-4 px-5 text-center font-mono text-slate-500">
                              {item.compareWater}
                            </td>
                            <td className="py-4 px-5 text-center font-mono text-slate-800">
                              {item.targetWater}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-flex items-center space-x-1 font-mono px-2 py-0.5 rounded text-[10px] ${
                                item.waterDiff === 0 ? "bg-slate-100 text-slate-600" :
                                waterUp ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {item.waterDiff === 0 ? "" : waterUp ? "+" : ""}
                                <span>{item.waterDiff} หน่วย</span>
                              </span>
                            </td>

                            {/* Electricity comparative cells */}
                            <td className="py-4 px-5 text-center font-mono text-slate-500">
                              {item.compareElec}
                            </td>
                            <td className="py-4 px-5 text-center font-mono text-slate-800">
                              {item.targetElec}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-flex items-center space-x-1 font-mono px-2 py-0.5 rounded text-[10px] ${
                                item.elecDiff === 0 ? "bg-slate-100 text-slate-600" :
                                elecUp ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {item.elecDiff === 0 ? "" : elecUp ? "+" : ""}
                                <span>{item.elecDiff} หน่วย</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: SEASONAL MONTH-BY-MONTH CALENDAR AVERAGE (เฉลี่ยรายเดือนในทุกๆ ปี) */}
        {activeAnalysisView === "seasonal" && (
          <motion.div
            key="seasonal-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Visual calendar average layout explanations */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800">อัตราเฉลี่ยรายเดือนสะสมตามปฏิทินในทุกรอบปี</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  คำนวณและเฉลี่ยรายเดือนสะสม (ม.ค. - ธ.ค.) เพื่อช่วยให้มองเห็นสถิติปริมาณความต้องการใช้น้ำและไฟฟ้าเฉลี่ยสูงสุดของแต่ละช่วงฤดูกาลในรอบปี (คลิกเลือกแต่ละเดือนเพื่อดูแจงรายละเอียดรายห้องพักด้านล่าง)
                </p>
              </div>

              {/* Compact 12-month grid showing both water and electricity side-by-side */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {calendarMonthAverages.map(item => {
                  const isSelected = selectedCalendarMonth === item.monthCode && showDetailedRooms;
                  return (
                    <div 
                      key={`season-${item.monthCode}`} 
                      onClick={() => {
                        if (item.yearsRecorded === 0) {
                          // กดเดือนที่ไม่มีข้อมูล ไม่มีการเปลี่ยนแปลง
                          return;
                        }
                        if (selectedCalendarMonth === item.monthCode) {
                          // เมื่อกดซ้ำให้ซ้อน
                          setShowDetailedRooms(prev => !prev);
                        } else {
                          // เมื่อกดเดือนอื่น เปลี่ยน ข้อมูล
                          setSelectedCalendarMonth(item.monthCode);
                          setShowDetailedRooms(true);
                        }
                      }}
                      className={`cursor-pointer border p-3 rounded-xl transition-all duration-150 flex flex-col justify-between ${
                        isSelected 
                          ? "bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500/20" 
                          : "bg-slate-50/50 hover:bg-slate-50 border-slate-100/70 hover:border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">
                            {item.monthNameTh}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 font-bold block mb-1.5">
                          ประวัติสะสม {item.yearsRecorded} ปี
                        </span>
                      </div>
                      
                      {/* Compact stacked water & electricity values */}
                      <div className="space-y-1 mt-1.5 border-t border-slate-100/80 pt-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Droplet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>น้ำเฉลี่ย</span>
                          </span>
                          <span className="font-extrabold text-blue-600 font-mono">
                            {item.avgWater.toLocaleString("th-TH")} <span className="text-[8px] text-slate-400 font-medium">หน่วย</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>ไฟเฉลี่ย</span>
                          </span>
                          <span className="font-extrabold text-amber-600 font-mono">
                            {item.avgElec.toLocaleString("th-TH")} <span className="text-[8px] text-slate-400 font-medium">หน่วย</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAILED PER-ROOM BREAKDOWN FOR SELECTED CALENDAR MONTH */}
            {showDetailedRooms && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 animate-in fade-in duration-200">
                <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-black text-slate-800">
                        แจงรายละเอียดค่าเฉลี่ยแยกรายห้องพัก ประจำเดือน {getThaiMonthName(selectedCalendarMonth)}
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      คำนวณจากสถิติประวัติทุกปีเฉพาะเดือน{getThaiMonthName(selectedCalendarMonth)} และประมวลผลเป็นปริมาณเฉลี่ยและจำนวนเงินบาทจำลอง
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Select month dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase whitespace-nowrap">เลือกเดือน:</span>
                      <select
                        value={selectedCalendarMonth}
                        onChange={(e) => {
                          const newMonth = e.target.value;
                          const monthItem = calendarMonthAverages.find(m => m.monthCode === newMonth);
                          if (monthItem && monthItem.yearsRecorded > 0) {
                            setSelectedCalendarMonth(newMonth);
                            setShowDetailedRooms(true);
                          }
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const code = (i + 1).toString().padStart(2, "0");
                          return <option key={`sel-month-${code}`} value={code}>{getThaiMonthName(code)}</option>;
                        })}
                      </select>
                    </div>

                    {/* Room list search box */}
                    <div className="relative w-full sm:w-60">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Search className="w-3 h-3" />
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหารหัสห้อง / ผู้เช่า..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-xs font-bold rounded-xl pl-8 pr-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {filteredRoomCalendarMonthAverages.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Info className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">ไม่พบข้อมูลห้องพักหรือสถิติตามการค้นหานี้</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 pt-0">
                    {filteredRoomCalendarMonthAverages.map(item => {
                      return (
                        <div 
                          key={`avg-cal-room-${item.roomId}`} 
                          className="bg-slate-50/40 rounded-2xl border border-slate-100 p-4 space-y-3 hover:shadow-sm hover:border-slate-200 transition-all duration-150"
                        >
                          {/* Room Title & stay duration */}
                          <div className="flex items-center justify-between border-b border-slate-100/70 pb-2">
                            <span className="text-sm font-black text-slate-800">
                              ห้อง {item.roomId}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              ({item.durationTh})
                            </span>
                          </div>

                          {/* Tenant Name */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate" title={item.tenantName}>ผู้เช่า: {item.tenantName}</span>
                          </div>

                          {/* Averages and Costs */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                              <span className="text-blue-500 font-black shrink-0 mt-0.5">•</span>
                              <span>
                                ค่าน้ำ เดือน {parseInt(selectedCalendarMonth)} เฉลี่ย <span className="font-extrabold text-blue-600 font-mono">{item.avgWaterUnits}</span> หน่วย คิดเป็น <span className="font-extrabold text-blue-700 font-mono">{item.avgWaterCost}</span> บาท
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                              <span className="text-amber-500 font-black shrink-0 mt-0.5">•</span>
                              <span>
                                ค่าไฟ เดือน {parseInt(selectedCalendarMonth)} เฉลี่ย <span className="font-extrabold text-amber-600 font-mono">{item.avgElecUnits}</span> หน่วย คิดเป็น <span className="font-extrabold text-amber-700 font-mono">{item.avgElecCost}</span> บาท
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 3: PER-ROOM STATS AND AVERAGES */}
        {activeAnalysisView === "rooms" && (
          <motion.div
            key="rooms-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Rooms lists card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">วิเคราะห์อัตราการใช้งานเฉลี่ยรายห้องพัก</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    ประมวลผลหาค่าน้ำและไฟฟ้าเฉลี่ยต่อรอบบิลของแต่ละห้องพักรายบุคคลจากอดีตจนถึงปัจจุบัน
                  </p>
                </div>

                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="ค้นหาตามรหัสห้อง หรือ ชื่อผู้เช่า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-xs font-bold rounded-xl pl-9 pr-3.5 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredRoomAverages.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-300 animate-bounce" />
                  <p className="text-xs font-bold">ไม่พบข้อมูลห้องพักหรือสถิติตามการค้นหานี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                  {filteredRoomAverages.map(item => (
                    <div key={`avg-room-${item.roomId}`} className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 space-y-3.5 hover:shadow-sm hover:border-slate-200 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="bg-[#2563eb] text-white px-3 py-1 rounded-xl text-xs font-black font-mono">
                          ห้อง {item.roomId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">บิลสะสม {item.billCount} ฉบับ</span>
                      </div>
                      
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase">ผู้เช่าปัจจุบัน/ล่าสุด</span>
                        <span className="text-xs font-black text-slate-700 truncate block max-w-full" title={item.tenantName}>
                          {item.tenantName}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg p-2.5 border border-slate-50 text-center">
                          <span className="text-[9px] font-bold text-blue-500 flex items-center justify-center gap-0.5 mb-1">
                            <Droplet className="w-3 h-3" />
                            <span>น้ำเฉลี่ย</span>
                          </span>
                          <span className="text-sm font-black font-mono text-slate-800">
                            {item.avgWater.toLocaleString("th-TH")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">หน่วย / เดือน</span>
                        </div>

                        <div className="bg-white rounded-lg p-2.5 border border-slate-50 text-center">
                          <span className="text-[9px] font-bold text-amber-500 flex items-center justify-center gap-0.5 mb-1">
                            <Zap className="w-3 h-3" />
                            <span>ไฟเฉลี่ย</span>
                          </span>
                          <span className="text-sm font-black font-mono text-slate-800">
                            {item.avgElec.toLocaleString("th-TH")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">หน่วย / เดือน</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
        
      </AnimatePresence>

    </div>
  );
}
