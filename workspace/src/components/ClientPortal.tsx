import React, { useState } from 'react';
import { Project, PaymentStage, ExtraWork, DailyProgress, ProjectDocument, ChatMessage } from '../types';
import ChatComponent from './ChatComponent';
import PaymentStatementSheet from './PaymentStatementSheet';
import RecentActivity from './dashboard/RecentActivity';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db as fdb, auth, signInAnon } from '../firebase';
import { useAuth } from '../context/AuthContext';
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
  Lock
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
  
  // Left sidebar module navigation (Unified client experience)
  const [activeModule, setActiveModule] = useState<'overview' | 'payments' | 'variations' | 'updates' | 'documents' | 'chat'>('overview');
  
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
  const { loginAsClient, user, userRole } = useAuth();

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
          const userSnap = await getDoc(doc(fdb, 'users', activeProject.contractorUid));
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
  }, [activeProject?.contractorUid]);

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

    try {
      const projectId = await loginAsClient(clientCode);
      onSelectProject(projectId);
      setIsLoggedIn(true);
      showToast('Successfully authenticated and connected securely!', 'success');
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
    id: 'overview' | 'payments' | 'variations' | 'updates' | 'documents' | 'chat';
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
  ];

  // Simulate payment stage click
  const handleSimulatePayment = (stageId: string) => {
    const updated = stages.map(s => {
      if (s.id === stageId) {
        return {
          ...s,
          status: 'Paid' as const,
          receivedAmount: s.payableAmount
        };
      }
      return s;
    });
    onUpdateStages(updated);

    const updatedStage = stages.find(s => s.id === stageId);
    showToast(`Payment of ₹${updatedStage?.payableAmount.toLocaleString('en-IN')} simulated successfully!`, 'success');

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
  const handleExtraWorkApproval = (ewId: string, status: 'Approved' | 'Rejected') => {
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
            <div>
              <label className="lh-label">Client access code</label>
              <input
                type="text"
                required
                disabled={isLoggingIn}
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="e.g., CLIENT-GREEN"
                className="lh-input text-center font-mono tracking-wide disabled:opacity-50"
              />
              <p className="text-[11px] mt-2" style={{ color: 'var(--lh-text-tertiary)' }}>
                Try <span className="font-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--lh-surface-muted)', color: 'var(--lh-text-secondary)' }}>CLIENT-GREEN</span> for the demo dashboard.
              </p>
            </div>

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
                <span>Access workspace</span>
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
      {projectStages.filter(s => s.paymentRequested && s.status !== 'Paid' && (s.receivedAmount || 0) < s.payableAmount).map(stg => (
        <div 
          key={`req-alert-${stg.id}`} 
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
              <span className="lh-badge lh-badge-neutral font-mono">{activeProject.clientCode}</span>
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
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  localStorage.removeItem('metrobuild_client_code');
                  setIsLoggedIn(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Switch account</span>
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

            {/* Logout / Signout at the End of Sidebar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  localStorage.removeItem('metrobuild_client_code');
                  setIsLoggedIn(false);
                }}
                className="w-full text-left px-3 py-2 text-[12px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Logout / Signout</span>
              </button>
            </div>
          </div>

          {/* Mobile responsive horizontal scroll selection bar */}
          <div className="flex lg:hidden overflow-x-auto py-1 gap-2 no-scrollbar mb-4" id="client-mobile-bar">
            {clientTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveModule(tab.id as any)}
                  className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all flex-shrink-0 shadow-2xs"
                  style={isSelected 
                    ? { background: 'var(--lh-blue)', color: '#fff' } 
                    : { background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)', color: 'var(--lh-text-secondary)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            
            {/* Mobile Switch Account & Signout items at end of scroll list */}
            <button
              onClick={() => {
                localStorage.removeItem('metrobuild_client_code');
                setIsLoggedIn(false);
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 flex-shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Switch account</span>
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem('metrobuild_client_code');
                setIsLoggedIn(false);
              }}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 flex-shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Logout / Signout</span>
            </button>
          </div>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Original Contract</span>
                    <p className="text-sm font-extrabold mt-1" style={{ color: 'var(--lh-text-primary)' }}>
                      ₹{originalContractValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Extra Works</span>
                    <p className="text-sm font-extrabold mt-1 text-indigo-600 dark:text-indigo-400">
                      ₹{approvedExtraValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Adjusted Total</span>
                    <p className="text-sm font-extrabold mt-1" style={{ color: 'var(--lh-text-primary)' }}>
                      ₹{totalAdjustedContractValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Pending Balance</span>
                    <p className="text-sm font-extrabold mt-1 text-amber-600 dark:text-amber-400">
                      ₹{pendingAmount.toLocaleString('en-IN')}
                    </p>
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
                    *Stage 1 lock is triggered upon clearing of the advance milestone.
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
                  Additional works the team has logged that need your approval. Approving locks the amount into the adjusted contract total.
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
                              placeholder="e.g. Approved, please proceed immediately..."
                              value={extraWorkComments[ew.id] || ''}
                              onChange={(e) => setExtraWorkComments(prev => ({ ...prev, [ew.id]: e.target.value }))}
                              className="lh-input lh-input-sm w-full"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExtraWorkApproval(ew.id, 'Approved')}
                              className="flex-1 lh-btn lh-btn-sm text-white bg-blue-600 hover:bg-blue-700 border-none transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleExtraWorkApproval(ew.id, 'Rejected')}
                              className="flex-1 lh-btn lh-btn-secondary lh-btn-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
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

    </div>
  );
}