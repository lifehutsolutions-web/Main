import React, { useState } from 'react';
import { FolderOpen, Download, Eye, Sparkles, AlertTriangle, X } from 'lucide-react';
import { Project } from '../types';
import { ProjectManager } from '../library/ProjectManager';
import { generateExportHtml } from '../utils/exporter';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  project: Project;
  onImport: (imported: Project) => void;
  onPreviewFull: () => void;
}

export default function Header({ project, onImport, onPreviewFull }: HeaderProps) {
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  
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
      
      // Strict validation: must only accept .json files
      const isJson = file.name.endsWith('.json') || file.type === 'application/json';
      if (!isJson) {
        setErrorPopup("Strict File Block: The selected file is not a JSON document. Lifehut Studio only accepts standard configuration JSON files (.json) for website importing.");
        e.target.value = ""; // Clear file choice
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
        e.target.value = ""; // Clear file choice
      };
    }
  };

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

  return (
    <>
      <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40" id="app-header">
        {/* Brand Logo */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">Lifehut Studio™</span>
              <span className="bg-blue-50 text-blue-600 font-bold text-3xs px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> v1.0
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

        {/* Primary Actions */}
        <div className="flex items-center gap-3">
          {/* Import Project Trigger */}
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportConfig}
            />
            <span className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Open Project</span>
            </span>
          </label>

          {/* Export Project */}
          <button 
            onClick={handleExportConfig}
            className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all"
            title="Save and Export Project File"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Save Project</span>
          </button>

          {/* Live Preview Toggle */}
          <button 
            onClick={onPreviewFull}
            className="inline-flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Full Preview</span>
          </button>

          <div className="w-px h-6 bg-slate-100" />

          {/* Download Website CTA */}
          <button 
            onClick={handleDownloadWebsite}
            className="inline-flex items-center gap-2 px-5 h-10 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Website</span>
          </button>
        </div>
      </header>

      {/* Strict File Validation Error Popup */}
      <AnimatePresence>
        {errorPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorPopup(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            
            {/* Dialog Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full relative overflow-hidden z-10"
            >
              {/* Colored top bar indicator */}
              <div className="h-1.5 bg-rose-500 w-full" />
              
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Warning Icon Badge */}
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  
                  {/* Message details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Project Action Blocked</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      {errorPopup}
                    </p>
                  </div>
                  
                  {/* Close corner button */}
                  <button 
                    onClick={() => setErrorPopup(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Footer Action */}
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
