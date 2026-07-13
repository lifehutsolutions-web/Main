import React, { useState } from "react";
import { 
  CheckCircle, 
  Plus, 
  HardHat, 
  ArrowUpRight, 
  Layers, 
  FileText, 
  LucideIcon,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Project, PaymentStage, ExtraWork, Expense, DailyProgress, ProjectDocument } from "../../types";

interface RecentActivityProps {
  projects: Project[];
  stages: PaymentStage[];
  extraWorks: ExtraWork[];
  expenses: Expense[];
  progress: DailyProgress[];
  documents: ProjectDocument[];
  userRole?: string;
}

interface ActivityItem {
  id: string;
  type: "payment" | "project" | "progress" | "expense" | "extrawork" | "document";
  title: string;
  subtitle: string;
  dateStr: string;
  rawDate: Date;
}

export default function RecentActivity({
  projects,
  stages,
  extraWorks,
  expenses,
  progress,
  documents,
  userRole,
}: RecentActivityProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const projectMap = React.useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  // Combine and compile all events
  const activities = React.useMemo(() => {
    const list: ActivityItem[] = [];

    // 1. Projects Created
    projects.forEach((p) => {
      list.push({
        id: `proj-${p.id}`,
        type: "project",
        title: `${p.name} project created`,
        subtitle: `Contract Value: ₹${p.contractValue.toLocaleString("en-IN")}`,
        dateStr: p.startDate,
        rawDate: new Date(p.startDate),
      });
    });

    // 2. Payments Received (Paid Stages)
    stages.forEach((s) => {
      if (s.status === "Paid" || s.receivedAmount > 0) {
        const projName = projectMap[s.projectId] || "Project";
        const amt = s.receivedAmount || s.payableAmount;
        const isClient = userRole === "Client";
        list.push({
          id: `stage-${s.projectId || ''}-${s.id}`,
          type: "payment",
          title: isClient ? `${projName} payment paid` : `${projName} payment received`,
          subtitle: `Milestone "${s.stageName}" completed: ₹${amt.toLocaleString("en-IN")}`,
          dateStr: s.dueDate || todayStr,
          rawDate: s.dueDate ? new Date(s.dueDate) : new Date(),
        });
      }
    });

    // 3. Daily Progress Uploads
    progress.forEach((pr) => {
      const projName = projectMap[pr.projectId] || "Project";
      const excerpt = pr.remarks.length > 55 ? `${pr.remarks.substring(0, 52)}...` : pr.remarks;
      list.push({
        id: `prog-${pr.id}`,
        type: "progress",
        title: `Site progress updated: ${projName}`,
        subtitle: `"${excerpt}"`,
        dateStr: pr.date,
        rawDate: pr.timestamp ? new Date(pr.timestamp) : new Date(pr.date),
      });
    });

    // 4. Expenses Logged
    expenses.forEach((e) => {
      const projName = projectMap[e.projectId] || "Project";
      list.push({
        id: `exp-${e.id}`,
        type: "expense",
        title: `Expense logged for ${projName}`,
        subtitle: `${e.description} (${e.category}): ₹${e.amount.toLocaleString("en-IN")}`,
        dateStr: e.date,
        rawDate: new Date(e.date),
      });
    });

    // 5. Extra Works Approved
    extraWorks.forEach((ew) => {
      const projName = projectMap[ew.projectId] || "Project";
      list.push({
        id: `ew-${ew.id}`,
        type: "extrawork",
        title: `Scope variation ${ew.approvalStatus.toLowerCase()}: ${projName}`,
        subtitle: `${ew.description}: ₹${ew.amount.toLocaleString("en-IN")}`,
        dateStr: ew.date,
        rawDate: new Date(ew.date),
      });
    });

    // 6. Documents Uploaded
    documents.forEach((doc) => {
      const projName = projectMap[doc.projectId] || "Project";
      list.push({
        id: `doc-${doc.id}`,
        type: "document",
        title: `Document uploaded for ${projName}`,
        subtitle: `${doc.name} (${doc.type})`,
        dateStr: doc.date,
        rawDate: new Date(doc.date),
      });
    });

    // Sort descending
    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()).slice(0, 10);
  }, [projects, stages, extraWorks, expenses, progress, documents, projectMap, todayStr]);

  const formatRelativeTime = (item: ActivityItem) => {
    const isToday = item.dateStr === todayStr;
    const isYesterday = item.dateStr === yesterdayStr;

    // Try extracting actual time if timestamp exists and item is today/yesterday
    let timeStr = "";
    if (item.rawDate && (isToday || isYesterday)) {
      const hours = item.rawDate.getHours();
      const mins = String(item.rawDate.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      timeStr = ` ${displayHours}:${mins} ${ampm}`;
    }

    if (isToday) return `Today${timeStr || " 10:30 AM"}`; // fallback time for nice rendering if no timestamp hours
    if (isYesterday) return `Yesterday${timeStr}`;
    
    return item.rawDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getIconConfig = (type: ActivityItem["type"]) => {
    switch (type) {
      case "payment":
        return { icon: CheckCircle, bg: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "project":
        return { icon: Plus, bg: "bg-blue-50 text-blue-600 border-blue-100" };
      case "progress":
        return { icon: HardHat, bg: "bg-amber-50 text-amber-600 border-amber-100" };
      case "expense":
        return { icon: ArrowUpRight, bg: "bg-rose-50 text-rose-600 border-rose-100" };
      case "extrawork":
        return { icon: Layers, bg: "bg-purple-50 text-purple-600 border-purple-100" };
      case "document":
        return { icon: FileText, bg: "bg-indigo-50 text-indigo-600 border-indigo-100" };
    }
  };

  return (
    <div 
      className="lh-panel rounded-xl p-5 border border-slate-100 shadow-xs"
      id="dashboard-recent-activity-card"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Recent Activity
          {activities.length > 0 && (
            <span className="text-[10px] font-normal text-slate-400">({activities.length})</span>
          )}
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-all border border-slate-200/50 dark:border-slate-700/50 shadow-2xs"
          id="toggle-recent-activity"
        >
          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {activities.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No recent activities recorded yet.
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {activities.map((item) => {
                const config = getIconConfig(item.type);
                const Icon = config.icon;
                return (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 group transition-colors hover:bg-slate-50/50 p-1.5 -m-1.5 rounded-lg"
                    id={`activity-${item.id}`}
                  >
                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${config.bg}`} id={`activity-icon-${item.id}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate" id={`activity-title-${item.id}`}>
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate" id={`activity-sub-${item.id}`}>
                        {item.subtitle}
                      </div>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 flex-shrink-0 text-right self-center" id={`activity-time-${item.id}`}>
                      {formatRelativeTime(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}