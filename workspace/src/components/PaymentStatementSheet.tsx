import React, { useRef, useState } from 'react';
import { PaymentStage, Project } from '../types';
import { Printer, Check, ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface PaymentStatementSheetProps {
  project: Project;
  stages: PaymentStage[];
  onPayStage?: (stageId: string) => void;
  isClientView?: boolean;
  contractorName?: string;
}

// Format numbers to Indian currency standard (e.g. 5,00,000.00)
export function formatIndianNoCurrency(num: number): string {
  if (num === 0) return '0.00';
  const formatted = num.toFixed(2);
  const [integer, decimal] = formatted.split('.');
  
  // Format Indian integer commas
  let lastThree = integer.substring(integer.length - 3);
  const otherDigits = integer.substring(0, integer.length - 3);
  if (otherDigits !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  return `${formattedInteger}.${decimal}`;
}

export default function PaymentStatementSheet({
  project,
  stages,
  onPayStage,
  isClientView = false,
  contractorName = 'Workspace'
}: PaymentStatementSheetProps) {
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
  const element = document.getElementById('statement-preview-target');
  if (!element) return;

  setIsGenerating(true);

  try {

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;
    const html2pdfFunc =
      typeof html2pdf === 'function'
        ? html2pdf
        : (html2pdf as any).default;

    if (!html2pdfFunc) {
      throw new Error('PDF library failed to load.');
    }

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `statement_${project.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}.pdf`,
      image: {
        type: 'jpeg',
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc: Document) => {
          const styles = clonedDoc.getElementsByTagName('style');

          for (let i = 0; i < styles.length; i++) {
            let css = styles[i].innerHTML;

            if (css.includes('oklch')) {
              css = css.replace(/oklch\([^)]+\)/g, '#475569');
              styles[i].innerHTML = css;
            }
          }
        },
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    };

    const platform = Capacitor.getPlatform();

    // -------------------------
    // WEB
    // -------------------------

    if (platform === 'web') {

      await html2pdfFunc()
        .set(opt)
        .from(element)
        .save();

      return;
    }

    // -------------------------
    // ANDROID + IOS
    // -------------------------

    const pdfBlob = await html2pdfFunc()
      .set(opt)
      .from(element)
      .outputPdf('blob');

    const reader = new FileReader();

    reader.readAsDataURL(pdfBlob);

    reader.onloadend = async () => {

      const base64 =
        reader.result!
          .toString()
          .split(',')[1];

      const fileName =
        `statement_${project.name
          .replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      await Filesystem.writeFile({

        path: fileName,

        data: base64,

        directory: Directory.Documents,

        recursive: true,

      });

      const fileUri = await Filesystem.getUri({

        directory: Directory.Documents,

        path: fileName,

      });

      await Share.share({

        title: 'Payment Ledger Statement',

        text: 'Payment Ledger Statement',

        url: fileUri.uri,

      });

    };

  } catch (err) {

    console.error(err);

    alert("Unable to generate PDF.");

  } finally {

    setIsGenerating(false);

  }
};

  // Compute stats
  const totalPayable = stages.reduce((sum, s) => sum + s.payableAmount, 0);
  const totalReceived = stages.reduce((sum, s) => {
    const logSum = s.paymentLog && s.paymentLog.length > 0
      ? s.paymentLog.reduce((logSumVal, l) => logSumVal + (l.amount || 0), 0)
      : (s.receivedAmount || 0);
    return sum + logSum;
  }, 0);
  const totalBalance = totalPayable - totalReceived;

  return (
    <div className="lh-panel rounded-xl overflow-hidden">

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--lh-border)' }}>
        <div>
          <h4 className="text-[12.5px] font-semibold" style={{ color: 'var(--lh-text-primary)' }}>
            Payment statement
          </h4>
          <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--lh-text-secondary)' }}>{project.name} · {project.clientName}</p>
        </div>
        <button
          onClick={() => setShowPrintPreview(true)}
          className="lh-btn lh-btn-secondary lh-btn-sm"
          id="btn-open-statement-preview"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* On-screen clean table */}
      <div className="overflow-x-auto">
        <table className="lh-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Stage</th>
              <th style={{ textAlign: 'right' }}>Payable</th>
              <th style={{ textAlign: 'right' }}>Received</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              {isClientView && <th style={{ textAlign: 'right' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {stages.map((stg, index) => {
              const logSum = stg.paymentLog && stg.paymentLog.length > 0
                ? stg.paymentLog.reduce((sum, l) => sum + (l.amount || 0), 0)
                : (stg.receivedAmount || 0);
              const isPaid = stg.status === 'Paid' || logSum >= stg.payableAmount;
              const received = logSum;
              const balance = stg.payableAmount - received;
              return (
                <tr key={`${stg.projectId || ''}_${stg.id}_${index}`}>
                  <td style={{ color: 'var(--lh-text-tertiary)' }}>{index + 1}</td>
                  <td className="font-medium">
                    <div>{stg.stageName}</div>
                    {stg.paymentLog && stg.paymentLog.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {stg.paymentLog.map((log, lIdx) => (
                          <div key={log.id || lIdx} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex flex-wrap items-center gap-1 bg-emerald-500/5 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit border border-emerald-500/10">
                            <span className="font-sans font-medium text-slate-500 dark:text-slate-400">📅 Paid:</span>
                            <strong>₹{log.amount.toLocaleString('en-IN')}</strong>
                            <span className="text-slate-400 dark:text-slate-500 text-[9px]">({log.date}{log.reference ? ` - ${log.reference}` : ''})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono">₹{stg.payableAmount.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    {received > 0 ? (
                      <span style={{ color: 'var(--lh-success-text)' }}>₹{received.toLocaleString('en-IN')}</span>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--lh-text-secondary)' }} className="font-mono">
                    {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '—'}
                  </td>
                  {isClientView && (
                    <td style={{ textAlign: 'right' }}>
                      {!isPaid && onPayStage ? (
                        <button
                          onClick={() => onPayStage(stg.id)}
                          className="lh-btn lh-btn-primary lh-btn-sm"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="lh-badge lh-badge-success"><Check className="w-2.5 h-2.5" /> Paid</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            <tr style={{ background: 'var(--lh-surface-muted)' }}>
              <td></td>
              <td className="font-semibold" style={{ color: 'var(--lh-text-primary)' }}>TOTAL</td>
              <td style={{ textAlign: 'right' }} className="font-semibold font-mono">₹{totalPayable.toLocaleString('en-IN')}</td>
              <td className="font-semibold font-mono" style={{ textAlign: 'right', color: 'var(--lh-success-text)' }}>₹{totalReceived.toLocaleString('en-IN')}</td>
              <td style={{ textAlign: 'right' }} className="font-semibold font-mono">₹{totalBalance.toLocaleString('en-IN')}</td>
              {isClientView && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Interactive, Fully Responsive PDF / Print Preview Overlay */}
      {showPrintPreview && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex flex-col justify-start overflow-y-auto p-0 sm:p-5 no-print"
          id="statement-preview-modal-overlay"
        >
          {/* Top Sticky Control Bar */}
          <div className="sticky top-0 z-[10000] w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border-b sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-xl shadow-md p-3 px-4 flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                id="close-statement-preview"
                aria-label="Close Statement Preview"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Ledger Statement Preview</h5>
                <p className="text-[10px] text-slate-400">Review before saving / printing</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-[10px] text-slate-400 italic">
                On mobile? Print to save as PDF.
              </span>
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                id="trigger-print-dialog"
              >
                <Printer className="w-3.5 h-3.5 animate-pulse" />
                <span>{isGenerating ? 'Generating PDF...' : 'Save PDF / Print'}</span>
              </button>
            </div>
          </div>

          {/* Printable / Scalable Statement Container Card */}
          <div 
            ref={printAreaRef}
            className="shadow-xl rounded-none sm:rounded-2xl border p-4 sm:p-8 md:p-10 max-w-3xl w-full mx-auto mb-10 overflow-hidden" 
            id="statement-preview-target"
            style={{ 
              color: '#0B2545', 
              backgroundColor: '#ffffff',
              borderColor: '#E2E8F0',
              fontFamily: "'Poppins', 'Inter', sans-serif" 
            }}
          >
             {/* Print custom styles hidden dynamically */}
             <style>{`
               @media print {
                 body {
                   visibility: hidden !important;
                   background: white !important;
                 }
                 #statement-preview-target, #statement-preview-target * {
                   visibility: visible !important;
                 }
                 #statement-preview-target {
                   position: absolute !important;
                   left: 0 !important;
                   top: 0 !important;
                   width: 100% !important;
                   border: none !important;
                   box-shadow: none !important;
                   padding: 0 !important;
                   margin: 0 !important;
                 }
                 .no-print {
                   display: none !important;
                 }
               }
             `}</style>

             {/* Header */}
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-[3px] border-[#0B2545] pb-4 mb-6 gap-4">
               <div>
                 <div className="text-xl sm:text-2xl font-black text-[#0B2545] flex items-center gap-2 font-sans">
                   <span className="bg-white border border-[#CBD1DA] p-1 rounded-lg shadow-xs flex items-center justify-center w-8 h-8 flex-shrink-0">
                     <Logo className="w-6 h-6" />
                   </span>
                   Lifehut Workspace
                 </div>
                 <div className="text-[9.5px] sm:text-[10px] text-[#0A84FF] mt-1.5 uppercase tracking-wider font-extrabold font-sans">
                   Project Management & Liaison System
                 </div>
               </div>
               <div className="text-left sm:text-right w-full sm:w-auto">
                 <div className="text-[10px] sm:text-[11.5px] font-bold text-white bg-[#0B2545] px-3.5 py-1.5 rounded-full inline-block tracking-wide font-sans">
                   PAYMENT LEDGER STATEMENT
                 </div>
                 <div className="text-[10px] text-[#5B6270] mt-2 font-medium">
                   Issued: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                 </div>
               </div>
             </div>

             {/* Stakeholder and Project Details Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 bg-[#F7F8FA] p-4 sm:p-5 rounded-xl border border-[#E2E5EA]">
               <div>
                 <div className="text-[9px] font-bold text-[#E67E22] uppercase tracking-wider mb-2 font-sans">
                   PROJECT SITE DETAILS
                 </div>
                 <div className="text-[14px] sm:text-[15px] font-extrabold text-[#0B2545] mb-1.5 font-sans">
                   {project.name}
                 </div>
                 <div className="text-[11px] sm:text-[12px] text-[#16191F] mb-1">
                   <strong className="text-[#0B2545]">Type:</strong> {project.type} Site
                 </div>
                 <div className="text-[10.5px] sm:text-[11.5px] text-[#5B6270] leading-relaxed">
                   <strong className="text-[#0B2545]">Address:</strong> {project.address}
                 </div>
               </div>
               <div className="border-t sm:border-t-0 sm:border-l border-dashed border-[#CBD1DA] pt-4 sm:pt-0 sm:pl-5">
                 <div className="text-[9px] font-bold text-[#0A84FF] uppercase tracking-wider mb-2 font-sans">
                   LIAISON STAKEHOLDERS
                 </div>
                 <div className="text-[11.5px] sm:text-[12.5px] text-[#16191F] mb-1">
                   <strong className="text-[#0B2545]">Contractor:</strong> {contractorName}
                 </div>
                 <div className="text-[11.5px] sm:text-[12.5px] text-[#16191F] mb-1">
                   <strong className="text-[#0B2545]">Client:</strong> {project.clientName}
                 </div>
                 <div className="text-[10.5px] sm:text-[11px] text-[#5B6270] break-all">
                   <strong className="text-[#0B2545]">Project ID:</strong> <span className="font-mono font-bold text-[#0A84FF]">{project.id || 'N/A'}</span>
                 </div>
               </div>
             </div>

             {/* Metric KPI Widgets */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
               <div className="bg-[#E6F1FB] border border-[#BEE0FF] rounded-xl p-3.5 border-l-[5px] border-[#0A84FF]">
                 <div className="text-[8.5px] font-bold text-[#0C447C] uppercase tracking-wider mb-1.5 font-sans">
                   TOTAL CONTRACT VALUE
                 </div>
                 <div className="text-lg sm:text-xl font-black text-[#0B2545] font-sans">
                   ₹{totalPayable.toLocaleString('en-IN')}
                 </div>
               </div>
               <div className="bg-[#E1F5EE] border border-[#A3E2CD] rounded-xl p-3.5 border-l-[5px] border-[#085041]">
                 <div className="text-[8.5px] font-bold text-[#085041] uppercase tracking-wider mb-1.5 font-sans">
                   TOTAL COLLECTED REVENUE
                 </div>
                 <div className="text-lg sm:text-xl font-black text-[#085041] font-sans">
                   ₹{totalReceived.toLocaleString('en-IN')}
                 </div>
               </div>
               <div className="bg-[#FDF1DC] border border-[#F9DCA2] rounded-xl p-3.5 border-l-[5px] border-[#E67E22]">
                 <div className="text-[8.5px] font-bold text-[#7A4A05] uppercase tracking-wider mb-1.5 font-sans">
                   OUTSTANDING RECEIVABLE
                 </div>
                 <div className="text-lg sm:text-xl font-black text-[#E67E22] font-sans">
                   ₹{totalBalance.toLocaleString('en-IN')}
                 </div>
               </div>
             </div>

             {/* Milestone Transactions */}
             <div className="text-[10px] font-bold text-[#0B2545] uppercase tracking-wider mb-2.5 font-sans">
               MILESTONE TRANSACTIONS SUMMARY
             </div>

             <div className="overflow-x-auto border border-[#E2E5EA] rounded-xl mb-6">
               <table className="min-w-[650px] sm:min-w-full divide-y divide-[#E2E5EA] text-left text-[11px] sm:text-[11.5px] w-full">
                 <thead className="bg-[#0B2545] text-white">
                   <tr>
                     <th className="px-3 py-2.5 font-bold text-center w-[50px] font-sans">S.NO</th>
                     <th className="px-3 py-2.5 font-bold font-sans">MILESTONE PAYMENT STAGE</th>
                     <th className="px-3 py-2.5 font-bold text-right w-[120px] font-sans">PAYABLE (₹)</th>
                     <th className="px-3 py-2.5 font-bold text-right w-[120px] font-sans">RECEIVED (₹)</th>
                     <th className="px-3 py-2.5 font-bold text-right w-[120px] font-sans">PENDING BALANCE (₹)</th>
                     <th className="px-3 py-2.5 font-bold text-center w-[90px] font-sans">STATUS</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#E2E5EA]" style={{ backgroundColor: '#ffffff' }}>
                   {stages.map((stg, index) => {
                     const sNo = index + 1;
                     const payable = stg.payableAmount;
                     const logSum = stg.paymentLog && stg.paymentLog.length > 0
                       ? stg.paymentLog.reduce((sum, l) => sum + (l.amount || 0), 0)
                       : (stg.receivedAmount || 0);
                     const received = logSum;
                     const balance = payable - received;
                     const isPaid = stg.status === 'Paid' || balance <= 0;

                     return (
                       <tr key={`${stg.projectId || ''}_${stg.id}_${index}`} style={{ backgroundColor: isPaid ? '#F4FAF8' : '#ffffff' }}>
                         <td className="px-3 py-3 text-center font-bold border-r border-[#E2E5EA]" style={{ color: '#64748B' }}>
                           {sNo}
                         </td>
                         <td className="px-3 py-3 font-semibold border-r border-[#E2E5EA] font-sans" style={{ color: '#0F172A' }}>
                           <div>{stg.stageName}</div>
                           {stg.paymentLog && stg.paymentLog.length > 0 && (
                             <div className="mt-1.5 flex flex-col gap-1">
                               {stg.paymentLog.map((log, lIdx) => (
                                 <div key={log.id || lIdx} className="text-[9px] text-[#085041] font-mono bg-[#E1F5EE] px-2 py-0.5 rounded border border-[#A3E2CD] w-fit">
                                   <span className="font-sans font-medium" style={{ color: '#64748B' }}>📅 Paid:</span>
                                   <strong> ₹{log.amount.toLocaleString('en-IN')}</strong> on {log.date} {log.reference ? `(${log.reference})` : ''}
                                 </div>
                               ))}
                             </div>
                           )}
                         </td>
                         <td className="px-3 py-3 text-right font-bold font-mono text-[#0B2545] border-r border-[#E2E5EA]">
                           {formatIndianNoCurrency(payable)}
                         </td>
                         <td className="px-3 py-3 text-right font-bold font-mono border-r border-[#E2E5EA]" style={{ color: received > 0 ? '#085041' : '#94999E' }}>
                           {received > 0 ? formatIndianNoCurrency(received) : '—'}
                         </td>
                         <td className="px-3 py-3 text-right font-bold font-mono border-r border-[#E2E5EA]" style={{ color: balance > 0 ? '#E67E22' : '#94999E' }}>
                           {balance > 0 ? formatIndianNoCurrency(balance) : '—'}
                         </td>
                         <td className="px-3 py-3 text-center">
                           {isPaid ? (
                             <span className="bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded text-[9px] font-extrabold border border-[#A3E2CD] font-sans">
                               PAID
                             </span>
                           ) : (
                             <span className="bg-[#FDF1DC] text-[#7A4A05] px-2 py-0.5 rounded text-[9px] font-extrabold border border-[#F9DCA2] font-sans">
                               PENDING
                             </span>
                           )}
                         </td>
                       </tr>
                     );
                   })}

                   {/* Grand Total Row */}
                   <tr className="bg-[#F7F8FA] font-bold" style={{ borderTop: '2.5px solid #0B2545' }}>
                     <td colSpan={2} className="px-3 py-3 text-xs uppercase text-[#0B2545] border-r border-[#E2E5EA] font-sans">
                       GRAND TOTALS
                     </td>
                     <td className="px-3 py-3 text-right font-mono text-xs text-[#0B2545] border-r border-[#E2E5EA]">
                       {formatIndianNoCurrency(totalPayable)}
                     </td>
                     <td className="px-3 py-3 text-right font-mono text-xs border-r border-[#E2E5EA]" style={{ color: '#085041' }}>
                       {formatIndianNoCurrency(totalReceived)}
                     </td>
                     <td className="px-3 py-3 text-right font-mono text-xs border-r border-[#E2E5EA]" style={{ color: '#E67E22' }}>
                       {formatIndianNoCurrency(totalBalance)}
                     </td>
                     <td className="px-3 py-3"></td>
                   </tr>
                 </tbody>
               </table>
             </div>

             {/* Footer and Signatures */}
             <div className="mt-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-t-2 border-[#0B2545] pt-5">
               <div className="max-w-md">
                 <p className="text-[9.5px] text-[#5B6270] leading-relaxed">
                   This is a secure, official ledger statement compiled from your Lifehut Workspace.
                 </p>
                 <p className="text-[10px] text-[#0A84FF] font-bold mt-1 tracking-wide">
                   Secure Key: LHW-PROJ_GRE-2026
                 </p>
               </div>
               <div className="text-center w-full sm:w-[220px] border-t-2 border-[#0B2545] pt-2.5">
                 <div className="text-[12px] font-black text-[#0B2545] font-sans">
                   {contractorName}
                 </div>
                 <div className="text-[9px] text-[#5B6270] mt-1 font-bold uppercase tracking-wider">
                   Authorized Builder / Contractor
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
