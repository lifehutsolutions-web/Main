import { useState } from 'react';
import { Sparkles, HelpCircle, X } from 'lucide-react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ConfigPanel from './components/ConfigPanel';
import LivePreview from './components/LivePreview';
import FullPreviewModal from './components/FullPreviewModal';
import { Project, WebsiteConfig } from './types';
import { ProjectManager } from './library/ProjectManager';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [project, setProject] = useState<Project>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlIndustry = params.get('industry');
      const urlTemplate = params.get('template');
      if (urlIndustry || urlTemplate) {
        return ProjectManager.createProject(
          urlIndustry || 'construction',
          urlTemplate || undefined
        );
      }
    } catch (e) {
      console.warn('Could not parse URL query parameters', e);
    }
    return ProjectManager.loadProject();
  });

  const isFrozen = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('freeze') === 'true';
    } catch {
      return false;
    }
  })();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set<number>());
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Sync back to config panel compatible bridge
  const config = project.config;
  const setConfig = (newConfigOrFn: WebsiteConfig | ((prev: WebsiteConfig) => WebsiteConfig)) => {
    setProject(prev => {
      const nextConfig = typeof newConfigOrFn === 'function' ? newConfigOrFn(prev.config) : newConfigOrFn;
      const updated = {
        ...prev,
        config: nextConfig
      };
      ProjectManager.saveProject(updated);
      return updated;
    });
  };

  // Clean Import Handler
  const handleImport = (importedProject: Project) => {
    setProject(importedProject);
    ProjectManager.saveProject(importedProject);
    // Auto-mark imported sections as completed
    setCompletedTabs(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden" id="lifehut-root">
      
      {/* Header CTA & Actions */}
      <Header 
        project={project} 
        onImport={handleImport} 
        onPreviewFull={() => setIsFullPreviewOpen(true)} 
      />

      {/* Navigation section tabs */}
      <Tabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        completedTabs={completedTabs} 
      />

      {/* Main Panel Core Workspace */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Config parameters */}
        <ConfigPanel 
          config={config}
          setConfig={setConfig}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          completedTabs={completedTabs}
          setCompletedTabs={setCompletedTabs}
          project={project}
          setProject={setProject}
          isFrozen={isFrozen}
        />

        {/* Right Live Device Preview */}
        <LivePreview 
          project={project} 
          activeTab={activeTab}
        />
      </div>

      {/* Minimal Footer */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-6 shrink-0 select-none text-[9px] uppercase tracking-wider font-semibold text-slate-400">
        <div className="flex items-center gap-1">
          <span>Built with</span>
          <span className="text-slate-800 font-black flex items-center gap-0.5">
            Lifehut Studio™ <Sparkles className="w-2.5 h-2.5 text-blue-600 animate-pulse" />
          </span>
        </div>
        
        <div className="flex items-center gap-4.5">
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer outline-none uppercase font-semibold text-[9px] tracking-wider"
          >
            <HelpCircle className="w-3 h-3 text-slate-450" />
            <span>Help</span>
          </button>
          <span className="text-slate-250">|</span>
          <span>v1.0</span>
          <span className="text-slate-250">|</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="normal-case text-slate-500 font-semibold text-3xs">All changes saved</span>
          </div>
        </div>
      </footer>

      {/* Full Immersive Screen Modal Overlay */}
      <FullPreviewModal 
        project={project}
        isOpen={isFullPreviewOpen}
        onClose={() => setIsFullPreviewOpen(false)}
      />

      {/* Embedded Help Overlay Dialog (no window.alert inside iframe) */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full relative overflow-hidden z-10 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" /> Welcome to Lifehut Studio™
                </h3>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-5">
                Complete each section tab to configure your custom responsive template. Select your Sector, Template Layout, and Colors under the <strong className="font-bold text-slate-700">General</strong> tab. Once finalized, download your fully styled self-contained production-ready HTML website package in one click!
              </p>
              <div className="flex justify-end">
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
