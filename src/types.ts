/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Room {
  id: string;
  name: string;
  rent: number;
  minWater: number;
  minElec: number;
  payMethod: "เงินสด" | "โอนธนาคาร";
  bankId: string;
  note: string;
}

export interface Tenant {
  roomId: string; // 1-to-1 with Room
  name: string;
  phone: string;
  startDate: string; // YYYY-MM-DD
  startWater: number;
  startElec: number;
  status: "ใช้งาน" | "ยกเลิกสัญญา";
}

export interface MeterReading {
  meterId: string; // M{roomId}-{YYYYMM}
  roomId: string;
  month: string; // YYYY-MM
  prevWater: number;
  currWater: number;
  prevElec: number;
  currElec: number;
  note: string; // Required if prev readings are changed
  recordedBy: string;
  recordedDate: string; // YYYY-MM-DD HH:mm:ss
}

export interface AddedItem {
  id: string; // ADD{timestamp}
  roomId: string;
  month: string; // YYYY-MM
  name: string;
  amount: number;
  note: string;
}

export interface Bill {
  billId: string; // B{roomId}-{YYYYMM}
  roomId: string;
  roomName?: string;
  tenantName?: string;
  month: string; // YYYY-MM
  waterUnits: number;
  waterCost: number;
  elecUnits: number;
  elecCost: number;
  rentCost: number;
  addedCost: number;
  prevUnpaid: number;
  total: number;
  paid: number;
  balance: number;
  status: "ค้างชำระ" | "ชำระบางส่วน" | "ชำระแล้ว";
  createdDate: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  footerNote: string;
}

export interface PaymentRecord {
  payId: string; // P{timestamp}
  billId: string;
  date: string;
  amount: number;
  method: "เงินสด" | "โอนธนาคาร";
  receiver: string;
  note: string;
}

export interface Admin {
  id: string;
  username: string;
  pin: string;
}

export interface UtilityRate {
  id: string;             // RATE{timestamp}
  waterRate: number;      // e.g., 25
  elecRate: number;       // e.g., 9
  startMonth: string;     // YYYY-MM
  createdDate: string;
}

export interface BillAnnouncement {
  id: string;             // ANNC{timestamp}
  message: string;        // Text message
  startMonth: string;     // YYYY-MM
  endMonth: string;       // YYYY-MM
  createdDate: string;
}

export interface OwnerInfo {
  name: string;
  phone: string;
}

