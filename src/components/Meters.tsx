/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Info, Save, PlusCircle, AlertCircle, X, Trash2 } from "lucide-react";
import { AddedItem } from "../types";

interface MeterItem {
  roomId: string;
  roomName: string;
  tenantName: string;
  isRecorded: boolean;
  meterId: string;
  prevWater: number;
  currWater: number | string;
  prevElec: number;
  currElec: number | string;
  note: string;
  originalPrevWater: number;
  originalPrevElec: number;
}

interface MetersProps {
  list: MeterItem[];
  month: string;
  onSaveBatch: (items: any[]) => void;
  onGetAddedItems: (roomId: string, month: string) => AddedItem[];
  onSaveAddedItem: (item: AddedItem) => void;
  onDeleteAddedItem: (id: string, roomId: string, month: string) => void;
}

export default function Meters({ list, month, onSaveBatch, onGetAddedItems, onSaveAddedItem, onDeleteAddedItem }: MetersProps) {
  // Local state for table editing inputs to avoid sluggishness
  const [editedList, setEditedList] = useState<MeterItem[]>([]);
  const [inlineModalRoom, setInlineModalRoom] = useState<{ id: string; name: string } | null>(null);
  const [inlineItems, setInlineItems] = useState<AddedItem[]>([]);
  
  // New added item form states
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState(0);
  const [newItemNote, setNewItemNote] = useState("");

  useEffect(() => {
    const unrecorded = list.filter(item => !item.isRecorded);
    setEditedList(JSON.parse(JSON.stringify(unrecorded)));
  }, [list]);

  const handleInputChange = (roomId: string, field: keyof MeterItem, value: any) => {
    setEditedList(prev => prev.map(item => {
      if (item.roomId === roomId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleOpenInlineModal = (roomId: string, roomName: string) => {
    setInlineModalRoom({ id: roomId, name: roomName });
    const items = onGetAddedItems(roomId, month);
    setInlineItems(items);
    setNewItemName("");
    setNewItemAmount(0);
    setNewItemNote("");
  };

  const handleAddInlineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineModalRoom || !newItemName.trim() || newItemAmount <= 0) return;

    onSaveAddedItem({
      id: "",
      roomId: inlineModalRoom.id,
      month,
      name: newItemName.trim(),
      amount: Number(newItemAmount),
      note: newItemNote.trim()
    });

    // Refresh list
    const items = onGetAddedItems(inlineModalRoom.id, month);
    setInlineItems(items);
    setNewItemName("");
    setNewItemAmount(0);
    setNewItemNote("");
  };

  const handleDeleteInlineItem = (id: string) => {
    if (!inlineModalRoom) return;
    onDeleteAddedItem(id, inlineModalRoom.id, month);
    const items = onGetAddedItems(inlineModalRoom.id, month);
    setInlineItems(items);
  };


  const handleSaveBatch = () => {
    // Validate inputs
    let allValid = true;
    const itemsToSave: any[] = [];

    for (let i = 0; i < editedList.length; i++) {
      const room = editedList[i];
      
      const hasWater = room.currWater !== undefined && room.currWater !== null && room.currWater !== "";
      const hasElec = room.currElec !== undefined && room.currElec !== null && room.currElec !== "";

      // Whichever room has blank inputs, skip it (wait for values)
      if (!hasWater || !hasElec) {
        continue;
      }

      const currW = Number(room.currWater);
      const currE = Number(room.currElec);
      const prevW = Number(room.prevWater);
      const prevE = Number(room.prevElec);

      if (currW < prevW) {
        alert(`เลขมิเตอร์น้ำล่าสุดสำหรับห้อง ${room.roomName} ต้องไม่ต่ำกว่าค่าเลขก่อนหน้า (${prevW})`);
        allValid = false;
        break;
      }

      if (currE < prevE) {
        alert(`เลขมิเตอร์ไฟฟ้าล่าสุดสำหรับห้อง ${room.roomName} ต้องไม่ต่ำกว่าค่าเลขก่อนหน้า (${prevE})`);
        allValid = false;
        break;
      }

      // Check if previous readings were changed and if reason/note is provided
      const isWaterChanged = prevW !== room.originalPrevWater;
      const isElecChanged = prevE !== room.originalPrevElec;

      if ((isWaterChanged || isElecChanged) && !room.note.trim()) {
        alert(`คุณมีการแก้ไขค่าเลขมิเตอร์ก่อนหน้าของห้อง ${room.roomName} โปรดระบุเหตุผลในการแก้ไขลงในช่อง "หมายเหตุแก้ไข" เพื่อยืนยันความถูกต้อง`);
        allValid = false;
        break;
      }

      itemsToSave.push({
        roomId: room.roomId,
        meterId: room.meterId,
        prevWater: Number(room.prevWater),
        currWater: Number(room.currWater),
        prevElec: Number(room.prevElec),
        currElec: Number(room.currElec),
        note: room.note
      });
    }

    if (!allValid) return;

    if (itemsToSave.length === 0) {
      alert("กรุณากรอกข้อมูลเลขมิเตอร์น้ำและไฟให้ครบถ้วนอย่างน้อย 1 ห้องก่อนบันทึก");
      return;
    }

    onSaveBatch(itemsToSave);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Informational Alert Header */}
      <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3 text-blue-800">
          <div className="p-1.5 bg-blue-500/20 rounded-xl text-blue-600 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed font-semibold">
            <span className="block text-sm font-bold text-slate-800 mb-0.5">ระบบจดบันทึกค่ามิเตอร์และบริการคลาวด์กลุ่ม</span>
            คุณสามารถป้อนเลขมิเตอร์น้ำ-ไฟของแต่ละห้องได้พร้อมกันในรอบเดือน {month} โดย<strong className="text-blue-600 font-bold">ห้องใดที่ป้อนเลขครบแล้ว ระบบจะบันทึกนำเข้าข้อมูลก่อน</strong> ส่วน<strong className="text-amber-600 font-bold">ห้องที่ปล่อยว่างไว้ ระบบจะข้ามไปเพื่อรอการป้อนค่าในภายหลัง</strong> (ไม่บังคับกรอกครบทุกห้องพร้อมกัน)
          </div>
        </div>
        {editedList.length > 0 && (
          <button 
            onClick={handleSaveBatch}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 shrink-0 cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกส่งมิเตอร์ทั้งหมด</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-6 py-4">ห้อง / ผู้เช่าหลัก</th>
                <th className="px-6 py-4">จดมิเตอร์น้ำประปา (หน่วย)</th>
                <th className="px-6 py-4">จดมิเตอร์ไฟฟ้าหลัก (หน่วย)</th>
                <th className="px-6 py-4 w-1/4">หมายเหตุแก้ไขเลขก่อนหน้า</th>
                <th className="px-6 py-4 text-center">จัดการรายจ่ายเสริม</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {editedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    🎉 ทุกห้องที่ผูกสัญญามีผู้เช่า "ใช้งาน" ได้รับการจดบันทึกค่ามิเตอร์เรียบร้อยแล้วในรอบเดือน {month}
                  </td>
                </tr>
              ) : (
                editedList.map(item => {
                  const isWaterChanged = Number(item.prevWater) !== item.originalPrevWater;
                  const isElecChanged = Number(item.prevElec) !== item.originalPrevElec;
                  const needsNote = isWaterChanged || isElecChanged;

                  return (
                    <tr 
                      key={item.roomId} 
                      className={`border-b border-slate-50 transition-colors ${
                        item.isRecorded ? "bg-slate-50/10" : "bg-blue-50/5"
                      }`}
                    >
                      {/* Room & Tenant Info */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-800">ห้อง {roomNameFormat(item.roomName)}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.tenantName}</div>
                      </td>

                      {/* Water Meter */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">ก่อนหน้า</span>
                            <input 
                              type="number" 
                              value={item.prevWater}
                              onChange={(e) => handleInputChange(item.roomId, "prevWater", e.target.value)}
                              className={`w-16 px-1.5 py-1 border rounded-lg text-xs font-semibold font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isWaterChanged ? "bg-amber-50 border-amber-300 text-amber-800 font-bold" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                          <span className="text-slate-300 font-bold mt-3">→</span>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">จดล่าสุด *</span>
                            <input 
                              type="number" 
                              value={item.currWater}
                              onChange={(e) => handleInputChange(item.roomId, "currWater", e.target.value)}
                              className="w-20 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                              placeholder="เลล่าสุด"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Elec Meter */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">ก่อนหน้า</span>
                            <input 
                              type="number" 
                              value={item.prevElec}
                              onChange={(e) => handleInputChange(item.roomId, "prevElec", e.target.value)}
                              className={`w-16 px-1.5 py-1 border rounded-lg text-xs font-semibold font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isElecChanged ? "bg-amber-50 border-amber-300 text-amber-800 font-bold" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                          <span className="text-slate-300 font-bold mt-3">→</span>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">จดล่าสุด *</span>
                            <input 
                              type="number" 
                              value={item.currElec}
                              onChange={(e) => handleInputChange(item.roomId, "currElec", e.target.value)}
                              className="w-20 px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                              placeholder="เลล่าสุด"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Editing warning / note */}
                      <td className="px-6 py-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={item.note}
                            required={needsNote}
                            onChange={(e) => handleInputChange(item.roomId, "note", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 ${
                              needsNote 
                                ? "bg-amber-50/50 border-amber-300 text-amber-900 placeholder-amber-400" 
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                            placeholder={needsNote ? "โปรดใส่เหตุผลการเปลี่ยนเลขก่อนหน้า *" : "หมายเหตุช่วยจำ..."}
                          />
                          {needsNote && (
                            <span className="absolute top-2.5 right-2 text-amber-500" title="ต้องการระบุเหตุผลประกอบ">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Supplementary Added Services shortcut */}
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenInlineModal(item.roomId, item.roomName)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>จัดการค่าบริการเสริม</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Added Items Manage Modal */}
      {inlineModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  รายจ่ายเสริมอื่นๆ: ห้อง {roomNameFormat(inlineModalRoom.name)}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">รอบบริการทางการเงินประจำเดือน: {month}</p>
              </div>
              <button 
                onClick={() => setInlineModalRoom(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form to add item */}
              <form onSubmit={handleAddInlineItem} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อเรียกรายจ่ายเสริม *</label>
                    <input 
                      type="text" 
                      required 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
                      placeholder="เช่น จอดรถยนต์, ซ่อมก๊อกน้ำ"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">จำนวนเงิน (บาท) *</label>
                    <input 
                      type="number" 
                      required 
                      value={newItemAmount || ""}
                      onChange={(e) => setNewItemAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800 font-bold"
                      placeholder="ระบุจำนวนเงิน"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">หมายเหตุย่อยช่วยจำ</label>
                  <input 
                    type="text" 
                    value={newItemNote}
                    onChange={(e) => setNewItemNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-700"
                    placeholder="รายละเอียดจำเพาะเจาะจง..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>เพิ่มบันทึกรายจ่ายเสริม</span>
                </button>
              </form>

              {/* Added item rows table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-4 py-2 text-[10px]">ชื่อรายจ่าย</th>
                      <th className="px-4 py-2 text-[10px]">ราคา</th>
                      <th className="px-4 py-2 text-[10px]">หมายเหตุ</th>
                      <th className="px-4 py-2 text-right text-[10px]">ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inlineItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs">
                          ยังไม่มีค่าบริการเสริมใดๆ ในเดือนนี้
                        </td>
                      </tr>
                    ) : (
                      inlineItems.map(it => (
                        <tr key={it.id} className="border-b border-slate-100 text-xs text-slate-700">
                          <td className="px-4 py-2.5 font-bold">{it.name}</td>
                          <td className="px-4 py-2.5 font-bold text-blue-600">{formatCurrency(it.amount)}</td>
                          <td className="px-4 py-2.5 text-slate-400 truncate max-w-[100px]">{it.note || "-"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button 
                              onClick={() => handleDeleteInlineItem(it.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-md transition-all cursor-pointer"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                <span>รวมรายจ่ายเสริมสะสมเดือนนี้:</span>
                <span className="text-sm text-blue-600">
                  {formatCurrency(inlineItems.reduce((sum, item) => sum + item.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper formatting room names to ensure 3 digits or normal
function roomNameFormat(name: string) {
  return name.length === 3 ? name : name;
}
