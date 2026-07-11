/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, X } from "lucide-react";
import { BankAccount } from "../types";

interface BanksProps {
  banks: BankAccount[];
  onSave: (bank: BankAccount) => void;
  onDelete: (id: string) => void;
}

export default function Banks({ banks, onSave, onDelete }: BanksProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBank, setCurrentBank] = useState<BankAccount | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [footerNote, setFooterNote] = useState("");

  const handleOpenAdd = () => {
    setCurrentBank(null);
    setBankName("ธนาคารกสิกรไทย");
    setAccountNumber("");
    setAccountName("");
    setFooterNote("โปรดชำระเงินไม่เกินวันที่ 5 ของรอบเดือน ขอบคุณค่ะ");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bank: BankAccount) => {
    setCurrentBank(bank);
    setBankName(bank.bankName);
    setAccountNumber(bank.accountNumber);
    setAccountName(bank.accountName);
    setFooterNote(bank.footerNote);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) return;

    onSave({
      id: currentBank?.id || "",
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      footerNote: footerNote.trim()
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-slate-500 text-sm font-medium">
          ตั้งค่าสถาบันการเงินและบัญชีสำหรับใช้แนะนำช่องทางการชำระโอนและพิมพ์แสดงล่างบิลใบแจ้งหนี้
        </span>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสัญญารับโอน</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-b border-slate-100">
                <th className="px-6 py-4">ธนาคาร</th>
                <th className="px-6 py-4">หมายเลขบัญชี</th>
                <th className="px-6 py-4">ชื่อบัญชีรับโอนเงิน</th>
                <th className="px-6 py-4">ข้อกำหนด/หมายเหตุส่วนล่างบิล</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    ยังไม่มีการเพิ่มบัญชีปลายทางใด ๆ
                  </td>
                </tr>
              ) : (
                banks.map(b => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{b.bankName}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{b.accountNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-600">{b.accountName}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-sm truncate">
                      {b.footerNote || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button 
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                          title="ลบบัญชี"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800">
                {currentBank ? "แก้ไขบัญชีรับเงิน" : "เพิ่มบัญชีรับเงินใหม่"}
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
                <label className="block text-xs font-semibold text-slate-500 mb-1">สถาบันการเงิน / ธนาคาร *</label>
                <input 
                  type="text" 
                  required 
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-semibold"
                  placeholder="เช่น ธนาคารกสิกรไทย"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">เลขที่บัญชีรับเงิน *</label>
                  <input 
                    type="text" 
                    required 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-mono"
                    placeholder="เช่น 123-4-56789-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อบัญชีเจ้าของหอพัก *</label>
                  <input 
                    type="text" 
                    required 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 font-semibold"
                    placeholder="เช่น น.ส.พิมพ์ชนก มหาลาภ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ข้อความกำหนด / หมายเหตุท้ายบิลใบเสร็จ</label>
                <textarea 
                  rows={3}
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-700"
                  placeholder="เช่น กรุณาชำระเงินภายในวันที่กำหนดเพื่อหลีกเลี่ยงค่าปรับล่าช้าวันละ 50 บาท"
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
                  บันทึกบัญชีเงินฝาก
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
              <h4 className="text-base font-bold">ยืนยันลบบัญชี?</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ต้องการลบข้อมูลบัญชีธนาคารนี้หรือไม่? ห้องพักที่ใช้ช่องทางผูกแนะนำเลขบัญชีนี้จะไม่ได้รับการดึงรายละเอียดโชว์ท้ายบิลน้ำ-ไฟโดยอัตโนมัติ
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
                ยืนยันลบบัญชี
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
