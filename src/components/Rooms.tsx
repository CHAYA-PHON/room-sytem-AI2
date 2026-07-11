/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, Check, X, Wallet, HelpCircle } from "lucide-react";
import { Room, BankAccount } from "../types";

interface RoomsProps {
  rooms: Room[];
  banks: BankAccount[];
  onSave: (room: Room) => void;
  onDelete: (id: string) => void;
}

export default function Rooms({ rooms, banks, onSave, onDelete }: RoomsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [rent, setRent] = useState(3000);
  const [minWater, setMinWater] = useState(100);
  const [minElec, setMinElec] = useState(100);
  const [payMethod, setPayMethod] = useState<"เงินสด" | "โอนธนาคาร">("เงินสด");
  const [bankId, setBankId] = useState("");
  const [note, setNote] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const handleOpenAdd = () => {
    setCurrentRoom(null);
    setName("");
    setRent(3000);
    setMinWater(100);
    setMinElec(100);
    setPayMethod("เงินสด");
    setBankId(banks[0]?.id || "");
    setNote("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setCurrentRoom(room);
    setName(room.name);
    setRent(room.rent);
    setMinWater(room.minWater);
    setMinElec(room.minElec);
    setPayMethod(room.payMethod);
    setBankId(room.bankId);
    setNote(room.note);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: currentRoom?.id || "",
      name: name.trim(),
      rent: Number(rent),
      minWater: Number(minWater),
      minElec: Number(minElec),
      payMethod,
      bankId: payMethod === "โอนธนาคาร" ? bankId : "",
      note: note.trim()
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-slate-500 text-sm font-medium">คุณสามารถเพิ่ม ลบ และแก้ไขประเภทห้องพัก ค่าเช่าคงที่ และค่าน้ำไฟขั้นต่ำได้ที่แท็บนี้</span>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มห้องพักใหม่</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-6 py-4">ห้อง</th>
                <th className="px-6 py-4">ค่าเช่ารายเดือน</th>
                <th className="px-6 py-4">ขั้นต่ำน้ำ-ไฟ</th>
                <th className="px-6 py-4">ช่องทางรับเงิน</th>
                <th className="px-6 py-4">หมายเหตุเพิ่มเติม</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    ยังไม่มีห้องพักใด ๆ ในหอพักนี้ กดปุ่ม "เพิ่มห้องพักใหม่" เพื่อเริ่มต้น
                  </td>
                </tr>
              ) : (
                rooms.map(room => {
                  const bank = banks.find(b => b.id === room.bankId);
                  return (
                    <tr key={room.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">ห้อง {room.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{formatCurrency(room.rent)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 leading-relaxed">
                        <div>น้ำ: {formatCurrency(room.minWater)} (ต่อบิล)</div>
                        <div>ไฟ: {formatCurrency(room.minElec)} (ต่อบิล)</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-600">
                          {room.payMethod}
                        </span>
                        {room.payMethod === "โอนธนาคาร" && bank && (
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            {bank.bankName} • {bank.accountNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {room.note || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button 
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(room.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="ลบห้อง"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800">
                {currentRoom ? "แก้ไขข้อมูลห้องพัก" : "เพิ่มห้องพักใหม่"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เลขที่ห้องพัก / ชื่อห้อง *</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-semibold"
                    placeholder="เช่น 101, Room A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">อัตราค่าเช่าคงที่รายเดือน (บาท) *</label>
                  <input 
                    type="number" 
                    required 
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ค่าน้ำประปาขั้นต่ำ (บาท/บิล)</label>
                  <input 
                    type="number" 
                    value={minWater}
                    onChange={(e) => setMinWater(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ค่ากระแสไฟฟ้าขั้นต่ำ (บาท/บิล)</label>
                  <input 
                    type="number" 
                    value={minElec}
                    onChange={(e) => setMinElec(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">วิธีชำระเงินแนะนำ</label>
                  <select 
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold text-slate-700"
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนธนาคาร">โอนเงินเข้าบัญชีธนาคาร</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">บัญชีรับเงินของห้องเช่า</label>
                  <select 
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    disabled={payMethod === "เงินสด"}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-700 disabled:opacity-50"
                  >
                    {banks.length === 0 ? (
                      <option value="">-- กรุณาตั้งค่าบัญชีธนาคารก่อน --</option>
                    ) : (
                      banks.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ข้อกำหนด / บันทึกท้ายบิลรายห้อง</label>
                <textarea 
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-700"
                  placeholder="เช่น ปรับค่าย้ายออก 500 บาท หรือ ข้อตกลงพิเศษอื่น ๆ"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  บันทึกข้อมูลห้องพัก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">ยืนยันการลบห้องพัก?</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบห้องพักนี้? สัญญาผู้เช่า ประวัติมิเตอร์ และบิลค่าใช้จ่ายที่ผูกกับห้องนี้จะถูกลบหรืออาจเกิดข้อผิดพลาดในการเรียกดูข้อมูลย้อนหลัง
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/10 cursor-pointer"
              >
                ใช่, ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
