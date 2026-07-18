/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  name: string;
  clientName: string;
  phone: string;
  email?: string;
  address: string;
  type: 'Residential' | 'Commercial' | 'Renovation';
  contractValue: number;
  startDate: string;
  expectedEndDate: string;
  status: 'Active' | 'Hold' | 'Completed';
  clientCode: string; // Login credential
  isLocked: boolean; // Stage locking
  memberUids?: string[];
  contractorUid?: string;
  contractorName?: string;
  contractorPhone?: string;
  contractorEmail?: string;
}

export interface PaymentLogEntry {
  id: string;
  amount: number;
  date: string;
  reference?: string;
}

export interface PaymentStage {
  id: string;
  projectId: string;
  stageName: string;
  payableAmount: number;
  receivedAmount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentRequested?: boolean; // Payment request sent by contractor
  paymentRequestedDate?: string;
  paymentLog?: PaymentLogEntry[];
}

export interface ExtraWork {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  date: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Revision Requested';
  clientComment?: string;
  photos: string[]; // Base64 or mock layout static placeholders
}

export interface Expense {
  id: string;
  projectId: string;
  category: 'Material' | 'Labour' | 'Machinery' | 'Transport' | 'Electrical' | 'Plumbing' | 'Miscellaneous';
  description: string;
  amount: number;
  supplier: string;
  date: string;
  billUploaded: boolean;
  isPaid?: boolean;
  paidAmount?: number;
}

export interface DailyProgress {
  id: string;
  projectId: string;
  remarks: string;
  photos: string[]; // Base64 or mock
  videoUrl?: string;
  date: string;
  timestamp: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: 'Agreement' | 'Quotation' | 'BOQ' | 'Drawing' | 'Bill' | 'Approval';
  fileSize: string;
  date: string;
  url: string; // Mock or downloadable action
}

export interface ChatMessage {
  id: string;
  projectId: string;
  sender: 'Contractor' | 'Client';
  text: string;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string;
}

export type PlanType = 'Starter' | 'Pro' | 'Business' | 'Enterprise';

export interface Subscription {
  plan: PlanType;
  status: 'trial' | 'active' | 'expired' | 'free_partner';
  expiresAt: string; // ISO String
  trialStartedAt?: string; // ISO String
  activatedAt?: string; // ISO String
  promoCodeUsed?: string;
  razorpayPaymentId?: string;
}