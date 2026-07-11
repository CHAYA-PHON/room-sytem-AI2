/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Check, Printer, FileText, HandCoins, Receipt, X, PlusCircle, Trash2, AlertCircle, Edit2 } from "lucide-react";
import { Bill, BankAccount, AddedItem } from "../types";

interface BillsProps {
  bills: Bill[];
  banks: BankAccount[];
  month: string;
  onPayFIFO: (roomId: string, amount: number, method: "เงินสด" | "โอนธนาคาร", receiver: string, note: string) => void;
  onBulkPay?: (payments: { roomId: string; amount: number; method: "เงินสด" | "โอนธนาคาร"; receiver: string; note: string }[]) => void;
  onPrintInvoices: (roomIds: string[]) => void;
  onPrintSummary: (roomIds?: string[]) => void;
  onGetAddedItems?: (roomId: string, month: string) => AddedItem[];
  onSaveAddedItem?: (item: AddedItem) => void;
  onDeleteAddedItem?: (id: string, roomId: string, month: string) => void;
}

export default function Bills({ 
  bills, 
  banks, 
  month, 
  onPayFIFO, 
  onBulkPay, 
  onPrintInvoices, 
  onPrintSummary,
  onGetAddedItems,
  onSaveAddedItem,
  onDeleteAddedItem
}: BillsProps) {
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [paymentModalData, setPaymentModalData] = useState<{ roomId: string; roomName: string; balance: number } | null>(null);

  // Supplementary added items modal states
  const [addedItemsModalRoom, setAddedItemsModalRoom] = useState<{ id: string; name: string } | null>(null);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState(0);
  const [newItemNote, setNewItemNote] = useState("");
  const [editingItem, setEditingItem] = useState<AddedItem | null>(null);

  const handleOpenAddedItemsModal = (roomId: string, roomName: string) => {
    setAddedItemsModalRoom({ id: roomId, name: roomName });
    setEditingItem(null);
    if (onGetAddedItems) {
      const items = onGetAddedItems(roomId, month);
      setAddedItems(items);
    }
    setNewItemName("");
    setNewItemAmount(0);
    setNewItemNote("");
  };

  const handleAddAddedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addedItemsModalRoom || !newItemName.trim() || newItemAmount <= 0) return;

    if (onSaveAddedItem) {
      onSaveAddedItem({
        id: editingItem ? editingItem.id : "",
        roomId: addedItemsModalRoom.id,
        month,
        name: newItemName.trim(),
        amount: Number(newItemAmount),
        note: newItemNote.trim()
      });
    }

    // Refresh list
    if (onGetAddedItems) {
      const items = onGetAddedItems(addedItemsModalRoom.id, month);
      setAddedItems(items);
    }
    setEditingItem(null);
    setNewItemName("");
    setNewItemAmount(0);
    setNewItemNote("");
  };

  const handleDeleteAddedItem = (id: string) => {
    if (!addedItemsModalRoom) return;
    if (onDeleteAddedItem) {
      onDeleteAddedItem(id, addedItemsModalRoom.id, month);
    }
    // If we're deleting the item currently being edited, cancel edit mode
    if (editingItem && editingItem.id === id) {
      setEditingItem(null);
      setNewItemName("");
      setNewItemAmount(0);
      setNewItemNote("");
    }
    // Refresh list
    if (onGetAddedItems) {
      const items = onGetAddedItems(addedItemsModalRoom.id, month);
      setAddedItems(items);
    }
  };

  const handleStartEditAddedItem = (item: AddedItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemAmount(item.amount);
    setNewItemNote(item.note || "");
  };

  const handleCancelEditAddedItem = () => {
    setEditingItem(null);
    setNewItemName("");
    setNewItemAmount(0);
    setNewItemNote("");
  };

  // Bulk payment modal states
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false);
  const [bulkPayMethod, setBulkPayMethod] = useState<"เงินสด" | "โอนธนาคาร">("โอนธนาคาร");
  const [bulkPayReceiver, setBulkPayReceiver] = useState("แอดมิน");
  const [bulkPayNote, setBulkPayNote] = useState("");

  // Payment form states
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"เงินสด" | "โอนธนาคาร">("โอนธนาคาร");
  const [payReceiver, setPayReceiver] = useState("แอดมิน");
  const [payNote, setPayNote] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const handleSelectAll = () => {
    setSelectedRooms(bills.map(b => b.roomId));
  };

  const handleDeselectAll = () => {
    setSelectedRooms([]);
  };

  const handleCheckboxChange = (roomId: string) => {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  const selectedUnpaidRooms = bills.filter(b => selectedRooms.includes(b.roomId) && b.balance > 0);
  const totalBulkBalance = selectedUnpaidRooms.reduce((sum, b) => sum + b.balance, 0);

  const handleOpenPayment = (roomId: string, roomName: string, balance: number) => {
    setPaymentModalData({ roomId, roomName, balance });
    setPayAmount(balance);
    setPayMethod("โอนธนาคาร");
    setPayReceiver("แอดมิน");
    setPayNote("");
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData || payAmount <= 0) return;

    onPayFIFO(paymentModalData.roomId, payAmount, payMethod, payReceiver, payNote.trim());
    setPaymentModalData(null);
  };

  const handleBulkPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUnpaidRooms.length === 0) return;

    const payments = selectedUnpaidRooms.map(r => ({
      roomId: r.roomId,
      amount: r.balance,
      method: bulkPayMethod,
      receiver: bulkPayReceiver,
      note: bulkPayNote.trim() || "รับชำระเงินกลุ่มประจำรอบ"
    }));

    if (onBulkPay) {
      onBulkPay(payments);
    } else {
      payments.forEach(p => onPayFIFO(p.roomId, p.amount, p.method, p.receiver, p.note));
    }

    setBulkPaymentModalOpen(false);
    setSelectedRooms([]);
  };

  const handlePrintSelected = () => {
    if (selectedRooms.length === 0) {
      alert("กรุณาทำเครื่องหมายเลือกห้องพักที่ท่านต้องการพิมพ์ใบแจ้งหนี้ก่อน!");
      return;
    }
    onPrintInvoices(selectedRooms);
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSelectAll}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            เลือกห้องทั้งหมด
          </button>
          <button 
            onClick={handleDeselectAll}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            ยกเลิกทั้งหมด
          </button>
          {selectedUnpaidRooms.length > 0 && (
            <button 
              onClick={() => setBulkPaymentModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center space-x-1.5"
              title="รับชำระเงินของห้องที่เลือกทั้งหมดพร้อมกัน"
            >
              <HandCoins className="w-4 h-4" />
              <span>ชำระเงินพร้อมกัน ({selectedUnpaidRooms.length} ห้อง)</span>
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handlePrintSelected}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบแจ้งหนี้ห้องที่เลือก ({selectedRooms.length})</span>
          </button>
          <button 
            onClick={() => onPrintSummary(selectedRooms)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-slate-950/10 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>พิมพ์รายงานสรุปบิลประจำเดือน {selectedRooms.length > 0 ? `(${selectedRooms.length} ห้องที่เลือก)` : ""}</span>
          </button>
        </div>
      </div>

      {/* Main Bills Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-4 py-4 text-center w-12">เลือก</th>
                <th className="px-4 py-4">ห้องพัก</th>
                <th className="px-4 py-4">ผู้เช่า / เลขอ้างอิงบิล</th>
                <th className="px-4 py-4">ค่าบริการ มิเตอร์น้ำ-ไฟ</th>
                <th className="px-4 py-4">ค่าเช่าหลัก</th>
                <th className="px-4 py-4">รายจ่ายเสริม</th>
                <th className="px-4 py-4 text-rose-500 font-bold">ยอดค้างสะสมเดิม</th>
                <th className="px-4 py-4 text-blue-600 font-bold">ยอดสุทธิรวม</th>
                <th className="px-4 py-4 text-emerald-600 font-bold">ชำระเข้ามาแล้ว</th>
                <th className="px-4 py-4">ยอดคงค้าง</th>
                <th className="px-4 py-4">สถานะบิล</th>
                <th className="px-4 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    ยังไม่มีข้อมูลการประมวลผลบิลค่าเช่าในรอบเดือน {month} กรุณาไปป้อนจดบันทึกค่ามิเตอร์เพื่อสร้างบิลอัตโนมัติ
                  </td>
                </tr>
              ) : (
                bills.map(b => {
                  const isChecked = selectedRooms.includes(b.roomId);
                  const isPaid = b.status === "ชำระแล้ว";
                  const isPartial = b.status === "ชำระบางส่วน";

                  return (
                    <tr key={b.billId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(b.roomId)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 font-extrabold text-slate-800">ห้อง {b.roomName}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700 text-xs">{b.tenantName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">บิล ID: {b.billId}</div>
                      </td>
                      <td className="px-4 py-4 text-[10px] text-slate-500 font-mono leading-relaxed">
                        <div>น้ำ: {b.waterUnits} u ({formatCurrency(b.waterCost)})</div>
                        <div>ไฟ: {b.elecUnits} u ({formatCurrency(b.elecCost)})</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{formatCurrency(b.rentCost)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          {(() => {
                            const hasItems = onGetAddedItems ? onGetAddedItems(b.roomId, month).length > 0 : false;
                            const itemsCount = onGetAddedItems ? onGetAddedItems(b.roomId, month).length : 0;
                            return (
                              <>
                                <span className={`font-semibold ${hasItems ? "text-emerald-600 font-bold" : "text-slate-700"}`}>
                                  {formatCurrency(b.addedCost)}
                                </span>
                                {onGetAddedItems && (
                                  <button
                                    onClick={() => handleOpenAddedItemsModal(b.roomId, b.roomName)}
                                    className={`text-[10px] font-bold text-left inline-flex items-center space-x-0.5 cursor-pointer hover:underline ${
                                      hasItems 
                                        ? "text-emerald-600 hover:text-emerald-800" 
                                        : "text-blue-600 hover:text-blue-800"
                                    }`}
                                  >
                                    <PlusCircle className={`w-3.5 h-3.5 shrink-0 ${hasItems ? "text-emerald-500" : "text-blue-500"}`} />
                                    <span>จัดการรายจ่ายเสริม {hasItems && `(${itemsCount})`}</span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-rose-500">{formatCurrency(b.prevUnpaid)}</td>
                      <td className="px-4 py-4 font-extrabold text-blue-600">{formatCurrency(b.total)}</td>
                      <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(b.paid)}</td>
                      <td className={`px-4 py-4 font-extrabold ${b.balance > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {formatCurrency(b.balance)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isPaid ? "bg-emerald-50 text-emerald-600" : (isPartial ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600")
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!isPaid && (
                            <button 
                              onClick={() => handleOpenPayment(b.roomId, b.roomName, b.balance)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                              title="บันทึกรับเงิน"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              <span>รับเงิน</span>
                            </button>
                          )}
                          <button 
                            onClick={() => onPrintInvoices([b.roomId])}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                            title="พรีวิวใบแจ้งหนี้"
                          >
                            <Printer className="w-4 h-4" />
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

      {/* FIFO Payment Gateway Modal Dialog */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  รับชำระค่าเช่าหอพัก: ห้อง {paymentModalData.roomName}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">ระบบจะตัดชำระบิลค้างเก่าสุดก่อนอัตโนมัติ (FIFO)</p>
              </div>
              <button 
                onClick={() => setPaymentModalData(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">ยอดเงินค้างชำระสะสมรวม:</span>
                <span className="text-base font-extrabold text-rose-600">{formatCurrency(paymentModalData.balance)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ยอดเงินสด/โอน ที่ผู้เช่านำจ่ายชำระจริง (บาท) *</label>
                <input 
                  type="number" 
                  required 
                  max={paymentModalData.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-extrabold text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">หากนำจ่ายไม่ครบ ยอดค้างเก่าจะยังคงอยู่และสถานะบิลจะได้รับการปรับปรุงตาม FIFO</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">วิธีการชำระเงิน *</label>
                  <select 
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-700"
                  >
                    <option value="โอนธนาคาร">โอนเงินเข้าบัญชี</option>
                    <option value="เงินสด">เงินสด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เจ้าหน้าที่ผู้ทำรายการ *</label>
                  <input 
                    type="text" 
                    required 
                    value={payReceiver}
                    onChange={(e) => setPayReceiver(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">บันทึกความจำ / หมายเหตุชำระเงิน</label>
                <input 
                  type="text" 
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-700"
                  placeholder="เช่น โอนเวลา 14.30 น. แนบสลิปแล้ว"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  ยืนยันบันทึกยอดชำระ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk FIFO Payment Gateway Modal Dialog */}
      {bulkPaymentModalOpen && selectedUnpaidRooms.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  รับชำระค่าเช่าหอพักพร้อมกัน: {selectedUnpaidRooms.length} ห้องที่เลือก
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">ระบบจะตัดชำระบิลค้างเก่าสุดของแต่ละห้องอัตโนมัติ (FIFO)</p>
              </div>
              <button 
                onClick={() => setBulkPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkPaymentSubmit} className="p-5 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-200/40">
                  <span className="text-xs font-bold text-slate-700">รายการห้องพักและยอดชำระ:</span>
                  <span className="text-xs font-extrabold text-rose-600">รวม {selectedUnpaidRooms.length} ห้อง</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {selectedUnpaidRooms.map(r => (
                    <div key={r.roomId} className="flex justify-between items-center text-xs text-slate-600">
                      <span>ห้อง {r.roomName} ({r.tenantName})</span>
                      <span className="font-mono font-bold text-slate-700">{formatCurrency(r.balance)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-200 font-extrabold text-sm text-slate-800">
                  <span>ยอดเงินรับชำระสุทธิรวม:</span>
                  <span className="text-base text-rose-600 font-black">{formatCurrency(totalBulkBalance)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">วิธีการชำระเงิน *</label>
                  <select 
                    value={bulkPayMethod}
                    onChange={(e) => setBulkPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-700"
                  >
                    <option value="โอนธนาคาร">โอนเงินเข้าบัญชี</option>
                    <option value="เงินสด">เงินสด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เจ้าหน้าที่ผู้ทำรายการ *</label>
                  <input 
                    type="text" 
                    required 
                    value={bulkPayReceiver}
                    onChange={(e) => setBulkPayReceiver(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">บันทึกความจำ / หมายเหตุชำระเงิน</label>
                <input 
                  type="text" 
                  value={bulkPayNote}
                  onChange={(e) => setBulkPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-700"
                  placeholder="เช่น ชำระกลุ่มพร้อมกันผ่านแอปธนาคาร"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setBulkPaymentModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  ยืนยันบันทึกยอดชำระ {selectedUnpaidRooms.length} ห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Added Items Manage Modal (Manage extra expenses directly from bills) */}
      {addedItemsModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {editingItem ? "✏️ แก้ไขรายจ่ายเสริมอื่นๆ" : "⚙️ จัดการรายจ่ายเสริมอื่นๆ"}: ห้อง {addedItemsModalRoom.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">รอบบริการทางการเงินประจำเดือน: {month}</p>
              </div>
              <button 
                onClick={() => setAddedItemsModalRoom(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form to add or edit item */}
              <form onSubmit={handleAddAddedItem} className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                editingItem ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-150"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700">
                    {editingItem ? "กำลังแก้ไขข้อมูล:" : "เพิ่มรายการใหม่:"}
                  </span>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={handleCancelEditAddedItem}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                    >
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>
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
                <div className="flex space-x-2">
                  <button 
                    type="submit" 
                    className={`w-full py-2 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm ${
                      editingItem 
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/10" 
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                    }`}
                  >
                    {editingItem ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกการแก้ไข</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>เพิ่มบันทึกรายจ่ายเสริม</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Added item rows table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-4 py-2 text-[10px]">ชื่อรายจ่าย</th>
                      <th className="px-4 py-2 text-[10px]">ราคา</th>
                      <th className="px-4 py-2 text-[10px]">หมายเหตุ</th>
                      <th className="px-4 py-2 text-center text-[10px] w-20">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs">
                          ยังไม่มีค่าบริการเสริมใดๆ ในเดือนนี้
                        </td>
                      </tr>
                    ) : (
                      addedItems.map(it => {
                        const isEditingThis = editingItem?.id === it.id;
                        return (
                          <tr key={it.id} className={`border-b border-slate-100 text-xs transition-colors ${
                            isEditingThis ? "bg-amber-50/50" : "text-slate-700 hover:bg-slate-50/50"
                          }`}>
                            <td className="px-4 py-2.5 font-bold">
                              {isEditingThis && <span className="text-amber-600 mr-1">●</span>}
                              {it.name}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-blue-600">{formatCurrency(it.amount)}</td>
                            <td className="px-4 py-2.5 text-slate-400 truncate max-w-[100px]">{it.note || "-"}</td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button 
                                  type="button"
                                  onClick={() => handleStartEditAddedItem(it)}
                                  className={`p-1 rounded-md transition-all cursor-pointer ${
                                    isEditingThis 
                                      ? "bg-amber-100 text-amber-700" 
                                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                  }`}
                                  title="แก้ไข"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteAddedItem(it.id)}
                                  className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                <span>รวมรายจ่ายเสริมสะสมเดือนนี้:</span>
                <span className="text-sm text-blue-600">
                  {formatCurrency(addedItems.reduce((sum, item) => sum + item.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
