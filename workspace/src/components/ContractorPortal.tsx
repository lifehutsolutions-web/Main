import React, { useState } from 'react';
import TodaySummary from './dashboard/TodaySummary';
import RecentActivity from './dashboard/RecentActivity';
import { uploadImage } from '../services/storageService';
import { Project, PaymentStage, ExtraWork, Expense, DailyProgress, ProjectDocument, ChatMessage } from '../types';
import ChatComponent from './ChatComponent';
import PaymentStatementSheet, { formatIndianNoCurrency } from './PaymentStatementSheet';
import { useAuth } from '../context/AuthContext';
import SettingsPage from './SettingsPage';
import * as XLSX from 'xlsx';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Image as ImageIcon,
  DollarSign, 
  HardHat, 
  Layers, 
  TrendingUp, 
  Trash2, 
  Lock, 
  Unlock,
  Share2,
  ListFilter,
  Check,
  Percent,
  MessageSquare,
  FileSpreadsheet,
  Camera,
  FolderOpen,
  LayoutGrid,
  BarChart3,
  MoreHorizontal,
  Pencil,
  Bell,
  Settings,
  Download,
  Upload
} from 'lucide-react';

interface ContractorPortalProps {
  projects: Project[];
  stages: PaymentStage[];
  extraWorks: ExtraWork[];
  expenses: Expense[];
  progress: DailyProgress[];
  documents: ProjectDocument[];
  messages: ChatMessage[];
  onUpdateProjects: (newProj: Project[]) => void;
  onUpdateStages: (newStages: PaymentStage[]) => void;
  onUpdateExtraWorks: (newExtra: ExtraWork[]) => void;
  onUpdateExpenses: (newExp: Expense[]) => void;
  onUpdateProgress: (newProg: DailyProgress[]) => void;
  onUpdateDocuments: (newDocs: ProjectDocument[]) => void;
  onSendMessage: (text: string, attachment?: { name: string; type: string; data: string }) => void;
  selectedProjId: string;
  onSelectProject: (id: string) => void;
  ownerName?: string;
}

// Compresses an image file in the browser and returns a base64 data URL.
// Keeps files well under Firestore's 1MB document limit.
function compressImageToBase64(file: File, maxWidth = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ContractorPortal({
  projects,
  stages,
  extraWorks,
  expenses,
  progress,
  documents,
  messages,
  onUpdateProjects,
  onUpdateStages,
  onUpdateExtraWorks,
  onUpdateExpenses,
  onUpdateProgress,
  onUpdateDocuments,
  onSendMessage,
  selectedProjId,
  onSelectProject,
  ownerName
}: ContractorPortalProps) {
  const { user, userProfile, permissionGuard } = useAuth();
  const displayOwnerName = ownerName || userProfile?.ownerName || user?.displayName || user?.email?.split('@')[0] || 'Contractor';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'milestones' | 'expenses' | 'extraworks' | 'progress' | 'documents' | 'chat' | 'reports' | 'settings'>('dashboard');

  // Projects tab sub-view
  const [projectsSubTab, setProjectsSubTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [completedDetailId, setCompletedDetailId] = useState<string | null>(null);

  // Modal open flags
  const [showProjModal, setShowProjModal] = useState(false);
  const [showEditProjModal, setShowEditProjModal] = useState(false);
  const [editProjId, setEditProjId] = useState<string | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  // New item form states
  const [newProj, setNewProj] = useState({
    name: '',
    clientName: '',
    phone: '',
    email: '',
    address: '',
    type: 'Residential' as const,
    contractValue: 1500000,
    startDate: '',
    expectedEndDate: '',
  });

  // Edit project form state (separate from create form)
  const [editProj, setEditProj] = useState({
    name: '',
    clientName: '',
    phone: '',
    email: '',
    address: '',
    type: 'Residential' as 'Residential' | 'Commercial' | 'Renovation',
    contractValue: 0,
    startDate: '',
    expectedEndDate: '',
    status: 'Active' as 'Active' | 'Hold' | 'Completed',
  });

  // Multiple entry state for custom stages (Request 3)
  const [newStagesList, setNewStagesList] = useState<{ stageName: string; payableAmount: number; dueDate: string }[]>([
    { stageName: '', payableAmount: 100000, dueDate: '' }
  ]);

  const [newExtra, setNewExtra] = useState({
    description: '',
    amount: 50000,
    date: '',
  });

  const [newExpense, setNewExpense] = useState({
    category: 'Material' as const,
    description: '',
    amount: 25000,
    supplier: '',
    date: '',
    billUploaded: false,
    projectId: '',
  });

  const [newProg, setNewProg] = useState({
    remarks: '',
    videoUrl: '',
    date: '',
  });
  const [progPhotoFiles, setProgPhotoFiles] = useState<File[]>([]);
  const [progPhotoPreviews, setProgPhotoPreviews] = useState<string[]>([]);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);

  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'Quotation' as const,
  });

  const [editingStage, setEditingStage] = useState<PaymentStage | null>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Filtering states
  const [filterProject, setFilterProject] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  // Lightbox for viewing a progress photo full-size
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Show/hide completed projects in sidebar + overview
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);

  // Report Manager custom search & filter states
  const [reportSearch, setReportSearch] = useState('');
  const [reportProjectFilter, setReportProjectFilter] = useState('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'milestone' | 'extrawork' | 'expense'>('all');
  

  // Overview date range filter
  type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all';
  const [overviewPreset, setOverviewPreset] = useState<DatePreset>('all');
  const [overviewCustomFrom, setOverviewCustomFrom] = useState('');
  const [overviewCustomTo, setOverviewCustomTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Completed Project Credential Share notification
  const [createdClientShareDetails, setCreatedClientShareDetails] = useState<any>(null);

  // Active highlighted project 
  const activeProj = projects.find(p => p.id === selectedProjId) || projects[0];

  // Group items by selected active project
  const activeStages = stages.filter(s => s.projectId === selectedProjId);
  const activeExtraWorks = extraWorks.filter(e => e.projectId === selectedProjId);
  const activeExpenses = expenses.filter(ex => {
    if (filterProject === 'all') return true;
    return ex.projectId === filterProject;
  });
  const activeProgress = progress.filter(p => p.projectId === selectedProjId);
  const activeDocs = documents.filter(d => d.projectId === selectedProjId);

  // Handlers
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `proj_${Date.now()}`;
    const code = `CLIENT-${newProj.name.replace(/\s+/g, '').toUpperCase().slice(0, 5)}-${Math.floor(100 + Math.random() * 900)}`;
    const freshProject: Project = {
      ...newProj,
      id,
      status: 'Active',
      clientCode: code,
      isLocked: false,
      contractorUid: user?.uid
    };

    onUpdateProjects([...projects, freshProject]);
    setShowProjModal(false);

    // Setup basic template stages automatically for convenience (Advance, Footing, Lintel, Roof, Handover)
    const baseValue = Number(newProj.contractValue);
    const autoStages: PaymentStage[] = [
      {
        id: `stg_${Date.now()}_1`,
        projectId: id,
        stageName: 'Advance Fee',
        payableAmount: Math.round(baseValue * 0.15),
        receivedAmount: 0,
        dueDate: newProj.startDate || '2026-07-01',
        status: 'Pending',
      },
      {
        id: `stg_${Date.now()}_2`,
        projectId: id,
        stageName: 'Foundation/Footing Casting',
        payableAmount: Math.round(baseValue * 0.25),
        receivedAmount: 0,
        dueDate: '2026-08-15',
        status: 'Pending',
      },
      {
        id: `stg_${Date.now()}_3`,
        projectId: id,
        stageName: 'Structural Pillars GF',
        payableAmount: Math.round(baseValue * 0.20),
        receivedAmount: 0,
        dueDate: '2026-09-30',
        status: 'Pending',
      },
      {
        id: `stg_${Date.now()}_4`,
        projectId: id,
        stageName: 'Roof Slab GF Complete',
        payableAmount: Math.round(baseValue * 0.20),
        receivedAmount: 0,
        dueDate: '2026-10-31',
        status: 'Pending',
      },
      {
        id: `stg_${Date.now()}_5`,
        projectId: id,
        stageName: 'Plaster & Brick Finishing',
        payableAmount: Math.round(baseValue * 0.10),
        receivedAmount: 0,
        dueDate: '2026-11-30',
        status: 'Pending',
      },
      {
        id: `stg_${Date.now()}_6`,
        projectId: id,
        stageName: 'Project Handover & Signoff',
        payableAmount: baseValue - (Math.round(baseValue * 0.15) + Math.round(baseValue * 0.25) + Math.round(baseValue * 0.20) + Math.round(baseValue * 0.20) + Math.round(baseValue * 0.10)),
        receivedAmount: 0,
        dueDate: newProj.expectedEndDate || '2026-12-31',
        status: 'Pending',
      }
    ];

    onUpdateStages([...stages, ...autoStages]);
    onSelectProject(id);

    // Prompt for client logins sharing details
    setCreatedClientShareDetails({
      clientName: newProj.clientName,
      phone: newProj.phone,
      email: newProj.email,
      projName: newProj.name,
      code: code
    });

    // Reset state
    setNewProj({
      name: '',
      clientName: '',
      phone: '',
      email: '',
      address: '',
      type: 'Residential',
      contractValue: 1500000,
      startDate: '',
      expectedEndDate: '',
    });
  };

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptStageId, setReceiptStageId] = useState<string | null>(null);
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [receiptDate, setReceiptDate] = useState('');

  const handleOpenReceipt = (stg: PaymentStage) => {
    setReceiptStageId(stg.id);
    setReceiptAmount(stg.payableAmount - stg.receivedAmount);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setShowReceiptModal(true);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptStageId) return;
    const updated = stages.map(s => {
      if (s.id !== receiptStageId) return s;
      const newReceived = s.receivedAmount + Number(receiptAmount);
      const isPaid = newReceived >= s.payableAmount;
      return {
        ...s,
        receivedAmount: newReceived,
        status: isPaid ? 'Paid' as const : 'Pending' as const,
      };
    });
    onUpdateStages(updated);
    // Auto-lock if advance stage is now paid
    const stg = stages.find(s => s.id === receiptStageId);
    if (stg?.stageName.toLowerCase().includes('advance')) {
      onUpdateProjects(projects.map(p => p.id === selectedProjId ? { ...p, isLocked: true } : p));
    }
    setShowReceiptModal(false);
    setReceiptStageId(null);
  };
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const handleOpenEditExpense = (exp: Expense) => {
    setEditExpense({ ...exp });
    setShowEditExpenseModal(true);
  };

  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense) return;
    onUpdateExpenses(expenses.map(ex => ex.id === editExpense.id ? editExpense : ex));
    setShowEditExpenseModal(false);
    setEditExpense(null);
  };

  const handleDeleteExpense = (expId: string) => {
    if (confirm('Delete this expense entry?')) {
      onUpdateExpenses(expenses.filter(ex => ex.id !== expId));
    }
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditProjId(proj.id);
    setEditProj({
      name: proj.name,
      clientName: proj.clientName,
      phone: proj.phone,
      email: proj.email || '',
      address: proj.address,
      type: proj.type,
      contractValue: proj.contractValue,
      startDate: proj.startDate,
      expectedEndDate: proj.expectedEndDate,
      status: proj.status,
    });
    setShowEditProjModal(true);
  };

  // Save edited project (does not touch clientCode, isLocked, or stages)
  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjId) return;
    const { email, ...restEditProj } = editProj;
    const updated = projects.map(p => {
      if (p.id !== editProjId) return p;
      const merged: Project = { ...p, ...restEditProj };
      if (email) {
        merged.email = email;
      } else {
        delete merged.email;
      }
      return merged;
    });
    onUpdateProjects(updated);
    setShowEditProjModal(false);
    setEditProjId(null);
  };

  // Add Row to dynamically structured stages array (Request 3)
  const handleAddStageRow = () => {
    setNewStagesList([...newStagesList, { stageName: '', payableAmount: 100000, dueDate: '' }]);
  };

  const handleRemoveStageRow = (index: number) => {
    if (newStagesList.length === 1) return;
    setNewStagesList(newStagesList.filter((_, i) => i !== index));
  };

  const handleUpdateStageRow = (index: number, key: string, val: any) => {
    setNewStagesList(newStagesList.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  // Multi Entry Submission Handler (Request 3)
  const handleAddMultiplePaymentStages = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId) return;

    if (activeProj?.isLocked) {
      alert("❌ Locked! Cannot add custom payment stages after the Advance Payment stage has been marked PAID.");
      return;
    }

    if (newStagesList.some(s => !s.stageName.trim())) {
      alert("❌ All payment stages must have names specified.");
      return;
    }

    const compiledStages: PaymentStage[] = newStagesList.map((item, idx) => ({
      id: `stg_${Date.now()}_custom_${idx}`,
      projectId: selectedProjId,
      stageName: item.stageName.trim(),
      payableAmount: Number(item.payableAmount) || 0,
      receivedAmount: 0,
      dueDate: item.dueDate || '', // Request 1: optional / TBD holds blank string
      status: 'Pending',
    }));

    onUpdateStages([...stages, ...compiledStages]);
    setShowStageModal(false);
    
    // Reset stages state back to 1 row
    setNewStagesList([{ stageName: '', payableAmount: 100000, dueDate: '' }]);
  };

  const handleAddExtraWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId) return;

    const work: ExtraWork = {
      id: `ew_${Date.now()}`,
      projectId: selectedProjId,
      description: newExtra.description,
      amount: Number(newExtra.amount),
      date: newExtra.date || new Date().toISOString().split('T')[0],
      approvalStatus: 'Pending',
      photos: [],
    };

    onUpdateExtraWorks([...extraWorks, work]);
    setShowExtraModal(false);
    setNewExtra({
      description: '',
      amount: 50000,
      date: '',
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = newExpense.projectId || selectedProjId;
    if (!targetProjId) return;

    const exp: Expense = {
      id: `exp_${Date.now()}`,
      projectId: targetProjId,
      category: newExpense.category,
      description: newExpense.description,
      amount: Number(newExpense.amount),
      supplier: newExpense.supplier || 'N/A',
      date: newExpense.date || new Date().toISOString().split('T')[0],
      billUploaded: newExpense.billUploaded,
    };

    onUpdateExpenses([...expenses, exp]);
    setShowExpenseModal(false);
    setNewExpense({
      category: 'Material',
      description: '',
      amount: 25000,
      supplier: '',
      date: '',
      billUploaded: false,
      projectId: '',
    });
  };

  const handleProgressFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files).slice(0, 6); // cap at 6 photos per update
    setProgPhotoFiles(fileArr);
    setProgPhotoPreviews(fileArr.map(f => URL.createObjectURL(f)));
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId) return;

    setIsCompressingPhotos(true);
let finalPhotos: string[] = [];

try {
  finalPhotos = await Promise.all(
    progPhotoFiles.map(file => uploadImage(file, 'progress'))
  );
} catch (err) {
  console.error(err);
  alert('Photo upload failed. Please try again.');
  setIsCompressingPhotos(false);
  return;
}

setIsCompressingPhotos(false);

    const progItem: DailyProgress = {
      id: `prog_${Date.now()}`,
      projectId: selectedProjId,
      remarks: newProg.remarks,
      photos: finalPhotos,
      date: newProg.date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
    };
    if (newProg.videoUrl) {
      progItem.videoUrl = newProg.videoUrl;
    }

    onUpdateProgress([...progress, progItem]);
    setShowProgressModal(false);
    setNewProg({
      remarks: '',
      videoUrl: '',
      date: '',
    });
    setProgPhotoFiles([]);
    setProgPhotoPreviews([]);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId) return;
    if (!selectedDocFile) {
      alert("❌ Please select a document file to upload.");
      return;
    }

    setIsUploadingDoc(true);
    try {
      // Upload the file to Supabase Storage
      const fileUrl = await uploadImage(selectedDocFile, 'documents');
      
      const fileSize = selectedDocFile.size > 1024 * 1024
        ? `${(selectedDocFile.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(selectedDocFile.size / 1024).toFixed(0)} KB`;

      const originalName = selectedDocFile.name;
      const docTitle = newDoc.name.trim();
      
      // Determine file extension from original uploaded file
      const dotIndex = originalName.lastIndexOf('.');
      const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : '';
      
      let finalName = docTitle || originalName;
      if (docTitle && extension && !docTitle.toLowerCase().endsWith(extension.toLowerCase())) {
        finalName = `${docTitle}${extension}`;
      }

      const doc: ProjectDocument = {
        id: `doc_${Date.now()}`,
        projectId: selectedProjId,
        name: finalName,
        type: newDoc.type,
        fileSize: fileSize,
        date: new Date().toISOString().split('T')[0],
        url: fileUrl,
      };

      onUpdateDocuments([...documents, doc]);
      setShowDocModal(false);
      setNewDoc({
        name: '',
        type: 'Quotation',
      });
      setSelectedDocFile(null);
      alert(`✅ Document "${finalName}" uploaded successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(`❌ Failed to upload document to Supabase: ${err.message || err}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Lock Override Manual Override trigger helper
  const handleToggleBypassLock = () => {
    if (!activeProj) return;
    const choice = confirm(`⚠️ Scope Protection Warning: Bypass Contract Lock?\n\nIf you override this structured lock, you can add or change payment stages. However, modifying base stages after advance receipt causes frequent scope-creeps.\n\nContinue to UNLOCK editing?`);
    if (choice) {
      const updated = projects.map(p => {
        if (p.id === activeProj.id) {
          return { ...p, isLocked: false };
        }
        return p;
      });
      onUpdateProjects(updated);
    }
  };

  // Stage deletion fallback
  const handleDeleteStage = (stageId: string) => {
    if (activeProj?.isLocked) {
      alert("❌ Locked! Cannot delete payment milestones in active locked project.");
      return;
    }
    if (confirm('Delete this payment stage milestone?')) {
      onUpdateStages(stages.filter(s => s.id !== stageId));
    }
  };

  const handleEditStageClick = (stg: PaymentStage) => {
    if (activeProj?.isLocked) {
      alert("❌ Project structure is currently locked! Please unlock the project first by clicking 'Bypass lock'.");
      return;
    }
    setEditingStage(stg);
  };

  const downloadBulkUploadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const templateData = [
        {
          "Stage Name": "Advance Payment",
          "Payable Amount": 500000,
          "Due Date (YYYY-MM-DD)": "2026-08-01"
        },
        {
          "Stage Name": "Plinth Beam Completion",
          "Payable Amount": 350000,
          "Due Date (YYYY-MM-DD)": "2026-09-15"
        },
        {
          "Stage Name": "Slab Casting GF",
          "Payable Amount": 400000,
          "Due Date (YYYY-MM-DD)": "2026-10-31"
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, "Stages Template");
      XLSX.writeFile(wb, "Payment_Stages_Bulk_Upload_Template.xlsx");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to generate bulk upload template: ${err.message}`);
    }
  };

  const handleBulkUploadStages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeProj?.isLocked) {
      alert("❌ Project is currently locked! Please unlock the project first before uploading payment stages.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        if (rows.length === 0) {
          alert("⚠️ No rows found in the uploaded Excel sheet.");
          return;
        }

        const parsedStages: PaymentStage[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          const name = row["Stage Name"] || row["stage name"] || row["StageName"] || row["Stage"] || row["stage"] || "";
          const amountStr = row["Payable Amount"] || row["payable amount"] || row["Amount"] || row["amount"] || "0";
          const rawDate = row["Due Date (YYYY-MM-DD)"] || row["due date"] || row["Due Date"] || row["dueDate"] || row["Date"] || row["date"] || "";

          if (!name || String(name).trim() === "") {
            continue;
          }

          const payableAmount = Number(amountStr) || 0;
          
          let formattedDate = "";
          if (rawDate) {
            if (typeof rawDate === 'number') {
              const dateObj = XLSX.SSF.parse_date_code(rawDate);
              const y = dateObj.y;
              const m = String(dateObj.m).padStart(2, '0');
              const d = String(dateObj.d).padStart(2, '0');
              formattedDate = `${y}-${m}-${d}`;
            } else {
              const strDate = String(rawDate).trim();
              const dateMatch = strDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
              if (dateMatch) {
                formattedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
              } else {
                const parsedDate = new Date(strDate);
                if (!isNaN(parsedDate.getTime())) {
                  const y = parsedDate.getFullYear();
                  const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
                  const d = String(parsedDate.getDate()).padStart(2, '0');
                  formattedDate = `${y}-${m}-${d}`;
                }
              }
            }
          }

          parsedStages.push({
            id: `stg_${Date.now()}_bulk_${i}_${Math.random().toString(36).substr(2, 4)}`,
            projectId: selectedProjId,
            stageName: String(name).trim(),
            payableAmount: payableAmount,
            receivedAmount: 0,
            dueDate: formattedDate,
            status: 'Pending',
          });
        }

        if (parsedStages.length === 0) {
          alert("❌ No valid payment stages could be imported. Please make sure the sheet matches the template and contains 'Stage Name' and 'Payable Amount'.");
          return;
        }

        onUpdateStages([...stages, ...parsedStages]);
        alert(`✅ Successfully imported ${parsedStages.length} payment stages!`);
      } catch (err: any) {
        console.error(err);
        alert(`❌ Error parsing Excel file: ${err.message || err}`);
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRequestPayment = (stageId: string) => {
    const updated = stages.map(s => {
      if (s.id === stageId) {
        // Send a chat message notification automatically
        const formattedAmount = s.payableAmount.toLocaleString('en-IN');
        const msg = `📢 PAYMENT REQUEST:\n ${displayOwnerName} has requested payment of ₹${formattedAmount} for milestone '${s.stageName}'.\nDue Date: ${s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}.\nPlease review and verify payment under the Milestones tab.`;
        onSendMessage(msg);
        return {
          ...s,
          paymentRequested: true,
          paymentRequestedDate: new Date().toISOString()
        };
      }
      return s;
    });
    onUpdateStages(updated);
    alert("✅ Payment request sent! Client has been notified in the Portal and Chat.");
  };

  const downloadBulkUploadExpensesTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const templateData = [
        {
          "Category": "Material",
          "Description": "Cement bag purchase - 150 bags",
          "Amount": 65000,
          "Supplier": "UltraTech Cement Dealer",
          "Date (YYYY-MM-DD)": "2026-07-10"
        },
        {
          "Category": "Labour",
          "Description": "Weekly masonry work wages - Phase 1 GF",
          "Amount": 42000,
          "Supplier": "Suresh Contractor",
          "Date (YYYY-MM-DD)": "2026-07-15"
        },
        {
          "Category": "Machinery",
          "Description": "Concrete mixer rental - 3 days",
          "Amount": 12000,
          "Supplier": "Metro Rentals",
          "Date (YYYY-MM-DD)": "2026-07-12"
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, "Expenses Template");
      XLSX.writeFile(wb, "Expenses_Bulk_Upload_Template.xlsx");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to generate bulk upload template: ${err.message}`);
    }
  };

  const handleBulkUploadExpenses = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedProjId) {
      alert("❌ Please select a project first before uploading expenses.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        if (rows.length === 0) {
          alert("⚠️ No rows found in the uploaded Excel sheet.");
          return;
        }

        const validCategories = ['Material', 'Labour', 'Machinery', 'Transport', 'Electrical', 'Plumbing', 'Miscellaneous'];

        const parsedExpenses: Expense[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          let categoryRaw = String(row["Category"] || row["category"] || "Miscellaneous").trim();
          // Capitalize first letter, lowercase rest
          if (categoryRaw) {
            categoryRaw = categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1).toLowerCase();
          }
          
          const category = (validCategories.includes(categoryRaw) ? categoryRaw : 'Miscellaneous') as any;
          const description = String(row["Description"] || row["description"] || row["Details"] || row["details"] || "Bulk Imported Expense").trim();
          const amountStr = row["Amount"] || row["amount"] || row["Cost"] || row["cost"] || "0";
          const supplier = String(row["Supplier"] || row["supplier"] || row["Vendor"] || row["vendor"] || "Various").trim();
          const rawDate = row["Date (YYYY-MM-DD)"] || row["Date"] || row["date"] || row["expense date"] || "";

          const amount = Number(amountStr) || 0;
          if (amount <= 0 && !description) {
            continue;
          }

          let formattedDate = new Date().toISOString().split('T')[0];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              const dateObj = XLSX.SSF.parse_date_code(rawDate);
              const y = dateObj.y;
              const m = String(dateObj.m).padStart(2, '0');
              const d = String(dateObj.d).padStart(2, '0');
              formattedDate = `${y}-${m}-${d}`;
            } else {
              const strDate = String(rawDate).trim();
              const dateMatch = strDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
              if (dateMatch) {
                formattedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
              } else {
                const parsedDate = new Date(strDate);
                if (!isNaN(parsedDate.getTime())) {
                  const y = parsedDate.getFullYear();
                  const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
                  const d = String(parsedDate.getDate()).padStart(2, '0');
                  formattedDate = `${y}-${m}-${d}`;
                }
              }
            }
          }

          parsedExpenses.push({
            id: `exp_${Date.now()}_bulk_${i}_${Math.random().toString(36).substr(2, 4)}`,
            projectId: selectedProjId,
            category,
            description,
            amount,
            supplier,
            date: formattedDate,
            billUploaded: false,
          });
        }

        if (parsedExpenses.length === 0) {
          alert("❌ No valid expenses could be imported. Please make sure the sheet matches the template and contains 'Category' and 'Amount'.");
          return;
        }

        onUpdateExpenses([...expenses, ...parsedExpenses]);
        alert(`✅ Successfully imported ${parsedExpenses.length} expenses!`);
      } catch (err: any) {
        console.error(err);
        alert(`❌ Error parsing Excel file: ${err.message || err}`);
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Per-project metrics (used in Milestones tab only)
  const currentTotalReceivable = activeStages.reduce((sum, s) => sum + s.payableAmount, 0);
  const currentCollected = activeStages.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
  const currentPending = currentTotalReceivable - currentCollected;
  const currentOverdueVal = activeStages
    .filter(s => (s.receivedAmount || 0) < s.payableAmount && s.dueDate && s.dueDate < todayStr)
    .reduce((sum, s) => sum + (s.payableAmount - (s.receivedAmount || 0)), 0);
  const currentUpcomingVal = activeStages
    .filter(s => (s.receivedAmount || 0) < s.payableAmount && (!s.dueDate || s.dueDate >= todayStr))
    .reduce((sum, s) => sum + (s.payableAmount - (s.receivedAmount || 0)), 0);

  // Contractor Margins mathematical metrics (Module 6)
  const expenseTargetStages = filterProject === 'all'
    ? stages
    : stages.filter(s => s.projectId === filterProject);
  const billingRevenue = expenseTargetStages.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
  const materialSpend = activeExpenses.filter(e => e.category === 'Material').reduce((sum, e) => sum + e.amount, 0);
  const labourSpend = activeExpenses.filter(e => e.category === 'Labour').reduce((sum, e) => sum + e.amount, 0);
  const externalSpend = activeExpenses.filter(e => e.category !== 'Material' && e.category !== 'Labour').reduce((sum, e) => sum + e.amount, 0);
  
  const totalProjectExpensesLogged = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const activeProfitMargin = billingRevenue - totalProjectExpensesLogged;
  const marginPercentage = billingRevenue > 0 ? Math.round((activeProfitMargin / billingRevenue) * 100) : 0;

  // Tabs structure configuration
  interface NavigationItem {
    id: 'dashboard' | 'projects' | 'milestones' | 'expenses' | 'extraworks' | 'progress' | 'documents' | 'chat' | 'reports' | 'settings';
    label: string;
    icon: any;
    badge?: number | string;
  }

  const contractorTabs: NavigationItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: Building2, badge: projects.filter(p => p.status !== 'Completed').length },
    { id: 'milestones', label: 'Payments', icon: FileSpreadsheet, badge: activeStages.filter(s => s.status !== 'Paid').length },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, badge: activeExpenses.length },
    { id: 'reports', label: 'Statements', icon: BarChart3 },
    { id: 'extraworks', label: 'Variation Scope', icon: Layers, badge: activeExtraWorks.filter(e => e.approvalStatus === 'Pending').length },
    { id: 'progress', label: 'Site updates', icon: Camera, badge: activeProgress.length },
    { id: 'documents', label: 'Documents', icon: FolderOpen, badge: activeDocs.length },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: messages.length ? 'Live' : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Compute date range boundaries for Overview filter
  const getOverviewDateRange = (): { from: string; to: string } | null => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (overviewPreset === 'all') return null;
    if (overviewPreset === 'today') {
      const t = fmt(today);
      return { from: t, to: t };
    }
    if (overviewPreset === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { from: fmt(start), to: fmt(today) };
    }
    if (overviewPreset === 'month') {
      return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(today) };
    }
    if (overviewPreset === 'year') {
      return { from: `${today.getFullYear()}-01-01`, to: fmt(today) };
    }
    // custom
    if (overviewCustomFrom && overviewCustomTo) {
      return { from: overviewCustomFrom, to: overviewCustomTo };
    }
    return null;
  };

  const overviewRange = getOverviewDateRange();

  // Filter stages/expenses by date range for Overview metrics
  const rangedStages = overviewRange
    ? stages.filter(s => s.dueDate && s.dueDate >= overviewRange.from && s.dueDate <= overviewRange.to)
    : stages;
  const rangedExpenses = overviewRange
    ? expenses.filter(e => e.date && e.date >= overviewRange.from && e.date <= overviewRange.to)
    : expenses;

  // Overview aggregates
  const ovTotalProjects = projects.length;
  const ovOngoing = projects.filter(p => p.status !== 'Completed').length;
  const ovCompleted = projects.filter(p => p.status === 'Completed').length;
  const ovOnHold = projects.filter(p => p.status === 'Hold').length;

  const ovTotalDues = rangedStages.reduce((s, st) => s + st.payableAmount, 0);
  const ovCollected = rangedStages.reduce((s, st) => s + (st.receivedAmount || 0), 0);
  const ovPending = ovTotalDues - ovCollected;

  // TodaySummary metrics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = `${currentYear}-${currentMonthStr}-01`;
  const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];

  const collectedThisMonth = stages
    .filter(s => s.dueDate && s.dueDate >= monthStart && s.dueDate <= endOfMonth)
    .reduce((sum, s) => sum + (s.receivedAmount || 0), 0);

  const pendingCollection = stages.reduce((sum, s) => sum + (s.payableAmount - (s.receivedAmount || 0)), 0);

  const paymentsDueToday = stages.filter(s => s.status !== 'Paid' && s.dueDate === todayStr).length;
  const ovOverdue = rangedStages.filter(s => (s.receivedAmount || 0) < s.payableAmount && s.dueDate && s.dueDate < todayStr).reduce((s, st) => s + (st.payableAmount - (st.receivedAmount || 0)), 0);
  const ovTotalExpenses = rangedExpenses.reduce((s, e) => s + e.amount, 0);
  const ovProfitLoss = ovCollected - ovTotalExpenses;

  return (
    <div className="space-y-5" id="contractor-portal-dashboard">
      
      {/* 1. COMPLETED CLIENT ACCOUNT NOTIFIER BANNER */}
      {createdClientShareDetails && (
        <div className="lh-panel rounded-xl p-4 space-y-3" id="credentials-clipboard-banner" style={{ borderColor: 'var(--lh-blue)' }}>
          <div className="flex items-center justify-between pb-2.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--lh-success-text)' }} />
              <h4 className="text-[11.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Client access configured</h4>
            </div>
            <button onClick={() => setCreatedClientShareDetails(null)} className="text-[11px] font-medium" style={{ color: 'var(--lh-text-tertiary)' }}>✕ Dismiss</button>
          </div>
          <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
            Login credentials created for <span className="font-semibold" style={{ color: 'var(--lh-text-primary)' }}>{createdClientShareDetails.clientName}</span>. Share these immediately.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs lh-panel-flat p-3 rounded-lg">
            <div><span className="lh-label mb-0.5">Client code</span> <span className="font-mono font-semibold" style={{ color: 'var(--lh-blue-dark)' }}>{createdClientShareDetails.code}</span></div>
            <div><span className="lh-label mb-0.5">Project</span> <span style={{ color: 'var(--lh-text-primary)' }}>{createdClientShareDetails.projName}</span></div>
            <div><span className="lh-label mb-0.5">Mobile</span> <span style={{ color: 'var(--lh-text-primary)' }}>{createdClientShareDetails.phone}</span></div>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(
                `🔑 Lifehut Workspace login for ${createdClientShareDetails.clientName}\n` +
                `Site: ${createdClientShareDetails.projName}\n` +
                `Client code: ${createdClientShareDetails.code}\n` +
                `Portal: ${window.location.origin}`
              );
              alert('Copied to clipboard! ✅');
            }}
            className="lh-btn lh-btn-secondary lh-btn-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy to clipboard</span>
          </button>
        </div>
      )}

      {/* 2. TABBED RESPONSIVE COMPONENT LAYOUT SWITCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Sidebar and Navigation */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Mobile responsive horizontal scroll selection bar */}
          <div className="flex lg:hidden overflow-x-auto py-1 gap-2 no-scrollbar" id="contractor-mobile-bar">
            {contractorTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-shrink-0 px-3 py-2 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors"
                  style={isSelected
                    ? { background: 'var(--lh-blue)', color: '#fff' }
                    : { background: 'var(--lh-surface)', color: 'var(--lh-text-secondary)', border: '1px solid var(--lh-border)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block lh-panel rounded-xl p-3.5 space-y-3.5">
            <div className="px-2 pb-1">
              <span className="lh-label">Contractor console</span>
            </div>

            <nav className="space-y-0.5">
              {contractorTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`lh-nav-item w-full ${isSelected ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge !== 0 && (
                      <span className="lh-badge lh-badge-neutral">{tab.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-1">
              <button
                onClick={() => setShowProjModal(true)}
                className="lh-btn lh-btn-primary lh-btn-md w-full"
              >
                <Plus className="w-4 h-4" />
                <span>New project</span>
              </button>
            </div>
          </div>

          {/* Connected Projects Indicator Panel */}
          <div className="lh-panel-flat rounded-xl p-3.5 space-y-2.5">
            <span className="lh-label">Connected sites</span>
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {projects
                .filter(p => p.status !== 'Completed')
                .map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-[11.5px] font-medium truncate flex items-center justify-between transition-colors"
                  style={p.id === selectedProjId
                    ? { background: 'var(--lh-surface)', border: '1px solid var(--lh-blue)', color: 'var(--lh-text-primary)' }
                    : { background: 'transparent', border: '1px solid transparent', color: 'var(--lh-text-secondary)' }}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--lh-text-tertiary)' }}>{p.type.charAt(0)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Active Page Viewport Workspace */}
        <div className="lg:col-span-9 space-y-5">

          {/* ACTIVE TAB 1: OVERVIEW — Executive dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">

              <TodaySummary
                ownerName={displayOwnerName}
                activeProjects={ovOngoing}
                paymentsDueToday={paymentsDueToday}
                collectedThisMonth={collectedThisMonth}
                pendingCollection={pendingCollection}
                onNavigate={setActiveTab}
              />

              <RecentActivity
                projects={projects}
                stages={stages}
                extraWorks={extraWorks}
                expenses={expenses}
                progress={progress}
                documents={documents}
                userRole="Contractor"
              />

              {/* Date range filter bar */}
              <div className="lh-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <span className="text-[12.5px] font-semibold flex-shrink-0" style={{ color: 'var(--lh-text-primary)' }}>Date range</span>
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This week' },
                    { id: 'month', label: 'This month' },
                    { id: 'year', label: 'This year' },
                    { id: 'all', label: 'All time' },
                  ] as { id: DatePreset; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setOverviewPreset(opt.id); setShowCustomRange(false); }}
                      className="lh-btn lh-btn-sm"
                      style={overviewPreset === opt.id && !showCustomRange
                        ? { background: 'var(--lh-blue)', color: '#fff', border: '1px solid var(--lh-blue)' }
                        : { background: 'var(--lh-surface-muted)', color: 'var(--lh-text-secondary)', border: '1px solid var(--lh-border)' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowCustomRange(!showCustomRange); setOverviewPreset('all'); }}
                    className="lh-btn lh-btn-sm"
                    style={showCustomRange
                      ? { background: 'var(--lh-blue)', color: '#fff', border: '1px solid var(--lh-blue)' }
                      : { background: 'var(--lh-surface-muted)', color: 'var(--lh-text-secondary)', border: '1px solid var(--lh-border)' }}
                  >
                    Custom
                  </button>
                </div>
                {showCustomRange && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      value={overviewCustomFrom}
                      onChange={e => setOverviewCustomFrom(e.target.value)}
                      className="lh-input"
                      style={{ width: 'auto' }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--lh-text-tertiary)' }}>to</span>
                    <input
                      type="date"
                      value={overviewCustomTo}
                      onChange={e => setOverviewCustomTo(e.target.value)}
                      className="lh-input"
                      style={{ width: 'auto' }}
                    />
                  </div>
                )}
              </div>

              {/* Row 2 — Financial dues */}
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--lh-text-tertiary)' }}>
                  Financial dues {overviewRange ? `(${overviewRange.from} → ${overviewRange.to})` : '(all time)'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="lh-metric">
                    <p className="lh-metric-label">Total billings</p>
                    <p className="lh-metric-value">₹{ovTotalDues.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="lh-metric">
                    <p className="lh-metric-label">Collected</p>
                    <p className="lh-metric-value" style={{ color: 'var(--lh-success-text)' }}>₹{ovCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="lh-metric">
                    <p className="lh-metric-label">Pending dues</p>
                    <p className="lh-metric-value">₹{ovPending.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="lh-metric" style={{ background: 'var(--lh-warning-bg)', borderColor: '#F0D49C' }}>
                    <p className="lh-metric-label" style={{ color: 'var(--lh-warning-text)' }}>Overdue</p>
                    <p className="lh-metric-value" style={{ color: 'var(--lh-warning-text)' }}>₹{ovOverdue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Row 3 — P&L */}
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--lh-text-tertiary)' }}>Profit & loss</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="lh-metric">
                    <p className="lh-metric-label">Total expenses</p>
                    <p className="lh-metric-value" style={{ color: 'var(--lh-warning-text)' }}>₹{ovTotalExpenses.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="lh-metric">
                    <p className="lh-metric-label">Revenue (collected)</p>
                    <p className="lh-metric-value" style={{ color: 'var(--lh-success-text)' }}>₹{ovCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="lh-metric" style={ovProfitLoss >= 0
                    ? { background: 'var(--lh-navy)', border: 'none' }
                    : { background: 'var(--lh-danger-bg)', borderColor: '#F5BABA' }}>
                    <p className="lh-metric-label" style={{ color: ovProfitLoss >= 0 ? 'rgba(255,255,255,0.6)' : 'var(--lh-danger-text)' }}>
                      {ovProfitLoss >= 0 ? 'Net profit' : 'Net loss'}
                    </p>
                    <p className="lh-metric-value" style={{ color: ovProfitLoss >= 0 ? '#5DCAA5' : 'var(--lh-danger-text)' }}>
                      {ovProfitLoss >= 0 ? '+' : '-'}₹{Math.abs(ovProfitLoss).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>



            </div>
          )}

          {/* ACTIVE TAB: PROJECTS (Ongoing / Completed) */}
          {activeTab === 'projects' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>All projects</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Ongoing sites and the completed project archive.</p>
                </div>
                <button
                  onClick={() => setShowProjModal(true)}
                  className="lh-btn lh-btn-primary lh-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create project</span>
                </button>
              </div>

              {/* Sub-tab switcher */}
              <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }}>
                <button
                  onClick={() => { setProjectsSubTab('ongoing'); setCompletedDetailId(null); }}
                  className="px-3.5 py-1.5 rounded-md text-[11.5px] font-semibold transition-all"
                  style={projectsSubTab === 'ongoing'
                    ? { background: 'var(--lh-blue)', color: '#fff' }
                    : { color: 'var(--lh-text-secondary)' }}
                >
                  Ongoing ({projects.filter(p => p.status !== 'Completed').length})
                </button>
                <button
                  onClick={() => { setProjectsSubTab('completed'); setCompletedDetailId(null); }}
                  className="px-3.5 py-1.5 rounded-md text-[11.5px] font-semibold transition-all"
                  style={projectsSubTab === 'completed'
                    ? { background: 'var(--lh-blue)', color: '#fff' }
                    : { color: 'var(--lh-text-secondary)' }}
                >
                  Completed ({projects.filter(p => p.status === 'Completed').length})
                </button>
              </div>

              {/* ONGOING sub-view */}
              {projectsSubTab === 'ongoing' && (
                <div className="lh-panel rounded-xl p-5">
                  {projects.filter(p => p.status !== 'Completed').length === 0 ? (
                    <p className="text-[12px] italic text-center py-10" style={{ color: 'var(--lh-text-tertiary)' }}>No ongoing projects. Create one to get started.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {projects.filter(p => p.status !== 'Completed').map((p) => {
                        const projStages = stages.filter(s => s.projectId === p.id);
                        const projEw = extraWorks.filter(e => e.projectId === p.id && e.approvalStatus === 'Approved');
                        const baseC = p.contractValue;
                        const extraC = projEw.reduce((sum, e) => sum + e.amount, 0);
                        const totalAdj = baseC + extraC;
                        const paidC = projStages.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
                        const pendingC = totalAdj - paidC;
                        const isSelected = p.id === selectedProjId;

                        return (
                          <div
                            key={p.id}
                            className="p-4 text-left rounded-xl transition-all flex flex-col justify-between relative group"
                            style={isSelected
                              ? { background: 'var(--lh-navy)', borderColor: 'var(--lh-navy)', border: '1px solid var(--lh-navy)' }
                              : { background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }}
                          >
                            <button
                              onClick={() => handleOpenEditProject(p)}
                              className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                              style={{ background: isSelected ? 'rgba(255,255,255,0.15)' : 'var(--lh-surface)', color: isSelected ? '#fff' : 'var(--lh-text-secondary)' }}
                              title="Edit project"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => onSelectProject(p.id)} className="text-left flex-1">
                              <div>
                                <div className="flex items-center justify-between gap-1.5 pr-7">
                                  <span className="font-semibold text-[12.5px] truncate max-w-[60%]" style={{ color: isSelected ? '#fff' : 'var(--lh-text-primary)' }}>{p.name}</span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {p.status === 'Hold' && (
                                      <span className="lh-badge lh-badge-warning">Hold</span>
                                    )}
                                    <span className="lh-badge lh-badge-neutral" style={isSelected ? { background: 'rgba(255,255,255,0.15)', color: '#fff' } : {}}>
                                      {p.type}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10.5px] mt-1" style={{ color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--lh-text-secondary)' }}>{p.clientName}</p>
                              </div>

                              <div className="mt-4 pt-3 flex items-center justify-between text-[11px]" style={{ borderTop: `1px dashed ${isSelected ? 'rgba(255,255,255,0.2)' : 'var(--lh-border)'}` }}>
                                <div>
                                  <p className="text-[9px] uppercase tracking-wide" style={{ opacity: 0.7 }}>Pending</p>
                                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: isSelected ? '#fff' : 'var(--lh-text-primary)' }}>₹{pendingC.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] uppercase tracking-wide" style={{ opacity: 0.7 }}>Collected</p>
                                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#5DCAA5' }}>₹{paidC.toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* COMPLETED sub-view */}
              {projectsSubTab === 'completed' && (
                <div className="space-y-4">
                  {projects.filter(p => p.status === 'Completed').length === 0 ? (
                    <div className="lh-panel rounded-xl p-8 text-center" style={{ color: 'var(--lh-text-tertiary)' }}>
                      No completed projects yet.
                    </div>
                  ) : completedDetailId ? (
                    /* DRILL-DOWN DETAIL VIEW */
                    (() => {
                      const cp = projects.find(p => p.id === completedDetailId);
                      if (!cp) {
                        setTimeout(() => setCompletedDetailId(null), 0);
                        return null;
                      }
                      const cpStages = stages.filter(s => s.projectId === cp.id);
                      const cpExpenses = expenses.filter(e => e.projectId === cp.id);
                      const cpExtra = extraWorks.filter(e => e.projectId === cp.id && e.approvalStatus === 'Approved');
                      const cpExtraTotal = cpExtra.reduce((s, e) => s + e.amount, 0);
                      const cpContractTotal = cp.contractValue + cpExtraTotal;
                      const cpCollected = cpStages.reduce((s, st) => s + (st.receivedAmount || 0), 0);
                      const cpExpenseTotal = cpExpenses.reduce((s, e) => s + e.amount, 0);
                      const cpProfit = cpCollected - cpExpenseTotal;

                      return (
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <button
                              onClick={() => setCompletedDetailId(null)}
                              className="lh-btn lh-btn-ghost lh-btn-sm"
                            >
                              ← Back to archive
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Reactivate "${cp.name}" back to Active?`)) {
                                  onUpdateProjects(projects.map(p => p.id === cp.id ? { ...p, status: 'Active' } : p));
                                  setCompletedDetailId(null);
                                  setProjectsSubTab('ongoing');
                                }
                              }}
                              className="lh-btn lh-btn-secondary lh-btn-sm"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Reactivate project</span>
                            </button>
                          </div>

                          {/* Project header card */}
                          <div className="rounded-xl p-5 space-y-1" style={{ background: 'var(--lh-navy)' }}>
                            <span className="lh-badge lh-badge-success">Completed</span>
                            <h3 className="text-lg font-display font-semibold text-white mt-1">{cp.name}</h3>
                            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{cp.clientName} · {cp.address}</p>
                            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{cp.startDate} → {cp.expectedEndDate}</p>
                          </div>

                          {/* Financial summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="lh-metric">
                              <p className="lh-metric-label">Contract value</p>
                              <p className="lh-metric-value">₹{cpContractTotal.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="lh-metric">
                              <p className="lh-metric-label">Total collected</p>
                              <p className="lh-metric-value" style={{ color: 'var(--lh-success-text)' }}>₹{cpCollected.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="lh-metric">
                              <p className="lh-metric-label">Total expenses</p>
                              <p className="lh-metric-value" style={{ color: 'var(--lh-warning-text)' }}>₹{cpExpenseTotal.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="lh-metric" style={cpProfit >= 0
                              ? { background: 'var(--lh-success-bg)' }
                              : { background: 'var(--lh-danger-bg)' }}>
                              <p className="lh-metric-label" style={{ color: cpProfit >= 0 ? 'var(--lh-success-text)' : 'var(--lh-danger-text)' }}>
                                {cpProfit >= 0 ? 'Net profit' : 'Net loss'}
                              </p>
                              <p className="lh-metric-value" style={{ color: cpProfit >= 0 ? 'var(--lh-success-text)' : 'var(--lh-danger-text)' }}>
                                ₹{Math.abs(cpProfit).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          {/* Milestone history table */}
                          <div className="lh-panel rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                              <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Milestone history</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="lh-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Stage</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cpStages.map((s, i) => (
                                    <tr key={s.id}>
                                      <td style={{ color: 'var(--lh-text-tertiary)' }}>{i + 1}</td>
                                      <td className="font-medium">{s.stageName}</td>
                                      <td style={{ textAlign: 'right' }} className="font-mono">₹{s.payableAmount.toLocaleString('en-IN')}</td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className={`lh-badge ${s.status === 'Paid' ? 'lh-badge-success' : 'lh-badge-warning'}`}>
                                          {s.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Expense history table */}
                          {cpExpenses.length > 0 && (
                            <div className="lh-panel rounded-xl overflow-hidden">
                              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                                <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Expense history</h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="lh-table">
                                  <thead>
                                    <tr>
                                      <th>Category</th>
                                      <th>Description</th>
                                      <th>Supplier</th>
                                      <th>Date</th>
                                      <th style={{ textAlign: 'right' }}>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cpExpenses.map(e => (
                                      <tr key={e.id}>
                                        <td><span className="lh-badge lh-badge-neutral">{e.category}</span></td>
                                        <td className="font-medium max-w-[200px] truncate">{e.description}</td>
                                        <td style={{ color: 'var(--lh-text-secondary)' }}>{e.supplier}</td>
                                        <td style={{ color: 'var(--lh-text-tertiary)' }}>{e.date}</td>
                                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">₹{e.amount.toLocaleString('en-IN')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* ARCHIVE LIST */
                    <div className="lh-panel rounded-xl overflow-hidden">
                      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                        <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Completed project archive</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="lh-table">
                          <thead>
                            <tr>
                              <th>Project</th>
                              <th>Client</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Contract value</th>
                              <th style={{ textAlign: 'right' }}>Collected</th>
                              <th style={{ textAlign: 'right' }}>Net P/L</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.filter(p => p.status === 'Completed').map(p => {
                              const pStages = stages.filter(s => s.projectId === p.id);
                              const pExp = expenses.filter(e => e.projectId === p.id);
                              const pExtra = extraWorks.filter(e => e.projectId === p.id && e.approvalStatus === 'Approved');
                              const collected = pStages.reduce((s, st) => s + (st.receivedAmount || 0), 0);
                              const expTotal = pExp.reduce((s, e) => s + e.amount, 0);
                              const profit = collected - expTotal;

                              return (
                                <tr key={p.id}>
                                  <td className="font-semibold">{p.name}</td>
                                  <td style={{ color: 'var(--lh-text-secondary)' }}>{p.clientName}</td>
                                  <td><span className="lh-badge lh-badge-neutral">{p.type}</span></td>
                                  <td style={{ textAlign: 'right' }} className="font-mono">₹{p.contractValue.toLocaleString('en-IN')}</td>
                                  <td style={{ textAlign: 'right' }} className="font-mono" >
                                    <span style={{ color: 'var(--lh-success-text)' }}>₹{collected.toLocaleString('en-IN')}</span>
                                  </td>
                                  <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                                    <span style={{ color: profit >= 0 ? 'var(--lh-success-text)' : 'var(--lh-danger-text)' }}>
                                      {profit >= 0 ? '+' : '-'}₹{Math.abs(profit).toLocaleString('en-IN')}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button
                                      onClick={() => setCompletedDetailId(p.id)}
                                      className="lh-btn lh-btn-ghost lh-btn-sm"
                                    >
                                      View →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE TAB 2: PAYMENT MILESTONES */}
          {activeTab === 'milestones' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Stage-wise payment setup</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Add milestones and generate printable statement sheets.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStageModal(true)}
                    className="lh-btn lh-btn-primary lh-btn-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add stages</span>
                  </button>

                  <button
                    onClick={handleToggleBypassLock}
                    className="lh-btn lh-btn-secondary lh-btn-sm"
                  >
                    {activeProj?.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" style={{ color: 'var(--lh-success-text)' }} />}
                    <span>{activeProj?.isLocked ? 'Bypass lock' : 'Lock structure'}</span>
                  </button>
                </div>
              </div>

              {/* Bulk Upload Section */}
              {activeProj && (
                <div className="lh-panel rounded-xl p-3 border border-[var(--lh-border)] bg-slate-50/50 dark:bg-slate-800/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-[12.5px] font-semibold text-[var(--lh-text-primary)] flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Bulk Upload Payment Milestones (Excel)</span>
                      </h4>
                      <p className="text-[10.5px] text-[var(--lh-text-secondary)]">
                        Fill out and upload the template to bulk add milestone payment stages.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadBulkUploadTemplate}
                        className="lh-btn lh-btn-secondary lh-btn-xs flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Download Template</span>
                      </button>

                      <label
                        className="lh-btn lh-btn-primary lh-btn-xs flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                        style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                      >
                        <Upload className="w-3.5 h-3.5 text-white" />
                        <span>Choose Excel File</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={handleBulkUploadStages}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Exact Replicating Statement attachment component */}
              {activeProj && (
                <div className="space-y-2.5">
                  <span className="lh-label">Statement sheet</span>
                  <PaymentStatementSheet 
                    project={activeProj} 
                    stages={activeStages} 
                    isClientView={false}
                    contractorName={displayOwnerName}
                  />
                </div>
              )}

              {/* Milestones table */}
              <div className="lh-panel rounded-xl overflow-hidden">
                <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Active milestones</h4>
                </div>
                {activeStages.length === 0 ? (
                  <p className="text-[12px] py-8 italic text-center" style={{ color: 'var(--lh-text-tertiary)' }}>No stages configured. Click "Add stages" above to begin.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="lh-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Stage</th>
                          <th>Due date</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeStages.map((stg, sIdx) => {
                          const isPaid = stg.status === 'Paid';
                          return (
                            <tr key={stg.id}>
                              <td style={{ color: 'var(--lh-text-tertiary)' }}>{sIdx + 1}</td>
                              <td className="font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span>{stg.stageName}</span>
                                  <button
                                    onClick={() => handleEditStageClick(stg)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-[var(--lh-blue)] transition-colors"
                                    title="Edit payment stage"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td style={{ color: 'var(--lh-text-secondary)' }}>
                                {stg.dueDate ? new Date(stg.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
                              </td>
                              <td style={{ textAlign: 'right' }} className="font-semibold font-mono">₹{stg.payableAmount.toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'center' }}>
                                {isPaid ? (
                                  <span className="lh-badge lh-badge-success">
                                    <Check className="w-2.5 h-2.5" /> Paid
                                  </span>
                                ) : (
                                  <span className="lh-badge lh-badge-warning">Pending</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isPaid ? (
                                  <span style={{ color: 'var(--lh-text-tertiary)' }}>—</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                                    {stg.paymentRequested ? (
                                      <span className="text-[10.5px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200/50 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Requested
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleRequestPayment(stg.id)}
                                        className="lh-btn lh-btn-secondary lh-btn-sm flex items-center gap-1"
                                        style={{ background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }}
                                        title="Send a payment request notification to client"
                                      >
                                        <Bell className="w-3 h-3 text-amber-500" />
                                        <span>Request Payment</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenReceipt(stg)}
                                      className="lh-btn lh-btn-primary lh-btn-sm"
                                    >
                                      Log receipt
                                    </button>
                                    <button
                                      onClick={() => handleEditStageClick(stg)}
                                      className="lh-btn lh-btn-secondary lh-btn-sm"
                                      style={{ padding: '5px' }}
                                      title="Edit payment stage"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStage(stg.id)}
                                      className="lh-btn lh-btn-danger lh-btn-sm"
                                      style={{ padding: '5px' }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 3: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Material & labour expenses</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Log spend and track profit margins.</p>
                </div>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="lh-btn lh-btn-primary lh-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log expense</span>
                </button>
              </div>

              {/* Project Filter for Expense Book */}
              <div className="lh-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
                <div className="space-y-0.5">
                  <span className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Project filter</span>
                  <p className="text-[11px]" style={{ color: 'var(--lh-text-tertiary)' }}>View all or filter by a specific site</p>
                </div>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="lh-select min-w-[220px]"
                  style={{ width: 'auto' }}
                >
                  <option value="all">All connected projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                  ))}
                </select>
              </div>

              {/* Bulk Upload Expenses Section */}
              {activeProj && (
                <div className="lh-panel rounded-xl p-3 border border-[var(--lh-border)] bg-slate-50/50 dark:bg-slate-800/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-[12.5px] font-semibold text-[var(--lh-text-primary)] flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Bulk Upload Expenses (Excel)</span>
                      </h4>
                      <p className="text-[10.5px] text-[var(--lh-text-secondary)]">
                        Fill out and upload the template to bulk add materials, labour, or machinery expenses.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadBulkUploadExpensesTemplate}
                        className="lh-btn lh-btn-secondary lh-btn-xs flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Download Template</span>
                      </button>

                      <label
                        className="lh-btn lh-btn-primary lh-btn-xs flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                        style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                      >
                        <Upload className="w-3.5 h-3.5 text-white" />
                        <span>Choose Excel File</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={handleBulkUploadExpenses}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit metrics margin layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="lh-metric">
                  <p className="lh-metric-label">Gross billings</p>
                  <h4 className="lh-metric-value" style={{ color: 'var(--lh-success-text)' }}>₹{billingRevenue.toLocaleString('en-IN')}</h4>
                </div>
                <div className="lh-metric">
                  <p className="lh-metric-label">Logged expenses</p>
                  <h4 className="lh-metric-value">₹{totalProjectExpensesLogged.toLocaleString('en-IN')}</h4>
                </div>
                <div className="lh-metric" style={{ background: 'var(--lh-navy)', border: 'none' }}>
                  <p className="lh-metric-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Gross profit</p>
                  <h4 className="lh-metric-value" style={{ color: '#5DCAA5' }}>₹{activeProfitMargin.toLocaleString('en-IN')}</h4>
                </div>
                <div className="lh-metric">
                  <p className="lh-metric-label">Margin</p>
                  <h4 className="lh-metric-value flex items-center gap-1.5">
                    {marginPercentage >= 0 ? `${marginPercentage}%` : `0%`} <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--lh-success-text)' }} />
                  </h4>
                </div>
              </div>

              {/* Expense Ledger table */}
              <div className="lh-panel rounded-xl overflow-hidden">
                <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Expense log</h4>
                </div>
                {activeExpenses.length === 0 ? (
                  <p className="text-[12px] italic py-8 text-center" style={{ color: 'var(--lh-text-tertiary)' }}>No expenses recorded for the current filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="lh-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Project</th>
                          <th>Supplier</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'center' }}>Bill</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExpenses.map((exp) => {
                          const matchedProj = projects.find(p => p.id === exp.projectId);
                          return (
                            <tr key={exp.id}>
                              <td><span className="lh-badge lh-badge-neutral">{exp.category}</span></td>
                              <td className="font-medium max-w-[220px] truncate" title={exp.description}>{exp.description}</td>
                              <td style={{ color: 'var(--lh-text-secondary)' }} className="truncate max-w-[140px]">{matchedProj?.name || 'Unmapped'}</td>
                              <td style={{ color: 'var(--lh-text-secondary)' }} className="truncate max-w-[140px]">{exp.supplier}</td>
                              <td style={{ color: 'var(--lh-text-tertiary)' }}>{exp.date}</td>
                              <td style={{ textAlign: 'right' }} className="font-semibold font-mono">₹{exp.amount.toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'center' }}>
                                {exp.billUploaded ? (
                                  <span className="lh-badge lh-badge-success">✓</span>
                                ) : (
                                  <span className="lh-badge lh-badge-neutral">—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleOpenEditExpense(exp)} className="lh-btn lh-btn-ghost lh-btn-sm">
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleDeleteExpense(exp.id)} className="lh-btn lh-btn-danger lh-btn-sm" style={{ padding: '4px' }}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 4: EXTRA WORKS REQUESTS */}
          {activeTab === 'extraworks' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Scope variation ledger</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Request supplemental works and monitor client approvals.</p>
                </div>
                <button
                  onClick={() => setShowExtraModal(true)}
                  className="lh-btn lh-btn-primary lh-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Request variation</span>
                </button>
              </div>

              {/* Extra works table */}
              <div className="lh-panel rounded-xl overflow-hidden">
                {activeExtraWorks.length === 0 ? (
                  <p className="text-[12px] italic text-center py-8" style={{ color: 'var(--lh-text-tertiary)' }}>No scope variations submitted.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="lh-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Estimated cost</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th>Client feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExtraWorks.map((ew) => (
                          <tr key={ew.id}>
                            <td className="font-medium max-w-[260px]">{ew.description}</td>
                            <td style={{ color: 'var(--lh-text-tertiary)' }}>{ew.date}</td>
                            <td style={{ textAlign: 'right' }} className="font-semibold font-mono">+₹{ew.amount.toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`lh-badge ${ew.approvalStatus === 'Approved' ? 'lh-badge-success' : ew.approvalStatus === 'Rejected' ? 'lh-badge-neutral' : 'lh-badge-warning'}`}>
                                {ew.approvalStatus}
                              </span>
                            </td>
                            <td style={{ color: 'var(--lh-text-secondary)' }} className="max-w-[200px] truncate italic" title={ew.clientComment}>
                              {ew.clientComment || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 5: DAILY PROGRESS */}
          {activeTab === 'progress' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Site progress logger</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Publish daily photos or video updates to the client.</p>
                </div>
                <button
                  onClick={() => setShowProgressModal(true)}
                  className="lh-btn lh-btn-primary lh-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add update</span>
                </button>
              </div>

              <div className="lh-panel rounded-xl p-5">
                {activeProgress.length === 0 ? (
                  <p className="text-[12px] italic py-8 text-center" style={{ color: 'var(--lh-text-tertiary)' }}>No progress logs yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeProgress.map((prog) => (
                      <div key={prog.id} className="lh-panel-flat rounded-lg p-3.5 space-y-2.5">
                        <div className="flex justify-between text-[10px] font-semibold" style={{ color: 'var(--lh-text-tertiary)' }}>
                          <span>Update</span>
                          <span>{prog.date}</span>
                        </div>
                        <p className="lh-panel p-2.5 rounded-lg text-[12px] leading-relaxed" style={{ color: 'var(--lh-text-primary)' }}>{prog.remarks}</p>

                        {prog.photos.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {prog.photos.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                onClick={() => setLightboxPhoto(src)}
                                className="rounded-md object-cover w-full h-20 aspect-video cursor-pointer transition-opacity hover:opacity-85"
                                alt="Project snapshot reference"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 6: DOCUMENT CABINET */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              <div className="lh-panel-flat rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Document cabinet</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Agreements, quotations, BOQs and drawings.</p>
                </div>
                <button
                  onClick={() => setShowDocModal(true)}
                  className="lh-btn lh-btn-primary lh-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach document</span>
                </button>
              </div>

              <div className="lh-panel rounded-xl overflow-hidden">
                {activeDocs.length === 0 ? (
                  <p className="text-[12px] py-8 text-center italic" style={{ color: 'var(--lh-text-tertiary)' }}>No documents loaded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="lh-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDocs.map((doc) => (
                          <tr key={doc.id}>
                            <td className="font-medium flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--lh-text-tertiary)' }} />
                              <span className="truncate max-w-[220px]">{doc.name}</span>
                            </td>
                            <td><span className="lh-badge lh-badge-info">{doc.type}</span></td>
                            <td style={{ color: 'var(--lh-text-tertiary)' }}>{doc.fileSize}</td>
                            <td style={{ color: 'var(--lh-text-tertiary)' }}>{doc.date}</td>
                            <td style={{ textAlign: 'right' }}>
                              {doc.url && doc.url !== '#' ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="lh-btn lh-btn-ghost lh-btn-sm inline-flex items-center gap-1.5 text-[var(--lh-blue)]"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => alert(`Simulating file download: "${doc.name}"`)}
                                  className="lh-btn lh-btn-ghost lh-btn-sm"
                                >
                                  Download
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 7: LIAISON CHAT */}
          {activeTab === 'chat' && (
            <div className="lh-panel rounded-xl p-5 flex flex-col min-h-[450px]">
              <div className="pb-3 mb-4" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                <h4 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Client messages</h4>
                <p className="text-[11px]" style={{ color: 'var(--lh-text-secondary)' }}>Discuss estimates, bills, or photo uploads in real time.</p>
              </div>

              <div className="flex-1 min-h-[350px]">
                <ChatComponent 
                  projectId={selectedProjId}
                  sender="Contractor"
                  messages={messages}
                  onSendMessage={onSendMessage}
                />
              </div>
            </div>
          )}

          {/* ACTIVE TAB 8: REPORT MANAGER */}
          {activeTab === 'reports' && (() => {
            const compileReportRows = () => {
              const rows: Array<{
                id: string;
                projectId: string;
                clientName: string;
                projectName: string;
                workDone: string;
                total: number;
                received: number;
                payment: string;
                date: string;
                type: 'milestone' | 'extrawork' | 'expense';
              }> = [];

              stages.forEach(s => {
                const proj = projects.find(p => p.id === s.projectId);
                rows.push({
                  id: s.id,
                  projectId: s.projectId,
                  clientName: proj?.clientName || 'Unknown Client',
                  projectName: proj?.name || 'Unmapped Site',
                  workDone: s.stageName,
                  total: s.payableAmount,
                  received: s.receivedAmount || 0,
                  payment: s.status,
                  date: s.dueDate || 'TBD',
                  type: 'milestone',
                });
              });

              extraWorks.forEach(e => {
                const proj = projects.find(p => p.id === e.projectId);
                rows.push({
                  id: e.id,
                  projectId: e.projectId,
                  clientName: proj?.clientName || 'Unknown Client',
                  projectName: proj?.name || 'Unmapped Site',
                  workDone: `Extra: ${e.description}`,
                  total: e.amount,
                  received: e.approvalStatus === 'Approved' ? e.amount : 0,
                  payment: e.approvalStatus === 'Approved' ? 'Paid' : 'Pending',
                  date: e.date || 'TBD',
                  type: 'extrawork',
                });
              });

              expenses.forEach(ex => {
                const proj = projects.find(p => p.id === ex.projectId);
                rows.push({
                  id: ex.id,
                  projectId: ex.projectId,
                  clientName: proj?.clientName || 'Unknown Client',
                  projectName: proj?.name || 'Unmapped Site',
                  workDone: `[${ex.category}] ${ex.description} (${ex.supplier || 'Vendor'})`,
                  total: ex.amount,
                  received: ex.amount,
                  payment: 'Paid',
                  date: ex.date || 'TBD',
                  type: 'expense',
                });
              });

              return rows;
            };

            const reportRows = compileReportRows();

            const filteredReportRows = reportRows.filter(row => {
              if (reportProjectFilter !== 'all' && row.projectId !== reportProjectFilter) return false;
              if (reportTypeFilter !== 'all' && row.type !== reportTypeFilter) return false;
              if (reportSearch.trim()) {
                const q = reportSearch.toLowerCase();
                return (
                  row.workDone.toLowerCase().includes(q) ||
                  row.clientName.toLowerCase().includes(q) ||
                  row.projectName.toLowerCase().includes(q)
                );
              }
              return true;
            });

            const isExpenseOnly = reportTypeFilter === 'expense';
            const revenueRows = filteredReportRows.filter(r => {
              if (reportTypeFilter === 'all') {
                return r.type === 'milestone' || r.type === 'extrawork';
              }
              return r.type === reportTypeFilter;
            });

            const totalEstimatedBudget = revenueRows.reduce((a, b) => a + b.total, 0);
            const totalSettlementValue = revenueRows.reduce((a, b) => a + (b.received || 0), 0);
            const outstandingPendingBills = totalEstimatedBudget - totalSettlementValue;

            const card1Label = isExpenseOnly ? "Total expenses" : "Turnover managed";
            const card2Label = isExpenseOnly ? "Expenses paid" : "Revenue settled";
            const card3Label = isExpenseOnly ? "Unpaid expenses" : "Pending outstanding";
            const card1Desc = isExpenseOnly ? `${filteredReportRows.length} items logged` : `${filteredReportRows.filter(r => r.type !== 'expense').length} items tracked`;
            const card2Desc = isExpenseOnly ? "Cleared expenses" : "Cleared settlements";
            const card3Desc = isExpenseOnly ? "To be paid" : "To be recovered";

            const handleExportCSV = () => {
              const headers = ['Record Type', 'Client Name', 'Project', 'Work Detail', 'Cost (₹)', 'Status', 'Date'];
              const rows = filteredReportRows.map(r => [
                r.type.toUpperCase(),
                r.clientName,
                r.projectName,
                r.workDone,
                r.total,
                r.payment,
                r.date
              ]);
              const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Lifehut_Report_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

            return (
              <div className="space-y-5 lg:col-span-12" id="reporting-manager-desk">
                
                <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'var(--lh-navy)' }}>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="lh-badge" style={{ background: 'rgba(230,126,34,0.18)', color: '#F5A961' }}>
                        Analytics
                      </span>
                      <h3 className="text-xl font-display font-semibold tracking-tight text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" style={{ color: '#7AB8F5' }} />
                        Report manager
                      </h3>
                      <p className="text-[12px] leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        Search across milestones, scope variations and expenses to generate clean financial statements.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleExportCSV}
                        className="lh-btn lh-btn-accent lh-btn-md"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="lh-btn lh-btn-md"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
                      >
                        Print audit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Micro Totals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="lh-panel rounded-xl p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="lh-metric-label">{card1Label}</span>
                      <h4 className="text-xl font-semibold font-mono" style={{ color: 'var(--lh-text-primary)' }}>₹{totalEstimatedBudget.toLocaleString('en-IN')}</h4>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--lh-blue)' }}>{card1Desc}</p>
                    </div>
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="lh-panel rounded-xl p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="lh-metric-label">{card2Label}</span>
                      <h4 className="text-xl font-semibold font-mono" style={{ color: 'var(--lh-success-text)' }}>₹{totalSettlementValue.toLocaleString('en-IN')}</h4>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--lh-success-text)' }}>{card2Desc}</p>
                    </div>
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--lh-success-bg)', color: 'var(--lh-success-text)' }}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="lh-panel rounded-xl p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="lh-metric-label">{card3Label}</span>
                      <h4 className="text-xl font-semibold font-mono" style={{ color: 'var(--lh-warning-text)' }}>₹{outstandingPendingBills.toLocaleString('en-IN')}</h4>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--lh-warning-text)' }}>{card3Desc}</p>
                    </div>
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--lh-warning-bg)', color: 'var(--lh-warning-text)' }}>
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Search & Filter bar */}
                <div className="lh-panel rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Search work, supplier, or client..."
                      className="lh-input"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <select
                      value={reportProjectFilter}
                      onChange={(e) => setReportProjectFilter(e.target.value)}
                      className="lh-select"
                    >
                      <option value="all">All connected sites</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <select
                      value={reportTypeFilter}
                      onChange={(e) => setReportTypeFilter(e.target.value as any)}
                      className="lh-select"
                    >
                      <option value="all">All categories</option>
                      <option value="milestone">Milestone billing</option>
                      <option value="extrawork">Scope variations</option>
                      <option value="expense">Logged expenses</option>
                    </select>
                  </div>
                </div>

                {/* Main Content: Table + sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  
                  <div className="lg:col-span-8 lh-panel rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                      <div>
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Statement list</span>
                        <p className="text-[10.5px]" style={{ color: 'var(--lh-text-tertiary)' }}>Showing {filteredReportRows.length} records</p>
                      </div>
                      <span className="lh-badge lh-badge-info">Filtered</span>
                    </div>

                    {filteredReportRows.length === 0 ? (
                      <p className="text-[12px] italic py-12 text-center" style={{ color: 'var(--lh-text-tertiary)' }}>
                        No report records match your filters.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="lh-table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Client / Site</th>
                              <th>Detail</th>
                              <th style={{ textAlign: 'right' }}>Cost</th>
                              <th style={{ textAlign: 'center' }}>Status</th>
                              <th style={{ textAlign: 'right' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReportRows.map((row, idx) => {
                              const isPaid = row.payment === 'Paid' || row.payment === 'Approved';
                              return (
                                <tr key={row.id + idx}>
                                  <td>
                                    {row.type === 'milestone' && <span className="lh-badge lh-badge-info">Stage</span>}
                                    {row.type === 'extrawork' && <span className="lh-badge" style={{ background: '#EEEDFE', color: '#5B4DBE' }}>Scope</span>}
                                    {row.type === 'expense' && <span className="lh-badge lh-badge-warning">Spend</span>}
                                  </td>
                                  <td>
                                    <div className="space-y-0.5">
                                      <span className="font-medium">{row.clientName}</span>
                                      <span className="block text-[10px]" style={{ color: 'var(--lh-blue)' }}>{row.projectName}</span>
                                    </div>
                                  </td>
                                  <td className="max-w-[220px] truncate" title={row.workDone}>{row.workDone}</td>
                                  <td style={{ textAlign: 'right' }} className="font-semibold font-mono">₹{row.total.toLocaleString('en-IN')}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {isPaid ? (
                                      <span className="lh-badge lh-badge-success">Settled</span>
                                    ) : (
                                      <span className="lh-badge lh-badge-warning">Pending</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right', color: 'var(--lh-text-tertiary)' }}>{row.date}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="lh-panel rounded-xl p-4.5 space-y-3">
                      <div className="px-1 pb-2" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                        <span className="lh-label">Reporting summary</span>
                        <h4 className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--lh-text-primary)' }}>Module compliance</h4>
                      </div>
                      <ul className="text-[11px] space-y-1.5 list-disc pl-4 font-medium" style={{ color: 'var(--lh-text-secondary)' }}>
                        <li>Left vertical navigation</li>
                        <li>Compact status badges</li>
                        <li>Dense, sortable breakdowns</li>
                        <li>Instant CSV export</li>
                      </ul>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}

        </div>

      </div>

      {/* ===================== NEW PROJECT MODAL ===================== */}
      {showProjModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>New project</h3>
              <button onClick={() => setShowProjModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="lh-label">Project name</label>
                <input
                  type="text" required placeholder="e.g. Rahul Sharma Green Villa"
                  value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client full name</label>
                <input
                  type="text" required placeholder="e.g. Rahul Sharma"
                  value={newProj.clientName} onChange={(e) => setNewProj({ ...newProj, clientName: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client mobile number</label>
                <input
                  type="text" required placeholder="e.g. +91 99880 11223"
                  value={newProj.phone} onChange={(e) => setNewProj({ ...newProj, phone: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input
                  type="email" placeholder="e.g. rahul@sharma-ventures.com"
                  value={newProj.email} onChange={(e) => setNewProj({ ...newProj, email: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Site address</label>
                <input
                  type="text" required placeholder="e.g. Plot 44-B, JP Nagar Block 5, Bangalore"
                  value={newProj.address} onChange={(e) => setNewProj({ ...newProj, address: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Project type</label>
                  <select
                    value={newProj.type} onChange={(e) => setNewProj({ ...newProj, type: e.target.value as any })}
                    className="lh-select"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Renovation">Renovation</option>
                  </select>
                </div>
                <div>
                  <label className="lh-label">Total value (₹)</label>
                  <input
                    type="number" required
                    value={newProj.contractValue} onChange={(e) => setNewProj({ ...newProj, contractValue: Number(e.target.value) })}
                    className="lh-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Start date</label>
                  <input
                    type="date"
                    value={newProj.startDate} onChange={(e) => setNewProj({ ...newProj, startDate: e.target.value })}
                    className="lh-input"
                  />
                </div>
                <div>
                  <label className="lh-label">Target date</label>
                  <input
                    type="date"
                    value={newProj.expectedEndDate} onChange={(e) => setNewProj({ ...newProj, expectedEndDate: e.target.value })}
                    className="lh-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="lh-btn lh-btn-primary lh-btn-lg w-full mt-2"
              >
                Create project & milestones
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT PROJECT MODAL ===================== */}
      {showEditProjModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Edit project</h3>
              <button onClick={() => setShowEditProjModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-3">
              <div>
                <label className="lh-label">Project name</label>
                <input
                  type="text" required
                  value={editProj.name} onChange={(e) => setEditProj({ ...editProj, name: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client full name</label>
                <input
                  type="text" required
                  value={editProj.clientName} onChange={(e) => setEditProj({ ...editProj, clientName: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client mobile number</label>
                <input
                  type="text" required
                  value={editProj.phone} onChange={(e) => setEditProj({ ...editProj, phone: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Client email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input
                  type="email"
                  value={editProj.email} onChange={(e) => setEditProj({ ...editProj, email: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Site address</label>
                <input
                  type="text" required
                  value={editProj.address} onChange={(e) => setEditProj({ ...editProj, address: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Project type</label>
                  <select
                    value={editProj.type} onChange={(e) => setEditProj({ ...editProj, type: e.target.value as any })}
                    className="lh-select"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Renovation">Renovation</option>
                  </select>
                </div>
                <div>
                  <label className="lh-label">Status</label>
                  <select
                    value={editProj.status} onChange={(e) => setEditProj({ ...editProj, status: e.target.value as any })}
                    className="lh-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Hold">Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="lh-label">Total contract value (₹)</label>
                <input
                  type="number" required
                  value={editProj.contractValue} onChange={(e) => setEditProj({ ...editProj, contractValue: Number(e.target.value) })}
                  className="lh-input"
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--lh-text-tertiary)' }}>Changing this does not recalculate existing payment stages.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Start date</label>
                  <input
                    type="date"
                    value={editProj.startDate} onChange={(e) => setEditProj({ ...editProj, startDate: e.target.value })}
                    className="lh-input"
                  />
                </div>
                <div>
                  <label className="lh-label">Target date</label>
                  <input
                    type="date"
                    value={editProj.expectedEndDate} onChange={(e) => setEditProj({ ...editProj, expectedEndDate: e.target.value })}
                    className="lh-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditProjModal(false)}
                  className="lh-btn lh-btn-secondary lh-btn-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lh-btn lh-btn-primary lh-btn-md flex-1"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE MULTIPLE MILESTONE STAGE MODAL ==================== */}
      {showStageModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            
            <div className="flex items-center justify-between pb-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <div className="space-y-1">
                <span className="lh-label">Contractor desk</span>
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>
                  Add milestone stages
                </h3>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  For <span className="font-semibold" style={{ color: 'var(--lh-text-primary)' }}>{activeProj?.clientName}'s</span> project statement.
                </p>
              </div>
              <button 
                onClick={() => setShowStageModal(false)} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                style={{ color: 'var(--lh-text-tertiary)' }}
              >
                ✕
              </button>
            </div>

            {activeProj?.isLocked && (
              <div className="p-3 rounded-lg text-[11.5px] leading-relaxed flex items-start gap-2" style={{ background: 'var(--lh-warning-bg)', color: 'var(--lh-warning-text)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>The milestone structure is locked. Click "Bypass lock" in the dashboard first to make manual additions.</span>
              </div>
            )}

            <form onSubmit={handleAddMultiplePaymentStages} className="space-y-4">
              
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {newStagesList.map((stageItem, idx) => (
                  <div key={idx} className="lh-panel-flat rounded-lg p-4 space-y-3">
                    
                    <div className="flex items-center justify-between">
                      <span className="lh-badge lh-badge-neutral">Item #{idx + 1}</span>
                      {newStagesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStageRow(idx)}
                          className="lh-btn lh-btn-danger lh-btn-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <label className="lh-label">Stage description *</label>
                        <input
                          type="text"
                          required
                          value={stageItem.stageName}
                          onChange={(e) => handleUpdateStageRow(idx, 'stageName', e.target.value)}
                          placeholder="e.g. Roof Concrete GF"
                          className="lh-input"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="lh-label">Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          value={stageItem.payableAmount}
                          onChange={(e) => handleUpdateStageRow(idx, 'payableAmount', Number(e.target.value))}
                          className="lh-input"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="lh-label">Due date <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                        <input
                          type="date"
                          value={stageItem.dueDate}
                          onChange={(e) => handleUpdateStageRow(idx, 'dueDate', e.target.value)}
                          className="lh-input"
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddStageRow}
                  className="lh-btn lh-btn-secondary lh-btn-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add another row</span>
                </button>
                <span className="text-[10.5px] font-medium" style={{ color: 'var(--lh-text-tertiary)' }}>{newStagesList.length} stages</span>
              </div>

              <div className="pt-3.5 flex gap-2.5" style={{ borderTop: '1px solid var(--lh-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowStageModal(false)}
                  className="lh-btn lh-btn-secondary lh-btn-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activeProj?.isLocked}
                  className="lh-btn lh-btn-primary lh-btn-md flex-1"
                  style={activeProj?.isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Publish {newStagesList.length} stages
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE EXTRA WORK MODAL ==================== */}
      {showExtraModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Request scope variation</h3>
              <button onClick={() => setShowExtraModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            <form onSubmit={handleAddExtraWork} className="space-y-3.5">
              <div>
                <label className="lh-label">Work description</label>
                <input
                  type="text" required placeholder="e.g. 60ft compound wall with gate"
                  value={newExtra.description} onChange={(e) => setNewExtra({ ...newExtra, description: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Requested cost (₹)</label>
                <input
                  type="number" required value={newExtra.amount}
                  onChange={(e) => setNewExtra({ ...newExtra, amount: Number(e.target.value) })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Date</label>
                <input
                  type="date" value={newExtra.date}
                  onChange={(e) => setNewExtra({ ...newExtra, date: e.target.value })}
                  className="lh-input"
                />
              </div>
              <button
                type="submit"
                className="lh-btn lh-btn-primary lh-btn-lg w-full mt-1"
              >
                Send proposal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE EXPENSE MODAL ==================== */}
      {showExpenseModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Log expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
             <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="lh-label">Project *</label>
                <select
                  value={newExpense.projectId || selectedProjId}
                  onChange={(e) => setNewExpense({ ...newExpense, projectId: e.target.value })}
                  className="lh-select"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Category</label>
                  <select
                    value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                    className="lh-select"
                  >
                    <option value="Material">Material</option>
                    <option value="Labour">Labour</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Transport">Transport</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="lh-label">Cost (₹)</label>
                  <input
                    type="number" required value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    className="lh-input"
                  />
                </div>
              </div>
              <div>
                <label className="lh-label">Description</label>
                <input
                  type="text" required placeholder="e.g. 400 bags Ultratech cement"
                  value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div>
                <label className="lh-label">Supplier</label>
                <input
                  type="text" placeholder="e.g. ACC Commercial Suppliers"
                  value={newExpense.supplier} onChange={(e) => setNewExpense({ ...newExpense, supplier: e.target.value })}
                  className="lh-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Date</label>
                  <input
                    type="date" value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="lh-input"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <input
                    type="checkbox" id="billCheckInput"
                    checked={newExpense.billUploaded} onChange={(e) => setNewExpense({ ...newExpense, billUploaded: e.target.checked })}
                    className="w-4 h-4 mr-2"
                  />
                  <label htmlFor="billCheckInput" className="text-[12px] font-medium select-none cursor-pointer" style={{ color: 'var(--lh-text-primary)' }}>Bill attached</label>
                </div>
              </div>
              <button
                type="submit"
                className="lh-btn lh-btn-primary lh-btn-lg w-full mt-1"
              >
                Log expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE PROGRESS MODAL ==================== */}
      {showProgressModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Log site progress</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            <form onSubmit={handleAddProgress} className="space-y-3.5">
              <div>
                <label className="lh-label">Remarks</label>
                <textarea
                  required placeholder="e.g. Lintel GF shuttering completed. Columns curing scheduled." rows={3}
                  value={newProg.remarks} onChange={(e) => setNewProg({ ...newProg, remarks: e.target.value })}
                  className="lh-textarea"
                />
              </div>
              <div>
                <label className="lh-label">Site photos <span style={{ fontWeight: 400, textTransform: 'none' }}>(up to 6, compressed automatically)</span></label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleProgressFilesSelected(e.target.files)}
                  className="lh-input"
                  style={{ padding: '7px 10px' }}
                />
                {progPhotoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {progPhotoPreviews.map((src, i) => (
                      <img key={i} src={src} className="w-full h-16 object-cover rounded-md" style={{ border: '1px solid var(--lh-border)' }} alt="Preview" />
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Date</label>
                  <input
                    type="date" value={newProg.date}
                    onChange={(e) => setNewProg({ ...newProg, date: e.target.value })}
                    className="lh-input"
                  />
                </div>
                <div>
                  <label className="lh-label">Video link</label>
                  <input
                    type="text" placeholder="Embed link"
                    value={newProg.videoUrl} onChange={(e) => setNewProg({ ...newProg, videoUrl: e.target.value })}
                    className="lh-input"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isCompressingPhotos}
                className="lh-btn lh-btn-primary lh-btn-lg w-full mt-1"
                style={isCompressingPhotos ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isCompressingPhotos ? 'Processing photos…' : 'Publish update'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE DOC CABINET MODAL ==================== */}
      {showDocModal && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Attach Document</h3>
              <button onClick={() => setShowDocModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="lh-label">Document Title (Optional)</label>
                <input
                  type="text" 
                  placeholder="Leave empty to use file name"
                  value={newDoc.name} 
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  className="lh-input text-xs"
                />
              </div>

              <div>
                <label className="lh-label">Classification</label>
                <select
                  value={newDoc.type} 
                  onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as any })}
                  className="lh-select text-xs"
                >
                  <option value="Agreement">Agreement copy</option>
                  <option value="Quotation">Quotation estimate</option>
                  <option value="BOQ">Bill of quantities</option>
                  <option value="Drawing">Drawing blueprint</option>
                  <option value="Bill">Bill receipt</option>
                  <option value="Approval">Approval certificate</option>
                </select>
              </div>

              <div>
                <label className="lh-label">Select Document File</label>
                <div 
                  className="relative group border-2 border-dashed border-[var(--lh-border)] hover:border-[var(--lh-blue)] rounded-lg p-4 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 transition-colors"
                >
                  <input
                    type="file"
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedDocFile(file);
                      if (file && !newDoc.name) {
                        // strip extension for title input helper
                        const dot = file.name.lastIndexOf('.');
                        const titleName = dot !== -1 ? file.name.substring(0, dot) : file.name;
                        setNewDoc(prev => ({ ...prev, name: titleName }));
                      }
                    }}
                  />
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-center mb-1">
                      <Upload className="w-6 h-6 text-emerald-500 animate-pulse" />
                    </div>
                    {selectedDocFile ? (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[280px]">
                        {selectedDocFile.name} ({(selectedDocFile.size / 1024).toFixed(1)} KB)
                      </div>
                    ) : (
                      <div className="text-[var(--lh-text-secondary)]">
                        <span className="font-semibold text-[var(--lh-blue)]">Click to upload</span> or drag and drop file
                      </div>
                    )}
                    <p className="text-[10px] text-[var(--lh-text-tertiary)]">Supports PDF, CAD, images, XLS, DOC up to 50MB</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploadingDoc}
                className="lh-btn lh-btn-primary lh-btn-lg w-full mt-2"
                style={isUploadingDoc ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isUploadingDoc ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Uploading to Supabase...
                  </span>
                ) : (
                  'Upload to Supabase Storage'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT MILESTONE STAGE MODAL ==================== */}
      {editingStage && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Edit Payment Stage</h3>
              <button onClick={() => setEditingStage(null)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            
            <div className="space-y-3.5 text-left">
              <div>
                <label className="lh-label">Stage Name</label>
                <input
                  type="text"
                  className="lh-input"
                  value={editingStage.stageName}
                  onChange={(e) => setEditingStage({ ...editingStage, stageName: e.target.value })}
                />
              </div>
              <div>
                <label className="lh-label">Payable Amount (₹)</label>
                <input
                  type="number"
                  className="lh-input"
                  value={editingStage.payableAmount}
                  onChange={(e) => setEditingStage({ ...editingStage, payableAmount: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="lh-label">Due Date</label>
                <input
                  type="date"
                  className="lh-input"
                  value={editingStage.dueDate || ''}
                  onChange={(e) => setEditingStage({ ...editingStage, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="lh-label">Received Amount (₹)</label>
                <input
                  type="number"
                  className="lh-input"
                  value={editingStage.receivedAmount || 0}
                  onChange={(e) => {
                    const rec = Number(e.target.value) || 0;
                    setEditingStage({ 
                      ...editingStage, 
                      receivedAmount: rec,
                      status: rec >= editingStage.payableAmount ? 'Paid' : 'Pending'
                    });
                  }}
                />
              </div>
              <div>
                <label className="lh-label">Status</label>
                <select
                  className="lh-select"
                  value={editingStage.status}
                  onChange={(e) => setEditingStage({ ...editingStage, status: e.target.value as any })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingStage(null)}
                className="lh-btn lh-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = stages.map(s => s.id === editingStage.id ? editingStage : s);
                  onUpdateStages(updated);
                  setEditingStage(null);
                }}
                className="lh-btn lh-btn-primary flex-1"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT EXPENSE MODAL ==================== */}
      {showEditExpenseModal && editExpense && (
        <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="lh-modal p-5 max-w-sm w-full">
            <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Edit expense</h3>
              <button onClick={() => setShowEditExpenseModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
            </div>
            <form onSubmit={handleSaveEditExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Category</label>
                  <select value={editExpense.category} onChange={e => setEditExpense({ ...editExpense, category: e.target.value as any })} className="lh-select">
                    {['Material','Labour','Machinery','Transport','Electrical','Plumbing','Miscellaneous'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lh-label">Amount (₹)</label>
                  <input type="number" required value={editExpense.amount} onChange={e => setEditExpense({ ...editExpense, amount: Number(e.target.value) })} className="lh-input" />
                </div>
              </div>
              <div>
                <label className="lh-label">Description</label>
                <input type="text" required value={editExpense.description} onChange={e => setEditExpense({ ...editExpense, description: e.target.value })} className="lh-input" />
              </div>
              <div>
                <label className="lh-label">Supplier</label>
                <input type="text" value={editExpense.supplier} onChange={e => setEditExpense({ ...editExpense, supplier: e.target.value })} className="lh-input" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="lh-label">Date</label>
                  <input type="date" value={editExpense.date} onChange={e => setEditExpense({ ...editExpense, date: e.target.value })} className="lh-input" />
                </div>
                <div className="flex items-center pt-5 gap-2">
                  <input type="checkbox" id="editBillCheck" checked={editExpense.billUploaded} onChange={e => setEditExpense({ ...editExpense, billUploaded: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="editBillCheck" className="text-[12px] font-medium cursor-pointer" style={{ color: 'var(--lh-text-primary)' }}>Bill attached</label>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowEditExpenseModal(false)} className="lh-btn lh-btn-secondary lh-btn-md">Cancel</button>
                <button type="submit" className="lh-btn lh-btn-primary lh-btn-md flex-1">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== PAYMENT RECEIPT MODAL ==================== */}
      {showReceiptModal && (() => {
        const stg = stages.find(s => s.id === receiptStageId);
        if (!stg) return null;
        const balance = stg.payableAmount - stg.receivedAmount;
        return (
          <div className="fixed inset-0 lh-modal-backdrop flex items-center justify-center p-4 z-50">
            <div className="lh-modal p-5 max-w-sm w-full">
              <div className="flex items-center justify-between pb-2.5 mb-3" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                <h3 className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Log payment receipt</h3>
                <button onClick={() => setShowReceiptModal(false)} className="text-sm font-bold" style={{ color: 'var(--lh-text-tertiary)' }}>✕</button>
              </div>

              <div className="lh-panel-flat rounded-lg p-3 mb-4 space-y-1.5 text-[12px]">
                <p className="font-semibold" style={{ color: 'var(--lh-text-primary)' }}>{stg.stageName}</p>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--lh-text-secondary)' }}>Payable</span>
                  <span className="font-mono font-semibold">₹{stg.payableAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--lh-text-secondary)' }}>Already received</span>
                  <span className="font-mono" style={{ color: 'var(--lh-success-text)' }}>₹{stg.receivedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between" style={{ borderTop: '1px solid var(--lh-border)', paddingTop: 6 }}>
                  <span className="font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Balance due</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--lh-warning-text)' }}>₹{balance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <form onSubmit={handleSaveReceipt} className="space-y-3">
                <div>
                  <label className="lh-label">Amount received (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={balance}
                    value={receiptAmount}
                    onChange={e => setReceiptAmount(Number(e.target.value))}
                    className="lh-input"
                  />
                  <p className="text-[10.5px] mt-1" style={{ color: 'var(--lh-text-tertiary)' }}>
                    Max: ₹{balance.toLocaleString('en-IN')}. Stage auto-marks Paid when fully received.
                  </p>
                </div>
                <div>
                  <label className="lh-label">Receipt date</label>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={e => setReceiptDate(e.target.value)}
                    className="lh-input"
                  />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="lh-btn lh-btn-secondary lh-btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="lh-btn lh-btn-primary lh-btn-md flex-1"
                  >
                    Save receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================== PHOTO LIGHTBOX ==================== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(11, 37, 69, 0.85)' }}
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            ✕
          </button>
          <img
            src={lightboxPhoto}
            alt="Site photo full view"
            className="max-w-full max-h-[88vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
