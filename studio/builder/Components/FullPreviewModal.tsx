import * as Icons from 'lucide-react';
import { Project } from '../types';
import { RenderEngine } from '../library/RenderEngine';

interface FullPreviewModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullPreviewModal({ project, isOpen, onClose }: FullPreviewModalProps) {
  if (!isOpen) return null;

  const renderedHtml = RenderEngine.render(project, { isPreview: false });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex flex-col" id="full-preview-modal">
      {/* Top action bar */}
      <div className="bg-slate-900 text-white h-14 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Icons.Monitor className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold tracking-tight text-slate-100">Full-Screen Interactive Preview</span>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
        >
          <Icons.X className="w-3.5 h-3.5" />
          <span>Exit Full-Screen</span>
        </button>
      </div>

      {/* Website Viewport (Unified Render Engine) */}
      <div className="flex-1 overflow-hidden bg-slate-50/50 relative">
        <iframe
          srcDoc={renderedHtml}
          className="w-full h-full border-0 absolute inset-0"
          title="Full-Screen Web Preview"
          sandbox="allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}
