import React, { useEffect, useState } from 'react';
import { getDashboard, getEVMSummary } from '../services/api';
import {
  Printer,
  BarChart3,
  DollarSign,
  GitPullRequest,
  Bug,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Activity
} from 'lucide-react';

const fmtPKR = (n) => n != null ? `PKR ${Number(n).toLocaleString()}` : '—';
const fmtN = (n, d = 2) => n != null ? Number(n).toFixed(d) : '—';

export default function Reports({ projectId }) {
  const [dashboard, setDashboard] = useState(null);
  const [evm, setEvm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      getDashboard(projectId),
      getEVMSummary(projectId),
    ]).then(([d, e]) => {
      setDashboard(d.data);
      setEvm(e.data);
      setError('');
    }).catch(e => setError(e.response?.data?.error || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) return (
    <div className="empty-state">
      <FileText size={40} className="text-muted mb-8" />
      <p>Select a project from the sidebar to inspect its executive SPM summary report.</p>
    </div>
  );
  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      Generating executive summary report...
    </div>
  );
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!dashboard) return null;

  const { project, healthSummary, scheduleAndProgress, budgetAndEVM, scopeAndChangeRequests, defectsAndQuality, riskExposure } = dashboard;

  return (
    <div className="report-page">
      <div className="page-header flex-between mb-20">
        <div>
          <span className="init-eyebrow">EXECUTIVE AUDIT REPORT</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '2px 0 4px 0' }}>
            Project Status & Governance Summary
          </h2>
          <p className="text-muted text-xs">
            Generated: <strong>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong> · Consortia Project: <strong>{project.name}</strong>
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => window.print()}>
          <Printer size={15} />
          <span>Print Executive Summary</span>
        </button>
      </div>

      {/* Executive Summary */}
      <div className="card mb-24">
        <div className="card-header" style={{ background: 'var(--primary-dark)', color: 'white' }}>
          <h3 style={{ color: 'white' }}>
            <BarChart3 size={16} /> Executive Health & Governance Overview
          </h3>
          <span className="badge badge-gold font-bold">{healthSummary.overallHealth}</span>
        </div>
        <div className="card-body">
          <div className="two-col mb-16">
            <div>
              <p><strong>Target Objective:</strong> Enterprise Smart Healthcare SPM System across 5 regional hospitals.</p>
              <p><strong>Assigned Project Manager:</strong> {project.projectManager}</p>
              <p><strong>Approved Baseline Budget:</strong> {fmtPKR(project.baselineBudgetPKR)}</p>
              <p><strong>Approved Baseline Duration:</strong> {project.baselineDurationWeeks} Weeks</p>
            </div>
            <div>
              <p><strong>Current Lifecycle Status:</strong> {project.status}</p>
              <p><strong>Overall Work Complete:</strong> {scheduleAndProgress.averagePercentComplete}%</p>
              <p><strong>Total Active Activities:</strong> {scheduleAndProgress.totalActivities}</p>
              <p><strong>Active Governance Advisories:</strong> {healthSummary.warningCount}</p>
            </div>
          </div>
          <div className="health-section-card" style={{ background: 'var(--surface-2)', border: 'none' }}>
            <span className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
              Key Health Advisories
            </span>
            {healthSummary.importantWarnings.map((w, i) => (
              <div key={i} className={`alert-item ${w.includes('Critical') ? 'critical' : 'warning'} mb-4`}>
                <span className={`alert-severity-badge ${w.includes('Critical') ? 'critical' : 'warning'}`}>
                  {w.includes('Critical') ? 'CRITICAL' : 'ADVISORY'}
                </span>
                <span className="alert-text">{w.replace(/^⚠️\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule & Progress */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><Calendar size={16} className="text-primary" /> Schedule & Work Progress</h3>
          <span className="badge badge-neutral">SPI: {fmtN(evm?.SPI)}</span>
        </div>
        <div className="card-body">
          <div className="stat-grid mb-16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="evm-metric">
              <div className="evm-metric-label">Completed</div>
              <div className="evm-metric-value good">{scheduleAndProgress.statusBreakdown?.Completed || 0}</div>
            </div>
            <div className="evm-metric">
              <div className="evm-metric-label">In Progress</div>
              <div className="evm-metric-value">{scheduleAndProgress.statusBreakdown?.['In Progress'] || 0}</div>
            </div>
            <div className="evm-metric">
              <div className="evm-metric-label">Not Started</div>
              <div className="evm-metric-value text-muted">{scheduleAndProgress.statusBreakdown?.['Not Started'] || 0}</div>
            </div>
            <div className="evm-metric">
              <div className="evm-metric-label">Delayed / Overdue</div>
              <div className="evm-metric-value bad">{scheduleAndProgress.delayedActivitiesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget & EVM */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><DollarSign size={16} className="text-primary" /> Budget & EVM Performance Analysis</h3>
          <span className="badge badge-neutral">Currency: PKR</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'BAC', val: fmtPKR(evm?.BAC) },
              { label: 'PV',  val: fmtPKR(evm?.PV)  },
              { label: 'EV',  val: fmtPKR(evm?.EV)  },
              { label: 'AC',  val: fmtPKR(evm?.AC)  },
              { label: 'CPI', val: fmtN(evm?.CPI)   },
              { label: 'SPI', val: fmtN(evm?.SPI)   },
              { label: 'EAC', val: fmtPKR(evm?.EAC) },
              { label: 'VAC', val: fmtPKR(evm?.VAC) },
            ].map(m => (
              <div key={m.label} className="evm-metric">
                <div className="evm-metric-label">{m.label}</div>
                <div className="evm-metric-value" style={{ fontSize: 16 }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div className="alert alert-info mt-16">
            {budgetAndEVM.note}
          </div>
        </div>
      </div>

      {/* Scope & CR */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><GitPullRequest size={16} className="text-primary" /> Scope Baseline & Change Control</h3>
          <span className="badge badge-neutral">{scopeAndChangeRequests.totalChangeRequests} CRs</span>
        </div>
        <div className="card-body">
          <div className="two-col">
            <div>
              <p><strong>Approved Requirements:</strong> {scopeAndChangeRequests.approvedRequirementsCount} of {scopeAndChangeRequests.totalRequirements}</p>
              <p><strong>WBS Work Packages:</strong> {scopeAndChangeRequests.totalWBSTasks}</p>
            </div>
            <div>
              <p><strong>Total Change Proposals:</strong> {scopeAndChangeRequests.totalChangeRequests}</p>
              <p><strong>Pending Review:</strong> {scopeAndChangeRequests.pendingChangeRequestsCount}</p>
            </div>
          </div>
          <div className="alert alert-info mt-16">{scopeAndChangeRequests.scopeIntegrity}</div>
        </div>
      </div>

      {/* Defects & Quality */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><Bug size={16} className="text-primary" /> Quality Assurance & Defect Thresholds</h3>
          <span className="badge badge-neutral">Pass Rate: {defectsAndQuality.qualityInspections?.passRate}</span>
        </div>
        <div className="card-body">
          <div className="two-col">
            <div>
              <p><strong>Total Defects Logged:</strong> {defectsAndQuality.totalDefects}</p>
              <p><strong>Unresolved Critical:</strong> <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{defectsAndQuality.unresolvedCriticalDefects}</span></p>
              <p><strong>Open Defects:</strong> {defectsAndQuality.defectStatusCounts?.Open || 0}</p>
              <p><strong>Resolved / Closed:</strong> {(defectsAndQuality.defectStatusCounts?.Resolved || 0) + (defectsAndQuality.defectStatusCounts?.Closed || 0)}</p>
            </div>
            <div>
              <p><strong>QC Inspections Executed:</strong> {defectsAndQuality.qualityInspections?.total || 0}</p>
              <p><strong>Inspections Passed:</strong> {defectsAndQuality.qualityInspections?.resultCounts?.Passed || 0}</p>
              <p><strong>Inspections Failed:</strong> <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{defectsAndQuality.qualityInspections?.resultCounts?.Failed || 0}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Risks */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><ShieldAlert size={16} className="text-primary" /> Risk Management Register</h3>
          <span className="badge badge-neutral">{riskExposure.totalRisks} Total Risks</span>
        </div>
        <div className="card-body">
          <div className="severity-pills-row mb-16">
            {Object.entries(riskExposure.byLevel || {}).map(([l, v]) => (
              <div key={l} className={`severity-pill ${l.toLowerCase()}`}>
                <span className="sev-count">{v}</span>
                <span className="sev-label">{l}</span>
              </div>
            ))}
          </div>
          {riskExposure.highAndCriticalRisks?.length > 0 && (
            <div className="table-wrapper compact-table-wrap">
              <table className="compact-table">
                <thead><tr><th>Risk Title</th><th>Level</th><th>Score</th><th>Owner</th><th>Status</th></tr></thead>
                <tbody>
                  {riskExposure.highAndCriticalRisks.map(r => (
                    <tr key={r._id}>
                      <td><strong>{r.title}</strong></td>
                      <td><span className={`badge ${r.riskLevel === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>{r.riskLevel}</span></td>
                      <td>{r.riskScore}</td>
                      <td>{r.owner || '—'}</td>
                      <td><span className="badge badge-neutral">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI Change Request Context */}
      <div className="card">
        <div className="card-header" style={{ background: 'var(--surface-2)' }}>
          <h3><FileText size={16} className="text-primary" /> Proposed Change Request — AI Diagnosis & Mobile App</h3>
        </div>
        <div className="card-body">
          <div className="two-col">
            <div>
              <p><strong>Scope Addition:</strong> AI-based preliminary diagnosis module + cross-platform mobile application</p>
              <p className="mt-8"><strong>Estimated Cost Impact:</strong> PKR 800,000</p>
              <p><strong>Estimated Time Impact:</strong> +3 weeks (16 → 19 weeks)</p>
            </div>
            <div>
              <p><strong>Current Approved Budget:</strong> PKR 5,000,000</p>
              <p className="mt-8"><strong>If Approved New Budget:</strong> PKR 5,800,000</p>
              <p><strong>If Approved New Timeline:</strong> 19 weeks</p>
            </div>
          </div>
          <div className="alert alert-warning mt-16">
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>
              This change request is <strong>pending approval</strong>. The baseline budget and schedule remain unchanged until formally approved through the change control process.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
