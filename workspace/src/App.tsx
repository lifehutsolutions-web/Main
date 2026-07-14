/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { 
  fetchAll, 
  saveAll, 
  initDB,
  resetDB
} from './data';
import { Project, PaymentStage, ExtraWork, Expense, DailyProgress, ProjectDocument, ChatMessage } from './types';
import ContractorPortal from './components/ContractorPortal';
import ClientPortal from './components/ClientPortal';
import DbManager from './components/DbManager';
import ProfileSetupModal from "./components/ProfileSetupModal";
import PullToRefresh from "./components/PullToRefresh";
import Logo from './components/Logo';
import { ClientNotification } from './services/notifications/clientNotification';
import { ContractorNotification } from './services/notifications/contractorNotification';
import { SystemNotification } from './services/notifications/systemNotification';
import { HardHat, User, ArrowRight, Building2, ShieldCheck, ChevronRight, AlertTriangle, ExternalLink, ShieldAlert, LogOut, Sparkles, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { 
  auth, 
  db as fdb, 
  signInGoogle, 
  signInAnon,
  logOut, 
  handleFirestoreError,
  OperationType,
  testConnection
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc
} from 'firebase/firestore';

export default function App() {
  // Consume central Auth Context
  const { 
    user, 
    userRole, 
    userProfile, 
    isDemoMode, 
    authLoading, 
    selectedProjId, 
    setSelectedProjId, 
    loginAsContractor, 
    loginContractorWithEmail,
    registerContractorWithEmail,
    sendPasswordResetEmail,
    loginAsTestContractor,
    logout: authLogout, 
    startDemoMode,
    updateUserProfile
  } = useAuth();

  const logout = async () => {
    localStorage.removeItem('metrobuild_client_code');
    setShowAutoFallbackBanner(false);
    try {
      resetDB();
      await authLogout();
    } catch (err) {
      console.error("authLogout failed:", err);
    }
    setViewingMode('welcome');
  };

 
  // DB States
  const [db, setDb] = useState<{
    projects: Project[];
    stages: PaymentStage[];
    extraWorks: ExtraWork[];
    expenses: Expense[];
    progress: DailyProgress[];
    documents: ProjectDocument[];
    messages: ChatMessage[];
  } | null>(null);

  // Active workspace profile
  const [activeRole, setActiveRole] = useState<'Contractor' | 'Client'>('Contractor');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAutoFallbackBanner, setShowAutoFallbackBanner] = useState<boolean>(false);

  // Contractor Email Auth sub-states for Capacitor / native mobile support
  const [contractorAuthSubMode, setContractorAuthSubMode] = useState<'selection' | 'email-signin' | 'email-signup'>('selection');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('metrobuild_remember_me') !== 'false';
  });
  const [emailFormEmail, setEmailFormEmail] = useState(() => {
    return localStorage.getItem('metrobuild_remembered_email') || '';
  });
  const [emailFormPassword, setEmailFormPassword] = useState(() => {
    return localStorage.getItem('metrobuild_remembered_password') || '';
  });
  const [emailFormName, setEmailFormName] = useState('');
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const renderAuthError = () => {
    if (!authError) return null;

    const isUnauthorizedDomain = authError.toLowerCase().includes('unauthorized-domain');
    const currentHostname = window.location.hostname;

    return (
      <div className="p-4 rounded-xl text-left bg-red-50/90 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-3" style={{ fontSize: '12px' }}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            {isUnauthorizedDomain ? (
              <>
                <p className="font-semibold text-red-800 dark:text-red-300">Firebase Unauthorized Domain</p>
                <p className="text-red-600 dark:text-red-400 leading-relaxed text-[11.5px]">
                  To enable Google Sign-In on this domain, please add <code className="bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded font-mono text-[11px] font-semibold text-red-900 dark:text-red-200">{currentHostname}</code> to your <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized Domains</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-800 dark:text-red-300">Authentication Error</p>
                <p className="text-red-600 dark:text-red-400 leading-relaxed text-[11.5px]">
                  {authError}
                </p>
              </>
            )}
          </div>
        </div>
        
        {window.self !== window.top && (
          <div className="pt-2 border-t border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row gap-2">
            <button 
              onClick={async () => {
                setAuthError(null);
                try {
                  await loginAsTestContractor();
                  setViewingMode('portal');
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : String(err));
                }
              }}
              className="px-3 py-1.5 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition-colors text-center text-[11px]"
            >
              Iframe-Safe Contractor Login
            </button>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-center text-[11px] flex items-center justify-center gap-1"
              style={{ color: 'var(--lh-text-primary)' }}
            >
              <ExternalLink className="w-3 h-3" />
              Open in New Tab
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderPasswordResetSuccess = () => {
    if (!passwordResetSuccess) return null;

    return (
      <div className="p-4 rounded-xl text-left bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/40 space-y-1" style={{ fontSize: '12px' }}>
        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Password Reset Sent</p>
        <p className="text-emerald-600 dark:text-emerald-400 leading-relaxed text-[11.5px]">
          {passwordResetSuccess}
        </p>
      </div>
    );
  };

  // Load / Sync fallback
  const loadLocalDatabase = () => {
    initDB();
    const data = fetchAll();
    setDb(data);
    if (data.projects && data.projects.length > 0 && !data.projects.some(p => p && p.id === selectedProjId)) {
      setSelectedProjId(data.projects[0].id);
    }
  };

  // 1. Local fallback database loader (for Demo/Sandbox/Offline)
  useEffect(() => {
    if (isDemoMode || !user) {
      loadLocalDatabase();
    }
  }, [isDemoMode, user]);

  // Clear local demo data when entering Cloud Mode to prevent any leakage or mixed state
  useEffect(() => {
    if (user && !isDemoMode) {
      setDb(null);
    }
  }, [user, isDemoMode]);

  // Sync local activeRole toggle state with central userRole
  useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
    }
  }, [userRole]);

  // Network connection status listeners for SystemNotifications
  useEffect(() => {
    const handleOffline = () => {
      SystemNotification.offline().catch(err => console.log("Offline notice error:", err));
    };
    
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm] = useState({
    companyName: "",
    ownerName: "",
    mobile: "",
    email: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Sync profileForm when userProfile from context changes
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        companyName: userProfile.companyName || "",
        ownerName: userProfile.ownerName || user?.displayName || "",
        mobile: userProfile.mobile || "",
        email: userProfile.email || user?.email || "",
        gstNumber: userProfile.gstNumber || "",
        address: userProfile.address || "",
        city: userProfile.city || "",
        state: userProfile.state || "",
        pincode: userProfile.pincode || "",
      });

      // Contractor profile incompleteness checker
      if (user && !user.isAnonymous && !isDemoMode && (!userProfile.companyName || !userProfile.mobile)) {
        setShowProfileSetup(true);
      }
    }
  }, [userProfile, user, isDemoMode]);


  // 2. Real-time Projects Listener (when signed in)
  useEffect(() => {
    if (!user) return;

    // Filter projects where user.uid is in memberUids to enforce secure scoping
    const q = query(collection(fdb, 'projects'), where('memberUids', 'array-contains', user.uid));
    const unsubProjects = onSnapshot(q, async (snapshot) => {
      console.log("Projects found:", snapshot.size);
      
      const fetchedProjects: Project[] = [];
      snapshot.forEach((doc) => {
        fetchedProjects.push(doc.data() as Project);
      });
      console.log("Firestore Projects:", fetchedProjects);

      // Seeding / migration to Cloud DB if Firestore is fully empty for this user
      if (false && fetchedProjects.length === 0) {
        initDB();
        const localData = fetchAll();
        if (localData.projects.length > 0) {
          console.log("Beginning automatic sandbox sync migration for user:", user.uid);
          try {
            // Keep a mapping of local ID to unique cloud ID to prevent ID collisions between users
            const idMap: Record<string, string> = {};

            for (const p of localData.projects) {
              const cloudId = `${p.id}_${user.uid}`;
              idMap[p.id] = cloudId;

              // Check if code exists to determine the cloud client code and avoid global collision
              const codeKey = p.clientCode.trim().toUpperCase();
              const codeSnap = await getDoc(doc(fdb, 'clientCodes', codeKey)).catch(() => null);
              let cloudClientCode = codeKey;
              if (codeSnap && codeSnap.exists()) {
                cloudClientCode = `${codeKey}-${user.uid.slice(0, 4).toUpperCase()}`;
              }

              const migratedProj = {
                ...p,
                id: cloudId,
                clientCode: cloudClientCode,
                contractorUid: user.uid,
                memberUids: [user.uid]
              };

              // Write project document
              await setDoc(doc(fdb, 'projects', cloudId), migratedProj);

              // Map clientCode to project ID securely for client lookup
              await setDoc(doc(fdb, 'clientCodes', cloudClientCode), {
                projectId: cloudId,
                redeemed: false,
                redeemedBy: ""
              });
            }

            // Populate initial project relations with mapped project IDs
            for (const s of localData.stages) {
              const cloudProjId = idMap[s.projectId];
              if (cloudProjId) {
                const migratedStage = { ...s, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/stages`, s.id), migratedStage);
              }
            }
            for (const ew of localData.extraWorks) {
              const cloudProjId = idMap[ew.projectId];
              if (cloudProjId) {
                const migratedEW = { ...ew, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/extraWorks`, ew.id), migratedEW);
              }
            }
            for (const exp of localData.expenses) {
              const cloudProjId = idMap[exp.projectId];
              if (cloudProjId) {
                const migratedExp = { ...exp, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/expenses`, exp.id), migratedExp);
              }
            }
            for (const prg of localData.progress) {
              const cloudProjId = idMap[prg.projectId];
              if (cloudProjId) {
                const migratedPrg = { ...prg, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/progress`, prg.id), migratedPrg);
              }
            }
            for (const d of localData.documents) {
              const cloudProjId = idMap[d.projectId];
              if (cloudProjId) {
                const migratedDoc = { ...d, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/documents`, d.id), migratedDoc);
              }
            }
            for (const m of localData.messages) {
              const cloudProjId = idMap[m.projectId];
              if (cloudProjId) {
                const migratedMsg = { ...m, projectId: cloudProjId };
                await setDoc(doc(fdb, `projects/${cloudProjId}/messages`, m.id), migratedMsg);
              }
            }
            console.log("Migration complete!");
          } catch (migrateErr) {
            console.error("Migration error: ", migrateErr);
          }
        }

        // Always initialize db state even if no projects fetched or if migration was blocked/failed
        setDb(prev => {
          const base = prev || {
            projects: [],
            stages: [],
            extraWorks: [],
            expenses: [],
            progress: [],
            documents: [],
            messages: []
          };
          return { ...base, projects: [] };
        });
      } else {
        setDb(prev => {
          const base = prev || {
            projects: [],
            stages: [],
            extraWorks: [],
            expenses: [],
            progress: [],
            documents: [],
            messages: []
          };
          return { ...base, projects: fetchedProjects };
        });
        if (fetchedProjects && fetchedProjects.length > 0 && !fetchedProjects.some(p => p && p.id === selectedProjId)) {
          setSelectedProjId(fetchedProjects[0].id);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubProjects();
  }, [user]);

  // 3. Real-time Subcollection Listeners for All Authorized Projects (when signed in)
  useEffect(() => {
    if (!user || !db || !db.projects || db.projects.length === 0) return;

    // Filter projects that the user is actually authorized for
    const authorizedProjects = db.projects.filter(p => p && p.memberUids?.includes(user.uid));
    if (authorizedProjects.length === 0) return;

    const unsubs: (() => void)[] = [];
    
    // Maps of project ID -> items for each subcollection to easily merge them
    const stagesMap: Record<string, PaymentStage[]> = {};
    const extraWorksMap: Record<string, ExtraWork[]> = {};
    const expensesMap: Record<string, Expense[]> = {};
    const progressMap: Record<string, DailyProgress[]> = {};
    const documentsMap: Record<string, ProjectDocument[]> = {};
    const messagesMap: Record<string, ChatMessage[]> = {};

    const updateDb = () => {
      setDb(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stages: Object.values(stagesMap).flat(),
          extraWorks: Object.values(extraWorksMap).flat(),
          expenses: Object.values(expensesMap).flat(),
          progress: Object.values(progressMap).flat(),
          documents: Object.values(documentsMap).flat(),
          messages: Object.values(messagesMap).flat()
        };
      });
    };

    authorizedProjects.forEach(proj => {
      const projectPath = `projects/${proj.id}`;

      // Stages subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/stages`), (snapshot) => {
        const items: PaymentStage[] = [];
        snapshot.forEach(d => items.push(d.data() as PaymentStage));
        stagesMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/stages`)));

      // Extra works subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/extraWorks`), (snapshot) => {
        const items: ExtraWork[] = [];
        snapshot.forEach(d => items.push(d.data() as ExtraWork));
        extraWorksMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/extraWorks`)));

      // Expenses subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/expenses`), (snapshot) => {
        const items: Expense[] = [];
        snapshot.forEach(d => items.push(d.data() as Expense));
        expensesMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/expenses`)));

      // Progress subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/progress`), (snapshot) => {
        const items: DailyProgress[] = [];
        snapshot.forEach(d => items.push(d.data() as DailyProgress));
        progressMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/progress`)));

      // Documents subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/documents`), (snapshot) => {
        const items: ProjectDocument[] = [];
        snapshot.forEach(d => items.push(d.data() as ProjectDocument));
        documentsMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/documents`)));

      // Messages subscription
      unsubs.push(onSnapshot(collection(fdb, `${projectPath}/messages`), (snapshot) => {
        const items: ChatMessage[] = [];
        snapshot.forEach(d => items.push(d.data() as ChatMessage));
        messagesMap[proj.id] = items;
        updateDb();
      }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/messages`)));
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, db?.projects?.map(p => p?.id).join(',')]);

  // Sync to Storage Helper (Local/Offline Mode)
  const syncDatabase = (updatedDb: typeof db) => {
    if (!updatedDb) return;
    if (!user || isDemoMode) {
      saveAll(updatedDb);
    }
    setDb({ ...updatedDb });
  };

  // State update callbacks (Write directly to Firestore if logged in, otherwise Local fallback)
  const handleUpdateProjects = async (newProj: Project[]) => {
    if (!db) return;
    if (user) {
      try {
        const changedItems = newProj.filter(p => {
          const old = db.projects.find(o => o.id === p.id);
          return !old || JSON.stringify(old) !== JSON.stringify(p);
        }).map(p => {
          // If this is a newly created project, assign membership & ownership
          const isNew = !db.projects.some(old => old.id === p.id);
          if (isNew && !p.memberUids) {
            return {
              ...p,
              contractorUid: user.uid,
              memberUids: [user.uid]
            };
          }
          return p;
        });

         await Promise.all(
          changedItems.map(async (item) => {
            // 1. Write core project document first
            await setDoc(doc(fdb, 'projects', item.id), item);

            // 2. Also write member registration in members subcollection for the creator
            await setDoc(doc(fdb, `projects/${item.id}/members`, user.uid), {
              role: 'Contractor',
              uid: user.uid
            });

            // 3. Register the Project ID directly in clientCodes to allow client lookup/login
            await setDoc(doc(fdb, 'clientCodes', item.id.trim().toUpperCase()), {
              projectId: item.id,
              redeemed: false,
              redeemedBy: ""
            });
          })
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects`);
      }
    } else {
      syncDatabase({ ...db, projects: newProj });
    }
  };

  const handleUpdateStages = async (newStages: PaymentStage[]) => {
    if (!db) return;
    const deletedItems = db.stages.filter(old => !newStages.some(n => n.id === old.id));
    const changedItems = newStages.filter(s => {
      const old = db.stages.find(o => o.id === s.id);
      return !old || JSON.stringify(old) !== JSON.stringify(s);
    });

    // Check if any stage status changed to 'Pending' / 'Overdue' or became requested to trigger a payment reminder notification
    const hasDueStage = changedItems.some(item => {
      const old = db.stages.find(o => o.id === item.id);
      const becameOverdueOrPending = (item.status === 'Pending' && (!old || old.status !== 'Pending')) ||
                                     (item.status === 'Overdue' && (!old || old.status !== 'Overdue'));
      const becameRequested = !!item.paymentRequested && (!old || !old.paymentRequested);
      return becameOverdueOrPending || becameRequested;
    });
    if (hasDueStage) {
      ClientNotification.paymentReminder().catch(err => console.log("Payment reminder notification failed:", err));
    }

    syncDatabase({ ...db, stages: newStages });
    if (user) {
      try {
        await Promise.all([
          ...changedItems.map(item =>
            setDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/stages`, item.id), item)
          ),
          ...deletedItems.map(item =>
            deleteDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/stages`, item.id))
          )
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/stages`);
      }
    }
  };

  const handleUpdateExtraWorks = async (newExtra: ExtraWork[]) => {
    if (!db) return;
    const deletedItems = db.extraWorks.filter(old => !newExtra.some(n => n.id === old.id));
    const changedItems = newExtra.filter(e => {
      const old = db.extraWorks.find(o => o.id === e.id);
      return !old || JSON.stringify(old) !== JSON.stringify(e);
    });
    syncDatabase({ ...db, extraWorks: newExtra });
    if (user) {
      try {
        await Promise.all([
          ...changedItems.map(item =>
            setDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/extraWorks`, item.id), item)
          ),
          ...deletedItems.map(item =>
            deleteDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/extraWorks`, item.id))
          )
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/extraWorks`);
      }
    }
  };

  const handleUpdateExpenses = async (newExp: Expense[]) => {
    if (!db) return;
    const deletedItems = db.expenses.filter(old => !newExp.some(n => n.id === old.id));
    const changedItems = newExp.filter(e => {
      const old = db.expenses.find(o => o.id === e.id);
      return !old || JSON.stringify(old) !== JSON.stringify(e);
    });

    // Check if a new expense is logged (i.e. present in changedItems but not in old db.expenses)
    const hasNewExpense = changedItems.some(item => !db.expenses.some(old => old.id === item.id));
    if (hasNewExpense) {
      ClientNotification.expenseApproval().catch(err => console.log("Expense approval notification failed:", err));
    }

    syncDatabase({ ...db, expenses: newExp });
    if (user) {
      try {
        await Promise.all([
          ...changedItems.map(item =>
            setDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/expenses`, item.id), item)
          ),
          ...deletedItems.map(item =>
            deleteDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/expenses`, item.id))
          )
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/expenses`);
      }
    }
  };

  const handleUpdateProgress = async (newProg: DailyProgress[]) => {
    if (!db) return;
    const deletedItems = db.progress.filter(old => !newProg.some(n => n.id === old.id));
    const changedItems = newProg.filter(p => {
      const old = db.progress.find(o => o.id === p.id);
      return !old || JSON.stringify(old) !== JSON.stringify(p);
    });

    // Check if a new daily progress item is added
    const hasNewProgress = changedItems.some(item => !db.progress.some(old => old.id === item.id));
    if (hasNewProgress) {
      ClientNotification.progressUploaded().catch(err => console.log("Progress uploaded notification failed:", err));
    }

    syncDatabase({ ...db, progress: newProg });
    if (user) {
      try {
        await Promise.all([
          ...changedItems.map(item =>
            setDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/progress`, item.id), item)
          ),
          ...deletedItems.map(item =>
            deleteDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/progress`, item.id))
          )
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/progress`);
      }
    }
  };

  const handleUpdateDocuments = async (newDocs: ProjectDocument[]) => {
    if (!db) return;
    const deletedItems = db.documents.filter(old => !newDocs.some(n => n.id === old.id));
    const changedItems = newDocs.filter(d => {
      const old = db.documents.find(o => o.id === d.id);
      return !old || JSON.stringify(old) !== JSON.stringify(d);
    });
    syncDatabase({ ...db, documents: newDocs });
    if (user) {
      try {
        await Promise.all([
          ...changedItems.map(item =>
            setDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/documents`, item.id), item)
          ),
          ...deletedItems.map(item =>
            deleteDoc(doc(fdb, `projects/${item.projectId || selectedProjId}/documents`, item.id))
          )
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/documents`);
      }
    }
  };

  const handleSendMessage = async (text: string, attachment?: { name: string; type: string; data: string }) => {
    if (!db) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      projectId: selectedProjId,
      sender: activeRole,
      text,
      timestamp: new Date().toISOString(),
      ...(attachment ? {
        attachmentName: attachment.name,
        attachmentType: attachment.type,
        attachmentData: attachment.data,
      } : {}),
    };
    if (user) {
      try {
        await setDoc(doc(fdb, `projects/${selectedProjId}/messages`, msg.id), msg);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/messages/${msg.id}`);
      }
    } else {
      syncDatabase({ ...db, messages: [...db.messages, msg] });
    }
  };

  // Viewing Modes: welcome | portal
  const [viewingMode, setViewingMode] = useState<'welcome' | 'portal'>('welcome');

  // Automatically navigate to portal if signed in, or welcome if signed out
  useEffect(() => {
    if (user) {
      const role = userProfile?.role || 'Contractor';
      setActiveRole(role);
      setViewingMode('portal');
    } else if (!isDemoMode) {
      setViewingMode('welcome');
    }
  }, [user, userProfile, isDemoMode]);

  const handleSelectRole = (role: 'Contractor' | 'Client') => {
    setActiveRole(role);
    setViewingMode('portal');
  };

  if (authLoading || !db) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: 'var(--lh-surface-sunken)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-xs animate-pulse p-1 flex-shrink-0">
            <Logo className="w-7 h-7" />
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--lh-text-secondary)' }}>Initializing Lifehut Workspace…</p>
        </div>
      </div>
    );
  }

  // 1. UNIFIED WELCOME & AUTHENTICATION SCREEN
  if (viewingMode === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans" style={{ background: 'var(--lh-surface-sunken)' }} id="welcome-container">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 rounded-2xl overflow-hidden lh-panel" style={{ boxShadow: 'var(--lh-shadow-sm)' }} id="welcome-attachment-layout">

          {/* LEFT: Brand panel */}
          <div className="lg:col-span-2 p-9 md:p-11 flex flex-col justify-between relative animate-fade-in" style={{ background: 'var(--lh-navy)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-xs p-1 flex-shrink-0">
                <Logo className="w-7 h-7" />
              </div>
              <span className="font-display font-semibold tracking-tight text-sm text-white">Lifehut Workspace</span>
            </div>

            <div className="my-10 space-y-4">
              <span className="inline-block text-[10px] tracking-widest font-bold uppercase px-2.5 py-1 rounded-md" style={{ background: 'rgba(230,126,34,0.18)', color: '#F5A961' }}>
                Project Management ERP
              </span>
              <h1 className="text-2xl md:text-[28px] font-display font-semibold tracking-tight text-white leading-snug">
                Where projects, clients and teams work together
              </h1>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Structured payments, daily site progress, scope approvals, document control and client communication — in one place.
              </p>
            </div>

            <div className="space-y-2.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#5DCAA5' }} />
                <span>Project-scoped access for every client</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" style={{ color: '#5DCAA5' }} />
                <span>Built for real Project workflows</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Combined profile selector / entry panel */}
          <div className="lg:col-span-3 p-9 md:p-11 flex flex-col justify-center space-y-7 animate-fade-in" style={{ background: 'var(--lh-surface)' }}>
            {contractorAuthSubMode === 'selection' ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Select active profile</h3>
                  <p className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Sign in as contractor or enter a client access code</p>
                </div>

                {renderAuthError()}

                <div className="space-y-3">
                  
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setContractorAuthSubMode('email-signin');
                    }}
                    className="w-full p-4 text-left rounded-xl transition-all flex items-center justify-between gap-3.5 group"
                    style={{ border: '1px solid var(--lh-border)', background: 'var(--lh-surface)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-blue)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
                        <HardHat className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <span className="font-display font-semibold text-[13px] block" style={{ color: 'var(--lh-text-primary)' }}>Contractor sign in</span>
                        <p className="text-[11.5px] leading-normal" style={{ color: 'var(--lh-text-secondary)' }}>
                          Manage projects, payments and approvals (Email or Google)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleSelectRole('Client')}
                    className="w-full p-4 text-left rounded-xl transition-all flex items-center justify-between gap-3.5 group"
                    style={{ border: '1px solid var(--lh-border)', background: 'var(--lh-surface)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-amber)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-warning-bg)', color: 'var(--lh-amber-dark)' }}>
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <span className="font-display font-semibold text-[13px] block" style={{ color: 'var(--lh-text-primary)' }}>Client access</span>
                        <p className="text-[11.5px] leading-normal" style={{ color: 'var(--lh-text-secondary)' }}>
                          View your project using your access code
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      setAuthError(null);
                      resetDB();
                      startDemoMode();
                      setViewingMode('portal');
                    }}
                    className="w-full p-4 text-left rounded-xl transition-all flex items-center justify-between gap-3.5 group"
                    style={{ border: '1px solid var(--lh-border)', background: 'var(--lh-surface)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed' }}>
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <span className="font-display font-semibold text-[13px] block" style={{ color: 'var(--lh-text-primary)' }}>Demo projects</span>
                        <p className="text-[11.5px] leading-normal" style={{ color: 'var(--lh-text-secondary)' }}>
                          Explore pre-loaded project examples for marketing
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                </div>
              </>
            ) : contractorAuthSubMode === 'email-signin' ? (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <button 
                    onClick={() => { setContractorAuthSubMode('selection'); setAuthError(null); setPasswordResetSuccess(null); }} 
                    className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to profiles
                  </button>
                  <h3 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Contractor Sign In</h3>
                  <p className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Sign in with email/password or use Google</p>
                </div>

                {renderAuthError()}
                {renderPasswordResetSuccess()}

                {/* Google sign-in fallback trigger */}
                <button
                  type="button"
                  onClick={async () => {
                    setAuthError(null);
                    try {
                      await loginAsContractor();
                      handleSelectRole('Contractor');
                    } catch (err: any) {
                      const isAuthIssue = err?.message?.toLowerCase().includes('unauthorized-domain') || 
                                          err?.code?.toLowerCase().includes('unauthorized-domain') ||
                                          err?.message?.toLowerCase().includes('popup-closed') ||
                                          err?.code?.toLowerCase().includes('popup-closed-by-user') ||
                                          true; 
                      
                      if (isAuthIssue) {
                        console.warn("Expected Google sign in exception, executing sandbox fallback:", err);
                        try {
                          await loginAsTestContractor();
                          setShowAutoFallbackBanner(true);
                          setActiveRole('Contractor');
                          setViewingMode('portal');
                        } catch (fallbackErr) {
                          console.error("Sandbox fallback login failed:", fallbackErr);
                          setAuthError("Fallback login failed. Please try again.");
                        }
                      } else {
                        console.error("Google sign in failed:", err);
                        setAuthError(err?.message || "Google sign in failed.");
                      }
                    }
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border transition-all"
                  style={{ borderColor: 'var(--lh-border)', color: 'var(--lh-text-primary)', background: 'var(--lh-surface)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-blue)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continue with Google
                </button>



                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  <span>or use email address</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  setEmailAuthLoading(true);
                  try {
                    await loginContractorWithEmail(emailFormEmail, emailFormPassword);
                    if (rememberMe) {
                      localStorage.setItem('metrobuild_remembered_email', emailFormEmail);
                      localStorage.setItem('metrobuild_remembered_password', emailFormPassword);
                      localStorage.setItem('metrobuild_remember_me', 'true');
                    } else {
                      localStorage.removeItem('metrobuild_remembered_email');
                      localStorage.removeItem('metrobuild_remembered_password');
                      localStorage.setItem('metrobuild_remember_me', 'false');
                    }
                    handleSelectRole('Contractor');
                  } catch (err: any) {
                    console.error("Email login failed:", err);
                    setAuthError(err?.message || "Invalid email or password. Please verify and try again.");
                  } finally {
                    setEmailAuthLoading(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="lh-label block mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email" required placeholder="contractor@yourfirm.com"
                        value={emailFormEmail} onChange={e => setEmailFormEmail(e.target.value)}
                        className="lh-input w-full"
                        style={{ paddingLeft: '38px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="lh-label block">Password</label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!emailFormEmail.trim()) {
                            setAuthError("Please enter your email address in the field above first, then click 'Forgot password?' to receive a password reset link.");
                            setPasswordResetSuccess(null);
                            return;
                          }
                          setAuthError(null);
                          setPasswordResetSuccess(null);
                          setEmailAuthLoading(true);
                          try {
                            await sendPasswordResetEmail(emailFormEmail.trim());
                            setPasswordResetSuccess(`A password reset link has been sent to ${emailFormEmail.trim()}. Please open the link in your email inbox to set a secure password for your email login.`);
                          } catch (err: any) {
                            console.error("Password reset failed:", err);
                            setAuthError(err?.message || "Failed to send password reset email. Please verify the email address is correct.");
                          } finally {
                            setEmailAuthLoading(false);
                          }
                        }}
                        className="text-[11.5px] font-semibold transition-colors hover:underline"
                        style={{ color: 'var(--lh-blue)' }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"} required placeholder="Enter your password"
                        value={emailFormPassword} onChange={e => setEmailFormPassword(e.target.value)}
                        className="lh-input w-full"
                        style={{ paddingLeft: '38px', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                      />
                      <span className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                        Remember me on this device
                      </span>
                    </label>
                  </div>
                  <button
                    type="submit" disabled={emailAuthLoading}
                    className="w-full py-3 px-4 text-xs font-semibold text-white rounded-lg transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--lh-blue)' }}
                  >
                    {emailAuthLoading ? 'Authenticating...' : 'Sign In as Contractor'}
                  </button>
                </form>

                <p className="text-center text-[12px] pt-1" style={{ color: 'var(--lh-text-secondary)' }}>
                  Don't have an account yet?{' '}
                  <button onClick={() => { setContractorAuthSubMode('email-signup'); setAuthError(null); }} className="underline font-semibold" style={{ color: 'var(--lh-blue)' }}>
                    Register now
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <button 
                    onClick={() => { setContractorAuthSubMode('selection'); setAuthError(null); }} 
                    className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to profiles
                  </button>
                  <h3 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Create Contractor Account</h3>
                  <p className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Register directly for native mobile & workspace access</p>
                </div>

                {renderAuthError()}

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (emailFormPassword.length < 6) {
                    setAuthError("Password must be at least 6 characters.");
                    return;
                  }
                  if (!emailFormName.trim()) {
                    setAuthError("Owner name is required.");
                    return;
                  }
                  setAuthError(null);
                  setEmailAuthLoading(true);
                  try {
                    await registerContractorWithEmail(emailFormEmail, emailFormPassword, emailFormName);
                    handleSelectRole('Contractor');
                  } catch (err: any) {
                    console.error("Email registration failed:", err);
                    setAuthError(err?.message || "Registration failed. Please check your inputs.");
                  } finally {
                    setEmailAuthLoading(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="lh-label block mb-1">Your Name / Owner Name</label>
                    <input
                      type="text" required placeholder="e.g. Rajesh Kumar"
                      value={emailFormName} onChange={e => setEmailFormName(e.target.value)}
                      className="lh-input w-full"
                    />
                  </div>
                  <div>
                    <label className="lh-label block mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email" required placeholder="contractor@yourfirm.com"
                        value={emailFormEmail} onChange={e => setEmailFormEmail(e.target.value)}
                        className="lh-input w-full"
                        style={{ paddingLeft: '38px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="lh-label block mb-1">Password (min 6 characters)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"} required placeholder="Create a strong password" minLength={6}
                        value={emailFormPassword} onChange={e => setEmailFormPassword(e.target.value)}
                        className="lh-input w-full"
                        style={{ paddingLeft: '38px', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit" disabled={emailAuthLoading}
                    className="w-full py-3 px-4 text-xs font-semibold text-white rounded-lg transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--lh-blue)' }}
                  >
                    {emailAuthLoading ? 'Creating profile...' : 'Register Contractor Account'}
                  </button>
                </form>

                <p className="text-center text-[12px] pt-1" style={{ color: 'var(--lh-text-secondary)' }}>
                  Already have a contractor account?{' '}
                  <button onClick={() => { setContractorAuthSubMode('email-signin'); setAuthError(null); }} className="underline font-semibold" style={{ color: 'var(--lh-blue)' }}>
                    Sign in here
                  </button>
                </p>
              </div>
            )}

            <div className="pt-1 flex items-center gap-1.5 text-[10.5px]" style={{ color: 'var(--lh-text-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: user ? '#1D9E75' : '#EF9F27' }} />
              <span>{user ? 'Connected to cloud workspace' : 'Ready for device login'}</span>
            </div>
          </div>

        </div>
      </div>
    );
  }
  const saveProfile = async () => {
  if (!user) return;

  if (!profileForm.companyName.trim()) {
    alert("Please enter Company Name");
    return;
  }

  if (!profileForm.mobile.trim()) {
    alert("Please enter Mobile Number");
    return;
  }

  try {
    await updateUserProfile(profileForm);
    setShowProfileSetup(false);
    alert("Profile saved successfully.");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile.");
  }
};

  // 3. MAIN LIVE PORTALS INTERFACE WITH REAL-TIME SYNC
  return (
    <>
   <ProfileSetupModal
  open={showProfileSetup}
  profileForm={profileForm}
  setProfileForm={setProfileForm}
  onSave={saveProfile}
/>
    <div className="min-h-screen font-sans antialiased" style={{ background: 'var(--lh-surface-sunken)' }} id="main-app-container">
      
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--lh-surface)', borderBottom: '1px solid var(--lh-border)' }}>
        <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-xs p-1 flex-shrink-0">
                <Logo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-[13px] font-semibold leading-none" style={{ color: 'var(--lh-text-primary)' }}>Lifehut Workspace</h1>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--lh-text-tertiary)' }}>Project Management ERP</p>
              </div>
            </div>
            
            
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
            <div 
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10.5px] cursor-help relative group" 
              style={{ background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }} 
              id="cloud-sync-status-indicator"
              title={user ? 'Real-time sync active — every change syncs to Firestore in real time.' : 'Sandbox mode — Sign in to activate secure cloud sync.'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: user ? '#1D9E75' : '#EF9F27' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: user ? '#1D9E75' : '#EF9F27' }}></span>
              </span>
              <span className="font-semibold tracking-wide" style={{ color: user ? '#1D9E75' : '#EF9F27' }}>
                {user ? `Cloud Sync Active` : 'Offline Sandbox'}
              </span>
            </div>



            <button
              onClick={async () => {
                await logout();
              }}
              className="lh-btn lh-btn-secondary lh-btn-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. DUAL-ROLE LIVE WORKSPACE APP VIEWPORT */}
      <PullToRefresh onRefresh={async () => {
        // Fetch or re-read active database data to force state re-sync and UI update
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isDemoMode || !user) {
          loadLocalDatabase();
        } else {
          // Cloud mode is automatically synced with Firestore in real-time.
          // Resolving directly prevents re-injecting local demo data into the active session.
          console.log("Real-time cloud sync refreshed from live subscription.");
        }
      }}>
        <main className="max-w-7xl mx-auto px-5 py-6">
          
          {/* Automatic Sandbox Fallback Banner */}
          {showAutoFallbackBanner && (
            <div className="mb-5 p-4 rounded-xl text-left bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2 animate-fade-in" style={{ fontSize: '12px' }}>
              <div className="flex items-start gap-2.5 justify-between">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Google Auth Sandbox Redirect Active</p>
                    <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11.5px]">
                      Google Sign-In is restricted inside preview iframe sandboxes (due to Firebase's unauthorized-domain policy). 
                      To ensure a seamless developer/preview experience, we have automatically activated the <strong>Iframe-Safe Sandbox Contractor</strong> session. 
                      Your changes will save to the sandbox environment smoothly!
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAutoFallbackBanner(false)} 
                  className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-bold px-1.5 py-0.5 rounded text-[11px]"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Dynamic portal router */}
          {activeRole === 'Contractor' ? (
            <ContractorPortal
              projects={db.projects}
              stages={db.stages}
              extraWorks={db.extraWorks}
              expenses={db.expenses}
              progress={db.progress}
              documents={db.documents}
              messages={db.messages}
              onUpdateProjects={handleUpdateProjects}
              onUpdateStages={handleUpdateStages}
              onUpdateExtraWorks={handleUpdateExtraWorks}
              onUpdateExpenses={handleUpdateExpenses}
              onUpdateProgress={handleUpdateProgress}
              onUpdateDocuments={handleUpdateDocuments}
              onSendMessage={handleSendMessage}
              selectedProjId={selectedProjId}
              onSelectProject={setSelectedProjId}
              ownerName={userProfile?.ownerName || user?.displayName || "Contractor"}
            />
          ) : (
            <ClientPortal
              projects={db.projects}
              stages={db.stages}
              extraWorks={db.extraWorks}
              progress={db.progress}
              documents={db.documents}
              messages={db.messages}
              onUpdateStages={handleUpdateStages}
              onUpdateExtraWorks={handleUpdateExtraWorks}
              onUpdateProjects={handleUpdateProjects}
              onSendMessage={handleSendMessage}
              selectedProjId={selectedProjId}
              onSelectProject={setSelectedProjId}
            />
          )}

        </main>
      </PullToRefresh>

      {/* 3. DB BACKUP TOOL - Sandbox Details hidden for contractors and clients */}
      {!user && !isDemoMode && activeRole !== 'Client' && (
        <DbManager 
          onRefresh={loadLocalDatabase} 
        />
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs mt-8" style={{ background: 'var(--lh-surface)', borderTop: '1px solid var(--lh-border)', color: 'var(--lh-text-tertiary)' }}>
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© {new Date().getFullYear()} Lifehut Workspace. All rights reserved.</span>
          <span className="font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: 'var(--lh-surface-muted)', color: 'var(--lh-text-secondary)' }}>
              <a href="https://lifehutsolutions.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-sky-600 transition">
                Powered by <span className="font-semibold">Lifehut Solutions</span>
              </a>
          </span>
        </div>
      </footer>

    </div>
    </>
  );
}