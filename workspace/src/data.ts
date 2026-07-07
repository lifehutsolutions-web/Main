/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, PaymentStage, ExtraWork, Expense, DailyProgress, ProjectDocument, ChatMessage } from './types';

// Predefined Demo Projects
const initialProjects: Project[] = [
  {
    id: 'proj_green_villa',
    name: 'Green Villa',
    clientName: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@gmail.com',
    address: 'Sector 4, HSR Layout, Bengaluru, Karnataka',
    type: 'Residential',
    contractValue: 4133900,
    startDate: '2026-03-01',
    expectedEndDate: '2026-11-30',
    status: 'Active',
    clientCode: 'CLIENT-GREEN',
    isLocked: true, // Stage 1 is paid, so it is locked by default
    contractorName: 'Lifehut Workspace',
    contractorPhone: '+91 99911 22334',
    contractorEmail: 'hello@lifehut.in',
  },
  {
    id: 'proj_skyline_renovation',
    name: 'Apex Commercial Cabin',
    clientName: 'Sanjay Kapoor',
    phone: '+91 91234 56789',
    email: 'sanjay@apexcorp.com',
    address: '8th Floor, MG Road, Bengaluru',
    type: 'Commercial',
    contractValue: 1850000,
    startDate: '2026-05-15',
    expectedEndDate: '2026-08-31',
    status: 'Active',
    clientCode: 'CLIENT-APEX',
    isLocked: false, // Not locked yet as Advance payment is pending/not paid!
    contractorName: 'Lifehut Workspace',
    contractorPhone: '+91 99911 22334',
    contractorEmail: 'hello@lifehut.in',
  }
];

const initialStages: PaymentStage[] = [
  // Green Villa Stages (Sum = 41,33,900)
  {
    id: 'stage_gv_1',
    projectId: 'proj_green_villa',
    stageName: 'Advance',
    payableAmount: 500000,
    receivedAmount: 500000,
    dueDate: '2026-03-05',
    status: 'Paid',
  },
  {
    id: 'stage_gv_2',
    projectId: 'proj_green_villa',
    stageName: 'Basement Completion',
    payableAmount: 300000,
    receivedAmount: 300000,
    dueDate: '2026-04-10',
    status: 'Paid',
  },
  {
    id: 'stage_gv_3',
    projectId: 'proj_green_villa',
    stageName: 'Lintel Shuttering GF',
    payableAmount: 200000,
    receivedAmount: 200000,
    dueDate: '2026-05-15',
    status: 'Paid',
  },
  {
    id: 'stage_gv_4',
    projectId: 'proj_green_villa',
    stageName: 'Roof Shuttering GF',
    payableAmount: 300000,
    receivedAmount: 0,
    dueDate: '2026-07-15',
    status: 'Pending',
  },
  {
    id: 'stage_gv_5',
    projectId: 'proj_green_villa',
    stageName: 'Brickwork GF',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-08-01',
    status: 'Pending',
  },
  {
    id: 'stage_gv_6',
    projectId: 'proj_green_villa',
    stageName: 'Slab Casting FF',
    payableAmount: 600000,
    receivedAmount: 0,
    dueDate: '2026-08-25',
    status: 'Pending',
  },
  {
    id: 'stage_gv_7',
    projectId: 'proj_green_villa',
    stageName: 'Plastering Inner & Outer',
    payableAmount: 500000,
    receivedAmount: 0,
    dueDate: '2026-09-20',
    status: 'Pending',
  },
  {
    id: 'stage_gv_8',
    projectId: 'proj_green_villa',
    stageName: 'Plumbing & Electrical Piping',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-10-10',
    status: 'Pending',
  },
  {
    id: 'stage_gv_9',
    projectId: 'proj_green_villa',
    stageName: 'Flooring & Tiles',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-11-01',
    status: 'Pending',
  },
  {
    id: 'stage_gv_10',
    projectId: 'proj_green_villa',
    stageName: 'Painting & Interior Finishing',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-11-15',
    status: 'Pending',
  },
  {
    id: 'stage_gv_11',
    projectId: 'proj_green_villa',
    stageName: 'Final Handover',
    payableAmount: 133900,
    receivedAmount: 0,
    dueDate: '2026-11-30',
    status: 'Pending',
  },

  // Apex Cabin Stages (Sum = 18,50,000)
  {
    id: 'stage_ap_1',
    projectId: 'proj_skyline_renovation',
    stageName: 'Advance Booking',
    payableAmount: 350000,
    receivedAmount: 0,
    dueDate: '2026-05-18',
    status: 'Pending',
  },
  {
    id: 'stage_ap_2',
    projectId: 'proj_skyline_renovation',
    stageName: 'Demolition & Partition Framing',
    payableAmount: 500000,
    receivedAmount: 0,
    dueDate: '2026-06-15',
    status: 'Pending',
  },
  {
    id: 'stage_ap_3',
    projectId: 'proj_skyline_renovation',
    stageName: 'Electrical Laying & AC Ducting',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-07-10',
    status: 'Pending',
  },
  {
    id: 'stage_ap_4',
    projectId: 'proj_skyline_renovation',
    stageName: 'Glass Paneling & Fixtures',
    payableAmount: 400000,
    receivedAmount: 0,
    dueDate: '2026-08-10',
    status: 'Pending',
  },
  {
    id: 'stage_ap_5',
    projectId: 'proj_skyline_renovation',
    stageName: 'Handover & Signoff',
    payableAmount: 200000,
    receivedAmount: 0,
    dueDate: '2026-08-30',
    status: 'Pending',
  }
];

const initialExtraWorks: ExtraWork[] = [
  {
    id: 'ew_1',
    projectId: 'proj_green_villa',
    description: 'Add Compound Wall (60ft Running Area with Gate design)',
    amount: 150000,
    date: '2026-05-20',
    approvalStatus: 'Approved',
    clientComment: 'Approved, please start construction alongside slab work.',
    photos: []
  },
  {
    id: 'ew_2',
    projectId: 'proj_green_villa',
    description: 'Underground Water Sump Tank Upgrade (+5,000 Litre Sump Size)',
    amount: 75000,
    date: '2026-06-10',
    approvalStatus: 'Pending',
    photos: []
  }
];

const initialExpenses: Expense[] = [
  {
    id: 'exp_1',
    projectId: 'proj_green_villa',
    category: 'Material',
    description: 'Cement Purchase - Ultratech premium 250 bags',
    amount: 112500,
    supplier: 'ABC Cement Traders, Bengaluru',
    date: '2026-03-12',
    billUploaded: true,
  },
  {
    id: 'exp_2',
    projectId: 'proj_green_villa',
    category: 'Labour',
    description: 'Foundation Excavation & Brick laying wages week-1',
    amount: 85000,
    supplier: 'Mahesh Contractor (Labour Union)',
    date: '2026-03-20',
    billUploaded: false,
  },
  {
    id: 'exp_3',
    projectId: 'proj_green_villa',
    category: 'Material',
    description: 'Fe 550 TMT Steel Bars - 3 Tonnes',
    amount: 195000,
    supplier: 'Steel Mart India',
    date: '2026-04-05',
    billUploaded: true,
  },
  {
    id: 'exp_4',
    projectId: 'proj_green_villa',
    category: 'Machinery',
    description: 'Excavator Rental (JCB - 5 Days with Driver and fuel)',
    amount: 45000,
    supplier: 'Rao Machinery Rentals',
    date: '2026-04-12',
    billUploaded: true,
  },
  {
    id: 'exp_5',
    projectId: 'proj_green_villa',
    category: 'Plumbing',
    description: 'Inflow-Outflow conduits and water main layout',
    amount: 32000,
    supplier: 'Supreme Pipes Depot',
    date: '2026-05-02',
    billUploaded: true,
  }
];

const initialProgress: DailyProgress[] = [
  {
    id: 'prog_1',
    projectId: 'proj_green_villa',
    remarks: 'Excavation completed. Ready for footing construction.',
    photos: ['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop'],
    date: '2026-03-08',
    timestamp: '2026-03-08T18:00:00Z',
  },
  {
    id: 'prog_2',
    projectId: 'proj_green_villa',
    remarks: 'Basement brickwork and sand-filling completed.',
    photos: ['https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop'],
    date: '2026-04-08',
    timestamp: '2026-04-08T17:30:00Z',
  },
  {
    id: 'prog_3',
    projectId: 'proj_green_villa',
    remarks: 'Completed Columns casting Ground Floor. Ready for roof beams setup.',
    photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop'],
    date: '2026-06-18',
    timestamp: '2026-06-18T16:45:00Z',
  }
];

const initialDocuments: ProjectDocument[] = [
  {
    id: 'doc_1',
    projectId: 'proj_green_villa',
    name: 'Signed_Construction_Agreement_Green_Villa.pdf',
    type: 'Agreement',
    fileSize: '4.8 MB',
    date: '2026-03-01',
    url: '#'
  },
  {
    id: 'doc_2',
    projectId: 'proj_green_villa',
    name: 'BOQ_Estimate_Green_Villa_v2.xlsx',
    type: 'BOQ',
    fileSize: '1.2 MB',
    date: '2026-03-03',
    url: '#'
  },
  {
    id: 'doc_3',
    projectId: 'proj_green_villa',
    name: 'Architectural_Floor_Plan_GF_FF.pdf',
    type: 'Drawing',
    fileSize: '18.4 MB',
    date: '2026-03-05',
    url: '#'
  }
];

const initialMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    projectId: 'proj_green_villa',
    sender: 'Client',
    text: 'Hello Team, when can we expect the concrete casting for GF roof slab?',
    timestamp: '2026-06-18T10:00:00Z'
  },
  {
    id: 'msg_2',
    projectId: 'proj_green_villa',
    sender: 'Contractor',
    text: 'Hi Rahul! The column casting is fully completed today. Shuttering guys will finalize tomorrow, so roof casting will happen on Saturday.',
    timestamp: '2026-06-18T10:15:00Z'
  },
  {
    id: 'msg_3',
    projectId: 'proj_green_villa',
    sender: 'Client',
    text: 'Perfect. I received the daily site photos. Looking very solid!',
    timestamp: '2026-06-18T10:30:00Z'
  }
];

// LocalStorage Keys
const KEYS = {
  PROJECTS: 'const_proj_projects',
  STAGES: 'const_proj_stages',
  EXTRA_WORKS: 'const_proj_extra_works',
  EXPENSES: 'const_proj_expenses',
  PROGRESS: 'const_proj_progress',
  DOCUMENTS: 'const_proj_documents',
  MESSAGES: 'const_proj_messages',
};

// Initialize localStorage if empty
export function initDB() {
  if (!localStorage.getItem(KEYS.PROJECTS)) {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(initialProjects));
    localStorage.setItem(KEYS.STAGES, JSON.stringify(initialStages));
    localStorage.setItem(KEYS.EXTRA_WORKS, JSON.stringify(initialExtraWorks));
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(initialExpenses));
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(initialProgress));
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(initialDocuments));
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(initialMessages));
  }
}

// Getters & Setters
export function getData<T>(key: string, defaults: T[]): T[] {
  initDB();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaults;
}

export function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Full DB controls for the developer module
export function fetchAll() {
  initDB();
  return {
    projects: getData<Project>(KEYS.PROJECTS, initialProjects),
    stages: getData<PaymentStage>(KEYS.STAGES, initialStages),
    extraWorks: getData<ExtraWork>(KEYS.EXTRA_WORKS, initialExtraWorks),
    expenses: getData<Expense>(KEYS.EXPENSES, initialExpenses),
    progress: getData<DailyProgress>(KEYS.PROGRESS, initialProgress),
    documents: getData<ProjectDocument>(KEYS.DOCUMENTS, initialDocuments),
    messages: getData<ChatMessage>(KEYS.MESSAGES, initialMessages),
  };
}

export function saveAll(db: {
  projects: Project[];
  stages: PaymentStage[];
  extraWorks: ExtraWork[];
  expenses: Expense[];
  progress: DailyProgress[];
  documents: ProjectDocument[];
  messages: ChatMessage[];
}) {
  saveData(KEYS.PROJECTS, db.projects);
  saveData(KEYS.STAGES, db.stages);
  saveData(KEYS.EXTRA_WORKS, db.extraWorks);
  saveData(KEYS.EXPENSES, db.expenses);
  saveData(KEYS.PROGRESS, db.progress);
  saveData(KEYS.DOCUMENTS, db.documents);
  saveData(KEYS.MESSAGES, db.messages);
}

export function resetDB() {
  localStorage.removeItem(KEYS.PROJECTS);
  localStorage.removeItem(KEYS.STAGES);
  localStorage.removeItem(KEYS.EXTRA_WORKS);
  localStorage.removeItem(KEYS.EXPENSES);
  localStorage.removeItem(KEYS.PROGRESS);
  localStorage.removeItem(KEYS.DOCUMENTS);
  localStorage.removeItem(KEYS.MESSAGES);
  initDB();
}

export { KEYS };
