import React, { useRef } from 'react';
import { PaymentStage, Project } from '../types';
import { Printer, Check } from 'lucide-react';

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
  contractorName = '${ownerName}'
}: PaymentStatementSheetProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Compute stats
  const totalPayable = stages.reduce((sum, s) => sum + s.payableAmount, 0);
  const totalReceived = stages.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
  const totalBalance = totalPayable - totalReceived;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (printContent) {
      const win = window.open('', '', 'height=750,width=950');
      if (win) {
        win.document.write('<html><head><title>Payment Statement - Lifehut Workspace</title>');
        win.document.write('<link rel="preconnect" href="https://fonts.googleapis.com">');
        win.document.write('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
        win.document.write('<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">');
        win.document.write('<style>');
        win.document.write(`
          body { 
            font-family: 'Poppins', 'Inter', -apple-system, sans-serif; 
            padding: 40px; 
            color: #0B2545; 
            background: #ffffff;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        `);
        win.document.write('</style></head><body>');
        win.document.write(printContent);
        win.document.write('</body></html>');
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
        }, 500);
      }
    }
  };

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
          onClick={handlePrint}
          className="lh-btn lh-btn-secondary lh-btn-sm"
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
              const isPaid = stg.status === 'Paid' || (stg.receivedAmount || 0) >= stg.payableAmount;
              const received = stg.receivedAmount || 0;
              const balance = stg.payableAmount - received;
              return (
                <tr key={stg.id}>
                  <td style={{ color: 'var(--lh-text-tertiary)' }}>{index + 1}</td>
                  <td className="font-medium">{stg.stageName}</td>
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

      {/* Hidden formal sheet — used only for print/PDF output, never shown on screen */}
      <div style={{ display: 'none' }}>
        <div ref={printAreaRef} style={{ width: '800px', margin: '0 auto', padding: '15px' }} id="printable-statement-sheet">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0B2545', paddingBottom: '18px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0B2545', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Poppins', sans-serif" }}>
                <span style={{ background: '#0A84FF', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 900, marginRight: '8px', display: 'inline-block', boxShadow: '0 2px 4px rgba(10,132,255,0.3)' }}>LH</span>
                Lifehut Workspace
              </div>
              <div style={{ fontSize: '10.5px', color: '#0A84FF', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                Project Management & Liaison System
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', background: '#0B2545', padding: '6px 16px', borderRadius: '20px', display: 'inline-block', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.03em' }}>
                PAYMENT LEDGER STATEMENT
              </div>
              <div style={{ fontSize: '11px', color: '#5B6270', marginTop: '8px', fontWeight: 500 }}>
                Issued: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Stakeholder and Project Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', background: '#F7F8FA', padding: '18px', borderRadius: '12px', border: '1px solid #E2E5EA' }}>
            <div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#E67E22', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: "'Poppins', sans-serif" }}>
                PROJECT SITE DETAILS
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B2545', marginBottom: '6px', fontFamily: "'Poppins', sans-serif" }}>
                {project.name}
              </div>
              <div style={{ fontSize: '11.5px', color: '#16191F', marginBottom: '4px' }}>
                <strong style={{ color: '#0B2545' }}>Type:</strong> {project.type} Site
              </div>
              <div style={{ fontSize: '11px', color: '#5B6270', lineHeight: '1.4' }}>
                <strong style={{ color: '#0B2545' }}>Address:</strong> {project.address}
              </div>
            </div>
            <div style={{ borderLeft: '2px dashed #CBD1DA', paddingLeft: '20px' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0A84FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: "'Poppins', sans-serif" }}>
                LIAISON STAKEHOLDERS
              </div>
              <div style={{ fontSize: '12px', color: '#16191F', marginBottom: '4px' }}>
                <strong style={{ color: '#0B2545' }}>Contractor:</strong> {contractorName}
              </div>
              <div style={{ fontSize: '12px', color: '#16191F', marginBottom: '4px' }}>
                <strong style={{ color: '#0B2545' }}>Client:</strong> {project.clientName}
              </div>
              <div style={{ fontSize: '11px', color: '#5B6270' }}>
                <strong style={{ color: '#0B2545' }}>Access Credential Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0A84FF' }}>{project.clientCode || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Metric KPI Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#E6F1FB', border: '1px solid #BEE0FF', borderRadius: '10px', padding: '14px 16px', borderLeft: '5px solid #0A84FF' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Poppins', sans-serif" }}>
                TOTAL CONTRACT VALUE
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0B2545', fontFamily: "'Poppins', sans-serif" }}>
                ₹{totalPayable.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#E1F5EE', border: '1px solid #A3E2CD', borderRadius: '10px', padding: '14px 16px', borderLeft: '5px solid #085041' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#085041', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Poppins', sans-serif" }}>
                TOTAL COLLECTED REVENUE
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#085041', fontFamily: "'Poppins', sans-serif" }}>
                ₹{totalReceived.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#FDF1DC', border: '1px solid #F9DCA2', borderRadius: '10px', padding: '14px 16px', borderLeft: '5px solid #E67E22' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#7A4A05', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: "'Poppins', sans-serif" }}>
                OUTSTANDING RECEIVABLE
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#E67E22', fontFamily: "'Poppins', sans-serif" }}>
                ₹{totalBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Milestone Details Heading */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0B2545', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: "'Poppins', sans-serif" }}>
            MILESTONE TRANSACTIONS SUMMARY
          </div>

          {/* Statement Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', border: '1px solid #E2E5EA', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <thead>
              <tr style={{ background: '#0B2545', color: '#FFFFFF' }}>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'center', width: '50px', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>S.NO</th>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'left', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>MILESTONE PAYMENT STAGE</th>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'right', width: '130px', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>PAYABLE (₹)</th>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'right', width: '130px', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>RECEIVED (₹)</th>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'right', width: '130px', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>PENDING BALANCE (₹)</th>
                <th style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'center', width: '110px', border: '1px solid #0B2545', fontFamily: "'Poppins', sans-serif" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stg, index) => {
                const sNo = index + 1;
                const payable = stg.payableAmount;
                const received = stg.receivedAmount || 0;
                const balance = payable - received;
                const isPaid = stg.status === 'Paid' || balance <= 0;

                return (
                  <tr key={stg.id} style={{ borderBottom: '1px solid #E2E5EA', background: isPaid ? '#F4FAF8' : '#ffffff' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: '#5B6270', border: '1px solid #E2E5EA' }}>
                      {sNo}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16191F', border: '1px solid #E2E5EA', fontFamily: "'Poppins', sans-serif" }}>
                      {stg.stageName}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', color: '#0B2545', border: '1px solid #E2E5EA', fontSize: '12px' }}>
                      {formatIndianNoCurrency(payable)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', color: received > 0 ? '#085041' : '#94999E', border: '1px solid #E2E5EA', fontSize: '12px' }}>
                      {received > 0 ? formatIndianNoCurrency(received) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', color: balance > 0 ? '#E67E22' : '#94999E', border: '1px solid #E2E5EA', fontSize: '12px' }}>
                      {balance > 0 ? formatIndianNoCurrency(balance) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #E2E5EA' }}>
                      {isPaid ? (
                        <span style={{ background: '#E1F5EE', color: '#085041', padding: '4px 10px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800, display: 'inline-block', border: '1px solid #A3E2CD', fontFamily: "'Poppins', sans-serif" }}>
                          PAID
                        </span>
                      ) : (
                        <span style={{ background: '#FDF1DC', color: '#7A4A05', padding: '4px 10px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800, display: 'inline-block', border: '1px solid #F9DCA2', fontFamily: "'Poppins', sans-serif" }}>
                          PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr style={{ background: '#F7F8FA', fontWeight: 'bold', borderTop: '2.5px solid #0B2545' }}>
                <td colSpan={2} style={{ padding: '12px', textTransform: 'uppercase', color: '#0B2545', border: '1px solid #E2E5EA', fontFamily: "'Poppins', sans-serif", fontSize: '12px', letterSpacing: '0.03em' }}>
                  GRAND TOTALS
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#0B2545', border: '1px solid #E2E5EA' }}>
                  {formatIndianNoCurrency(totalPayable)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#085041', border: '1px solid #E2E5EA' }}>
                  {formatIndianNoCurrency(totalReceived)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#E67E22', border: '1px solid #E2E5EA' }}>
                  {formatIndianNoCurrency(totalBalance)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #E2E5EA' }}></td>
              </tr>
            </tbody>
          </table>

          {/* Footer message / Verification signature */}
          <div style={{ marginTop: '45px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: '9.5px', color: '#5B6270', margin: 0, fontWeight: 500 }}>
                This is a secure, official ledger statement compiled from your Lifehut Workspace.
              </p>
              <p style={{ fontSize: '10px', color: '#0A84FF', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                Secure Key: LHW-PROJ_GRE-2026
              </p>
            </div>
            <div style={{ textAlign: 'center', width: '220px', borderTop: '2px solid #0B2545', paddingTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0B2545', fontFamily: "'Poppins', sans-serif" }}>
                {contractorName}
              </div>
              <div style={{ fontSize: '9.5px', color: '#5B6270', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Authorized Builder / Contractor
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}