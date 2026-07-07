/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  fetchAll, 
  saveAll, 
  initDB 
} from './data';
import { Project, PaymentStage, ExtraWork, Expense, DailyProgress, ProjectDocument, ChatMessage } from './types';
import ContractorPortal from './components/ContractorPortal';
import ClientPortal from './components/ClientPortal';
import DbManager from './components/DbManager';
import ProfileSetupModal from "./components/ProfileSetupModal";
import { HardHat, User, ArrowRight, Building2, ShieldCheck, ChevronRight } from 'lucide-react';
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
  onSnapshot,
  query,
  where,
  getDoc
} from 'firebase/firestore';

export default function App() {
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
  
  // Selected project ID
  const [selectedProjId, setSelectedProjId] = useState<string>('proj_green_villa');

  // Firebase Auth user state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load / Sync fallback
  const loadLocalDatabase = () => {
    initDB();
    const data = fetchAll();
    setDb(data);
    if (data.projects.length > 0 && !data.projects.some(p => p.id === selectedProjId)) {
      setSelectedProjId(data.projects[0].id);
    }
  };
  const [isDemoMode, setIsDemoMode] = useState(false);

  // 1. Firebase Auth listener
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
  loadLocalDatabase();
  setUser(null);
  setAuthLoading(false);
} else {
        setDb(null); // Clear any local or stale DB when a real user logs in, awaiting cloud data
        setUser(firebaseUser);
        setProfileForm(prev => ({
  ...prev,
  ownerName: firebaseUser.displayName || "",
  email: firebaseUser.email || "",
}));
        const userRef = doc(fdb, "users", firebaseUser.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
  setShowProfileSetup(true);
} else {
  const data = userSnap.data();

  setUserProfile(data);

  setProfileForm({
    companyName: data.companyName || "",
    ownerName: data.ownerName || firebaseUser.displayName || "",
    mobile: data.mobile || "",
    email: data.email || firebaseUser.email || "",
    gstNumber: data.gstNumber || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    pincode: data.pincode || "",
  });

  if (!data.companyName || !data.mobile) {
    setShowProfileSetup(true);
  }
}
        console.log("Logged in UID:", firebaseUser.uid);
        setAuthLoading(false);
        // Default anonymous users to Client role, Google accounts to Contractor
        if (firebaseUser.isAnonymous) {
          setActiveRole('Client');
        } else {
          setActiveRole('Contractor');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const [showProfileSetup, setShowProfileSetup] = useState(false);

const [userProfile, setUserProfile] = useState<any>(null);
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
        if (fetchedProjects.length > 0 && !fetchedProjects.some(p => p.id === selectedProjId)) {
          setSelectedProjId(fetchedProjects[0].id);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubProjects();
  }, [user]);

  // 3. Real-time Subcollection Listeners for Active Selected Project ID (when signed in)
  useEffect(() => {
    if (!user || !selectedProjId || !db) return;

    // Safety: ONLY subscribe to subcollections if user is actually authorized for the selected project
    const hasProject = db.projects.some(p => p.id === selectedProjId && p.memberUids?.includes(user.uid));
    if (!hasProject) {
      console.warn(`User is not authorized for selected project ${selectedProjId}. Subscriptions skipped.`);
      return;
    }

    const projectPath = `projects/${selectedProjId}`;

    // Stages subscription
    const unsubStages = onSnapshot(collection(fdb, `${projectPath}/stages`), (snapshot) => {
      const items: PaymentStage[] = [];
      snapshot.forEach(d => items.push(d.data() as PaymentStage));
      setDb(prev => prev ? { ...prev, stages: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/stages`));

    // Extra works subscription
    const unsubExtra = onSnapshot(collection(fdb, `${projectPath}/extraWorks`), (snapshot) => {
      const items: ExtraWork[] = [];
      snapshot.forEach(d => items.push(d.data() as ExtraWork));
      setDb(prev => prev ? { ...prev, extraWorks: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/extraWorks`));

    // Expenses subscription
    const unsubExpenses = onSnapshot(collection(fdb, `${projectPath}/expenses`), (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach(d => items.push(d.data() as Expense));
      setDb(prev => prev ? { ...prev, expenses: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/expenses`));

    // Progress subscription
    const unsubProgress = onSnapshot(collection(fdb, `${projectPath}/progress`), (snapshot) => {
      const items: DailyProgress[] = [];
      snapshot.forEach(d => items.push(d.data() as DailyProgress));
      setDb(prev => prev ? { ...prev, progress: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/progress`));

    // Documents subscription
    const unsubDocs = onSnapshot(collection(fdb, `${projectPath}/documents`), (snapshot) => {
      const items: ProjectDocument[] = [];
      snapshot.forEach(d => items.push(d.data() as ProjectDocument));
      setDb(prev => prev ? { ...prev, documents: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/documents`));

    // Messages subscription
    const unsubMessages = onSnapshot(collection(fdb, `${projectPath}/messages`), (snapshot) => {
      const items: ChatMessage[] = [];
      snapshot.forEach(d => items.push(d.data() as ChatMessage));
      setDb(prev => prev ? { ...prev, messages: items } : null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${projectPath}/messages`));

    return () => {
      unsubStages();
      unsubExtra();
      unsubExpenses();
      unsubProgress();
      unsubDocs();
      unsubMessages();
    };
  }, [user, selectedProjId, db?.projects.map(p => p.id).join(',')]);

  // Sync to Storage Helper (Local/Offline Mode)
  const syncDatabase = (updatedDb: typeof db) => {
    if (!updatedDb) return;
    saveAll(updatedDb);
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
            // Write core project document
            await setDoc(doc(fdb, 'projects', item.id), item);

            // Also write member registration in members subcollection for the creator
            await setDoc(doc(fdb, `projects/${item.id}/members`, user.uid), {
              role: 'Contractor',
              uid: user.uid
            });

            // Write lookup document for the client access code
            await setDoc(doc(fdb, 'clientCodes', item.clientCode.trim().toUpperCase()), {
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
    if (user) {
      try {
        const changedItems = newStages.filter(s => {
          const old = db.stages.find(o => o.id === s.id);
          return !old || JSON.stringify(old) !== JSON.stringify(s);
        });
        await Promise.all(
          changedItems.map(item =>
            setDoc(doc(fdb, `projects/${selectedProjId}/stages`, item.id), item)
          )
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/stages`);
      }
    } else {
      syncDatabase({ ...db, stages: newStages });
    }
  };

  const handleUpdateExtraWorks = async (newExtra: ExtraWork[]) => {
    if (!db) return;
    if (user) {
      try {
        const changedItems = newExtra.filter(e => {
          const old = db.extraWorks.find(o => o.id === e.id);
          return !old || JSON.stringify(old) !== JSON.stringify(e);
        });
        await Promise.all(
          changedItems.map(item =>
            setDoc(doc(fdb, `projects/${selectedProjId}/extraWorks`, item.id), item)
          )
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/extraWorks`);
      }
    } else {
      syncDatabase({ ...db, extraWorks: newExtra });
    }
  };

  const handleUpdateExpenses = async (newExp: Expense[]) => {
    if (!db) return;
    if (user) {
      try {
        const changedItems = newExp.filter(e => {
          const old = db.expenses.find(o => o.id === e.id);
          return !old || JSON.stringify(old) !== JSON.stringify(e);
        });
        await Promise.all(
          changedItems.map(item =>
            setDoc(doc(fdb, `projects/${selectedProjId}/expenses`, item.id), item)
          )
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/expenses`);
      }
    } else {
      syncDatabase({ ...db, expenses: newExp });
    }
  };

  const handleUpdateProgress = async (newProg: DailyProgress[]) => {
    if (!db) return;
    if (user) {
      try {
        const changedItems = newProg.filter(p => {
          const old = db.progress.find(o => o.id === p.id);
          return !old || JSON.stringify(old) !== JSON.stringify(p);
        });
        await Promise.all(
          changedItems.map(item =>
            setDoc(doc(fdb, `projects/${selectedProjId}/progress`, item.id), item)
          )
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/progress`);
      }
    } else {
      syncDatabase({ ...db, progress: newProg });
    }
  };

  const handleUpdateDocuments = async (newDocs: ProjectDocument[]) => {
    if (!db) return;
    if (user) {
      try {
        const changedItems = newDocs.filter(d => {
          const old = db.documents.find(o => o.id === d.id);
          return !old || JSON.stringify(old) !== JSON.stringify(d);
        });
        await Promise.all(
          changedItems.map(item =>
            setDoc(doc(fdb, `projects/${selectedProjId}/documents`, item.id), item)
          )
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${selectedProjId}/documents`);
      }
    } else {
      syncDatabase({ ...db, documents: newDocs });
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

  // Viewing Modes: welcome | role_select | portal
  const [viewingMode, setViewingMode] = useState<'welcome' | 'role_select' | 'portal'>('welcome');

  // Trigger role selection navigation
  const handleGetStarted = () => {
    setViewingMode('role_select');
  };

  const handleSelectRole = (role: 'Contractor' | 'Client') => {
    setActiveRole(role);
    setViewingMode('portal');
  };

  if (authLoading || !db) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: 'var(--lh-surface-sunken)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold animate-pulse" style={{ background: 'var(--lh-blue)' }}>
            LH
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--lh-text-secondary)' }}>Initializing Lifehut Workspace…</p>
        </div>
      </div>
    );
  }

  // 1. WELCOME SCREEN
  if (viewingMode === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans" style={{ background: 'var(--lh-surface-sunken)' }} id="welcome-container">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 rounded-2xl overflow-hidden lh-panel" style={{ boxShadow: 'var(--lh-shadow-sm)' }} id="welcome-attachment-layout">

          {/* LEFT: Brand panel */}
          <div className="lg:col-span-2 p-9 md:p-11 flex flex-col justify-between relative" style={{ background: 'var(--lh-navy)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--lh-blue)' }}>
                LH
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

          {/* RIGHT: Entry panel */}
          <div className="lg:col-span-3 p-9 md:p-12 flex flex-col justify-center space-y-7" style={{ background: 'var(--lh-surface)' }}>
            <div className="space-y-1.5">
              <h2 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Get started</h2>
              <p className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                Choose how you'd like to enter your workspace.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSelectRole('Contractor')}
                className="w-full p-4 text-left rounded-xl transition-all flex items-center gap-3.5 group"
                style={{ border: '1px solid var(--lh-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-blue)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
              >
                <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
                  <HardHat className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Contractor sign in</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Manage projects, payments and approvals</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--lh-text-tertiary)' }} />
              </button>

              <button
                onClick={() => handleSelectRole('Client')}
                className="w-full p-4 text-left rounded-xl transition-all flex items-center gap-3.5 group"
                style={{ border: '1px solid var(--lh-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-amber)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
              >
                <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-warning-bg)', color: 'var(--lh-amber-dark)' }}>
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>Client access</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>View your project using your access code</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--lh-text-tertiary)' }} />
              </button>
            </div>

            <button
              onClick={handleGetStarted}
              className="lh-btn lh-btn-accent lh-btn-lg w-full"
              id="landing-get-started-btn"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[10.5px] text-center" style={{ color: 'var(--lh-text-tertiary)' }}>
              Powered by Lifehut Solutions
            </p>
          </div>

        </div>
      </div>
    );
  }

  // 2. ROLE SELECTION INTERFACE
  if (viewingMode === 'role_select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans" style={{ background: 'var(--lh-surface-sunken)' }}>
        <div className="w-full max-w-4xl lh-panel rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2" style={{ boxShadow: 'var(--lh-shadow-sm)' }}>
          
          {/* Left Decorative branding section */}
          <div className="p-9 md:p-11 flex flex-col justify-between relative" style={{ background: 'var(--lh-navy)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--lh-blue)' }}>
                LH
              </div>
              <span className="font-display font-semibold tracking-tight text-sm text-white">Lifehut Workspace</span>
            </div>

            <div className="my-10 space-y-3.5">
              <span className="inline-block text-[10px] tracking-widest font-bold uppercase px-2.5 py-1 rounded-md" style={{ background: 'rgba(230,126,34,0.18)', color: '#F5A961' }}>
                Workspace access
              </span>
              <h2 className="text-2xl font-display font-semibold tracking-tight text-white leading-snug">
                Choose your workspace
              </h2>
              <p className="text-[12.5px] leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Each workspace is scoped to its role. Switch any time from the header once signed in.
              </p>
            </div>

            <button
              onClick={() => setViewingMode('welcome')}
              className="text-[12px] font-medium self-start flex items-center gap-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              ← Back to start
            </button>
          </div>

          {/* Right Role selector buttons */}
          <div className="p-9 md:p-11 flex flex-col justify-center space-y-7">
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold tracking-tight" style={{ color: 'var(--lh-text-primary)' }}>Select active profile</h3>
              <p className="text-[12.5px]" style={{ color: 'var(--lh-text-secondary)' }}>Sign in as contractor or enter a client access code</p>
            </div>

            <div className="space-y-3">
              
              <button
                onClick={() => handleSelectRole('Contractor')}
                className="w-full p-4 text-left rounded-xl transition-all flex items-start gap-3.5 group"
                style={{ border: '1px solid var(--lh-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-blue)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
              >
                <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-info-bg)', color: 'var(--lh-blue-dark)' }}>
                  <HardHat className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[13px]" style={{ color: 'var(--lh-text-primary)' }}>Contractor workspace</span>
                    <span className="lh-badge lh-badge-neutral">Sign in</span>
                  </div>
                  <p className="text-[11.5px] leading-normal" style={{ color: 'var(--lh-text-secondary)' }}>
                    Register projects, manage milestones, log expenses and track approvals.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleSelectRole('Client')}
                className="w-full p-4 text-left rounded-xl transition-all flex items-start gap-3.5 group"
                style={{ border: '1px solid var(--lh-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lh-amber)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
              >
                <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: 'var(--lh-warning-bg)', color: 'var(--lh-amber-dark)' }}>
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[13px]" style={{ color: 'var(--lh-text-primary)' }}>Client access</span>
                    <span className="lh-badge lh-badge-warning">Access code</span>
                  </div>
                  <p className="text-[11.5px] leading-normal" style={{ color: 'var(--lh-text-secondary)' }}>
                    View payment milestones, site progress, documents and approve scope changes.
                  </p>
                </div>
              </button>
              <button
  onClick={() => {
  setIsDemoMode(true);
  loadLocalDatabase();
  setActiveRole('Contractor');
}}
  className="w-full p-4 text-left rounded-xl transition-all flex items-start gap-3.5 group"
  style={{ border: '1px solid var(--lh-border)' }}
  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lh-border)'; }}
>
  <div
    className="p-2.5 rounded-lg flex-shrink-0"
    style={{ background: '#ecfdf5', color: '#16a34a' }}
  >
    🎬
  </div>

  <div className="space-y-0.5 flex-1">
    <div className="flex items-center gap-2">
      <span
        className="font-display font-semibold text-[13px]"
        style={{ color: 'var(--lh-text-primary)' }}
      >
        Demo workspace
      </span>

      <span className="lh-badge">Demo</span>
    </div>

    <p
      className="text-[11.5px] leading-normal"
      style={{ color: 'var(--lh-text-secondary)' }}
    >
      Explore Lifehut with sample projects. No sign-in required.
    </p>
  </div>
</button>

            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[10.5px]" style={{ color: 'var(--lh-text-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: user ? '#1D9E75' : '#EF9F27' }} />
              <span>{user ? 'Connected to cloud workspace' : 'Offline sandbox mode'}</span>
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
    await setDoc(
      doc(fdb, "users", user.uid),
      {
        ...profileForm,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    setUserProfile(profileForm);
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: 'var(--lh-blue)' }}>
                LH
              </div>
              <div>
                <h1 className="text-[13px] font-semibold leading-none" style={{ color: 'var(--lh-text-primary)' }}>Lifehut Workspace</h1>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--lh-text-tertiary)' }}>Project Management ERP</p>
              </div>
            </div>
            
            
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px]" style={{ background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }} id="cloud-sync-status-indicator">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: user ? '#1D9E75' : '#EF9F27' }} />
              <span className="font-medium" style={{ color: 'var(--lh-text-secondary)' }}>
                {user ? `Connected` : 'Offline'}
              </span>
              {user ? (
                <button 
                  onClick={logOut} 
                  className="ml-1 text-[10.5px] font-semibold underline"
                  style={{ color: 'var(--lh-blue)' }}
                  id="btn-cloud-signout"
                >
                  Sign out
                </button>
              ) : (
                <button 
                  onClick={signInGoogle} 
                  className="ml-1 text-[10.5px] font-semibold"
                  style={{ color: 'var(--lh-blue)' }}
                  id="btn-cloud-signin"
                >
                  Sign in
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--lh-surface-muted)', border: '1px solid var(--lh-border)' }} id="role-toggle-container">
              <button
                onClick={() => setActiveRole('Contractor')}
                className="px-3 py-1.5 rounded-md text-[10.5px] font-semibold transition-all flex items-center gap-1.5"
                style={activeRole === 'Contractor'
                  ? { background: 'var(--lh-blue)', color: '#fff' }
                  : { color: 'var(--lh-text-secondary)' }}
              >
                <HardHat className="w-3 h-3" />
                <span>Contractor</span>
              </button>

              <button
                onClick={() => setActiveRole('Client')}
                className="px-3 py-1.5 rounded-md text-[10.5px] font-semibold transition-all flex items-center gap-1.5"
                style={activeRole === 'Client'
                  ? { background: 'var(--lh-amber)', color: '#fff' }
                  : { color: 'var(--lh-text-secondary)' }}
              >
                <User className="w-3 h-3" />
                <span>Client</span>
              </button>
            </div>

            <button
              onClick={() => setViewingMode('role_select')}
              className="hidden md:flex lh-btn lh-btn-secondary lh-btn-sm"
            >
              Exit
            </button>
          </div>

        </div>
      </header>

      {/* 2. DUAL-ROLE LIVE WORKSPACE APP VIEWPORT */}
      <main className="max-w-7xl mx-auto px-5 py-6">
        
        {/* Sync status banner */}
        <div className="mb-5 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-[12px]" style={{ background: 'var(--lh-success-bg)', border: '1px solid #9FE1CB' }}>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--lh-success-text)' }} />
            <div style={{ color: 'var(--lh-success-text)' }}>
              <span className="font-semibold">Real-time sync: </span>
              {user ? 'Authenticated — every change syncs to Firestore in real time.' : 'Sign in above to activate secure cloud sync. Sandbox edits will migrate automatically.'}
            </div>
          </div>
        </div>

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
            userProfile={userProfile}
          />
        )}

      </main>

      {/* 3. DB BACKUP TOOL */}
      <DbManager 
        onRefresh={loadLocalDatabase} 
      />

      {/* Footer */}
      <footer className="py-6 text-center text-xs mt-8" style={{ background: 'var(--lh-surface)', borderTop: '1px solid var(--lh-border)', color: 'var(--lh-text-tertiary)' }}>
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© {new Date().getFullYear()} Lifehut Workspace. All rights reserved.</span>
          <span className="font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: 'var(--lh-surface-muted)', color: 'var(--lh-text-secondary)' }}>
            Powered by Lifehut Solutions
          </span>
        </div>
      </footer>

    </div>
    </>
  );
}