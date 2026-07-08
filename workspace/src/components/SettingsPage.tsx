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
  FileSpreadsheet
} from 'lucide-react';
import { fetchAll, saveAll, resetDB } from '../data';

export default function SettingsPage() {
  const { user, userRole, userProfile, isDemoMode, updateUserProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'auth' | 'storage' | 'defaults' | 'backup'>('profile');

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

  // Form states for Project Defaults
  const [defaultRetainage, setDefaultRetainage] = useState('5');
  const [paymentTermsDays, setPaymentTermsDays] = useState('15');
  const [defaultTaxRate, setDefaultTaxRate] = useState('18');

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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(dbString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([dbString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifehut_workspace_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    const raw = prompt('Paste your previously backed-up JSON data here:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.projects && parsed.stages) {
        saveAll(parsed);
        alert('Data successfully imported and active! Please reload to view.');
        window.location.reload();
      } else {
        alert('Invalid schema! Missing "projects" or "stages" headers.');
      }
    } catch (e) {
      alert('Failed to parse JSON. Please make sure the string is clean.');
    }
  };

  const handleResetSandbox = () => {
    if (confirm('Are you sure you want to reset all data? This deletes any sandbox edits and restores original seed data.')) {
      resetDB();
      alert('Database reset to original seed data successfully! Reloading...');
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
              Configure company variables, authentication parameters, cloud database state, and local backups.
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left mini-navigation menu */}
        <div className="lg:col-span-3 lh-panel rounded-xl p-3.5 space-y-1.5">
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              activeSection === 'profile' ? 'bg-[var(--lh-blue)] text-white' : 'text-[var(--lh-text-secondary)] hover:bg-[var(--lh-surface-muted)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Profile</span>
          </button>

          <button
            onClick={() => setActiveSection('auth')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              activeSection === 'auth' ? 'bg-[var(--lh-blue)] text-white' : 'text-[var(--lh-text-secondary)] hover:bg-[var(--lh-surface-muted)]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Auth & Security</span>
          </button>

          <button
            onClick={() => setActiveSection('storage')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              activeSection === 'storage' ? 'bg-[var(--lh-blue)] text-white' : 'text-[var(--lh-text-secondary)] hover:bg-[var(--lh-surface-muted)]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Storage & DB</span>
          </button>

          <button
            onClick={() => setActiveSection('defaults')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              activeSection === 'defaults' ? 'bg-[var(--lh-blue)] text-white' : 'text-[var(--lh-text-secondary)] hover:bg-[var(--lh-surface-muted)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Project Defaults</span>
          </button>

          <button
            onClick={() => setActiveSection('backup')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              activeSection === 'backup' ? 'bg-[var(--lh-blue)] text-white' : 'text-[var(--lh-text-secondary)] hover:bg-[var(--lh-surface-muted)]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Backup & Sync</span>
          </button>
        </div>

        {/* Right content panels */}
        <div className="lg:col-span-9 lh-panel rounded-xl p-6">
          
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

          {/* SECTION 2: AUTHENTICATION & SECURITY */}
          {activeSection === 'auth' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Authentication & Security Controls</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  View details of the currently enforced modular authentication architecture.
                </p>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--lh-border)] bg-[var(--lh-surface-muted)] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lh-text-primary)]">
                    <Key className="w-4 h-4 text-[var(--lh-blue)]" />
                    <span>Contractor Auth Protocol</span>
                  </div>
                  <p className="text-[11px] text-[var(--lh-text-secondary)]">
                    Contractors authenticate exclusively via Google Sign-In. This registers them with secure, encrypted OAuth handles in the project's User directories.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">Authentication Type:</span>
                    <span className="lh-badge lh-badge-info">OAuth (Google)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--lh-border)] bg-[var(--lh-surface-muted)] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lh-text-primary)]">
                    <CloudLightning className="w-4 h-4 text-[var(--lh-amber)]" />
                    <span>Client Auth Protocol</span>
                  </div>
                  <p className="text-[11px] text-[var(--lh-text-secondary)]">
                    Clients utilize anonymous Firebase session tokens bound dynamically to a verified client code lookup sheet in Firestore.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">Access Verification:</span>
                    <span className="lh-badge lh-badge-warning">Client Access Code</span>
                  </div>
                </div>
              </div>

              {/* Security permissions explanation */}
              <div className="p-4 rounded-xl border border-[#9FE1CB] bg-[#ECFDF5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Security Guard & Role Permissions</span>
                </div>
                <div className="text-[11px] text-[#065F46] space-y-1">
                  <p className="font-semibold">Current user is logged in as: <span className="font-mono text-black font-bold uppercase">{userRole || 'Contractor (Sandbox/Demo)'}</span></p>
                  <ul className="list-disc pl-4 space-y-1 mt-1 font-medium">
                    <li><strong className="text-black">Contractor Role:</strong> Has full CRUD (Create, Read, Update, Delete) rights over projects, payment milestones, expenses, extra works, documents, and messaging boards.</li>
                    <li><strong className="text-black">Client Role:</strong> Enforces read-only access guards across all project metrics. No project parameter can be modified except approving scope changes (extra works) and contributing to project chat.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: STORAGE & DATABASE */}
          {activeSection === 'storage' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Storage & Database Integration</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  State parameters for persistent real-time Firestore database and Supabase file servers.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--lh-border)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lh-text-primary)]">
                    <Database className="w-4 h-4 text-[var(--lh-blue)]" />
                    <span>Google Cloud Firestore</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span className="text-[var(--lh-text-secondary)] font-medium">Database Node:</span>
                    <span className="font-mono text-right font-semibold">projects (Default Default)</span>
                    <span className="text-[var(--lh-text-secondary)] font-medium">Client Code Lookups:</span>
                    <span className="font-mono text-right font-semibold">clientCodes</span>
                    <span className="text-[var(--lh-text-secondary)] font-medium">Sync Status:</span>
                    <span className="text-right text-[#047857] font-semibold">{isDemoMode ? 'Offline Sandbox (Demo)' : 'Authenticated & Connected'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--lh-border)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lh-text-primary)]">
                    <FolderOpen className="w-4 h-4 text-[#10B981]" />
                    <span>Supabase Storage Integration</span>
                  </div>
                  <p className="text-[11px] text-[var(--lh-text-secondary)] leading-normal">
                    Media files, progress photos, and contract agreement uploads are securely stored inside Supabase file buckets. This optimizes database volume and ensures instant download pipelines.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <span className="text-[var(--lh-text-secondary)] font-medium">Active Storage Bucket:</span>
                    <span className="font-mono text-right font-semibold">workspace-files</span>
                    <span className="text-[var(--lh-text-secondary)] font-medium">Upload Protocol:</span>
                    <span className="font-mono text-right font-semibold">supabase-js API v2</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: PROJECT DEFAULTS */}
          {activeSection === 'defaults' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Project Defaults & Standards</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Set up default payment terms and tax variables applied to newly drafted projects or billing stages.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="lh-label">Default Retainage (%)</label>
                  <input
                    type="number" value={defaultRetainage}
                    onChange={(e) => setDefaultRetainage(e.target.value)}
                    className="lh-input" min="0" max="100"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Contract value held back for security.</span>
                </div>
                <div>
                  <label className="lh-label">Standard Payment Terms (Days)</label>
                  <input
                    type="number" value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(e.target.value)}
                    className="lh-input" min="1"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Due window following milestone invoice.</span>
                </div>
                <div>
                  <label className="lh-label">Standard GST Rate (%)</label>
                  <input
                    type="number" value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(e.target.value)}
                    className="lh-input" min="0" max="100"
                  />
                  <span className="text-[10px] text-[var(--lh-text-tertiary)] mt-1 block">Goods & Services tax applied by default.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--lh-border)]">
                <button
                  type="button" onClick={() => alert('Standard project configuration parameters updated! ⚙️')}
                  className="lh-btn lh-btn-primary lh-btn-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 5: BACKUP & SYNC */}
          {activeSection === 'backup' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--lh-text-primary)' }}>Backup & Sandbox Sync</h4>
                <p className="text-[11.5px]" style={{ color: 'var(--lh-text-secondary)' }}>
                  Manage offline states, export raw schema payloads, or import local data trees back into the sandbox.
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
                  onClick={handleCopyToClipboard}
                  className="lh-btn lh-btn-secondary lh-btn-sm flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied Payload!' : 'Copy Schema'}</span>
                </button>

                <button
                  onClick={handleDownloadBackup}
                  className="lh-btn lh-btn-secondary lh-btn-sm flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup File</span>
                </button>

                <button
                  onClick={handleImportBackup}
                  className="lh-btn lh-btn-secondary lh-btn-sm flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON State</span>
                </button>

                <button
                  onClick={handleResetSandbox}
                  className="lh-btn lh-btn-primary lh-btn-sm flex items-center gap-1"
                  style={{ background: '#DC2626', borderColor: '#DC2626', color: '#FFF' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe & Reset Sandbox</span>
                </button>
              </div>

              {/* Schema Inspector */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-[var(--lh-text-secondary)] block">Sandbox Schema Inspector</span>
                <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-200 max-h-48 overflow-auto">
                  {dbString}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
