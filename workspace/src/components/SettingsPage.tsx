/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  ShieldCheck, 
  Database, 
  FolderOpen, 
  Settings, 
  Save, 
  Lock, 
  CloudLightning, 
  Key, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2,
  FileSpreadsheet,
  Bell
} from 'lucide-react';
import { fetchAll, saveAll, resetDB } from '../data';
import { ClientNotification } from '../services/notifications/clientNotification';
import { ContractorNotification } from '../services/notifications/contractorNotification';
import * as XLSX from 'xlsx';
import SubscriptionPortal from './SubscriptionPortal';

interface SettingsPageProps {
  activeSection?: 'profile' | 'defaults' | 'notifications' | 'backup' | 'billing';
  setActiveSection?: (section: 'profile' | 'defaults' | 'notifications' | 'backup' | 'billing') => void;
}

export default function SettingsPage({ activeSection: propActiveSection, setActiveSection: propSetActiveSection }: SettingsPageProps = {}) {
  const { user, userRole, userProfile, isDemoMode, updateUserProfile } = useAuth();
  const [localActiveSection, setLocalActiveSection] = useState<'profile' | 'defaults' | 'notifications' | 'backup' | 'billing'>('profile');

  const activeSection = propActiveSection || localActiveSection;
  const setActiveSection = propSetActiveSection || setLocalActiveSection;

  // Form states for Company Profile
  const [companyName, setCompanyName] = useState(userProfile?.companyName || '');
  const [ownerName, setOwnerName] = useState(userProfile?.ownerName || '');
  const [mobile, setMobile] = useState(userProfile?.mobile || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [gstNumber, setGstNumber] = useState(userProfile?.gstNumber || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [state, setState] = useState(userProfile?.state || '');
  const [pincode, setPincode] = useState(userProfile?.pincode || '');

  // Form states for Page Settings / Defaults (Header, Logo, Signature, Terms, etc.)
  const [pageHeader, setPageHeader] = useState(userProfile?.pageHeader || 'Lifehut Workspace Billing Statement');
  const [logoUrl, setLogoUrl] = useState(userProfile?.logoUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=100&auto=format&fit=crop');
  const [signature, setSignature] = useState(userProfile?.signature || 'Authorized Signatory');
  const [termsAndConditions, setTermsAndConditions] = useState(userProfile?.termsAndConditions || '1. All payments should be made strictly as per billing stages.\n2. Delayed payments may attract delay interest.\n3. Dispute resolution subject to local jurisdiction.');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Backup state
  const [copied, setCopied] = useState(false);
  const currentDb = fetchAll();
  const dbString = JSON.stringify(currentDb, null, 2);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateUserProfile({
        companyName,
        ownerName,
        mobile,
        email,
        gstNumber,
        address,
        city,
        state,
        pincode
      });
      setMsg({ text: 'Company profile updated successfully! ✅', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMsg({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateUserProfile({
        pageHeader,
        logoUrl,
        signature,
        termsAndConditions
      });
      setMsg({ text: 'Page & Document settings updated successfully! ✅', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMsg({ text: err.message || 'Failed to update defaults.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(dbString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackup = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Convert each db collection to sheet
      const wsProjects = XLSX.utils.json_to_sheet(currentDb.projects || []);
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');

      const wsStages = XLSX.utils.json_to_sheet(currentDb.stages || []);
      XLSX.utils.book_append_sheet(wb, wsStages, 'Payment Stages');

      const wsExtraWorks = XLSX.utils.json_to_sheet(currentDb.extraWorks || []);
      XLSX.utils.book_append_sheet(wb, wsExtraWorks, 'Extra Works');

      const wsExpenses = XLSX.utils.json_to_sheet(currentDb.expenses || []);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

      // Generate Supplier summary sheet
      const supplierSummaryMap: Record<string, { "Supplier Name": string; "Total Bill Amount": number; "Paid Amount": number; "Outstanding Due": number; "Expense Count": number }> = {};
      const rawExpenses = currentDb.expenses || [];
      rawExpenses.forEach((ex: any) => {
        const supplierName = (ex.supplier || 'N/A').trim();
        if (supplierName.toLowerCase() === 'n/a') return;
        
        if (!supplierSummaryMap[supplierName]) {
          supplierSummaryMap[supplierName] = {
            "Supplier Name": supplierName,
            "Total Bill Amount": 0,
            "Paid Amount": 0,
            "Outstanding Due": 0,
            "Expense Count": 0
          };
        }
        
        const amount = Number(ex.amount) || 0;
        const paidAmount = ex.paidAmount !== undefined ? Number(ex.paidAmount) : (ex.isPaid !== false ? amount : 0);
        const outstanding = Math.max(0, amount - paidAmount);
        
        supplierSummaryMap[supplierName]["Total Bill Amount"] += amount;
        supplierSummaryMap[supplierName]["Paid Amount"] += paidAmount;
        supplierSummaryMap[supplierName]["Outstanding Due"] += outstanding;
        supplierSummaryMap[supplierName]["Expense Count"] += 1;
      });
      const supplierRows = Object.values(supplierSummaryMap);
      const wsSuppliersSummary = XLSX.utils.json_to_sheet(supplierRows);
      XLSX.utils.book_append_sheet(wb, wsSuppliersSummary, 'Suppliers Summary');

      const wsProgress = XLSX.utils.json_to_sheet(currentDb.progress || []);
      XLSX.utils.book_append_sheet(wb, wsProgress, 'Daily Progress');

      const wsDocuments = XLSX.utils.json_to_sheet(currentDb.documents || []);
      XLSX.utils.book_append_sheet(wb, wsDocuments, 'Documents');

      const wsMessages = XLSX.utils.json_to_sheet(currentDb.messages || []);
      XLSX.utils.book_append_sheet(wb, wsMessages, 'Messages');

      XLSX.writeFile(wb, `lifehut_workspace_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      setMsg({ text: 'Excel backup file downloaded successfully! 📊', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMsg({ text: `Failed to generate Excel backup: ${err.message}`, type: 'error' });
    }
  };

  const handleImportBackup = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const importedDb: any = {
            projects: [],
            stages: [],
            extraWorks: [],
            expenses: [],
            progress: [],
            documents: [],
            messages: []
          };
          
          const sheetMap: Record<string, string> = {
            'Projects': 'projects',
            'Payment Stages': 'stages',
            'Extra Works': 'extraWorks',
            'Expenses': 'expenses',
            'Daily Progress': 'progress',
            'Documents': 'documents',
            'Messages': 'messages'
          };
          
          workbook.SheetNames.forEach(sheetName => {
            const dbKey = sheetMap[sheetName];
            if (dbKey) {
              const ws = workbook.Sheets[sheetName];
              importedDb[dbKey] = XLSX.utils.sheet_to_json(ws);
            }
          });
          
          if (importedDb.projects && importedDb.projects.length > 0) {
            saveAll(importedDb);
            alert('Excel Backup successfully imported and synchronized! Reloading to apply changes...');
            window.location.reload();
          } else {
            alert('Invalid Excel backup structure! Please upload a valid backup generated by this system (must contain "Projects" sheet).');
          }
        } catch (err: any) {
          console.error(err);
          alert(`Failed to import Excel backup: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };

  const handleResetSandbox = () => {
    const confirmMsg = isDemoMode
      ? 'Are you sure you want to reset all data? This deletes any sandbox edits and restores original seed data.'
      : 'Are you sure you want to clear your local offline browser cache? This will refresh your local session with fresh data from the server.';

    if (confirm(confirmMsg)) {
      resetDB();
      const successMsg = isDemoMode
        ? 'Database reset to original seed data successfully! Reloading...'
        : 'Local offline cache cleared successfully! Reloading...';
      alert(successMsg);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-5" id="settings-management-panel">
      {/* Settings Header */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'var(--lh-navy)' }}>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="lh-badge" style={{ background: 'rgba(230,126,34,0.18)', color: '#F5A961' }}>
              System Panel
            </span>
            <h3 className="text-xl font-display font-semibold tracking-tight text-white flex items-center gap-2">
              <Settings className="w-5 h-5 animate-spin-slow" style={{ color: '#7AB8F5' }} />
              Workspace Settings
            </h3>
            <p className="text-[12px] leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Configure company variables, page layout defaults, and local spreadsheet backups.
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold border ${
          msg.type === 'success' ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Settings Layout */}
      <div className="lh-panel rounded-xl p-6">
          
          {/* SECTION: BILLING & SUBSCRIPTION */}
          {activeSection === 'billing' && (
            <div className="space-y-4" id="settings-billing-section">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Billing & Subscription</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Manage your workspace subscription tier, view project limits, and apply premium codes.
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--lh-border)]">
                <SubscriptionPortal />
              </div>
            </div>
          )}

          {/* SECTION 1: COMPANY PROFILE */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Company Profile</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Manage contractor business parameters printed on billing and payment receipts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="lh-label">Company Name</label>
                  <input
                    type="text" required value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="lh-input" placeholder="e.g. Metrobuild Enterprises"
                  />
                </div>
                <div>
                  <label className="lh-label">Owner Name</label>
                  <input
                    type="text" required value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="lh-input" placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="lh-label">Mobile Number</label>
                  <input
                    type="text" required value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="lh-input" placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div>
                  <label className="lh-label">Business Email</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lh-input" placeholder="e.g. accounts@metrobuild.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="lh-label">GST Number</label>
                  <input
                    type="text" value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="lh-input" placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="lh-label">Office Address</label>
                  <input
                    type="text" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="lh-input" placeholder="Street Name, Building, Suite"
                  />
                </div>
                <div>
                  <label className="lh-label">City</label>
                  <input
                    type="text" value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="lh-input" placeholder="e.g. Mumbai"
                  />
                </div>
                <div>
                  <label className="lh-label">State</label>
                  <input
                    type="text" value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="lh-input" placeholder="e.g. Maharashtra"
                  />
                </div>
                <div>
                  <label className="lh-label">Pincode</label>
                  <input
                    type="text" value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="lh-input" placeholder="e.g. 400001"
                  />
                </div>
              </div>

              <div className="pt-3" style={{ borderTop: '1px solid var(--lh-border)' }}>
                <button
                  type="submit" disabled={saving}
                  className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION 4: PAGE & DOCUMENT SETTINGS */}
          {activeSection === 'defaults' && (
            <form onSubmit={handleSaveDefaults} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Page & Document Layout Defaults</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Set up default headers, logos, signatures, and terms applied to newly generated statements and pages.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="lh-label">Page Header Text</label>
                  <input
                    type="text" required value={pageHeader}
                    onChange={(e) => setPageHeader(e.target.value)}
                    className="lh-input" placeholder="e.g. Lifehut Workspace Billing Statement"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Primary header text displayed at the top of statement pages.</span>
                </div>
                
                <div>
                  <label className="lh-label">Company Logo URL</label>
                  <input
                    type="text" required value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="lh-input" placeholder="e.g. https://domain.com/logo.png"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Web link to your company logo image.</span>
                </div>

                <div>
                  <label className="lh-label">Authorized Signature / Designation</label>
                  <input
                    type="text" required value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="lh-input" placeholder="e.g. Authorized Signatory for Lifehut"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Label placed above the signature box on generated document prints.</span>
                </div>

                <div>
                  <label className="lh-label">Default Terms & Conditions</label>
                  <textarea
                    rows={4} required value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="lh-input font-mono text-xs" style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Enter standard contract terms..."
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Terms listed at the bottom of estimates and final bill summaries.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--lh-border)]">
                <button
                  type="submit" disabled={saving}
                  className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Updating Settings...' : 'Save Page Defaults'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION: NOTIFICATIONS SYSTEM */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Workspace Notifications Engine</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Verify, configure and test live local/push notification streams for client-contractor coordination.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--lh-border)] bg-[var(--lh-surface-muted)]">
                <table className="min-w-full divide-y divide-[var(--lh-border)] text-[11.5px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <th scope="col" className="px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-400 text-[10px]">Event</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-400 text-[10px]">Receiver</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-400 text-[10px]">Type</th>
                      <th scope="col" className="px-4 py-3 text-right font-bold uppercase tracking-wider text-slate-400 text-[10px]">Simulation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--lh-border)] bg-white dark:bg-slate-900">
                    {/* Event 1 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Daily progress reminder</td>
                      <td className="px-4 py-3 text-slate-500">Contractor</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Local</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ContractorNotification.dailyProgressReminder();
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 2 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Progress uploaded</td>
                      <td className="px-4 py-3 text-slate-500">Client</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ClientNotification.progressUploaded('Westfield Residences');
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 3 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Variation requested</td>
                      <td className="px-4 py-3 text-slate-500">Client</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ClientNotification.variationRequested('Westfield Residences', 'Italian Marble Flooring Upgrade');
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 4 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Variation approved</td>
                      <td className="px-4 py-3 text-slate-500">Contractor</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ContractorNotification.variationApproved('Westfield Residences');
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 5 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Payment requested</td>
                      <td className="px-4 py-3 text-slate-500">Client</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ClientNotification.paymentRequested('Westfield Residences', 'Foundation Slab Completed');
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 6 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Payment approved</td>
                      <td className="px-4 py-3 text-slate-500">Contractor</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ContractorNotification.paymentApproved('Westfield Residences', 'Foundation Slab Completed');
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                    {/* Event 7 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Chat message</td>
                      <td className="px-4 py-3 text-slate-500">Other party</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Push</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              ClientNotification.chatMessage('Contractor Lead', 'We just updated the site photos.');
                            }}
                            className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[9.5px] shadow-xs hover:opacity-90 transition-all cursor-pointer"
                          >
                            To Client
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              ContractorNotification.chatMessage('Client Coordinator', 'Can you verify the bathroom fittings size?');
                            }}
                            className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[9.5px] shadow-xs hover:opacity-90 transition-all cursor-pointer"
                          >
                            To Contractor
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Event 8 */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Backup reminder</td>
                      <td className="px-4 py-3 text-slate-500">Contractor</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Local</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            ContractorNotification.backupReminder();
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--lh-blue)] text-white font-bold text-[10.5px] shadow-xs hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Trigger</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 5: BACKUP & SYNC */}
          {activeSection === 'backup' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Excel Backup & Sync</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Manage offline states, export spreadsheet workbook backups, or import local Excel data sheets back into the sandbox.
                </p>
              </div>

              {/* Cloud Sync Status */}
              <div className="p-4 rounded-xl border border-[var(--lh-border)] bg-[var(--lh-surface-muted)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lh-text-primary)]">
                    <CloudLightning className="w-4 h-4 text-[#10B981]" />
                    <span>Real-time Sync Pipeline</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isDemoMode ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isDemoMode ? 'Sandbox/Demo' : 'Online'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--lh-text-secondary)] leading-normal">
                  {isDemoMode 
                    ? 'You are running in a local offline sandbox. Changes are not written to the centralized Firestore.'
                    : 'Changes are written in real-time to Google Cloud Firestore with standard offline caching mechanisms.'
                  }
                </p>
              </div>

              {/* Database Operations */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleDownloadBackup}
                  className="lh-btn lh-btn-primary lh-btn-sm flex items-center gap-1.5 bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel Backup</span>
                </button>

                <button
                  onClick={handleImportBackup}
                  className="lh-btn lh-btn-secondary lh-btn-sm flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Excel Backup</span>
                </button>

                <button
                  onClick={handleResetSandbox}
                  className="lh-btn lh-btn-primary lh-btn-sm flex items-center gap-1"
                  style={{ 
                    background: isDemoMode ? '#DC2626' : '#475569', 
                    borderColor: isDemoMode ? '#DC2626' : '#475569', 
                    color: '#FFF' 
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDemoMode ? 'Wipe & Reset Sandbox' : 'Clear Offline Cache'}</span>
                </button>
              </div>

              {/* Schema Inspector */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-[var(--lh-text-secondary)] block">Sandbox JSON Payload Preview</span>
                <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-200 max-h-48 overflow-auto">
                  {dbString}
                </pre>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
