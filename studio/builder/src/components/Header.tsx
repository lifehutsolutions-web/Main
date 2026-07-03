import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderOpen, 
  Download, 
  Eye, 
  Sparkles, 
  AlertTriangle, 
  X, 
  User, 
  ChevronDown, 
  LogOut, 
  Folder, 
  ShoppingBag, 
  Lock 
} from 'lucide-react';
import { Project } from '../types';
import { ProjectManager } from '../library/ProjectManager';
import { generateExportHtml } from '../utils/exporter';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useLicense } from '../hooks/useLicense';
import AuthModal from './AuthModal';
import CheckoutModal from './CheckoutModal';
import ProjectsModal from './ProjectsModal';

interface HeaderProps {
  project: Project;
  onImport: (imported: Project) => void;
  onPreviewFull: () => void;
}

export default function Header({ project, onImport, onPreviewFull }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { hasLicense, refreshLicenses } = useLicense();

  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  
  // Modals States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportConfig = () => {
    const dataStr = ProjectManager.exportProject(project);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `${project.config.businessName.toLowerCase().replace(/\s+/g, '-')}-project.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const isJson = file.name.endsWith('.json') || file.type === 'application/json';
      if (!isJson) {
        setErrorPopup("Strict File Block: The selected file is not a JSON document. Lifehut Studio only accepts standard configuration JSON files (.json) for website importing.");
        e.target.value = "";
        return;
      }

      const fileReader = new FileReader();
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedProject = ProjectManager.importProject(event.target?.result as string);
          onImport(importedProject);
        } catch (err: any) {
          setErrorPopup(`Incompatible JSON Schema: The JSON file does not contain a valid Lifehut Studio project structure. ${err?.message || ''}`);
        }
        e.target.value = "";
      };
    }
  };

  // Triggers compilation & downloads static HTML instantly
  const handleDownloadWebsite = () => {
    const htmlContent = generateExportHtml(project);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', 'index.html');
    linkElement.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // Sequence check trigger for Download Button
  const handleDownloadWorkflow = () => {
    // 1. Check if user is logged in
    if (!user) {
      setAuthInitialMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // 2. Check if logged in user owns a license for the current template
    const templateId = project.metadata.templateId;
    const isOwner = hasLicense(templateId);

    if (isOwner) {
      // 3. License matches both User ID and Template ID -> Download instantly!
      handleDownloadWebsite();
    } else {
      // 4. No license owned for current template -> Launch Razorpay checkout
      setIsCheckoutModalOpen(true);
    }
  };

  const handleCheckoutSuccess = async () => {
    // Re-verify and sync licenses
    await refreshLicenses();
    // Start immediate download of HTML package
    handleDownloadWebsite();
  };

  return (
    <>
      <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40" id="app-header">
        {/* Brand Logo */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">Lifehut Studio™</span>
              <span className="bg-blue-50 text-blue-600 font-bold text-3xs px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> v2.0
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wide">Website Builder</span>
          </div>
          <div className="w-px h-6 bg-slate-100 hidden sm:block" />
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Industry</span>
            <span>/</span>
            <span className="font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
              {project.metadata.industryId === 'construction' 
                ? 'Construction' 
                : project.metadata.industryId === 'tech_saas' 
                  ? 'SaaS & Tech' 
                  : 'Services'}
            </span>
          </div>
        </div>

        {/* Action Controls Panel */}
        <div className="flex items-center gap-3">
          {/* Open Project (JSON Local file import) */}
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportConfig}
            />
            <span className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Open File</span>
            </span>
          </label>

          {/* Backup Project File (JSON local export) */}
          <button 
            onClick={handleExportConfig}
            className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer"
            title="Save and Export Project File Locally"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Save Backup</span>
          </button>

          {/* Full preview overlay modal */}
          <button 
            onClick={onPreviewFull}
            className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Preview</span>
          </button>

          <div className="w-px h-6 bg-slate-100" />

          {/* User Sign In and Profile Actions */}
          {!user ? (
            // GUEST STATE
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthInitialMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthInitialMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Create Account
              </button>
            </div>
          ) : (
            // LOGGED-IN STATE
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-50 border border-slate-150 rounded-xl transition-all cursor-pointer"
              >
                {/* Simulated Avatar Badge */}
                <div className="w-6 h-6 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center justify-center">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-bold text-slate-700 max-w-[80px] truncate hidden sm:inline">
                  {user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown panel */}
              <AnimatePresence>
                {isUserDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-150 shadow-xl overflow-hidden z-50 py-1.5"
                  >
                    <div className="px-4.5 py-2 border-b border-slate-100">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        Authenticated as
                      </p>
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsProjectsModalOpen(true);
                      }}
                      className="w-full text-left px-4.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Folder className="w-4 h-4 text-slate-400" />
                      <span>My Projects</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsProjectsModalOpen(true);
                        // Jump directly to purchases tab
                      }}
                      className="w-full text-left px-4.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      <span>My Purchases</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-4.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Log Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="w-px h-6 bg-slate-100" />

          {/* Download Website CTA Button */}
          <button 
            onClick={handleDownloadWorkflow}
            className="inline-flex items-center gap-2 px-5 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-50 transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            {user && hasLicense(project.metadata.templateId) ? (
              <Download className="w-4 h-4 animate-bounce" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>Download Website</span>
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
      />

      {/* Checkout Payment Modal */}
      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        templateId={project.metadata.templateId}
        projectData={project}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Saved Projects Manager Modal */}
      <ProjectsModal 
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        activeProjectTemplateId={project.metadata.templateId}
        onLoadProject={(loadedProject) => {
          onImport(loadedProject);
        }}
      />

      {/* Strict File Validation Error Popup */}
      <AnimatePresence>
        {errorPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorPopup(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full relative overflow-hidden z-10"
            >
              <div className="h-1.5 bg-rose-500 w-full" />
              
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Project Action Blocked</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      {errorPopup}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setErrorPopup(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-6 flex justify-end gap-2">
                  <button 
                    onClick={() => setErrorPopup(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Dismiss Warning
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
