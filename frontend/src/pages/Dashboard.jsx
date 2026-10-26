import React, { useEffect, useState } from 'react';
import { getDashboard, getProject } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Bug,
  ShieldAlert,
  GitPullRequest,
  CheckSquare,
  Activity,
  BarChart2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronRight
} from 'lucide-react';

/* ── Formatter Helpers ─────────────────────────────────────────── */
const fmtPKR = (n) => (n != null ? `PKR ${Number(n).toLocaleString()}` : '—');
const fmtPKRCompact = (n) => {
  if (n == null) return '—';
  const num = Number(n);
  if (num >= 1_000_000) return `PKR ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `PKR ${(num / 1_000).toFixed(0)}k`;
  return `PKR ${num.toLocaleString()}`;
};
const fmtNum = (n, d = 2) => (n != null ? Number(n).toFixed(d) : '—');
const dateFmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/* ── SVG Donut Progress Chart ──────────────────────────────────── */
function DonutProgressChart({ percent = 0, size = 150, stroke = 13, activities = {} }) {
  const safePct = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  const completed = activities.statusBreakdown?.Completed || 0;
  const inProgress = activities.statusBreakdown?.['In Progress'] || 0;
  const notStarted = activities.statusBreakdown?.['Not Started'] || 0;
  const delayed = activities.statusBreakdown?.Delayed || 0;
  const total = activities.totalActivities || 0;

  return (
    <div className="donut-chart-container">
      <div className="donut-svg-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          {/* Progress Segment */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="donut-center-text">
          <span className="donut-value">{safePct}%</span>
          <span className="donut-label">Completed</span>
        </div>
      </div>

      <div className="donut-legend">
        <div className="donut-legend-item">
          <span className="legend-dot" style={{ background: 'var(--primary)' }} />
          <span className="legend-name">Completed</span>
          <span className="legend-count">{completed}</span>
        </div>
        <div className="donut-legend-item">
          <span className="legend-dot" style={{ background: 'var(--info)' }} />
          <span className="legend-name">In Progress</span>
          <span className="legend-count">{inProgress}</span>
        </div>
        <div className="donut-legend-item">
          <span className="legend-dot" style={{ background: 'var(--text-faint)' }} />
          <span className="legend-name">Not Started</span>
          <span className="legend-count">{notStarted}</span>
        </div>
        {delayed > 0 && (
          <div className="donut-legend-item">
            <span className="legend-dot" style={{ background: 'var(--danger)' }} />
            <span className="legend-name">Delayed</span>
            <span className="legend-count text-danger">{delayed}</span>
          </div>
        )}
        <div className="donut-legend-total">
          <span>Total Activities</span>
          <strong>{total}</strong>
        </div>
      </div>
    </div>
  );
}

/* ── Planned vs Actual Progress Comparison ─────────────────────── */
function PlannedVsActualChart({ plannedPct = 0, actualPct = 0, spi = 1, isBehind = false }) {
  const safePlanned = Math.min(100, Math.max(0, Math.round(plannedPct)));
  const safeActual = Math.min(100, Math.max(0, Math.round(actualPct)));
  const diff = safeActual - safePlanned;

  return (
    <div className="progress-compare-card">
      <div className="compare-header flex-between mb-16">
        <div>
          <span className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Schedule Baseline Tracking
          </span>
          <h4 style={{ margin: '3px 0 0', fontSize: '15px', color: 'var(--text)' }}>
            Planned vs. Actual Completion
          </h4>
        </div>
        <div className={`status-pill ${diff >= 0 ? 'good' : 'bad'}`}>
          {diff >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          <span>{diff >= 0 ? `+${diff}% Ahead` : `${diff}% Behind`}</span>
        </div>
      </div>

      {/* Planned Bar */}
      <div className="compare-bar-group mb-12">
        <div className="flex-between mb-4">
          <span className="compare-bar-label">
            <span className="bar-tag blue">Planned Baseline</span> (PV / BAC)
          </span>
          <span className="compare-bar-val">{safePlanned}%</span>
        </div>
        <div className="progress-bar-wrap" style={{ height: 10, background: 'var(--surface-2)' }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${safePlanned}%`, background: 'var(--info)' }}
          />
        </div>
      </div>

      {/* Actual Bar */}
      <div className="compare-bar-group mb-16">
        <div className="flex-between mb-4">
          <span className="compare-bar-label">
            <span className="bar-tag green">Actual Progress</span> (Earned Value Work)
          </span>
          <span className="compare-bar-val font-bold" style={{ color: 'var(--primary)' }}>{safeActual}%</span>
        </div>
        <div className="progress-bar-wrap" style={{ height: 10, background: 'var(--surface-2)' }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${safeActual}%`,
              background: isBehind ? 'var(--warning)' : 'var(--primary)'
            }}
          />
        </div>
      </div>

      <div className="compare-footer flex-between">
        <span className="text-xs text-muted">
          Schedule Performance Index: <strong>{fmtNum(spi)}</strong>
        </span>
        <span className={`badge ${isBehind ? 'badge-warning' : 'badge-success'}`}>
          {isBehind ? 'Behind Schedule' : 'On Schedule'}
        </span>
      </div>
    </div>
  );
}

/* ── Cost & EVM Visual Comparison Chart ────────────────────────── */
function CostEVMBarChart({ evm = {} }) {
  const bac = Number(evm.BAC || 0);
  const pv = Number(evm.PV || 0);
  const ev = Number(evm.EV || 0);
  const ac = Number(evm.AC || 0);

  const maxVal = Math.max(bac, pv, ev, ac, 1);

  const bars = [
    { label: 'BAC', full: 'Budget at Completion', val: bac, color: '#64748b', bg: '#f1f5f9' },
    { label: 'PV', full: 'Planned Value', val: pv, color: 'var(--info)', bg: 'var(--info-bg)' },
    { label: 'EV', full: 'Earned Value', val: ev, color: 'var(--primary)', bg: 'var(--success-bg)' },
    { label: 'AC', full: 'Actual Cost', val: ac, color: evm.overBudget ? 'var(--danger)' : 'var(--gold)', bg: evm.overBudget ? 'var(--danger-bg)' : '#fef9ec' },
  ];

  const cpiGood = evm.CPI != null && evm.CPI >= 1;
  const spiGood = evm.SPI != null && evm.SPI >= 1;

  return (
    <div className="evm-chart-card">
      <div className="evm-chart-bars">
        {bars.map((b) => {
          const heightPct = Math.max(8, Math.round((b.val / maxVal) * 100));
          return (
            <div key={b.label} className="evm-bar-col">
              <span className="evm-bar-amount">{fmtPKRCompact(b.val)}</span>
              <div className="evm-bar-track">
                <div
                  className="evm-bar-fill"
                  style={{
                    height: `${heightPct}%`,
                    background: b.color,
                  }}
                  title={`${b.full}: ${fmtPKR(b.val)}`}
                />
              </div>
              <span className="evm-bar-code">{b.label}</span>
            </div>
          );
        })}
      </div>

      <div className="evm-kpi-summary">
        <div className="evm-kpi-badge-box">
          <div className="kpi-box-row">
            <span className="kpi-box-label">Cost Performance Index (CPI)</span>
            <span className={`kpi-box-val ${cpiGood ? 'good' : 'bad'}`}>
              {fmtNum(evm.CPI)}
              <span className="kpi-box-sub">({cpiGood ? 'Cost Efficient' : 'Cost Overrun'})</span>
            </span>
          </div>
          <div className="kpi-box-row">
            <span className="kpi-box-label">Schedule Performance Index (SPI)</span>
            <span className={`kpi-box-val ${spiGood ? 'good' : 'bad'}`}>
              {fmtNum(evm.SPI)}
              <span className="kpi-box-sub">({spiGood ? 'On Track' : 'Behind Schedule'})</span>
            </span>
          </div>
        </div>

        <div className="evm-metrics-subgrid">
          <div className="metric-chip">
            <span className="metric-chip-lbl">Cost Variance (CV)</span>
            <span className={`metric-chip-val font-bold ${evm.CV >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmtPKR(evm.CV)}
            </span>
          </div>
          <div className="metric-chip">
            <span className="metric-chip-lbl">Schedule Variance (SV)</span>
            <span className={`metric-chip-val font-bold ${evm.SV >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmtPKR(evm.SV)}
            </span>
          </div>
          <div className="metric-chip">
            <span className="metric-chip-lbl">Estimate at Completion (EAC)</span>
            <span className="metric-chip-val font-bold">{fmtPKRCompact(evm.EAC)}</span>
          </div>
          <div className="metric-chip">
            <span className="metric-chip-lbl">Budget Used</span>
            <span className={`metric-chip-val font-bold ${evm.overBudget ? 'text-danger' : 'text-primary'}`}>
              {evm.budgetUsedPct != null ? `${evm.budgetUsedPct}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Task Status Distribution Chart ────────────────────────────── */
function TaskStatusDistribution({ statusBreakdown = {}, totalActivities = 0 }) {
  const statuses = [
    { key: 'Completed', label: 'Completed', color: 'var(--primary)' },
    { key: 'In Progress', label: 'In Progress', color: 'var(--info)' },
    { key: 'Not Started', label: 'Not Started', color: '#94a3b8' },
    { key: 'Delayed', label: 'Delayed', color: 'var(--danger)' },
    { key: 'On Hold', label: 'On Hold', color: 'var(--gold)' },
  ];

  const total = totalActivities || 1;

  return (
    <div className="task-dist-card">
      {/* Segmented Stacked Bar */}
      <div className="task-segmented-bar mb-16">
        {statuses.map((st) => {
          const count = statusBreakdown[st.key] || 0;
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={st.key}
              className="segment"
              style={{ width: `${pct}%`, background: st.color }}
              title={`${st.label}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Breakdown Grid */}
      <div className="task-status-grid">
        {statuses.map((st) => {
          const count = statusBreakdown[st.key] || 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={st.key} className="status-grid-item">
              <div className="status-item-top">
                <span className="status-color-dot" style={{ background: st.color }} />
                <span className="status-item-name">{st.label}</span>
              </div>
              <div className="status-item-bottom">
                <strong className="status-item-count">{count}</strong>
                <span className="status-item-pct">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Milestone Timeline Component ──────────────────────────────── */
function MilestoneTimeline({ milestones = [] }) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="empty-milestones">
        <Calendar size={28} className="text-muted mb-8" />
        <p className="text-sm text-muted">No milestone schedule defined for this project yet.</p>
        <p className="text-xs text-faint">Add delivery milestones in Project Initiation.</p>
      </div>
    );
  }

  return (
    <div className="milestone-timeline-wrap">
      <div className="milestone-track">
        {milestones.map((m, idx) => {
          const isDone = m.completed || m.status === 'Completed';
          const overdue = !isDone && m.dueDate && new Date(m.dueDate) < new Date();

          return (
            <div key={m._id || idx} className={`milestone-node ${isDone ? 'is-done' : overdue ? 'is-overdue' : 'is-pending'}`}>
              <div className="milestone-marker">
                {isDone ? (
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                ) : overdue ? (
                  <Clock size={16} strokeWidth={2.5} />
                ) : (
                  <span className="milestone-num">{idx + 1}</span>
                )}
              </div>
              <div className="milestone-content">
                <div className="milestone-title-row">
                  <h5 className="milestone-title">{m.title}</h5>
                  <span className={`badge ${isDone ? 'badge-success' : overdue ? 'badge-danger' : 'badge-neutral'}`}>
                    {isDone ? 'Completed' : overdue ? 'Overdue' : 'Scheduled'}
                  </span>
                </div>
                <div className="milestone-meta">
                  <span className="milestone-date">
                    <Calendar size={11} /> {dateFmt(m.dueDate)}
                  </span>
                  {m.responsiblePerson && (
                    <span className="milestone-resp">
                      Lead: {m.responsiblePerson}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Compact Project Health & Alerts ───────────────────────────── */
function HealthAlertsSection({ warnings = [], healthSummary = {} }) {
  const [expanded, setExpanded] = useState(false);

  // Categorize alerts
  const criticalAlerts = warnings.filter(
    (w) => w.toLowerCase().includes('critical') || w.toLowerCase().includes('over approved budget')
  );
  const operationalAlerts = warnings.filter(
    (w) => !w.toLowerCase().includes('critical') && !w.toLowerCase().includes('over approved budget')
  );

  const isHealthy = healthSummary.overallHealth?.includes('Healthy');
  const isCritical = healthSummary.overallHealth?.includes('Critical');

  return (
    <div className="health-section-card mb-24">
      <div className="health-header flex-between">
        <div className="health-title-group">
          <div className={`health-status-icon ${isCritical ? 'critical' : isHealthy ? 'healthy' : 'warning'}`}>
            {isCritical ? <AlertOctagon size={18} strokeWidth={2.5} /> : isHealthy ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <AlertTriangle size={18} strokeWidth={2.5} />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
              Project Governance & Health Status
            </h4>
            <span className="text-xs text-muted">
              {healthSummary.overallHealth || 'Active Monitoring'} · {warnings.length} active advisories
            </span>
          </div>
        </div>

        {warnings.length > 2 && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : `View All (${warnings.length})`}
          </button>
        )}
      </div>

      {/* Critical Warnings */}
      {criticalAlerts.length > 0 && (
        <div className="critical-alerts-strip mt-12">
          {criticalAlerts.map((w, idx) => (
            <div key={idx} className="alert-item critical">
              <span className="alert-severity-badge critical">CRITICAL</span>
              <span className="alert-text">{w.replace(/^⚠️\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Operational Warnings */}
      {operationalAlerts.length > 0 && (
        <div className={`operational-alerts-list mt-8 ${!expanded && criticalAlerts.length > 0 ? 'collapsed-view' : ''}`}>
          {(expanded || criticalAlerts.length === 0 ? operationalAlerts : operationalAlerts.slice(0, 2)).map((w, idx) => (
            <div key={idx} className="alert-item warning">
              <span className="alert-severity-badge warning">ADVISORY</span>
              <span className="alert-text">{w.replace(/^⚠️\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length === 0 && (
        <div className="healthy-empty-state mt-12">
          <CheckCircle2 size={16} className="text-success" />
          <span className="text-xs text-success font-600">
            All project baselines, EVM performance, and defect thresholds are currently healthy.
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard View ───────────────────────────────────────── */
export default function Dashboard({ projectId }) {
  const [data, setData] = useState(null);
  const [projectObj, setProjectObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setProjectObj(null);
      return;
    }
    setLoading(true);
    Promise.all([getDashboard(projectId), getProject(projectId)])
      .then(([dashRes, projRes]) => {
        setData(dashRes.data);
        setProjectObj(projRes.data);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Activity size={48} strokeWidth={1.8} style={{ color: 'var(--primary)' }} />
        </div>
        <h2 style={{ marginBottom: 6, color: 'var(--text)' }}>Smart Healthcare PM Dashboard</h2>
        <p className="text-muted text-sm" style={{ maxWidth: 440, margin: '0 auto 16px' }}>
          Select an active hospital consortia project from the sidebar to inspect real-time progress, EVM metrics, task distribution, and risk exposure.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Loading project analytics and EVM calculations…</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!data) return null;

  const { project, healthSummary, scheduleAndProgress, budgetAndEVM: evm, scopeAndChangeRequests, defectsAndQuality, riskExposure } = data;

  const plannedProgressPct = evm.BAC > 0 ? (evm.PV / evm.BAC) * 100 : 0;
  const actualProgressPct = scheduleAndProgress.averagePercentComplete || 0;

  return (
    <div className="dashboard-page">
      {/* Executive Page Header */}
      <div className="dashboard-header flex-between mb-20">
        <div>
          <div className="flex-gap-8 mb-4">
            <span className="badge badge-green font-bold">{project.status || 'Active'}</span>
            <span className="text-xs text-muted">PM: <strong>{project.projectManager}</strong></span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">Duration: <strong>{project.baselineDurationWeeks} Weeks</strong></span>
          </div>
          <h2 className="dashboard-title">{project.name}</h2>
          <p className="text-muted text-xs">
            Baseline Budget: <strong>{fmtPKR(project.baselineBudgetPKR)}</strong> · Timeline: <strong>{dateFmt(project.startDate)}</strong> → <strong>{dateFmt(project.endDate)}</strong>
          </p>
        </div>

        <div className="header-stat-box">
          <span className="header-stat-lbl">Earned Value (EV)</span>
          <span className="header-stat-val text-primary">{fmtPKR(evm.EV)}</span>
        </div>
      </div>

      {/* Compact Health & Alert Advisories */}
      <HealthAlertsSection
        warnings={healthSummary.importantWarnings || []}
        healthSummary={healthSummary}
      />

      {/* 8-Card Responsive KPI Grid */}
      <div className="kpi-dashboard-grid mb-24">
        {/* 1. Overall Progress */}
        <div className="kpi-card green-accent">
          <div className="kpi-card-header">
            <span className="kpi-label">Overall Progress</span>
            <CheckSquare size={16} className="text-primary" />
          </div>
          <div className="kpi-card-value">{scheduleAndProgress.averagePercentComplete}%</div>
          <div className="kpi-card-sub text-muted">
            {scheduleAndProgress.totalActivities} scheduled activities
          </div>
        </div>

        {/* 2. Budget Used */}
        <div className={`kpi-card ${evm.overBudget ? 'danger-accent' : 'gold-accent'}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Budget Used</span>
            <DollarSign size={16} className={evm.overBudget ? 'text-danger' : 'text-gold'} />
          </div>
          <div className="kpi-card-value">
            {evm.budgetUsedPct != null ? `${evm.budgetUsedPct}%` : '—'}
          </div>
          <div className="kpi-card-sub text-muted">
            AC: {fmtPKRCompact(evm.AC)} / {fmtPKRCompact(evm.BAC)}
          </div>
        </div>

        {/* 3. CPI */}
        <div className={`kpi-card ${evm.CPI != null && evm.CPI < 1 ? 'danger-accent' : 'green-accent'}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Cost Efficiency (CPI)</span>
            <TrendingUp size={16} className={evm.CPI != null && evm.CPI < 1 ? 'text-danger' : 'text-primary'} />
          </div>
          <div className={`kpi-card-value ${evm.CPI != null && evm.CPI < 1 ? 'text-danger' : 'text-primary'}`}>
            {fmtNum(evm.CPI)}
          </div>
          <div className="kpi-card-sub text-muted">
            {evm.CPI != null && evm.CPI >= 1 ? 'Under approved cost' : 'Cost overrun warning'}
          </div>
        </div>

        {/* 4. SPI */}
        <div className={`kpi-card ${evm.SPI != null && evm.SPI < 1 ? 'warn-accent' : 'green-accent'}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Schedule Index (SPI)</span>
            <Calendar size={16} className={evm.SPI != null && evm.SPI < 1 ? 'text-warning' : 'text-primary'} />
          </div>
          <div className={`kpi-card-value ${evm.SPI != null && evm.SPI < 1 ? 'text-warning' : 'text-primary'}`}>
            {fmtNum(evm.SPI)}
          </div>
          <div className="kpi-card-sub text-muted">
            {evm.SPI != null && evm.SPI >= 1 ? 'On or ahead of schedule' : 'Behind planned pace'}
          </div>
        </div>

        {/* 5. Defects */}
        <div className={`kpi-card ${defectsAndQuality.unresolvedCriticalDefects > 0 ? 'danger-accent' : 'green-accent'}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Open Defects</span>
            <Bug size={16} className={defectsAndQuality.unresolvedCriticalDefects > 0 ? 'text-danger' : 'text-muted'} />
          </div>
          <div className="kpi-card-value">
            {defectsAndQuality.defectStatusCounts['Open'] || 0}
          </div>
          <div className="kpi-card-sub">
            <span className={defectsAndQuality.unresolvedCriticalDefects > 0 ? 'text-danger font-600' : 'text-muted'}>
              {defectsAndQuality.unresolvedCriticalDefects} critical unresolved
            </span>
          </div>
        </div>

        {/* 6. Risks */}
        <div className={`kpi-card ${riskExposure.activeHighAndCriticalRisksCount > 0 ? 'warn-accent' : 'green-accent'}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Risk Register</span>
            <ShieldAlert size={16} className={riskExposure.activeHighAndCriticalRisksCount > 0 ? 'text-warning' : 'text-muted'} />
          </div>
          <div className="kpi-card-value">
            {riskExposure.activeHighAndCriticalRisksCount}
          </div>
          <div className="kpi-card-sub text-muted">
            High/Critical of {riskExposure.totalRisks} total risks
          </div>
        </div>

        {/* 7. Change Requests */}
        <div className="kpi-card info-accent">
          <div className="kpi-card-header">
            <span className="kpi-label">Pending CRs</span>
            <GitPullRequest size={16} className="text-info" />
          </div>
          <div className="kpi-card-value">
            {scopeAndChangeRequests.pendingChangeRequestsCount}
          </div>
          <div className="kpi-card-sub text-muted">
            {scopeAndChangeRequests.totalChangeRequests} total proposed
          </div>
        </div>

        {/* 8. QC Pass Rate */}
        <div className="kpi-card gold-accent">
          <div className="kpi-card-header">
            <span className="kpi-label">QC Pass Rate</span>
            <Activity size={16} className="text-gold" />
          </div>
          <div className="kpi-card-value">
            {defectsAndQuality.qualityInspections?.passRate || 'N/A'}
          </div>
          <div className="kpi-card-sub text-muted">
            {defectsAndQuality.qualityInspections?.total || 0} inspection checks
          </div>
        </div>
      </div>

      {/* Row 1: Real Visual Charts Grid */}
      <div className="charts-main-grid mb-24">
        {/* Chart 1: Overall Progress Donut Chart */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><PieChart size={16} className="text-primary" /> Overall Progress</h3>
            <span className="badge badge-neutral">{scheduleAndProgress.totalActivities} Activities</span>
          </div>
          <div className="card-body">
            <DonutProgressChart
              percent={scheduleAndProgress.averagePercentComplete || 0}
              size={146}
              stroke={14}
              activities={scheduleAndProgress}
            />
          </div>
        </div>

        {/* Chart 2: Planned vs Actual Comparison */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><BarChart2 size={16} className="text-primary" /> Planned vs. Actual Progress</h3>
            <span className="text-xs text-muted">SPI: {fmtNum(evm.SPI)}</span>
          </div>
          <div className="card-body">
            <PlannedVsActualChart
              plannedPct={plannedProgressPct}
              actualPct={actualProgressPct}
              spi={evm.SPI}
              isBehind={evm.behindSchedule}
            />
          </div>
        </div>
      </div>

      {/* Row 2: EVM Cost Comparison & Task Status Distribution */}
      <div className="charts-main-grid mb-24">
        {/* Chart 3: Cost & EVM (BAC, PV, EV, AC) Comparison */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><DollarSign size={16} className="text-primary" /> Cost & EVM Performance Comparison</h3>
            <span className="text-xs text-muted">Currency: {evm.currency}</span>
          </div>
          <div className="card-body">
            <CostEVMBarChart evm={evm} />
          </div>
        </div>

        {/* Chart 4: Task Status Distribution */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><CheckSquare size={16} className="text-primary" /> Task Status Distribution</h3>
            <span className="text-xs text-muted">Workflow Health</span>
          </div>
          <div className="card-body">
            <TaskStatusDistribution
              statusBreakdown={scheduleAndProgress.statusBreakdown}
              totalActivities={scheduleAndProgress.totalActivities}
            />

            {/* Delayed Activities Notice */}
            {scheduleAndProgress.delayedActivitiesCount > 0 && (
              <div className="delayed-alert-box mt-16">
                <div className="flex-between mb-6">
                  <span className="text-xs font-bold text-danger flex-gap-8">
                    <AlertTriangle size={13} /> {scheduleAndProgress.delayedActivitiesCount} Delayed Activities
                  </span>
                  <span className="text-xs text-muted">Requires re-allocation</span>
                </div>
                <div className="delayed-list">
                  {scheduleAndProgress.delayedActivities.slice(0, 3).map((a) => (
                    <div key={a._id} className="delayed-row">
                      <span className="delayed-title">{a.title}</span>
                      <span className="badge badge-danger text-xs">{a.percentComplete}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Project Milestone Timeline */}
      <div className="card mb-24">
        <div className="card-header flex-between">
          <h3><Calendar size={16} className="text-primary" /> Project Delivery Milestones</h3>
          <span className="text-xs text-muted">
            {(projectObj?.milestones || []).filter((m) => m.completed || m.status === 'Completed').length} of {(projectObj?.milestones || []).length} completed
          </span>
        </div>
        <div className="card-body">
          <MilestoneTimeline milestones={projectObj?.milestones || []} />
        </div>
      </div>

      {/* Row 4: Critical Open Defects & High Risks Summary */}
      <div className="two-col mb-24">
        {/* Defects */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><Bug size={16} className="text-primary" /> Defect Severity Breakdown</h3>
            <span className="badge badge-neutral">{defectsAndQuality.totalDefects} Total</span>
          </div>
          <div className="card-body">
            <div className="severity-pills-row mb-16">
              {Object.entries(defectsAndQuality.defectSeverityCounts || {}).map(([sev, count]) => (
                <div key={sev} className={`severity-pill ${sev.toLowerCase()}`}>
                  <span className="sev-count">{count}</span>
                  <span className="sev-label">{sev}</span>
                </div>
              ))}
            </div>

            {defectsAndQuality.criticalOpenDefects?.length > 0 ? (
              <div className="table-wrapper compact-table-wrap">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Critical Defect</th>
                      <th>Module</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defectsAndQuality.criticalOpenDefects.map((d) => (
                      <tr key={d._id}>
                        <td><strong>{d.title}</strong></td>
                        <td>{d.relatedModule}</td>
                        <td><span className="badge badge-danger">{d.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted" style={{ padding: '8px 0' }}>
                No unresolved critical defects currently logged.
              </p>
            )}
          </div>
        </div>

        {/* Risks */}
        <div className="card">
          <div className="card-header flex-between">
            <h3><ShieldAlert size={16} className="text-primary" /> Risk Register Exposure</h3>
            <span className="badge badge-neutral">{riskExposure.totalRisks} Total</span>
          </div>
          <div className="card-body">
            <div className="severity-pills-row mb-16">
              {Object.entries(riskExposure.byLevel || {}).map(([lvl, count]) => (
                <div key={lvl} className={`severity-pill ${lvl.toLowerCase()}`}>
                  <span className="sev-count">{count}</span>
                  <span className="sev-label">{lvl}</span>
                </div>
              ))}
            </div>

            {riskExposure.highAndCriticalRisks?.length > 0 ? (
              <div className="table-wrapper compact-table-wrap">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>High / Critical Risk</th>
                      <th>Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskExposure.highAndCriticalRisks.slice(0, 4).map((r) => (
                      <tr key={r._id}>
                        <td><strong>{r.title}</strong></td>
                        <td><span className={`badge ${r.riskLevel === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>{r.riskLevel}</span></td>
                        <td><span className="badge badge-neutral">{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted" style={{ padding: '8px 0' }}>
                No high or critical risks identified in the register.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
