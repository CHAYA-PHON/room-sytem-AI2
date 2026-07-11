/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, X } from "lucide-react";
import { Tenant, Room } from "../types";

interface TenantsProps {
  tenants: Tenant[];
  rooms: Room[];
  onSave: (tenant: Tenant) => void;
  onDelete: (roomId: string) => void;
}

export default function Tenants({ tenants, rooms, onSave, onDelete }: TenantsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);

  // Form states
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startWater, setStartWater] = useState(0);
  const [startElec, setStartElec] = useState(0);
  const [status, setStatus] = useState<"ใช้งาน" | "ยกเลิกสัญญา">("ใช้งาน");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const handleOpenAdd = () => {
    // หาห้องว่างที่ไม่มีสัญญา "ใช้งาน" อยู่
    const vacantRoom = rooms.find(r => !tenants.some(t => t.roomId === r.id && t.status === "ใช้งาน"));
    
    if (!vacantRoom) {
      alert("ไม่มีห้องว่างเหลือสำหรับการทำสัญญาเช่าใหม่ กรุณาไปเพิ่มห้องพักก่อน!");
      return;
    }

    setCurrentTenant(null);
    setRoomId(vacantRoom.id);
    setName("");
    setPhone("");
    setStartDate(new Date().toISOString().substring(0, 10));
    setStartWater(0);
    setStartElec(0);
    setStatus("ใช้งาน");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setRoomId(tenant.roomId);
    setName(tenant.name);
    setPhone(tenant.phone);
    setStartDate(tenant.startDate);
    setStartWater(tenant.startWater);
    setStartElec(tenant.startElec);
    setStatus(tenant.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomId) return;

    onSave({
      roomId,
      name: name.trim(),
      phone: phone.trim(),
      startDate,
      startWater: Number(startWater),
      startElec: Number(startElec),
      status
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-slate-500 text-sm font-medium">ผูกรายชื่อผู้เช่าเข้ากับห้องพัก พร้อมบันทึกเลขมิเตอร์เริ่มต้นสัญญา</span>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ทำสัญญาเช่าใหม่</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-6 py-4">ห้องพัก</th>
                <th className="px-6 py-4">ชื่อผู้เช่า</th>
                <th className="px-6 py-4">เบอร์โทรศัพท์</th>
                <th className="px-6 py-4">วันเริ่มเช่า</th>
                <th className="px-6 py-4">มิเตอร์ตั้งต้น (น้ำ/ไฟ)</th>
                <th className="px-6 py-4">สถานะสัญญา</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    ยังไม่มีข้อมูลสัญญาผู้เช่าในหอพักนี้ กดทำสัญญาเช่าใหม่เพื่อเริ่มดำเนินการ
                  </td>
                </tr>
              ) : (
                tenants.map(tenant => {
                  const room = rooms.find(r => r.id === tenant.roomId);
                  return (
                    <tr key={tenant.roomId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-600">ห้อง {room ? room.name : tenant.roomId}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{tenant.name}</td>
                      <td className="px-6 py-4 font-medium text-slate-500">{tenant.phone || "-"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">{tenant.startDate}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400 leading-relaxed">
                        <div>น้ำ: {tenant.startWater} หน่วย</div>
                        <div>ไฟ: {tenant.startElec} หน่วย</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                          tenant.status === "ใช้งาน" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {tenant.status === "ใช้งาน" ? "ใช้งานอยู่" : "ยกเลิกสัญญา"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button 
                            onClick={() => handleOpenEdit(tenant)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmRoomId(tenant.roomId)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="ลบผู้เช่า"
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

      {/* Add / Edit Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800">
                {currentTenant ? "แก้ไขสัญญาข้อมูลผู้เช่า" : "ทำสัญญาเช่าห้องพักใหม่"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เลือกห้องพักทำสัญญาเช่า *</label>
                {currentTenant ? (
                  <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm">
                    ห้อง {rooms.find(r => r.id === roomId)?.name || roomId} (ไม่สามารถเปลี่ยนห้องเช่าระหว่างสัญญาได้)
                  </div>
                ) : (
                  <select 
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold text-slate-700"
                  >
                    {rooms
                      .filter(r => !tenants.some(t => t.roomId === r.id && t.status === "ใช้งาน"))
                      .map(r => (
                        <option key={r.id} value={r.id}>ห้อง {r.name} - ค่าเช่า {formatCurrency(r.rent)}</option>
                      ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อ-สกุล ผู้เช่าหลัก *</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-semibold"
                    placeholder="เช่น นายอัศวิน ประจญภัย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="เช่น 089-123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">วันเริ่มเข้าอยู่อาศัย *</label>
                  <input 
                    type="date" 
                    required 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">มิเตอร์น้ำประปาเริ่มต้น *</label>
                  <input 
                    type="number" 
                    required 
                    value={startWater}
                    onChange={(e) => setStartWater(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">มิเตอร์ไฟฟ้าเริ่มต้น *</label>
                  <input 
                    type="number" 
                    required 
                    value={startElec}
                    onChange={(e) => setStartElec(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">สถานะสัญญาเช่าปัจจุบัน</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-semibold text-slate-700"
                >
                  <option value="ใช้งาน">ใช้งานปกติ (Active)</option>
                  <option value="ยกเลิกสัญญา">ยกเลิกสัญญา / ย้ายออกแล้ว (Terminated)</option>
                </select>
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
                  ทำสัญญาเสร็จสิ้น
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">ยืนยันถอนสัญญาผู้เช่า?</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผู้เช่าและประวัติสัญญาเช่านี้ออกจากระบบ? ข้อมูลการจดมิเตอร์และบิลของห้องนี้อาจจะแสดงข้อผิดพลาดหากผู้เช่าสูญหาย
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                onClick={() => setDeleteConfirmRoomId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  onDelete(deleteConfirmRoomId);
                  setDeleteConfirmRoomId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/10 cursor-pointer"
              >
                ยืนยันลบผู้เช่า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
