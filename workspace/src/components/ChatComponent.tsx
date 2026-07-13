import React, { useState } from 'react';
import { Project, PaymentStage, ExtraWork, DailyProgress, ProjectDocument, ChatMessage } from '../types';
import ChatComponent from './ChatComponent';
import PaymentStatementSheet from './PaymentStatementSheet';
import RecentActivity from './dashboard/RecentActivity';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, deleteDoc, onSnapshot, query, where, collection } from 'firebase/firestore';
import { db as fdb, auth, signInAnon } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ClientNotification } from '../services/notifications/clientNotification';
import { ContractorNotification } from '../services/notifications/contractorNotification';
import { 
  Building2, 
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
  ThumbsUp, 
  ThumbsDown,
  LayoutGrid,
  Download,
  Info,
  Bell,
  MessageSquare,
  FileSpreadsheet,
  Camera,
  Layers,
  ChevronRight,
  Search,
  Users,
  Briefcase,
  ExternalLink,
  Lock,
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  X,
  Menu,
  Eye,
  EyeOff
} from 'lucide-react';

interface ClientPortalProps {
  projects: Project[];
  stages: PaymentStage[];
  extraWorks: ExtraWork[];
  progress: DailyProgress[];
  documents: ProjectDocument[];
  messages: ChatMessage[];
  onUpdateStages: (newStages: PaymentStage[]) => void;
  onUpdateExtraWorks: (newExtra: ExtraWork[]) => void;
  onUpdateProjects: (newProj: Project[]) => void;
  onSendMessage: (text: string, attachment?: { name: string; type: string; data: string }) => void;
  selectedProjId: string;
  onSelectProject: (id: string) => void;
}

export default function ClientPortal({
  projects,
  stages,
  extraWorks,
  progress,
  documents,
  messages,
  onUpdateStages,
  onUpdateExtraWorks,
  onUpdateProjects,
  onSendMessage,
  selectedProjId,
  onSelectProject
}: ClientPortalProps) {
  const [clientCode, setClientCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('metrobuild_client_code');
    return !!saved;
  });
  const [loginError, setLoginError] = useState('');
  
  // PIN states for client login
  const [loginStep, setLoginStep] = useState<'code' | 'setup-pin' | 'enter-pin'>('code');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [tempProjectId, setTempProjectId] = useState('');
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  
  // Left sidebar module navigation (Unified client experience)
  const [activeModule, setActiveModule] = useState<'overview' | 'payments' | 'variations' | 'updates' | 'documents' | 'chat' | 'direct-expenses'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom interactive toasts and inline comments
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [extraWorkComments, setExtraWorkComments] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(current => current?.message === message ? null : current);
    }, 4500);
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Consume Auth Context
  const { loginAsClient, user, userRole, logout } = useAuth();

  // Active Project for the Client (Declared early to prevent block-scope hoisting issues)
  const activeProject = projects.find(p => {
    const saved = localStorage.getItem('metrobuild_client_code');
    if (saved) {
      return p.clientCode.trim().toUpperCase() === saved.trim().toUpperCase();
    }
    return p.id === selectedProjId;
  }) || projects[0];

  // Dynamic contractor details loader
  const [contractorProfile, setContractorProfile] = useState<{
    ownerName?: string;
    mobile?: string;
    email?: string;
    companyName?: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchContractor = async () => {
      if (activeProject?.contractorUid) {
        try {
          const userSnap = await getDoc(doc(fdb, 'contractorUsers', activeProject.contractorUid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setContractorProfile({
              ownerName: data.ownerName || data.companyName,
              mobile: data.mobile,
              email: data.email,
              companyName: data.companyName
            });
          } else {
            setContractorProfile(null);
          }
        } catch (e) {
          console.warn("Failed to load contractor profile dynamically:", e);
          setContractorProfile(null);
        }
      } else {
        setContractorProfile(null);
      }
    };
    fetchContractor();
  }, [activeProject?.id, activeProject?.contractorUid]);

  // Other Works Expenses State
  const [otherExpenses, setOtherExpenses] = useState<any[]>([]);
  const [loadingOther, setLoadingOther] = useState(false);

  // Form State for Adding Other Expense
  const [showAddForm, setShowAddForm] = useState(false);
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherDate, setOtherDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherCategory, setOtherCategory] = useState('Materials');
  const [otherNotes, setOtherNotes] = useState('');

  // Form State for Editing Other Expense
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Other Works Real-time Sync (Firestore + Offline Fallback)
  React.useEffect(() => {
    if (!user?.uid) {
      // Offline/Demo Mode local fallback
      const local = localStorage.getItem(`client_other_expenses_${activeProject?.id || 'default'}`);
      if (local) {
        setOtherExpenses(JSON.parse(local));
      } else {
        setOtherExpenses([]);
      }
      return;
    }

    setLoadingOther(true);
    const q = query(
      collection(fdb, 'clientOtherWorks'),
      where('clientUid', '==', user.uid),
      where('projectId', '==', activeProject?.id || 'default')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOtherExpenses(items);
      setLoadingOther(false);
    }, (err) => {
      console.warn("Failed to subscribe to client other works:", err);
      setLoadingOther(false);
    });

    return () => unsubscribe();
  }, [user?.uid, activeProject?.id]);

  const handleAddOtherExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherDesc.trim() || !otherAmount.trim()) {
      showToast("Please provide a description and amount.", "error");
      return;
    }
    const amountNum = parseFloat(otherAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Amount must be a positive number.", "error");
      return;
    }

    const payload = {
      description: otherDesc.trim(),
      amount: amountNum,
      date: otherDate,
      category: otherCategory,
      notes: otherNotes.trim(),
      clientUid: user?.uid || 'offline_client',
      projectId: activeProject?.id || 'default',
      createdAt: new Date().toISOString()
    };

    try {
      if (user?.uid) {
        // Write to Firestore
        const docRef = doc(collection(fdb, 'clientOtherWorks'), `other_exp_${Date.now()}`);
        await setDoc(docRef, payload);
      } else {
        // LocalStorage offline mode
        const fresh = { id: `other_exp_${Date.now()}`, ...payload };
        const updated = [fresh, ...otherExpenses];
        setOtherExpenses(updated);
        localStorage.setItem(`client_other_expenses_${activeProject?.id || 'default'}`, JSON.stringify(updated));
      }

      showToast("Expense logged successfully!", "success");
      setOtherDesc('');
      setOtherAmount('');
      setOtherNotes('');
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding other expense:", err);
      showToast("Failed to save expense to database.", "error");
    }
  };

  const handleDeleteOtherExpense = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense entry?")) return;
    try {
      if (user?.uid) {
        await deleteDoc(doc(fdb, 'clientOtherWorks', id));
      } else {
        const updated = otherExpenses.filter(e => e.id !== id);
        setOtherExpenses(updated);
        localStorage.setItem(`client_other_expenses_${activeProject?.id || 'default'}`, JSON.stringify(updated));
      }
      showToast("Expense entry deleted.", "success");
    } catch (err) {
      console.error("Error deleting other expense:", err);
      showToast("Failed to delete expense entry.", "error");
    }
  };

  const handleStartEditOtherExpense = (exp: any) => {
    setEditingId(exp.id);
    setEditDesc(exp.description);
    setEditAmount(String(exp.amount));
    setEditDate(exp.date);
    setEditCategory(exp.category);
    setEditNotes(exp.notes || '');
  };

  const handleSaveEditOtherExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDesc.trim() || !editAmount.trim()) {
      showToast("Description and amount are required.", "error");
      return;
    }
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Amount must be a positive number.", "error");
      return;
    }

    const updatedPayload = {
      description: editDesc.trim(),
      amount: amountNum,
      date: editDate,
      category: editCategory,
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (user?.uid) {
        await updateDoc(doc(fdb, 'clientOtherWorks', editingId!), updatedPayload);
      } else {
        const updated = otherExpenses.map(e => e.id === editingId ? { ...e, ...updatedPayload } : e);
        setOtherExpenses(updated);
        localStorage.setItem(`client_other_expenses_${activeProject?.id || 'default'}`, JSON.stringify(updated));
      }
      showToast("Expense entry updated!", "success");
      setEditingId(null);
    } catch (err) {
      console.error("Error saving edited expense:", err);
      showToast("Failed to update expense entry.", "error");
    }
  };

  React.useEffect(() => {
    const savedCode = localStorage.getItem('metrobuild_client_code');
    if (savedCode && userRole === 'Client') {
      setIsLoggedIn(true);
    }
  }, [userRole]);

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCode.trim()) return;
    setIsLoggingIn(true);
    setLoginError('');

    const codeKey = clientCode.trim().toUpperCase();

    try {
      if (loginStep === 'code') {
        // 1. Perform anonymous sign-in to satisfy firebase rules only if not already signed in
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const { signInAnonymously } = await import('firebase/auth');
          const result = await signInAnonymously(auth);
          currentUser = result.user;
        }
        if (!currentUser) throw new Error("Anonymous authentication failed.");

        // 2. Fetch the client code document
        const lookupRef = doc(fdb, 'clientCodes', codeKey);
        const lookupSnap = await getDoc(lookupRef);

        if (!lookupSnap.exists()) {
          throw new Error(`Invalid client code: "${clientCode}". Please verify and try again.`);
        }

        const codeData = lookupSnap.data();
        const projectId = codeData.projectId;
        setTempProjectId(projectId);

        // 3. Check if PIN exists in clientPins under Project ID or legacy Code Key
        let pinRef = doc(fdb, 'clientPins', projectId);
        let pinSnap = await getDoc(pinRef);

        if (!pinSnap.exists()) {
          const legacyRef = doc(fdb, 'clientPins', codeKey);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            pinRef = legacyRef;
            pinSnap = legacySnap;
          }
        }

        if (pinSnap.exists()) {
          // PIN exists, ask to enter PIN
          setLoginStep('enter-pin');
        } else {
          // PIN does not exist, ask to setup PIN
          setLoginStep('setup-pin');
        }
      } else if (loginStep === 'setup-pin') {
        // 1. Validate PIN is 6 digits
        if (!/^\d{6}$/.test(pin)) {
          throw new Error("PIN must be a 6-digit number.");
        }
        if (pin !== confirmPin) {
          throw new Error("PINs do not match. Please verify.");
        }

        // 2. Save the PIN under both Project ID and the lookup clientCode
        await setDoc(doc(fdb, 'clientPins', tempProjectId), {
          pin: pin,
          projectId: tempProjectId,
          clientCode: codeKey,
          updatedAt: new Date().toISOString()
        });

        if (codeKey !== tempProjectId.toUpperCase()) {
          await setDoc(doc(fdb, 'clientPins', codeKey), {
            pin: pin,
            projectId: tempProjectId,
            clientCode: codeKey,
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Complete loginAsClient
        const projectId = await loginAsClient(clientCode);
        onSelectProject(projectId);
        setIsLoggedIn(true);
        showToast('PIN configured and authenticated securely!', 'success');
      } else if (loginStep === 'enter-pin') {
        // 1. Validate PIN entered
        if (!/^\d{6}$/.test(pin)) {
          throw new Error("PIN must be a 6-digit number.");
        }

        // 2. Fetch stored PIN
        let pinRef = doc(fdb, 'clientPins', tempProjectId);
        let pinSnap = await getDoc(pinRef);

        if (!pinSnap.exists()) {
          const legacyRef = doc(fdb, 'clientPins', codeKey);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            pinRef = legacyRef;
            pinSnap = legacySnap;
          } else {
            // Edge case: Pin was deleted, go back to setup-pin
            setLoginStep('setup-pin');
            throw new Error("PIN document not found. Please set it up now.");
          }
        }

        if (pinSnap.data()?.pin !== pin) {
          throw new Error("Incorrect PIN. Please try again.");
        }

        // 3. Pin matches, complete login
        const projectId = await loginAsClient(clientCode);
        onSelectProject(projectId);
        setIsLoggedIn(true);
        showToast('Successfully authenticated and connected securely!', 'success');
      }
    } catch (err: any) {
      console.error("Secure client login failed:", err);
      setLoginError(err.message || 'Authentication failed. Please verify your connection or client code.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Filter items for the selected project
  const projectStages = activeProject ? stages.filter(s => s.projectId === activeProject.id) : [];
  const projectExtraWorks = activeProject ? extraWorks.filter(e => e.projectId === activeProject.id) : [];
  const projectProgress = activeProject ? progress.filter(p => p.projectId === activeProject.id) : [];
  const projectDocs = activeProject ? documents.filter(d => d.projectId === activeProject.id) : [];

  // Financial status
  const originalContractValue = activeProject ? activeProject.contractValue : 0;
  const approvedExtraValue = projectExtraWorks
    .filter(e => e.approvalStatus === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalAdjustedContractValue = originalContractValue + approvedExtraValue;

  const paidAmount = projectStages
    .reduce((sum, s) => sum + (s.receivedAmount || 0), 0);

  const pendingAmount = totalAdjustedContractValue - paidAmount;

  // Direct Expenses totals & Overall project value
  const directExpensesTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalProjectValue = totalAdjustedContractValue + directExpensesTotal;

  // Progress metrics
  const totalStagesCount = projectStages.length;
  const paidStagesCount = projectStages.filter(s => s.status === 'Paid' || (s.receivedAmount || 0) >= s.payableAmount).length;
  const computedProgressPercentage = totalStagesCount > 0 ? Math.round((paidStagesCount / totalStagesCount) * 100) : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 17
      ? "Good Afternoon"
      : "Good Evening";

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  interface ClientNav {
    id: 'overview' | 'payments' | 'variations' | 'updates' | 'documents' | 'chat' | 'direct-expenses';
    label: string;
    icon: any;
    badge?: number | string;
  }

  const clientTabs: ClientNav[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'payments', label: 'Payments', icon: DollarSign, badge: projectStages.filter(s => s.status !== 'Paid' && (s.receivedAmount || 0) < s.payableAmount).length || undefined },
    { id: 'variations', label: 'Variation Scope', icon: Layers, badge: projectExtraWorks.filter(e => e.approvalStatus === 'Pending').length || undefined },
    { id: 'updates', label: 'Site updates', icon: Camera, badge: projectProgress.length || undefined },
    { id: 'documents', label: 'Documents', icon: FileText, badge: projectDocs.length || undefined },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: messages.length ? 'Live' : undefined },
    { id: 'direct-expenses', label: 'Direct Expenses', icon: Receipt, badge: otherExpenses.length || undefined },
  ];

  // Simulate payment stage click
  const handleSimulatePayment = (stageId: string) => {
    const updated = stages.map(s => {
      if (s.id === stageId) {
        let currentLog = s.paymentLog || [];
        const currentSum = currentLog.reduce((sum, l) => sum + (l.amount || 0), 0);
        if (s.receivedAmount > 0 && currentSum === 0) {
          currentLog = [{
            id: `pay_initial_${s.id}`,
            amount: s.receivedAmount,
            date: s.dueDate || new Date().toISOString().split('T')[0],
            reference: 'Existing Received Balance'
          }];
        }
        const actualReceived = currentLog.reduce((sum, l) => sum + (l.amount || 0), 0);
        const payingAmount = s.payableAmount - actualReceived;
        if (payingAmount <= 0) return s;
        
        const newEntry = {
          id: `pay_${Date.now()}`,
          amount: payingAmount,
          date: new Date().toISOString().split('T')[0],
          reference: 'Client Portal (Online Sim)'
        };
        
        const updatedLog = [...currentLog, newEntry];
        const newReceived = updatedLog.reduce((sum, l) => sum + (l.amount || 0), 0);
        
        return {
          ...s,
          status: 'Paid' as const,
          receivedAmount: newReceived,
          paymentLog: updatedLog
        };
      }
      return s;
    });
    onUpdateStages(updated);

    const updatedStage = stages.find(s => s.id === stageId);
    showToast(`Payment of ₹${updatedStage?.payableAmount.toLocaleString('en-IN')} simulated successfully!`, 'success');

    // Trigger Payment Approved Notification (Push style)
    if (activeProject && updatedStage) {
      ContractorNotification.paymentApproved(activeProject.name, updatedStage.stageName).catch(err => {
        console.warn('Payment approved notification failed:', err);
      });
    }

    // Auto update status on lock if Advance stage goes Paid
    if (stageId.includes('advance') || stageId.includes('stg_advance') || (updatedStage && updatedStage.stageName.toLowerCase().includes('advance'))) {
      const updatedProjs = projects.map(p => {
        if (activeProject && p.id === activeProject.id) {
          return { ...p, isLocked: true };
        }
        return p;
      });
      onUpdateProjects(updatedProjs);
    }
  };

  // Client approvals for variation proposals
  const handleExtraWorkApproval = (ewId: string, status: 'Approved' | 'Rejected' | 'Revision Requested') => {
    const comment = extraWorkComments[ewId] || '';
    const updated = extraWorks.map(ew => {
      if (ew.id === ewId) {
        return {
          ...ew,
          approvalStatus: status,
          clientComment: comment
        };
      }
      return ew;
    });
    onUpdateExtraWorks(updated);
    showToast(`Proposal ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'info');

    // Trigger Variation Approved Notification (Push style)
    if (status === 'Approved' && activeProject) {
      ContractorNotification.variationApproved(activeProject.name).catch(err => {
        console.warn('Variation approved notification failed:', err);
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12" id="client-login-view">
        <div className="lh-modal p-8" style={{ boxShadow: 'var(--lh-shadow-sm)' }}>
          <div className="text-center mb-6">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
              <Building2 className="w-6 h-6" />
            </span>
            <h2 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Client access</h2>
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--lh-text-secondary)' }}>
              Enter the access code shared by your contractor to view your project.
            </p>
          </div>

          <form onSubmit={handleCodeLogin} className="space-y-4">
            {loginStep === 'code' && (
              <div>
                <label className="lh-label">Project ID (Access Code)</label>
                <input
                  type="text"
                  required
                  disabled={isLoggingIn}
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  placeholder="e.g., proj_123456"
                  className="lh-input text-center font-mono tracking-wide disabled:opacity-50"
                />
              </div>
            )}

            {loginStep === 'setup-pin' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="lh-label mb-0">Project ID (Access Code)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('code');
                        setPin('');
                        setConfirmPin('');
                        setLoginError('');
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Change code
                    </button>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={clientCode.toUpperCase()}
                    className="lh-input text-center font-mono tracking-wide bg-slate-50 dark:bg-slate-900 opacity-70"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-xl text-center">
                  <p className="text-[11.5px] text-amber-800 dark:text-amber-300 font-medium">
                    ✨ First-Time Login: Set up a secure 6-digit PIN for future access.
                  </p>
                </div>

                <div>
                  <label className="lh-label">Choose 6-Digit PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      pattern="\d*"
                      maxLength={6}
                      required
                      disabled={isLoggingIn}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6 digits"
                      className="lh-input text-center font-mono tracking-widest disabled:opacity-50 w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="lh-label">Confirm 6-Digit PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      pattern="\d*"
                      maxLength={6}
                      required
                      disabled={isLoggingIn}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Re-enter 6 digits"
                      className="lh-input text-center font-mono tracking-widest disabled:opacity-50 w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loginStep === 'enter-pin' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="lh-label mb-0">Project ID (Access Code)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('code');
                        setPin('');
                        setLoginError('');
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Change code
                    </button>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={clientCode.toUpperCase()}
                    className="lh-input text-center font-mono tracking-wide bg-slate-50 dark:bg-slate-900 opacity-70"
                  />
                </div>

                <div>
                  <label className="lh-label">Enter 6-Digit PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      pattern="\d*"
                      maxLength={6}
                      required
                      disabled={isLoggingIn}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="lh-input text-center font-mono tracking-widest text-lg disabled:opacity-50 w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loginError && (
              <p className="text-[11.5px] font-medium flex items-center gap-1.5 p-3 rounded-lg" style={{ color: 'var(--lh-danger-text)', background: 'var(--lh-danger-bg)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{loginError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="lh-btn lh-btn-primary lh-btn-lg w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Connecting securely...</span>
                </>
              ) : (
                <span>
                  {loginStep === 'code' ? 'Access workspace' : loginStep === 'setup-pin' ? 'Set PIN & Connect' : 'Verify PIN & Connect'}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]" id="client-loading-view">
        <span className="animate-spin inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-medium" style={{ color: 'var(--lh-text-secondary)' }}>Securing connection and loading your project data...</p>
      </div>
    );
  }
  return (
    <div className="space-y-5 relative" id="client-portal-dashboard">
      
      {/* Notification Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] shadow-2xl rounded-xl px-4 py-3 flex items-center gap-2.5 text-[12px] font-medium" style={{ background: 'var(--lh-navy)', color: '#fff' }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#5DCAA5' }} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Payment Request Alerts */}
      {projectStages.filter(s => s.paymentRequested && s.status !== 'Paid' && (s.receivedAmount || 0) < s.payableAmount).map((stg, idx) => (
        <div 
          key={`req-alert-${stg.id}-${idx}`} 
          className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border shadow-xs" 
          style={{ background: 'var(--lh-surface)', borderColor: 'rgba(217, 119, 6, 0.45)' }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[12.5px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                Pending Payment Request
              </h4>
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--lh-text-primary)' }}>
                Contractor has requested payment of <strong style={{ color: 'var(--lh-text-primary)' }}>₹{stg.payableAmount.toLocaleString('en-IN')}</strong> for milestone <strong style={{ color: 'var(--lh-text-primary)' }}>"{stg.stageName}"</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSimulatePayment(stg.id)}
            className="lh-btn lh-btn-sm self-start sm:self-center flex items-center gap-1 text-white bg-amber-600 hover:bg-amber-700 border-none transition-colors"
            style={{ background: '#d97706', border: 'none', color: '#fff' }}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Verify & Pay Now</span>
          </button>
        </div>
      ))}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lh-panel rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-surface-muted)' }}>
            <Building2 className="w-4.5 h-4.5" style={{ color: 'var(--lh-text-secondary)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="lh-badge lh-badge-success">Client Console</span>
              <span className="lh-badge lh-badge-neutral font-mono">{activeProject.id}</span>
            </div>
            <h2 className="text-[14px] font-display font-semibold mt-1" style={{ color: 'var(--lh-text-primary)' }}>
              {activeProject.name} — Workspace
            </h2>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-[11px] text-slate-400 font-medium">Logged in as Client</p>
          <p className="text-[12px] font-bold" style={{ color: 'var(--lh-text-primary)' }}>{activeProject.clientName}</p>
        </div>
      </div>

      {/* Main Grid Viewport Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Sidebar and Navigation */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Desktop Left Sidebar Panel */}
          <div className="hidden lg:block lh-panel rounded-xl p-3.5 space-y-4">
            <div className="px-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="lh-label text-[10px]">Active Project</span>
              <h3 className="text-[13px] font-extrabold truncate mt-0.5 text-indigo-600 dark:text-indigo-400">
                {activeProject.name}
              </h3>
            </div>

            <nav className="space-y-1">
              {clientTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModule(tab.id as any)}
                    className={`lh-nav-item w-full flex items-center justify-between py-2 px-3 rounded-lg text-[12.5px] font-semibold transition-all ${
                      isSelected 
                        ? 'active bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                        tab.id === 'payments' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : tab.id === 'variations' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : tab.id === 'chat' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Switch Account (Small row after modules list) */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <button
                onClick={() => {
                  localStorage.removeItem('metrobuild_client_code');
                  setIsLoggedIn(false);
                  setLoginStep('code');
                  setPin('');
                  setConfirmPin('');
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Switch account</span>
              </button>
              <button
                onClick={() => {
                  setNewPin('');
                  setConfirmNewPin('');
                  setResetPinError('');
                  setShowResetPinModal(true);
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reset Account PIN</span>
              </button>
            </div>

            {/* Your Contractor Section (Populated dynamically) */}
            <div className="pt-3.5 text-[11px] space-y-2 px-1 border-t border-slate-100 dark:border-slate-800" style={{ color: 'var(--lh-text-secondary)' }}>
              <span className="font-extrabold uppercase tracking-wider text-[9.5px] block text-slate-400">
                Your contractor
              </span>
              <div className="space-y-1 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-[12px] text-slate-800 dark:text-slate-200">
                  {contractorProfile?.companyName || activeProject?.contractorName || 'Workspace'}
                </p>
                <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Phone className="w-3 h-3" /> 
                  <span>{contractorProfile?.mobile || activeProject?.contractorPhone || 'N/A'}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
                  <Mail className="w-3 h-3" /> 
                  {contractorProfile?.email || activeProject?.contractorEmail || 'N/A'}
                </p>
            
              </div>
            </div>
          </div>

          {/* Mobile Navigation Header with Burger Icon */}
          <div className="flex lg:hidden items-center justify-between p-3 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs mb-4" id="client-mobile-nav-trigger">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700"
                aria-label="Toggle navigation menu"
                id="mobile-client-burger-btn"
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <div className="flex items-center gap-2 pl-1">
                {(() => {
                  const activeTabItem = clientTabs.find(t => t.id === activeModule);
                  if (!activeTabItem) return null;
                  const Icon = activeTabItem.icon;
                  return (
                    <>
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200">{activeTabItem.label}</span>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Code</span>
              <span className="text-[11.5px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeProject.id}</span>
            </div>
          </div>

          {/* Mobile Off-Canvas Sidebar Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden" id="client-mobile-sidebar-drawer">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Drawer Content */}
              <div className="relative flex w-full max-w-[280px] flex-col bg-white dark:bg-slate-900 h-full p-5 shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--lh-amber)' }}>
                      CL
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase leading-none">Client Portal</span>
                      <span className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100 truncate max-w-[150px] block">{activeProject.name}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                {/* Modules Navigation */}
                <div className="py-4 space-y-1">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">Modules</span>
                  <nav className="space-y-0.5">
                    {clientTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeModule === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveModule(tab.id as any);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between py-2 px-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                            isSelected 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 font-bold' 
                              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              tab.id === 'payments' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : tab.id === 'variations' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                              : tab.id === 'chat' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Switch Account and Reset PIN */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        localStorage.removeItem('metrobuild_client_code');
                        setIsLoggedIn(false);
                        setLoginStep('code');
                        setPin('');
                        setConfirmPin('');
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Switch account</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setNewPin('');
                        setConfirmNewPin('');
                        setResetPinError('');
                        setShowResetPinModal(true);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Reset Account PIN</span>
                    </button>
                  </div>

                  {/* Contractor Profile */}
                  <div className="pt-3 text-[11px] space-y-2 border-t border-slate-100 dark:border-slate-800" style={{ color: 'var(--lh-text-secondary)' }}>
                    <span className="font-extrabold uppercase tracking-wider text-[9.5px] block text-slate-400">
                      Your contractor
                    </span>
                    <div className="space-y-1 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-[12px] text-slate-800 dark:text-slate-200 truncate">
                        {contractorProfile?.companyName || activeProject?.contractorName || 'Workspace'}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Phone className="w-3 h-3" /> 
                        <span>{contractorProfile?.mobile || activeProject?.contractorPhone || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
                        <Mail className="w-3 h-3" /> 
                        <span className="truncate">{contractorProfile?.email || activeProject?.contractorEmail || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT MODULE WORKSPACE */}
        <div className="lg:col-span-9 space-y-5">
          
          {/* A: OVERVIEW MODULE */}
          {activeModule === 'overview' && (
            <div className="space-y-5">
              
              {/* Dynamic Greetings Blue Box with Weather Report */}
              <div 
                className="rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm border border-blue-100/10" 
                style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: '#fff' }}
              >
                {/* Background ambient bubble */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                
                <div className="space-y-1.5 relative z-10">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-200/90 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-300" />
                    {formattedDate}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight">
                    ☀ {greeting}, {activeProject.clientName}!
                  </h2>
                  <p className="text-xs text-blue-100/95 font-medium max-w-md leading-relaxed">
                    Let's track your dream space progress today. Welcome to your Lifehut Workspace.
                  </p>
                </div>

                {/* Real-time Weather Report Indication */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-lg self-start md:self-center relative z-10 text-white">
                  <div className="text-3xl animate-bounce">⛅</div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black">29°C</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 font-bold text-emerald-200 uppercase tracking-wide">
                        Clear for Site Work
                      </span>
                    </div>
                    <div className="text-[10px] text-blue-100/80 font-semibold mt-0.5">
                      Scattered Clouds • Wind: 14 km/h • Humidity: 58%
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Progress Panel */}
              <div className="lh-panel rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--lh-text-primary)' }}>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>Project Financial Summary</span>
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    ₹{paidAmount.toLocaleString('en-IN')} Paid
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="lh-panel p-4 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Original Contract</span>
                    <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                      ₹{originalContractValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="lh-panel p-4 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Extra Works</span>
                    <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                      ₹{approvedExtraValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="lh-panel p-4 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Adjusted Total</span>
                    <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                      ₹{totalAdjustedContractValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="lh-panel p-4 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Direct Expenses</span>
                    <p className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400">
                      ₹{directExpensesTotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Separate row box for key client-facing totals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50/40 dark:bg-amber-950/10 p-4 rounded-lg border border-amber-100/70 dark:border-amber-900/30">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pending Payment</span>
                      <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                        ₹{pendingAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 dark:bg-indigo-950/25 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xs pointer-events-none" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Total Project Value</span>
                      <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                        ₹{totalProjectValue.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span style={{ color: 'var(--lh-text-secondary)' }}>Payment Milestones Cleared</span>
                    <span style={{ color: 'var(--lh-blue)' }}>{computedProgressPercentage}% Verified</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${computedProgressPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    *Milestone updates are processed upon approval.
                  </p>
                </div>
              </div>

              {/* Site updates preview row */}
              <div className="lh-panel rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--lh-text-primary)' }}>
                    <Camera className="w-4 h-4 text-indigo-500" />
                    <span>Latest Site Updates</span>
                  </h3>
                  <button 
                    onClick={() => setActiveModule('updates')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>View all Site Updates</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {projectProgress.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No progress photos recorded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectProgress.slice(-2).reverse().map((prog) => (
                      <div key={`preview-${prog.id}`} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="relative rounded-lg overflow-hidden aspect-video border border-slate-100 dark:border-slate-800" style={{ background: 'var(--lh-surface-sunken)' }}>
                          <img 
                            src={prog.photos[0] || ""} 
                            alt="Site progress report preview" 
                            onClick={() => setLightboxPhoto(prog.photos[0])}
                            className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{prog.date}</p>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {prog.remarks}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Recent Activity Feed */}
              <RecentActivity
                projects={projects.filter(p => p.id === activeProject.id)}
                stages={stages.filter(s => s.projectId === activeProject.id)}
                extraWorks={extraWorks.filter(e => e.projectId === activeProject.id)}
                expenses={[]} // hide contractor expenses in client view
                progress={progress.filter(p => p.projectId === activeProject.id)}
                documents={documents.filter(d => d.projectId === activeProject.id)}
                userRole="Client"
              />

            </div>
          )}

          {/* B: PAYMENTS MODULE */}
          {activeModule === 'payments' && (
            <div className="space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: 'var(--lh-navy)' }}>
                <span className="lh-badge" style={{ background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' }}>Payments</span>
                <h3 className="text-lg font-display font-semibold tracking-tight text-white">Milestone payment statement</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  View full contract schedule of payments, request status, and simulate online clearance of pending milestones.
                </p>
              </div>

              <div className="lh-panel rounded-xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800">
                <PaymentStatementSheet 
                  project={activeProject} 
                  stages={projectStages} 
                  onPayStage={handleSimulatePayment}
                  isClientView={true}
                  contractorName={contractorProfile?.companyName || contractorProfile?.ownerName || activeProject.contractorName || 'Workspace'}
                />
              </div>
            </div>
          )}

          {/* C: VARIATION SCOPE MODULE */}
          {activeModule === 'variations' && (
            <div className="space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: 'var(--lh-navy)' }}>
                <span className="lh-badge" style={{ background: 'rgba(230,126,34,0.18)', color: '#F5A961' }}>Variation Scope</span>
                <h3 className="text-lg font-display font-semibold tracking-tight text-white">Work orders awaiting your review</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Additional works the team has logged that need your approval. Approving adds the amount into the adjusted contract total.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectExtraWorks.length === 0 ? (
                  <div className="md:col-span-2 text-center py-12 lh-panel rounded-xl" style={{ color: 'var(--lh-text-tertiary)' }}>
                    No extra work orders recorded yet.
                  </div>
                ) : (
                  projectExtraWorks.map((ew) => (
                    <div key={ew.id} className="lh-panel rounded-xl p-4.5 space-y-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start gap-2 pb-2.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
                        <div>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--lh-surface-muted)', color: 'var(--lh-text-tertiary)' }}>{ew.id}</span>
                          <h4 className="text-[13px] font-bold mt-1.5 leading-normal" style={{ color: 'var(--lh-text-primary)' }}>{ew.description}</h4>
                        </div>
                        <span className={`lh-badge ${
                          ew.approvalStatus === 'Approved' ? 'lh-badge-success'
                          : ew.approvalStatus === 'Rejected' ? 'lh-badge-neutral'
                          : ew.approvalStatus === 'Revision Requested' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50'
                          : 'lh-badge-warning'
                        }`}>
                          {ew.approvalStatus}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--lh-text-secondary)' }}>Amount</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">₹{ew.amount.toLocaleString('en-IN')}</span>
                      </div>

                      {ew.photos && ew.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {ew.photos.map((p, pIdx) => (
                            <div key={pIdx} className="relative rounded-lg overflow-hidden aspect-video border border-slate-100 dark:border-slate-800 bg-slate-50">
                              <img 
                                src={p} 
                                alt="Scope change support documentation" 
                                onClick={() => setLightboxPhoto(p)}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {ew.approvalStatus === 'Pending' ? (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="lh-label text-[10px] mb-1 block">Feedback Comment (Optional)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Please revise the price or list of materials..."
                              value={extraWorkComments[ew.id] || ''}
                              onChange={(e) => setExtraWorkComments(prev => ({ ...prev, [ew.id]: e.target.value }))}
                              className="lh-input lh-input-sm w-full"
                            />
                          </div>
                          <div className="flex flex-wrap md:flex-nowrap gap-2">
                            <button
                              onClick={() => handleExtraWorkApproval(ew.id, 'Approved')}
                              className="flex-1 lh-btn lh-btn-sm text-white bg-emerald-600 hover:bg-emerald-700 border-none transition-colors flex items-center justify-center gap-1"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleExtraWorkApproval(ew.id, 'Revision Requested')}
                              className="flex-1 lh-btn lh-btn-sm text-white bg-amber-500 hover:bg-amber-600 border-none transition-colors flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-request</span>
                            </button>
                            <button
                              onClick={() => handleExtraWorkApproval(ew.id, 'Rejected')}
                              className="flex-1 lh-btn lh-btn-secondary lh-btn-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <span className="font-extrabold uppercase tracking-wide text-[9px] text-slate-400 block">Client Comment</span>
                          <p className="font-medium italic text-slate-600 dark:text-slate-300">
                            "{ew.clientComment || 'No feedback comment supplied.'}"
                          </p>
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* D: SITE UPDATES MODULE */}
          {activeModule === 'updates' && (
            <div className="space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: 'var(--lh-navy)' }}>
                <span className="lh-badge" style={{ background: 'rgba(129, 140, 248, 0.18)', color: '#a5b4fc' }}>Site Updates</span>
                <h3 className="text-lg font-display font-semibold tracking-tight text-white">Site inspection photo log</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  View daily, real-time photographic updates logged directly from the job site by our engineering and masonry teams.
                </p>
              </div>

              <div className="space-y-4">
                {projectProgress.length === 0 ? (
                  <div className="text-center py-12 lh-panel rounded-xl" style={{ color: 'var(--lh-text-tertiary)' }}>
                    No site updates have been posted by the contractor yet.
                  </div>
                ) : (
                  projectProgress.slice().reverse().map((prog) => (
                    <div key={prog.id} className="lh-panel rounded-xl p-4.5 space-y-3.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{prog.date}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">ID: {prog.id}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prog.photos.map((ph, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden aspect-video border border-slate-100 dark:border-slate-800 bg-slate-50">
                            <img 
                              src={ph} 
                              alt="Progress site report" 
                              onClick={() => setLightboxPhoto(ph)}
                              className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-101 hover:opacity-90"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--lh-text-primary)' }}>
                        {prog.remarks}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* E: DOCUMENTS MODULE */}
          {activeModule === 'documents' && (
            <div className="space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: 'var(--lh-navy)' }}>
                <span className="lh-badge" style={{ background: 'rgba(99, 102, 241, 0.18)', color: '#a5b4fc' }}>Documents</span>
                <h3 className="text-lg font-display font-semibold tracking-tight text-white">Project Agreement & Blueprint Vault</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Securely download project agreements, architectural drawings, and validated invoices mapped to your workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectDocs.length === 0 ? (
                  <div className="md:col-span-2 text-center py-12 lh-panel rounded-xl" style={{ color: 'var(--lh-text-tertiary)' }}>
                    No agreement or quotation documents loaded into vault yet.
                  </div>
                ) : (
                  projectDocs.map((doc) => (
                    <div key={doc.id} className="lh-panel rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-[12.5px] font-bold" style={{ color: 'var(--lh-text-primary)' }}>{doc.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{doc.type} • {doc.fileSize}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast(`Simulating secure download for document: ${doc.name}`, 'info')}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* F: CHAT MODULE */}
          {activeModule === 'chat' && (
            <div className="space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: 'var(--lh-navy)' }}>
                <span className="lh-badge" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399' }}>Chat</span>
                <h3 className="text-lg font-display font-semibold tracking-tight text-white">Direct Project Discussion Room</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Chat in real-time with your contractor. Send updates, resolve design queries, and attach supporting documentation directly.
                </p>
              </div>

              <div className="lh-panel rounded-xl overflow-hidden p-4 border border-slate-100 dark:border-slate-800" style={{ height: '580px' }}>
                <ChatComponent 
                  projectId={activeProject.id} 
                  messages={messages} 
                  onSendMessage={onSendMessage} 
                  sender="Client" 
                />
              </div>
            </div>
          )}

          {/* G: DIRECT EXPENSES MODULE */}
          {activeModule === 'direct-expenses' && (
            <div className="space-y-5 animate-fade-in" id="client-direct-expenses-module">
              <div className="rounded-xl p-5 space-y-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md border border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-400" />
                  <span className="lh-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>Client Exclusive</span>
                </div>
                <h3 className="text-xl font-display font-semibold tracking-tight text-white">Direct Expenses</h3>
                <p className="text-[12px] leading-relaxed text-slate-300">
                  Maintain a personal ledger of other project expenses, independent materials, or specialty vendors that you manage directly. 
                  <strong className="text-indigo-200 block mt-1">🔒 Private: This information and its ledger are strictly confidential and are NEVER shared with or visible to the contractor.</strong>
                </p>
              </div>

              {/* Stat summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="lh-panel p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Direct Spend</span>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    ₹{otherExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-500 font-semibold block">Managed independently</span>
                </div>

                <div className="lh-panel p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Logged Entries</span>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {otherExpenses.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block">Total entries in ledger</span>
                </div>

                <div className="lh-panel p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Primary Category</span>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate mt-1">
                    {otherExpenses.length > 0 ? (
                      (() => {
                        const counts: Record<string, number> = {};
                        otherExpenses.forEach(e => { counts[e.category] = (counts[e.category] || 0) + e.amount; });
                        const topCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                        return topCat ? `${topCat[0]} (₹${topCat[1].toLocaleString('en-IN')})` : "No entries logged";
                      })()
                    ) : "No entries logged"}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">By financial volume</span>
                </div>
              </div>

              {/* Add Expense Toggle & Search bar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingId(null);
                  }}
                  className="lh-btn lh-btn-primary flex items-center justify-center gap-1.5 self-start text-[12.5px] font-semibold py-2 px-4 rounded-lg shadow-sm"
                >
                  {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{showAddForm ? "Cancel Log Entry" : "Log New Direct Expense"}</span>
                </button>

                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="lh-input w-full !pl-9 text-[12.5px] py-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Log New Expense Card / Inline Form */}
              {showAddForm && (
                <form onSubmit={handleAddOtherExpense} className="lh-panel rounded-xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-800/10">
                  <h4 className="font-display font-semibold text-[14px] text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    Log Direct Purchase / Expense
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Expense / Item Description</label>
                      <input
                        type="text"
                        placeholder="e.g., Purchased premium marble tile slabs"
                        value={otherDesc}
                        onChange={(e) => setOtherDesc(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g., 45000"
                        value={otherAmount}
                        onChange={(e) => setOtherAmount(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Purchase/Expense Date</label>
                      <input
                        type="date"
                        value={otherDate}
                        onChange={(e) => setOtherDate(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Category</label>
                      <select
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                        className="lh-input w-full text-xs"
                      >
                        <option value="Materials">Materials</option>
                        <option value="Labour/Service">Labour/Service</option>
                        <option value="Sanitary & Plumbing">Sanitary & Plumbing</option>
                        <option value="Electricals & Lighting">Electricals & Lighting</option>
                        <option value="Interior & Decor">Interior & Decor</option>
                        <option value="Appliances">Appliances</option>
                        <option value="Permits & Approvals">Permits & Approvals</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="lh-label text-xs">Memo/Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add delivery note, vendor name, or details..."
                        value={otherNotes}
                        onChange={(e) => setOtherNotes(e.target.value)}
                        className="lh-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="lh-btn lh-btn-secondary lh-btn-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Expense Entry
                    </button>
                  </div>
                </form>
              )}

              {/* Editing Expense Inline Form */}
              {editingId && (
                <form onSubmit={handleSaveEditOtherExpense} className="lh-panel rounded-xl p-5 border border-amber-200 dark:border-amber-900/50 space-y-4 bg-amber-50/10">
                  <h4 className="font-display font-semibold text-[14px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-amber-500" />
                    Modify Ledger Entry
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Expense Description</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Amount (₹)</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="lh-input w-full text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="lh-label text-xs">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="lh-input w-full text-xs"
                      >
                        <option value="Materials">Materials</option>
                        <option value="Labour/Service">Labour/Service</option>
                        <option value="Sanitary & Plumbing">Sanitary & Plumbing</option>
                        <option value="Electricals & Lighting">Electricals & Lighting</option>
                        <option value="Interior & Decor">Interior & Decor</option>
                        <option value="Appliances">Appliances</option>
                        <option value="Permits & Approvals">Permits & Approvals</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="lh-label text-xs">Notes (Optional)</label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="lh-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="lh-btn lh-btn-secondary lh-btn-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5 bg-amber-600 border-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Expense Ledger Records Table/Cards */}
              <div className="lh-panel rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                {loadingOther ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                    <p>Fetching your secure private ledger...</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">Expense Ledger</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Showing {
                        otherExpenses.filter(e => 
                          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length
                      } items</span>
                    </div>

                    {/* Ledger List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {otherExpenses.filter(e => 
                        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.category.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-12 text-center space-y-2">
                          <p className="text-2xl">📓</p>
                          <h5 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">Personal Ledger is Empty</h5>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Log your personal materials purchases, extra fittings, or independent expenses to maintain a complete picture of your project cost.
                          </p>
                        </div>
                      ) : (
                        otherExpenses
                          .filter(e => 
                            e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            e.category.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((exp) => (
                            <div key={exp.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-[13.5px] text-slate-800 dark:text-slate-200 leading-snug">
                                    {exp.description}
                                  </h4>
                                  <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                                    exp.category === 'Materials' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                    exp.category === 'Labour/Service' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                    exp.category === 'Sanitary & Plumbing' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                                    exp.category === 'Electricals & Lighting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    exp.category === 'Interior & Decor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                    exp.category === 'Appliances' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                    exp.category === 'Permits & Approvals' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' :
                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    {exp.category}
                                  </span>
                                </div>
                                {exp.notes && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 italic font-normal">
                                    “{exp.notes}”
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-400">
                                  Logged on: {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 self-end md:self-center">
                                <div className="text-right">
                                  <span className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 block">
                                    ₹{exp.amount.toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEditOtherExpense(exp)}
                                    className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Edit Entry"
                                    type="button"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOtherExpense(exp.id)}
                                    className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Delete Entry"
                                    type="button"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Photo lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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

      {/* Reset PIN Modal */}
      {showResetPinModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              Reset Account PIN
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5">
              Set a new 6-digit PIN for your client account. The contractor will not have access to this PIN.
            </p>

            <div className="space-y-4 mt-5">
              <div>
                <label className="lh-label">New 6-Digit PIN</label>
                <input
                  type="password"
                  pattern="\d*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6 digits"
                  className="lh-input text-center font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="lh-label">Confirm New 6-Digit PIN</label>
                <input
                  type="password"
                  pattern="\d*"
                  maxLength={6}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter 6 digits"
                  className="lh-input text-center font-mono tracking-widest"
                />
              </div>

              {resetPinError && (
                <p className="text-[11.5px] font-medium flex items-center gap-1.5 p-3 rounded-lg text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{resetPinError}</span>
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPinModal(false);
                    setNewPin('');
                    setConfirmNewPin('');
                    setResetPinError('');
                  }}
                  className="flex-1 lh-btn lh-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setResetPinError('');
                      if (!/^\d{6}$/.test(newPin)) {
                        throw new Error("PIN must be exactly 6 digits.");
                      }
                      if (newPin !== confirmNewPin) {
                        throw new Error("PINs do not match.");
                      }

                      const savedCode = localStorage.getItem('metrobuild_client_code');
                      if (!savedCode) {
                        throw new Error("Client session not found. Please log in again.");
                      }

                      const codeKey = savedCode.trim().toUpperCase();
                      await setDoc(doc(fdb, 'clientPins', codeKey), {
                        pin: newPin,
                        projectId: activeProject.id,
                        clientCode: codeKey,
                        updatedAt: new Date().toISOString()
                      }, { merge: true });

                      showToast("Account PIN reset successfully!", "success");
                      setShowResetPinModal(false);
                      setNewPin('');
                      setConfirmNewPin('');
                    } catch (err: any) {
                      setResetPinError(err.message || "Failed to update PIN.");
                    }
                  }}
                  className="flex-1 lh-btn lh-btn-primary"
                >
                  Save PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}