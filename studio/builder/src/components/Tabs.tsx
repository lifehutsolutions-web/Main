import { Settings, Layout, User, Briefcase, Image, BadgeDollarSign, CircleHelp, Phone, CheckCircle } from 'lucide-react';

interface TabsProps {
  activeTab: number;
  setActiveTab: (idx: number) => void;
  completedTabs: Set<number>;
}

export const TABS = [
  { id: 0, label: 'General', icon: Settings },
  { id: 1, label: 'Hero', icon: Layout },
  { id: 2, label: 'About', icon: User },
  { id: 3, label: 'Services', icon: Briefcase },
  { id: 4, label: 'Gallery', icon: Image },
  { id: 5, label: 'Pricing', icon: BadgeDollarSign },
  { id: 6, label: 'FAQ', icon: CircleHelp },
  { id: 7, label: 'Contact', icon: Phone },
];

export default function Tabs({ activeTab, setActiveTab, completedTabs }: TabsProps) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 flex items-end gap-1 shrink-0 overflow-x-auto scrollbar-none" id="tabs-bar">
      {TABS.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        const isCompleted = completedTabs.has(tab.id);

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-3.5 px-4.5 border-b-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap outline-none relative group
              ${isActive 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/80 rounded-t-xl'
              }`}
            id={`tab-btn-${tab.id}`}
          >
            <IconComponent className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
            <span>{tab.label}</span>
            
            {isCompleted ? (
              <span className="flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5">
                <CheckCircle className="w-3 h-3 stroke-[3px]" />
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-300" />
            )}

            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
