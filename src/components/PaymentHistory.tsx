/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Receipt, Calendar, User, Info, DollarSign, Gauge, Edit2, Trash2, Save, X } from "lucide-react";
import { PaymentRecord, Bill } from "../types";

interface PaymentHistoryProps {
  payments: PaymentRecord[];
  bills: Bill[];
  month: string;
  metersList?: any[];
  onDeleteMeter?: (roomId: string) => void;
  onUpdateMeter?: (item: any) => void;
  onDeletePayment?: (payId: string) => void;
  onUpdatePayment?: (payId: string, updatedFields: Partial<PaymentRecord>) => void;
}

export default function PaymentHistory({ 
  payments, 
  bills, 
  month, 
  metersList = [], 
  onDeleteMeter, 
  onUpdateMeter,
  onDeletePayment,
  onUpdatePayment
}: PaymentHistoryProps) {
  const [subTab, setSubTab] = useState<"payments" | "meters">("payments");

  // Editing state for payments
  const [editingPayId, setEditingPayId] = useState<string | null>(null);
  const [editPayAmount, setEditPayAmount] = useState<string | number>("");
  const [editPayMethod, setEditPayMethod] = useState<"เงินสด" | "โอนธนาคาร">("เงินสด");
  const [editPayReceiver, setEditPayReceiver] = useState<string>("");
  const [editPayNote, setEditPayNote] = useState<string>("");

  // Editing state for meters
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editPrevWater, setEditPrevWater] = useState<string | number>("");
  const [editCurrWater, setEditCurrWater] = useState<string | number>("");
  const [editPrevElec, setEditPrevElec] = useState<string | number>("");
  const [editCurrElec, setEditCurrElec] = useState<string | number>("");
  const [editNote, setEditNote] = useState<string>("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const startEdit = (item: any) => {
    setEditingRoomId(item.roomId);
    setEditPrevWater(item.prevWater);
    setEditCurrWater(item.currWater);
    setEditPrevElec(item.prevElec);
    setEditCurrElec(item.currElec);
    setEditNote(item.note || "");
  };

  const handleSaveEdit = (item: any) => {
    const prevW = Number(editPrevWater);
    const currW = Number(editCurrWater);
    const prevE = Number(editPrevElec);
    const currE = Number(editCurrElec);

    if (currW < prevW) {
      alert(`เลขมิเตอร์น้ำล่าสุด ต้องไม่ต่ำกว่าค่าเลขก่อนหน้า (${prevW})`);
      return;
    }
    if (currE < prevE) {
      alert(`เลขมิเตอร์ไฟฟ้าล่าสุด ต้องไม่ต่ำกว่าค่าเลขก่อนหน้า (${prevE})`);
      return;
    }

    onUpdateMeter?.({
      roomId: item.roomId,
      meterId: item.meterId,
      prevWater: prevW,
      currWater: currW,
      prevElec: prevE,
      currElec: currE,
      note: editNote
    });

    setEditingRoomId(null);
    alert("แก้ไขข้อมูลมิเตอร์และประมวลผลบิลรอบเดือนนี้ใหม่เรียบร้อยแล้ว!");
  };

  const startEditPayment = (p: PaymentRecord) => {
    setEditingPayId(p.payId);
    setEditPayAmount(p.amount);
    setEditPayMethod(p.method);
    setEditPayReceiver(p.receiver);
    setEditPayNote(p.note || "");
  };

  const handleSaveEditPayment = (p: PaymentRecord) => {
    const amt = Number(editPayAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("กรุณาระบุจำนวนเงินที่ชำระให้ถูกต้อง (มากกว่า 0)");
      return;
    }

    onUpdatePayment?.(p.payId, {
      amount: amt,
      method: editPayMethod,
      receiver: editPayReceiver,
      note: editPayNote
    });

    setEditingPayId(null);
  };

  const recordedMeters = metersList.filter(m => m.isRecorded);

  return (
    <div className="space-y-4">
      {/* Information Header */}
      <div className="text-slate-500 text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>ประวัติการทำรายการและจดบันทึกของอาคาร ค้นหา แก้ไข และยกเลิกรายการที่บันทึกผิดพลาด</span>
        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold font-mono self-start sm:self-auto">
          รอบเดือนปัจจุบัน: {month}
        </span>
      </div>

      {/* Segmented Sub-tab control */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubTab("payments")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === "payments" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>ประวัติรับชำระเงิน</span>
        </button>
        <button
          onClick={() => setSubTab("meters")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === "meters" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>ประวัติจดมิเตอร์น้ำ-ไฟ ({recordedMeters.length})</span>
        </button>
      </div>

      {subTab === "payments" ? (
        <div key="payments-history-tab" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="px-6 py-4">วัน-เวลาที่ทำรายการ</th>
                  <th className="px-6 py-4">รหัสประมวลผล (บิล ID)</th>
                  <th className="px-6 py-4">จำนวนเงินที่ตัดยอด</th>
                  <th className="px-6 py-4">วิธีนำส่งชำระ</th>
                  <th className="px-6 py-4">เจ้าหน้าที่ผู้รับเงิน</th>
                  <th className="px-6 py-4">หมายเหตุธุรกรรม</th>
                  <th className="px-6 py-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      ยังไม่มีข้อมูลประวัติการทำรายการชำระเงินใด ๆ ในขณะนี้
                    </td>
                  </tr>
                ) : (
                  [...payments].reverse().map(p => {
                    const isEditingPay = editingPayId === p.payId;
                    const bill = bills.find(b => b.billId === p.billId);
                    return (
                      <tr key={p.payId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.date}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600 font-mono text-xs">
                          <span className="flex items-center space-x-1">
                            <Receipt className="w-3.5 h-3.5 text-blue-500" />
                            <span>{p.billId}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-800">
                          {isEditingPay ? (
                            <input 
                              type="number" 
                              value={editPayAmount}
                              onChange={(e) => setEditPayAmount(e.target.value)}
                              className="w-24 px-1.5 py-1 border border-blue-200 bg-blue-50/30 rounded text-xs font-bold text-left font-mono focus:ring-2 focus:ring-blue-500"
                              placeholder="จำนวนเงิน"
                            />
                          ) : (
                            <span className="text-emerald-600">{formatCurrency(p.amount)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditingPay ? (
                            <select
                              value={editPayMethod}
                              onChange={(e) => setEditPayMethod(e.target.value as "เงินสด" | "โอนธนาคาร")}
                              className="px-1.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="เงินสด">เงินสด</option>
                              <option value="โอนธนาคาร">โอนธนาคาร</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              p.method === "โอนธนาคาร" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-700"
                            }`}>
                              {p.method}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {isEditingPay ? (
                            <input 
                              type="text" 
                              value={editPayReceiver}
                              onChange={(e) => setEditPayReceiver(e.target.value)}
                              className="w-24 px-1.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              placeholder="ผู้รับเงิน"
                            />
                          ) : (
                            <span className="flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.receiver}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                          {isEditingPay ? (
                            <input 
                              type="text" 
                              value={editPayNote}
                              onChange={(e) => setEditPayNote(e.target.value)}
                              className="w-full min-w-[120px] px-1.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              placeholder="หมายเหตุธุรกรรม"
                            />
                          ) : (
                            p.note || "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditingPay ? (
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => handleSaveEditPayment(p)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                title="บันทึกที่แก้ไข"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingPayId(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="ยกเลิกแก้ไข"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => startEditPayment(p)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => onDeletePayment?.(p.payId)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="ยกเลิกรายการชำระเงิน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div key="meters-history-tab" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="px-6 py-4">ห้องพัก / ผู้เช่าหลัก</th>
                  <th className="px-6 py-4">ข้อมูลมิเตอร์น้ำ (หน่วยก่อน → ล่าสุด)</th>
                  <th className="px-6 py-4">ข้อมูลมิเตอร์ไฟ (หน่วยก่อน → ล่าสุด)</th>
                  <th className="px-6 py-4">หมายเหตุแก้ไข/ช่วยจำ</th>
                  <th className="px-6 py-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                {recordedMeters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      ยังไม่มีการบันทึกมิเตอร์น้ำ-ไฟใด ๆ ของผู้เช่า "ใช้งาน" ในรอบเดือนนี้
                    </td>
                  </tr>
                ) : (
                  recordedMeters.map(item => {
                    const isEditing = editingRoomId === item.roomId;

                    return (
                      <tr key={item.roomId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        {/* Room & Tenant Info */}
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800">ห้อง {item.roomName}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.tenantName}</div>
                        </td>

                        {/* Water Meter */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <input 
                                type="number" 
                                value={editPrevWater}
                                onChange={(e) => setEditPrevWater(e.target.value)}
                                className="w-16 px-1 py-1 border border-slate-200 rounded text-xs text-center font-mono focus:ring-1 focus:ring-blue-500"
                                placeholder="ก่อนหน้า"
                              />
                              <span className="text-slate-400 text-xs font-bold">→</span>
                              <input 
                                type="number" 
                                value={editCurrWater}
                                onChange={(e) => setEditCurrWater(e.target.value)}
                                className="w-16 px-1.5 py-1 border border-blue-200 bg-blue-50/30 rounded text-xs font-bold text-center font-mono focus:ring-2 focus:ring-blue-500"
                                placeholder="ล่าสุด"
                              />
                            </div>
                          ) : (
                            <div className="font-mono text-xs text-slate-600">
                              <span className="text-slate-400">ก่อนหน้า</span> <strong className="font-semibold">{item.prevWater}</strong>
                              <span className="mx-1.5 text-slate-300 font-bold">→</span>
                              <span className="text-blue-600">ล่าสุด</span> <strong className="text-blue-700 font-extrabold">{item.currWater}</strong>
                              <span className="ml-1.5 text-[10px] text-slate-400 font-semibold">({Math.max(0, item.currWater - item.prevWater)} หน่วย)</span>
                            </div>
                          )}
                        </td>

                        {/* Elec Meter */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <input 
                                type="number" 
                                value={editPrevElec}
                                onChange={(e) => setEditPrevElec(e.target.value)}
                                className="w-16 px-1 py-1 border border-slate-200 rounded text-xs text-center font-mono focus:ring-1 focus:ring-blue-500"
                                placeholder="ก่อนหน้า"
                              />
                              <span className="text-slate-400 text-xs font-bold">→</span>
                              <input 
                                type="number" 
                                value={editCurrElec}
                                onChange={(e) => setEditCurrElec(e.target.value)}
                                className="w-16 px-1.5 py-1 border border-blue-200 bg-blue-50/30 rounded text-xs font-bold text-center font-mono focus:ring-2 focus:ring-blue-500"
                                placeholder="ล่าสุด"
                              />
                            </div>
                          ) : (
                            <div className="font-mono text-xs text-slate-600">
                              <span className="text-slate-400">ก่อนหน้า</span> <strong className="font-semibold">{item.prevElec}</strong>
                              <span className="mx-1.5 text-slate-300 font-bold">→</span>
                              <span className="text-blue-600">ล่าสุด</span> <strong className="text-blue-700 font-extrabold">{item.currElec}</strong>
                              <span className="ml-1.5 text-[10px] text-slate-400 font-semibold">({Math.max(0, item.currElec - item.prevElec)} หน่วย)</span>
                            </div>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              placeholder="หมายเหตุประกอบการแก้ไข..."
                            />
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">
                              {item.note || "-"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => handleSaveEdit(item)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                title="บันทึกที่แก้ไข"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingRoomId(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="ยกเลิกแก้ไข"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <button 
                                onClick={() => startEdit(item)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                                title="แก้ไขมิเตอร์"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => onDeleteMeter?.(item.roomId)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="ลบข้อมูลมิเตอร์"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
