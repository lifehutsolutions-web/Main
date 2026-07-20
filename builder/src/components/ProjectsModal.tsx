import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Calendar, ArrowUpRight, Sparkles, Loader2, Play, Download, Trash2, HeartHandshake } from 'lucide-react';
import { getUserProjects, deleteProjectFromDb, SavedProject } from '../services/projectService';
import { getUserLicenses } from '../services/licenseService';
import { useAuth } from '../hooks/useAuth';
import { License, Project } from '../types';
import { generateExportHtml } from '../utils/exporter';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: Project, dbId?: string) => void;
  activeProjectTemplateId: string;
}

export default function ProjectsModal({
  isOpen,
  onClose,
  onLoadProject,
  activeProjectTemplateId,
}: ProjectsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'purchases'>('projects');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [userProjs, userLics] = await Promise.all([
        getUserProjects(user.id),
        getUserLicenses(user.id),
      ]);
      setProjects(userProjs);
      setLicenses(userLics);
    } catch (e) {
      console.error('Failed to load user records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const handleOpenProject = (savedProj: SavedProject) => {
    const projConfig = savedProj.config as Project;
    onLoadProject(projConfig, savedProj.id);
    onClose();
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingId(projectId);
      await deleteProjectFromDb(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      console.error('Delete project failed:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadAgain = (license: License) => {
    // 1. Locate if there is a matching saved project in DB for this template
    const matchingProj = projects.find((p) => p.template_id === license.template_id);
    const configToExport = matchingProj ? (matchingProj.config as Project) : null;

    if (configToExport) {
      // Direct instant download of the custom self-contained HTML
      const htmlContent = generateExportHtml(configToExport);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', 'index.html');
      linkElement.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      // Direct fallback: compile a fresh default project for this template
      alert(`No active project saved for template "${license.template_id}". Let's open the template in the builder so you can start customizing!`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Modal Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-2xl w-full relative overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header branding */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-blue-600 font-bold uppercase text-[9px] tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Personalized Studio Center</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  My Projects & Purchased Licenses
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub navigation Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-150 px-6 gap-6 shrink-0">
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-3.5 text-xs font-bold uppercase tracking-wider relative cursor-pointer outline-none transition-colors ${
                  activeTab === 'projects' ? 'text-blue-600 font-black' : 'text-slate-450 hover:text-slate-600'
                }`}
              >
                <span>My Saved Projects ({projects.length})</span>
                {activeTab === 'projects' && (
                  <motion.div
                    layoutId="active_tab_indicator"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('purchases')}
                className={`py-3.5 text-xs font-bold uppercase tracking-wider relative cursor-pointer outline-none transition-colors ${
                  activeTab === 'purchases' ? 'text-blue-600 font-black' : 'text-slate-450 hover:text-slate-600'
                }`}
              >
                <span>Purchased Licenses ({licenses.length})</span>
                {activeTab === 'purchases' && (
                  <motion.div
                    layoutId="active_tab_indicator"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            </div>

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-2xs uppercase tracking-wider text-slate-400 font-bold">
                    Retrieving database records...
                  </p>
                </div>
              ) : activeTab === 'projects' ? (
                // PROJECTS TAB
                projects.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-150 rounded-2xl p-8">
                    <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-sm font-bold text-slate-800">No Projects Saved Yet</h4>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                      All your customizations are automatically backed up in localStorage, and synced to our secure database as soon as you save or edit.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((proj) => {
                      const displayDate = proj.updated_at
                        ? new Date(proj.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Unknown Date';

                      const configObj = proj.config as Project;
                      const businessName = configObj?.config?.businessName || 'Unnamed Builder Site';
                      const isActiveProject = activeProjectTemplateId === proj.template_id;

                      return (
                        <div
                          key={proj.id}
                          className={`bg-white rounded-2xl p-4.5 border transition-all hover:shadow-md ${
                            isActiveProject ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-150'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[8px] uppercase tracking-wider mb-1.5">
                                {proj.template_id}
                              </span>
                              <h4 className="text-xs font-black text-slate-800 line-clamp-1">
                                {businessName}
                              </h4>
                            </div>
                            {isActiveProject && (
                              <span className="text-[7px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Currently Open
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold mb-4.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Last edited: {displayDate}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <button
                              onClick={() => handleOpenProject(proj)}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 outline-none cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Open In Workspace</span>
                            </button>

                            <button
                              disabled={deletingId === proj.id}
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Delete saved configuration"
                            >
                              {deletingId === proj.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                // PURCHASES (LICENSES) TAB
                licenses.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-150 rounded-2xl p-8">
                    <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-sm font-bold text-slate-800">No Purchased Licenses</h4>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                      Purchase template licenses to unlock unlimited, safe production downloads with clean compiled code.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {licenses.map((lic) => {
                      const purchaseDate = lic.created_at
                        ? new Date(lic.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Instant Purchase';

                      return (
                        <div
                          key={lic.id}
                          className="bg-white border border-slate-150 rounded-2xl p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                {lic.template_id}
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-bold uppercase tracking-wider">
                                Lifetime Active
                              </span>
                            </div>
                            <p className="text-3xs uppercase font-bold text-slate-400 tracking-wider">
                              Licensed on: {purchaseDate}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t border-slate-100 md:border-t-0 pt-3 md:pt-0">
                            {/* Download static copy again */}
                            <button
                              onClick={() => handleDownloadAgain(lic)}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-2xs rounded-xl cursor-pointer transition-colors"
                              title="Download production zip file instantly"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download HTML</span>
                            </button>

                            {/* Re-open builder */}
                            <button
                              onClick={() => {
                                const matchingProj = projects.find((p) => p.template_id === lic.template_id);
                                if (matchingProj) {
                                  handleOpenProject(matchingProj);
                                } else {
                                  // Create new fresh layout project
                                  window.location.search = `?template=${lic.template_id}`;
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xs rounded-xl cursor-pointer transition-all shadow-sm"
                            >
                              <span>Edit Template</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Footer informational */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 text-center shrink-0">
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 leading-relaxed">
                All India transaction processing secured securely by Razorpay • Lifehut Solutions Private Limited.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
