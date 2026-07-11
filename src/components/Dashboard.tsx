/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { DoorOpen, Calculator, CheckCircle2, AlertTriangle, Building2, Eye } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  data: {
    totalRooms: number;
    rentedRooms: number;
    vacantRooms: number;
    monthlyTotal: number;
    monthlyPaid: number;
    monthlyUnpaid: number;
    totalOutstandingUnpaid: number;
    roomList: Array<{ id: string; name: string; rent: number; status: string }>;
  };
  month: string;
  onNavigateToRooms: () => void;
  lastSyncTime?: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function Dashboard({ data, month, onNavigateToRooms, lastSyncTime, onSync, isSyncing }: DashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8">
      {/* Bento Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Stat Card 1: Room Occupancy */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between h-36 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">สถานะหอพัก</p>
            <p className="text-3xl font-black text-[#2563eb]">{data.rentedRooms} / {data.totalRooms}</p>
          </div>
          <p className="text-xs text-slate-500 italic">
            มีผู้เช่า {Math.round((data.rentedRooms / (data.totalRooms || 1)) * 100)}% (ว่าง {data.vacantRooms} ห้อง)
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-blue-50 rounded-full opacity-50 pointer-events-none"></div>
        </motion.div>
 
        {/* Stat Card 2: Projected Bills */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between h-36 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ประมาณการบิลประจำงวด</p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(data.monthlyTotal)}</p>
          </div>
          <p className="text-xs text-slate-500 italic">
            รอบงวดประจำเดือน {month}
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-slate-50 rounded-full opacity-60 pointer-events-none"></div>
        </motion.div>
 
        {/* Stat Card 3: Received Payments */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between h-36 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ชำระเข้ามาแล้ว</p>
            <p className="text-3xl font-black text-emerald-500 font-mono tracking-tight">{formatCurrency(data.monthlyPaid)}</p>
          </div>
          <p className="text-xs text-slate-500 italic">
            ในรอบเดือนปัจจุบัน
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-50 rounded-full opacity-50 pointer-events-none"></div>
        </motion.div>
 
        {/* Stat Card 4: Accumulated Balances (Blue Hero Accent Card!) */}
        <motion.div 
          variants={itemVariants}
          className="bg-[#2563eb] p-6 rounded-2xl shadow-lg shadow-blue-500/20 text-white relative overflow-hidden flex flex-col justify-between h-36 hover:bg-[#1d4ed8] transition-colors"
        >
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">ยอดค้างจ่ายสะสมรวม</p>
            <p className="text-3xl font-black font-mono tracking-tight">{formatCurrency(data.totalOutstandingUnpaid)}</p>
          </div>
          <p className="text-xs text-white/80 italic">
            รวมทุกห้องพักทุกรอบเดือนสะสม
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-blue-400 rounded-full opacity-20 pointer-events-none"></div>
        </motion.div>
      </motion.div>
 
      {/* Grid of rooms map */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden"
      >
        {/* Table Header matching the mockup aesthetic */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-sm italic flex items-center">
            <Building2 className="w-4.5 h-4.5 text-[#2563eb] mr-2" /> 
            <span>รายการสถานะห้องพักล่าสุด</span>
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> มีผู้เช่า
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> ห้องว่าง
            </span>
            <button 
              onClick={onNavigateToRooms}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 hover:underline cursor-pointer ml-2"
            >
              <Eye className="w-4 h-4" />
              <span>จัดการห้องพัก</span>
            </button>
          </div>
        </div>
 
        {/* Content wrapper */}
        <div className="flex-1 overflow-hidden p-6">
          {data.roomList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีห้องพักใด ๆ ในระบบ กดจัดการเพื่อเพิ่มห้องพัก</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.roomList.map(room => {
                const isRented = room.status === "มีผู้เช่า";
                return (
                  <div 
                    key={room.id}
                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                      isRented 
                        ? "border-emerald-100 bg-emerald-50/30 hover:shadow-md hover:border-emerald-200" 
                        : "border-slate-200 bg-white opacity-70 hover:opacity-100 hover:shadow-md hover:border-blue-100"
                    }`}
                  >
                    <div>
                      <p className={`text-[10px] font-bold uppercase ${isRented ? "text-emerald-600" : "text-slate-400"}`}>
                        Room
                      </p>
                      <p className="text-xl font-black text-slate-900 leading-tight">{room.name}</p>
                    </div>
                    <div className="text-right uppercase">
                      <p className={`text-[10px] font-bold bg-white px-2 py-0.5 rounded border leading-none ${
                        isRented ? "text-emerald-600 border-emerald-100" : "text-slate-400 border-slate-100"
                      }`}>
                        {isRented ? "Paid" : "Vacant"}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-1.5 font-mono">
                        {formatCurrency(room.rent)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar (Contextual Info) */}
        <div className="px-6 md:px-8 py-3.5 bg-[#1e293b] text-white/50 text-[10px] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap gap-4 items-center">
             <span className="uppercase font-bold tracking-wider">CONNECTED TO GOOGLE SHEETS: <b className="text-white font-black">ACTIVE (WEB APP)</b></span>
             <span className="hidden sm:inline text-white/35">|</span>
             <span className="uppercase font-bold">TOTAL REVENUE ({month}): <b className="text-emerald-400 font-mono font-bold">{formatCurrency(data.monthlyPaid)}</b></span>
          </div>
          <div className="flex items-center gap-4 uppercase font-bold tracking-widest text-blue-400">
             <span>LAST SYNC: {lastSyncTime || "ยังไม่ได้ซิงค์"}</span>
             {onSync && (
               <button 
                 onClick={onSync}
                 disabled={isSyncing}
                 className="px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white font-sans text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 cursor-pointer"
               >
                 {isSyncing ? "กำลังซิงค์..." : "ซิงค์ด่วน"}
               </button>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
