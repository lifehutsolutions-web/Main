import React, { useRef } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  UploadCloud, 
  HardHat, 
  Building, 
  Wrench, 
  Hammer, 
  Paintbrush, 
  Ruler, 
  Home,
  CheckCircle2,
  HelpCircle,
  Briefcase,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Lock,
  Mail,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WebsiteConfig, Project } from '../types';
import { TABS } from './Tabs';
import { INDUSTRIES, TEMPLATES, THEMES } from '../library/TemplateLibrary';
import { ProjectManager } from '../library/ProjectManager';

interface ConfigPanelProps {
  config: WebsiteConfig;
  setConfig: (c: WebsiteConfig | ((p: WebsiteConfig) => WebsiteConfig)) => void;
  activeTab: number;
  setActiveTab: (idx: number) => void;
  completedTabs: Set<number>;
  setCompletedTabs: React.Dispatch<React.SetStateAction<Set<number>>>;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  isFrozen?: boolean;
}

const LOGO_ICONS = [
  { name: 'HardHat', icon: HardHat },
  { name: 'Building', icon: Building },
  { name: 'Wrench', icon: Wrench },
  { name: 'Hammer', icon: Hammer },
  { name: 'Paintbrush', icon: Paintbrush },
  { name: 'Ruler', icon: Ruler },
];

export default function ConfigPanel({
  config,
  setConfig,
  activeTab,
  setActiveTab,
  completedTabs,
  setCompletedTabs,
  project,
  setProject,
  isFrozen = false,
}: ConfigPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic helpers for services and pricing plans
  const handleAddService = () => {
    if (config.services.length >= 8) {
      alert("You have reached the maximum cap of 8 services. Please edit or delete existing services to maintain an optimal landing page layout.");
      return;
    }
    const newId = `service-${Date.now()}`;
    const newService = {
      id: newId,
      title: "New Premium Service",
      description: "Professional grade custom solutions built to last, perfectly aligned with safety codes.",
      iconName: "Wrench"
    };
    setConfig(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const handleDeleteService = (id: string) => {
    setConfig(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const handleAddPricingPlan = () => {
    if (config.pricing.length >= 4) return;
    const labels = ["Starter", "Pro", "Premium", "Agency"];
    const nextLabel = labels[config.pricing.length] || "Pro";
    const newId = `price-${Date.now()}`;
    const newPlan = {
      id: newId,
      name: nextLabel,
      price: "$299",
      period: "Fixed Fee",
      features: [
        "Initial site consultation",
        "Basic spatial layout blueprint",
        "Project estimate report"
      ],
      popular: false
    };
    setConfig(prev => ({
      ...prev,
      pricing: [...prev.pricing, newPlan]
    }));
  };

  const handleDeletePricingPlan = (id: string) => {
    setConfig(prev => ({
      ...prev,
      pricing: prev.pricing.filter(p => p.id !== id)
    }));
  };

  // Progress Calculation
  const progressPct = Math.round((completedTabs.size / TABS.length) * 100);
  
  // Find next uncompleted task
  const nextTaskLabel = (() => {
    const nextIdx = [...Array(TABS.length).keys()].find(i => !completedTabs.has(i));
    if (nextIdx !== undefined) {
      return `Fill in ${TABS[nextIdx].label} section`;
    }
    return "All sections reviewed! Download your site.";
  })();

  const currentTabInfo = TABS.find(t => t.id === activeTab);

  const handleTextChange = (field: keyof WebsiteConfig, val: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleNextSection = () => {
    // Add current tab to completed list
    setCompletedTabs(prev => {
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });

    // Advance to next tab if available
    if (activeTab < TABS.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  // Drag and drop logo handler
  const handleLogoUpload = (file: File) => {
    const MAX_SIZE = 100 * 1024; // 100 KB limit
    if (file.size > MAX_SIZE) {
      alert(`The selected file is too large (${(file.size / 1024).toFixed(1)} KB). Please select an image under 100 KB to keep project blueprints compact and prevent storage limits.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setConfig(prev => ({
          ...prev,
          logoFileUrl: e.target?.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoUpload(e.target.files[0]);
    }
  };

  // Curated Unsplash Construction presets
  const GALLERY_PRESETS = [
    { title: 'Modern Residence', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
    { title: 'Designer Kitchen', url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80' },
    { title: 'Structural Frame', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80' },
    { title: 'Living Lounge', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80' },
    { title: 'Modern Bath', url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=600&q=80' },
    { title: 'Office Space', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
  ];

  return (
    <div className="w-85 lg:w-96 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto" id="config-panel">
      {/* Progress Card */}
      <div className="px-5 pt-3 pb-1" id="progress-card-container">
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Progress
              </span>
              <span className="text-[10px] font-extrabold text-blue-650">{progressPct}%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-sky-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 font-medium shrink-0 max-w-[120px] truncate leading-tight text-right">
            Next: <span className="text-slate-600 font-bold block truncate">{TABS[[...Array(TABS.length).keys()].find(i => !completedTabs.has(i)) || 0]?.label || "Done!"}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-50" />

      {/* Header for current tab */}
      <div className="px-5 py-4">
        <span className="text-[10px] font-bold text-slate-400 tracking-wide block mb-0.5">Section</span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight" id="active-tab-title">{currentTabInfo?.label} Settings</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed" id="active-tab-desc">
          {currentTabInfo?.id === 0 && "Configure business descriptors, contact details, and brand logo."}
          {currentTabInfo?.id === 1 && "Formulate dynamic headers, subheadlines, badges, and primary action CTAs."}
          {currentTabInfo?.id === 2 && "Introduce your company's legacy, about parameters, and operational statistics."}
          {currentTabInfo?.id === 3 && "Catalog standard services, building capabilities, and structural solutions."}
          {currentTabInfo?.id === 4 && "Select premium architectural presets or link your own portfolio showcase."}
          {currentTabInfo?.id === 5 && "Design transparent packages, pricing tiers, and primary highlights."}
          {currentTabInfo?.id === 6 && "Answer critical consumer questions regarding license, timelines, or bonds."}
          {currentTabInfo?.id === 7 && "Specify exact location coordinates, working schedules, and office details."}
        </p>
      </div>

      <div className="h-px bg-slate-50" />

      {/* Form Content */}
      <div className="flex-1 p-5 overflow-y-auto" id="fields-scroller">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-6"
          >
            {activeTab === 0 && (
              <div className="space-y-5">
                {/* Independent Selection Modules (Industry -> Template -> Theme) */}
                <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4.5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Project Design & Architecture</span>
                  
                  {isFrozen && (
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-2xs font-extrabold text-blue-800 uppercase tracking-wide">Studio Freeze Mode Active</p>
                        <p className="text-3xs text-blue-600 leading-relaxed font-medium">Your design framework is locked to match your specific checkout parameters. You can still fully customize all texts, pricing, FAQs, and photos below!</p>
                      </div>
                    </div>
                  )}

                  {/* Industry Select */}
                  {!isFrozen && (
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Industry Sector</label>
                      <select
                        value={project.metadata.industryId}
                        onChange={(e) => {
                          const nextIndId = e.target.value;
                          const defaultForIndustry = ProjectManager.createProject(nextIndId);
                          setProject(defaultForIndustry);
                          ProjectManager.saveProject(defaultForIndustry);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      >
                        {INDUSTRIES.map(ind => (
                          <option key={ind.id} value={ind.id}>{ind.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Template Select */}
                  {!isFrozen && (
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Template Layout</label>
                      <select
                        value={project.metadata.templateId}
                        onChange={(e) => {
                          const nextTplId = e.target.value;
                          setProject(prev => {
                            const updated = {
                              ...prev,
                              metadata: { ...prev.metadata, templateId: nextTplId }
                            };
                            ProjectManager.saveProject(updated);
                            return updated;
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      >
                        {TEMPLATES.filter(t => t.industryId === project.metadata.industryId).map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Theme Select */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Color Palette & Fonts</label>
                    <select
                      value={project.metadata.themeId}
                      onChange={(e) => {
                        const nextThemeId = e.target.value;
                        setProject(prev => {
                          const updated = {
                            ...prev,
                            metadata: { ...prev.metadata, themeId: nextThemeId }
                          };
                          ProjectManager.saveProject(updated);
                          return updated;
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    >
                      {THEMES.map(theme => (
                        <option key={theme.id} value={theme.id}>{theme.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Business Name */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="business-name"
                    value={config.businessName}
                    onChange={(e) => handleTextChange('businessName', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="business-name" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Business name
                  </label>
                </div>

                {/* Logo Text */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="logo-text"
                    value={config.logoText}
                    onChange={(e) => handleTextChange('logoText', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="logo-text" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Logo wordmark
                  </label>
                </div>

                {/* Logo Icon */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-2">Logo icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {LOGO_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = config.logoIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleTextChange('logoIcon', item.name)}
                          className={`h-11 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/40 text-blue-600 shadow-sm ring-2 ring-blue-100' 
                              : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700'
                          }`}
                          title={item.name}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Phone */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="phone"
                    value={config.phone}
                    onChange={(e) => handleTextChange('phone', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="phone" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Phone number
                  </label>
                </div>

                {/* Email */}
                <div className="relative h-13">
                  <input 
                    type="email" 
                    id="email"
                    value={config.email}
                    onChange={(e) => handleTextChange('email', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="email" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Email address
                  </label>
                </div>

                {/* Logo Image Upload */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-2">Custom brand logo image</label>
                  <div 
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-600 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                  >
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600 mb-3">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    {config.logoFileUrl ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-600">Logo Uploaded Successfully!</p>
                        <p className="text-[10px] text-slate-400">Click or drag again to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">Drag and drop your logo</p>
                        <p className="text-[10px] text-slate-400">PNG, SVG or JPG · Max 2MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-5">
                {/* Hero Badge */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="hero-badge"
                    value={config.heroBadge}
                    onChange={(e) => handleTextChange('heroBadge', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="hero-badge" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Hero badge text
                  </label>
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-1.5 ml-1">Main headline</label>
                  <textarea 
                    rows={3}
                    value={config.heroHeadline}
                    onChange={(e) => handleTextChange('heroHeadline', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-50 resize-none"
                    placeholder="Enter compelling main headline..."
                  />
                </div>

                {/* Subheadline */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-1.5 ml-1">Hero subheadline</label>
                  <textarea 
                    rows={4}
                    value={config.heroSubheadline}
                    onChange={(e) => handleTextChange('heroSubheadline', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-4 text-sm font-medium text-slate-600 outline-none transition-all focus:ring-4 focus:ring-blue-50 resize-none leading-relaxed"
                    placeholder="Enter detailed secondary subheadline explanation..."
                  />
                </div>

                {/* Primary Button */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="hero-pbtn"
                    value={config.heroPrimaryBtn}
                    onChange={(e) => handleTextChange('heroPrimaryBtn', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="hero-pbtn" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Primary button label
                  </label>
                </div>

                {/* Secondary Button */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="hero-sbtn"
                    value={config.heroSecondaryBtn}
                    onChange={(e) => handleTextChange('heroSecondaryBtn', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="hero-sbtn" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    Secondary button label
                  </label>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-5">
                {/* About Title */}
                <div className="relative h-13">
                  <input 
                    type="text" 
                    id="about-title"
                    value={config.aboutTitle}
                    onChange={(e) => handleTextChange('aboutTitle', e.target.value)}
                    placeholder=" "
                    className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                  />
                  <label htmlFor="about-title" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                    About title
                  </label>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-1.5 ml-1">About narrative</label>
                  <textarea 
                    rows={5}
                    value={config.aboutDescription}
                    onChange={(e) => handleTextChange('aboutDescription', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-4 text-sm font-medium text-slate-600 outline-none transition-all focus:ring-4 focus:ring-blue-50 resize-none leading-relaxed"
                    placeholder="Introduce company legacy..."
                  />
                </div>

                {/* Stat 1 Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative h-13">
                    <input 
                      type="text" 
                      id="stat-1-val"
                      value={config.aboutStatVal1}
                      onChange={(e) => handleTextChange('aboutStatVal1', e.target.value)}
                      placeholder=" "
                      className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-bold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                    />
                    <label htmlFor="stat-1-val" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                      Stat 1 value
                    </label>
                  </div>

                  <div className="relative h-13">
                    <input 
                      type="text" 
                      id="stat-1-lbl"
                      value={config.aboutStatLabel1}
                      onChange={(e) => handleTextChange('aboutStatLabel1', e.target.value)}
                      placeholder=" "
                      className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-700 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                    />
                    <label htmlFor="stat-1-lbl" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                      Stat 1 label
                    </label>
                  </div>
                </div>

                {/* Stat 2 Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative h-13">
                    <input 
                      type="text" 
                      id="stat-2-val"
                      value={config.aboutStatVal2}
                      onChange={(e) => handleTextChange('aboutStatVal2', e.target.value)}
                      placeholder=" "
                      className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-bold text-slate-900 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                    />
                    <label htmlFor="stat-2-val" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                      Stat 2 value
                    </label>
                  </div>

                  <div className="relative h-13">
                    <input 
                      type="text" 
                      id="stat-2-lbl"
                      value={config.aboutStatLabel2}
                      onChange={(e) => handleTextChange('aboutStatLabel2', e.target.value)}
                      placeholder=" "
                      className="peer absolute inset-0 w-full h-13 bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-700 placeholder-transparent outline-none transition-all focus:ring-4 focus:ring-blue-50" 
                    />
                    <label htmlFor="stat-2-lbl" className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                      Stat 2 label
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Manage services ({config.services.length})</span>
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Service
                  </button>
                </div>

                <div className="space-y-5">
                  {config.services.map((service, index) => (
                    <div key={service.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/40 relative space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-bold text-blue-600 flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" /> Service #{index + 1}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-300 uppercase">Config</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(service.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Service Title */}
                        <div className="relative h-13 bg-white rounded-xl">
                          <input 
                            type="text" 
                            id={`srv-title-${service.id}`}
                            value={service.title}
                            onChange={(e) => {
                              const updated = [...config.services];
                              updated[index].title = e.target.value;
                              setConfig(prev => ({ ...prev, services: updated }));
                            }}
                            placeholder=" "
                            className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all" 
                          />
                          <label htmlFor={`srv-title-${service.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                            Service header title
                          </label>
                        </div>

                        {/* Service Icon Dropdown selector */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">Service Icon</label>
                          <select
                            value={service.iconName || 'Briefcase'}
                            onChange={(e) => {
                              const updated = [...config.services];
                              updated[index].iconName = e.target.value;
                              setConfig(prev => ({ ...prev, services: updated }));
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="Wrench">Wrench</option>
                            <option value="Hammer">Hammer</option>
                            <option value="Home">Home</option>
                            <option value="Building">Building</option>
                            <option value="Paintbrush">Paintbrush</option>
                            <option value="Ruler">Ruler</option>
                            <option value="HardHat">Hard Hat</option>
                            <option value="Briefcase">Briefcase</option>
                            <option value="Shield">Shield</option>
                            <option value="Lightbulb">Lightbulb</option>
                            <option value="Zap">Zap</option>
                            <option value="CheckCircle">Check Circle</option>
                          </select>
                        </div>

                        {/* Service Description */}
                        <div>
                          <label className="block text-4xs font-bold text-slate-400 tracking-wider mb-1 ml-1">Capability description</label>
                          <textarea 
                            rows={2}
                            value={service.description}
                            onChange={(e) => {
                              const updated = [...config.services];
                              updated[index].description = e.target.value;
                              setConfig(prev => ({ ...prev, services: updated }));
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-3.5 text-xs font-medium text-slate-600 outline-none transition-all resize-none"
                            placeholder="Summarize building capabilities..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="space-y-6">
                {config.gallery.map((img, index) => (
                  <div key={img.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xs font-bold text-blue-600 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Gallery showcase 0{index + 1}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-300">Image asset</span>
                    </div>

                    {/* Title */}
                    <div className="relative h-13 bg-white rounded-xl">
                      <input 
                        type="text" 
                        id={`gal-title-${img.id}`}
                        value={img.title}
                        onChange={(e) => {
                          const updated = [...config.gallery];
                          updated[index].title = e.target.value;
                          setConfig(prev => ({ ...prev, gallery: updated }));
                        }}
                        placeholder=" "
                        className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all" 
                      />
                      <label htmlFor={`gal-title-${img.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                        Image descriptor title
                      </label>
                    </div>

                    {/* Custom URL */}
                    <div className="relative h-13 bg-white rounded-xl">
                      <input 
                        type="text" 
                        id={`gal-url-${img.id}`}
                        value={img.url}
                        onChange={(e) => {
                          const updated = [...config.gallery];
                          updated[index].url = e.target.value;
                          setConfig(prev => ({ ...prev, gallery: updated }));
                        }}
                        placeholder=" "
                        className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-xs font-medium text-slate-800 placeholder-transparent outline-none transition-all" 
                      />
                      <label htmlFor={`gal-url-${img.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                        Source photo URL
                      </label>
                    </div>

                    {/* Image File Uploader */}
                    <div className="p-3.5 bg-white border border-slate-150 rounded-xl flex items-center justify-between gap-3 shadow-3xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-2xs font-bold text-slate-800">Upload Custom Image</span>
                        <span className="text-4xs text-slate-400">Loads local image files directly</span>
                      </div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 rounded-lg text-3xs font-extrabold text-blue-600 hover:text-blue-700 transition-all cursor-pointer">
                        <Upload className="w-3 h-3 text-blue-500" />
                        <span>Select file</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  const updated = [...config.gallery];
                                  updated[index].url = event.target.result as string;
                                  setConfig(prev => ({ ...prev, gallery: updated }));
                                }
                              };
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Unsplash Presets selection */}
                    <div>
                      <span className="block text-4xs font-bold text-slate-400 tracking-wider mb-2 ml-1">Or choose architectural preset</span>
                      <div className="grid grid-cols-6 gap-1.5">
                        {GALLERY_PRESETS.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              const updated = [...config.gallery];
                              updated[index].url = preset.url;
                              updated[index].title = preset.title;
                              setConfig(prev => ({ ...prev, gallery: updated }));
                            }}
                            className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                              img.url === preset.url ? 'border-blue-600 ring-2 ring-blue-100 scale-95' : 'border-slate-100 hover:scale-105'
                            }`}
                            title={preset.title}
                          >
                            <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 5 && (
              <div className="space-y-6">
                {/* Razorpay Setup Block */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">Razorpay Payment Integration</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Collect payments directly on your exported landing page with India's leading payment gateway!</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 pb-1.5 border-b border-slate-150/80">
                    <label className="text-[11px] font-bold text-slate-600 cursor-pointer" htmlFor="enable-razorpay-global">
                      Enable Razorpay Payment Gateway
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="enable-razorpay-global"
                        checked={project.extensions?.integrations?.enableRazorpayGlobal || false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setProject(prev => {
                            const updated = {
                              ...prev,
                              extensions: {
                                ...prev.extensions,
                                integrations: {
                                  ...prev.extensions?.integrations,
                                  enableRazorpayGlobal: val
                                }
                              }
                            };
                            ProjectManager.saveProject(updated);
                            return updated;
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {(project.extensions?.integrations?.enableRazorpayGlobal) && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Razorpay API Key ID (Live or Test)</label>
                        <input 
                          type="text"
                          value={project.extensions?.integrations?.razorpayKeyId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProject(prev => {
                              const updated = {
                                ...prev,
                                extensions: {
                                  ...prev.extensions,
                                  integrations: {
                                    ...prev.extensions?.integrations,
                                    razorpayKeyId: val
                                  }
                                }
                              };
                              ProjectManager.saveProject(updated);
                              return updated;
                            });
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-semibold text-slate-950 outline-none transition-all"
                          placeholder="rzp_test_XXXXXXXXXXXXXXXX or rzp_live_XXXXXXXXXXXXXXXX"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                          Your Key ID is safe and stored locally. Get your Key ID from the <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Razorpay Dashboard</a>.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Business Name shown on checkout popup</label>
                        <input 
                          type="text"
                          value={project.extensions?.integrations?.razorpayBusinessName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProject(prev => {
                              const updated = {
                                ...prev,
                                extensions: {
                                  ...prev.extensions,
                                  integrations: {
                                    ...prev.extensions?.integrations,
                                    razorpayBusinessName: val
                                  }
                                }
                              };
                              ProjectManager.saveProject(updated);
                              return updated;
                            });
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-semibold text-slate-950 outline-none transition-all"
                          placeholder={config.businessName}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Manage packages ({config.pricing.length}/4)</span>
                  <button
                    type="button"
                    onClick={handleAddPricingPlan}
                    disabled={config.pricing.length >= 4}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      config.pricing.length >= 4 
                        ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-60' 
                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100/70'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Package
                  </button>
                </div>

                <div className="space-y-5">
                  {config.pricing.map((plan, index) => (
                    <div key={plan.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xs font-bold text-blue-600">
                            Package #{index + 1}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleDeletePricingPlan(plan.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-500 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={plan.popular}
                            onChange={(e) => {
                              const updated = [...config.pricing];
                              updated[index].popular = e.target.checked;
                              setConfig(prev => ({ ...prev, pricing: updated }));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-100 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Popular</span>
                        </label>
                      </div>

                      {/* Package Name */}
                      <div className="relative h-13 bg-white rounded-xl">
                        <input 
                          type="text" 
                          id={`plan-name-${plan.id}`}
                          value={plan.name}
                          onChange={(e) => {
                            const updated = [...config.pricing];
                            updated[index].name = e.target.value;
                            setConfig(prev => ({ ...prev, pricing: updated }));
                          }}
                          placeholder=" "
                          className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all" 
                        />
                        <label htmlFor={`plan-name-${plan.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                          Package label / name
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Price */}
                        <div className="relative h-13 bg-white rounded-xl">
                          <input 
                            type="text" 
                            id={`plan-price-${plan.id}`}
                            value={plan.price}
                            onChange={(e) => {
                              const updated = [...config.pricing];
                              updated[index].price = e.target.value;
                              setConfig(prev => ({ ...prev, pricing: updated }));
                            }}
                            placeholder=" "
                            className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-bold text-slate-900 placeholder-transparent outline-none transition-all" 
                          />
                          <label htmlFor={`plan-price-${plan.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                            Price tag
                          </label>
                        </div>

                        {/* Period */}
                        <div className="relative h-13 bg-white rounded-xl">
                          <input 
                            type="text" 
                            id={`plan-period-${plan.id}`}
                            value={plan.period}
                            onChange={(e) => {
                              const updated = [...config.pricing];
                              updated[index].period = e.target.value;
                              setConfig(prev => ({ ...prev, pricing: updated }));
                            }}
                            placeholder=" "
                            className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-xs font-semibold text-slate-700 placeholder-transparent outline-none transition-all" 
                          />
                          <label htmlFor={`plan-period-${plan.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                            Price period
                          </label>
                        </div>
                      </div>

                      {/* Features */}
                      <div>
                        <label className="block text-4xs font-bold text-slate-400 tracking-wider mb-1 ml-1">Features (one per line)</label>
                        <textarea 
                          rows={3}
                          value={plan.features.join('\n')}
                          onChange={(e) => {
                            const updated = [...config.pricing];
                            updated[index].features = e.target.value.split('\n');
                            setConfig(prev => ({ ...prev, pricing: updated }));
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-3 text-xs font-medium text-slate-600 outline-none transition-all leading-relaxed"
                          placeholder="Enter features list..."
                        />
                      </div>

                      {/* Package-specific Razorpay Checkout Toggle */}
                      {project.extensions?.integrations?.enableRazorpayGlobal && (
                        <div className="bg-white border border-slate-150/85 rounded-xl p-3.5 space-y-3.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Enable Razorpay on Buy</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={plan.enableRazorpay || false}
                                onChange={(e) => {
                                  const updated = [...config.pricing];
                                  updated[index].enableRazorpay = e.target.checked;
                                  if (e.target.checked && !plan.razorpayAmount) {
                                    // Set a sensible fallback from text price if possible
                                    const parsedPrice = parseInt(plan.price.replace(/[^0-9]/g, ''));
                                    updated[index].razorpayAmount = isNaN(parsedPrice) ? 1000 : parsedPrice;
                                  }
                                  setConfig(prev => ({ ...prev, pricing: updated }));
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          {plan.enableRazorpay && (
                            <div className="relative h-13 bg-white rounded-xl">
                              <input 
                                type="number" 
                                id={`plan-razorpay-amount-${plan.id}`}
                                value={plan.razorpayAmount || ''}
                                onChange={(e) => {
                                  const updated = [...config.pricing];
                                  updated[index].razorpayAmount = e.target.value ? Number(e.target.value) : undefined;
                                  setConfig(prev => ({ ...prev, pricing: updated }));
                                }}
                                placeholder=" "
                                className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-bold text-slate-900 placeholder-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              />
                              <label htmlFor={`plan-razorpay-amount-${plan.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                                Charge Amount (INR)
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 6 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {config.faqs.map((faq, index) => (
                    <div key={faq.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/40 space-y-4 relative group">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xs font-bold text-blue-600 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" /> Inquiry 0{index + 1}
                        </h3>
                        {config.faqs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = config.faqs.filter((_, i) => i !== index);
                              setConfig(prev => ({ ...prev, faqs: updated }));
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete FAQ Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Question */}
                      <div className="relative h-13 bg-white rounded-xl">
                        <input 
                          type="text" 
                          id={`faq-q-${faq.id}`}
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...config.faqs];
                            updated[index].question = e.target.value;
                            setConfig(prev => ({ ...prev, faqs: updated }));
                          }}
                          placeholder=" "
                          className="peer absolute inset-0 w-full h-13 bg-transparent border border-slate-200 focus:border-blue-600 rounded-xl px-4 pt-5 pb-1 text-sm font-semibold text-slate-900 placeholder-transparent outline-none transition-all" 
                        />
                        <label htmlFor={`faq-q-${faq.id}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-2xs peer-focus:text-blue-600 peer-focus:font-bold peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-2xs peer-not-placeholder-shown:text-slate-500">
                          Frequent question
                        </label>
                      </div>

                      {/* Answer */}
                      <div>
                        <label className="block text-4xs font-bold text-slate-400 tracking-wider mb-1 ml-1">Detailed answer</label>
                        <textarea 
                          rows={3}
                          value={faq.answer}
                          onChange={(e) => {
                            const updated = [...config.faqs];
                            updated[index].answer = e.target.value;
                            setConfig(prev => ({ ...prev, faqs: updated }));
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-3 text-xs font-medium text-slate-600 outline-none transition-all resize-none leading-relaxed"
                          placeholder="Provide explanatory answer..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Question Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (config.faqs.length >= 10) {
                      alert("You have reached the maximum cap of 10 FAQs. Please edit or delete existing FAQs to maintain a high-quality user experience.");
                      return;
                    }
                    const newFaq = {
                      id: `faq-${Date.now()}`,
                      question: "New Frequently Asked Question?",
                      answer: "Please provide a detailed answer here."
                    };
                    setConfig(prev => ({
                      ...prev,
                      faqs: [...prev.faqs, newFaq]
                    }));
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/25 text-slate-500 hover:text-blue-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add FAQ Question</span>
                </button>
              </div>
            )}

            {activeTab === 7 && (
              <div className="space-y-5">
                {/* Contact Address */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-1.5 ml-1">Office location address</label>
                  <textarea 
                    rows={3}
                    value={config.contactAddress}
                    onChange={(e) => handleTextChange('contactAddress', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-50 resize-none leading-relaxed"
                    placeholder="Enter formal office coordinates..."
                  />
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-2xs font-bold text-slate-400 tracking-wide mb-1.5 ml-1">Operational working hours</label>
                  <input 
                    type="text"
                    value={config.contactHours}
                    onChange={(e) => handleTextChange('contactHours', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl p-4 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-50"
                    placeholder="Mon - Fri: 8:00 AM - 6:00 PM..."
                  />
                </div>

                {/* Form Action Endpoint Integration */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Mail className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Operational Form Action</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    By default, the exported contact form runs a local submission simulator. Provide a custom form submission endpoint (such as Formspree, Web3Forms, Getform, or your custom API endpoint) to collect real business leads!
                  </p>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Form Action URL (HTTP POST)</label>
                    <input 
                      type="url"
                      value={project.extensions?.integrations?.customFormActionUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProject(prev => {
                          const updated = {
                            ...prev,
                            extensions: {
                              ...prev.extensions,
                              integrations: {
                                ...prev.extensions?.integrations,
                                customFormActionUrl: val
                              }
                            }
                          };
                          ProjectManager.saveProject(updated);
                          return updated;
                        });
                      }}
                      className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-50"
                      placeholder="https://formspree.io/f/your-form-id"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigate */}
      <div className="p-4 border-t border-slate-50 bg-slate-50/50" id="panel-footer-actions">
        <button 
          onClick={handleNextSection}
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-100 hover:shadow-blue-200/50 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>{activeTab === TABS.length - 1 ? 'Mark Complete' : 'Next section'}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
