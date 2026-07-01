import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Project, DevMode } from '../types';
import { RenderEngine } from '../library/RenderEngine';

interface LivePreviewProps {
  project: Project;
  activeTab: number;
}

export default function LivePreview({ project, activeTab }: LivePreviewProps) {
  const [devMode, setDevMode] = useState<DevMode>('desktop');
  const [zoom, setZoom] = useState<number>(85);

  // Synchronized scroll to edited section inside the iframe doc
  useEffect(() => {
    const iframe = document.getElementById('live-preview-iframe') as HTMLIFrameElement;
    if (!iframe) return;

    const tabIdToSectionId: { [key: number]: string } = {
      0: 'top',
      1: 'hero',
      2: 'about',
      3: 'services',
      4: 'gallery',
      5: 'pricing',
      6: 'faqs',
      7: 'contact'
    };

    const targetId = tabIdToSectionId[activeTab];
    if (targetId) {
      // Delay slightly to allow iframe sourceDoc to render/re-evaluate
      const timeout = setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            if (targetId === 'top') {
              iframe.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              const element = iframeDoc.getElementById(targetId);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        } catch (err) {
          console.warn('Iframe accessibility check:', err);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [activeTab, project]);

  // Resolved size class for device viewports
  const getDeviceWidthClass = () => {
    switch (devMode) {
      case 'mobile': return 'w-[375px] h-[640px]';
      case 'tablet': return 'w-[768px] h-[800px]';
      default: return 'w-full h-full';
    }
  };

  // Generate identical live HTML from the Render Engine
  const renderedHtml = RenderEngine.render(project, { isPreview: true });

  return (
    <div className="flex-1 bg-slate-100/60 p-4 lg:p-6 flex flex-col min-w-0" id="live-preview-section">
      {/* Device Viewport Toggle & Live Indicators */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/50 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-3xs font-bold text-slate-800 uppercase tracking-wider">Live Preview</span>
          <span className="text-slate-300">·</span>
          <span className="text-3xs text-slate-400 font-medium">Real-time render</span>
        </div>

        {/* Viewport & Zoom Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Zoom Level Control */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-1 flex items-center shadow-2xs gap-1">
            <button 
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out (-10%)"
            >
              <Icons.ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-2xs font-mono font-bold text-slate-700 min-w-[38px] text-center">{zoom}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
              title="Zoom In (+10%)"
            >
              <Icons.ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-100 mx-1" />
            <button 
              onClick={() => setZoom(100)}
              className="px-2 py-1 hover:bg-slate-50 border border-slate-100 rounded-lg text-3xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Viewport Device Selector */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-1 flex items-center shadow-2xs">
            <button 
              onClick={() => setDevMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                devMode === 'desktop' 
                  ? 'bg-blue-50 text-blue-600 shadow-3xs' 
                  : 'text-slate-450 hover:text-slate-700'
              }`}
            >
              <Icons.Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            
            <button 
              onClick={() => setDevMode('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                devMode === 'tablet' 
                  ? 'bg-blue-50 text-blue-600 shadow-3xs' 
                  : 'text-slate-450 hover:text-slate-700'
              }`}
            >
              <Icons.Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>

            <button 
              onClick={() => setDevMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                devMode === 'mobile' 
                  ? 'bg-blue-50 text-blue-600 shadow-3xs' 
                  : 'text-slate-450 hover:text-slate-700'
              }`}
            >
              <Icons.Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex items-start justify-center overflow-hidden relative">
        <div 
          className={`bg-white rounded-2xl border border-slate-200/80 shadow-lg flex flex-col transition-all duration-300 overflow-hidden ${getDeviceWidthClass()}`}
          id="mock-browser-frame"
        >
          {/* Mock Browser Header Bar */}
          <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5 w-16">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
            </div>

            {/* Address bar */}
            <div className="bg-white border border-slate-200/80 rounded-lg py-1 px-3 flex items-center gap-1.5 w-72 md:w-96 text-4xs text-slate-400 font-mono justify-center truncate">
              <Icons.Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              <span className="truncate">preview.lifehut.studio/${project.config.businessName.toLowerCase().replace(/\s+/g, '-')}</span>
            </div>

            {/* Refresh action */}
            <div className="flex justify-end w-16 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <Icons.RotateCw className="w-3 h-3" />
            </div>
          </div>

          {/* Webpage Content Viewport (Embedded Render Engine) */}
          <div 
            className="flex-1 overflow-hidden bg-slate-50/50 relative" 
            id="mock-browser-body"
          >
            <iframe
              id="live-preview-iframe"
              srcDoc={renderedHtml}
              className="border-0 absolute inset-0 origin-top-left"
              style={{
                width: `${100 / (zoom / 100)}%`,
                height: `${100 / (zoom / 100)}%`,
                transform: `scale(${zoom / 100})`,
              }}
              title="Live Preview Website"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
