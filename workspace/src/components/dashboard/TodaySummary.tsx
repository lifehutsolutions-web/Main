import React from "react";
import { Calendar, Building2, TrendingUp, Clock, LucideIcon } from "lucide-react";

interface TodaySummaryProps {
  ownerName: string;
  activeProjects: number;
  paymentsDueToday: number;
  collectedThisMonth: number;
  pendingCollection: number;
  onNavigate?: (tab: 'dashboard' | 'projects' | 'milestones' | 'expenses' | 'extraworks' | 'progress' | 'documents' | 'chat' | 'reports') => void;
}

export default function TodaySummary({
  ownerName,
  activeProjects,
  paymentsDueToday,
  collectedThisMonth,
  pendingCollection,
  onNavigate,
}: TodaySummaryProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 17
      ? "Good Afternoon"
      : "Good Evening";

  // Format today's date, e.g., "Monday, 6 July 2026"
  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="mb-1 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 shadow-xs"
      id="dashboard-today-summary"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Today's Date */}
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1" id="summary-today-date">
            {formattedDate}
          </div>
          {/* Greeting */}
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2" id="summary-greeting-title">
            <span>☀</span> {greeting}, {ownerName}
          </h2>
          {/* Motivational line */}
          <p className="text-slate-500 mt-0.5 text-xs font-medium" id="summary-greeting-subtitle">
            Let's make today productive.
          </p>
        </div>

        {/* Real-time Weather Report Indication */}
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-blue-100/50 shadow-2xs self-start sm:self-center" id="weather-badge-info">
          <div className="text-2xl animate-bounce">⛅</div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-800">29°C</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 font-bold text-emerald-800 uppercase tracking-wide">
                Clear for Site Work
              </span>
            </div>
            <div className="text-[10.5px] text-slate-500 font-semibold mt-0.5">
              Scattered Clouds • Wind: 14 km/h • Humidity: 58%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5" id="summary-metrics-grid">
        <SummaryCard
          icon={Calendar}
          iconColor="text-blue-600 bg-blue-100/60"
          title="Payments Due Today"
          value={paymentsDueToday.toString()}
          id="metric-payments-due-today"
          onClick={() => onNavigate && onNavigate("milestones")}
        />

        <SummaryCard
          icon={Building2}
          iconColor="text-indigo-600 bg-indigo-100/60"
          title="Active Projects"
          value={activeProjects.toString()}
          id="metric-active-projects-count"
          onClick={() => onNavigate && onNavigate("projects")}
        />

        <SummaryCard
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-100/60"
          title="Collected This Month"
          value={`₹${collectedThisMonth.toLocaleString("en-IN")}`}
          id="metric-collected-this-month"
          onClick={() => onNavigate && onNavigate("reports")}
        />

        <SummaryCard
          icon={Clock}
          iconColor="text-amber-600 bg-amber-100/60"
          title="Pending Collection"
          value={`₹${pendingCollection.toLocaleString("en-IN")}`}
          id="metric-pending-collection"
          onClick={() => onNavigate && onNavigate("milestones")}
        />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  value: string;
  id: string;
  onClick?: () => void;
}

function SummaryCard({ icon: Icon, iconColor, title, value, id, onClick }: SummaryCardProps) {
  return (
    <div
      className={`rounded-lg bg-white p-3.5 shadow-xs border border-slate-100/80 flex flex-col justify-between transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
          : ""
      }`}
      id={id}
      onClick={onClick}
    >
      <div className={`p-1.5 rounded-md w-8 h-8 flex items-center justify-center ${iconColor}`} id={`${id}-icon-container`}>
        <Icon className="w-4 h-4" id={`${id}-icon`} />
      </div>
      <div>
        <div className="text-[11px] font-semibold text-slate-400 mt-2.5 uppercase tracking-wider" id={`${id}-title`}>
          {title}
        </div>
        <div className="text-base font-bold text-slate-800 mt-0.5" id={`${id}-value`}>
          {value}
        </div>
      </div>
    </div>
  );
}
