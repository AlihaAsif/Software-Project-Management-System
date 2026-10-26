import React, { useEffect, useState } from 'react';
import { getEVMSummary, getEVMActivities } from '../services/api';
import { Info, BarChart2, DollarSign } from 'lucide-react';

function Metric({ label, value, cls = 'neutral', sub }) {
  return (
    <div className="evm-metric">
      <div className="evm-metric-label">{label}</div>
      <div className={`evm-metric-value ${cls}`}>{value ?? '—'}</div>
      {sub && <div className="text-muted" style={{ fontSize: 10, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const fmtPKR = (n) => n != null ? `PKR ${Number(n).toLocaleString()}` : '—';
const fmtN = (n, d = 2) => n != null ? Number(n).toFixed(d) : '—';

export default function EVM({ projectId }) {
  const [summary, setSummary] = useState(null);
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([getEVMSummary(projectId), getEVMActivities(projectId)])
      .then(([s, a]) => { setSummary(s.data); setActs(a.data.activities || []); setError(''); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load EVM data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Computing EVM...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!summary) return null;

  const cpiClass = summary.CPI != null ? (summary.CPI >= 1 ? 'good' : 'bad') : 'neutral';
  const spiClass = summary.SPI != null ? (summary.SPI >= 1 ? 'good' : 'bad') : 'neutral';

  return (
    <div>
      <div className="page-header">
        <h2>Cost & Earned Value Management</h2>
        <p>Project: {summary.projectName} · Currency: {summary.currency} · {summary.totalActivities} activities</p>
      </div>

      {summary.warnings?.map((w, i) => (
        <div key={i} className="alert alert-warning">{w}</div>
      ))}

      <div className="alert alert-info mb-24 flex-gap-8">
        <Info size={15} style={{ flexShrink: 0 }} />
        <span>{summary.note}</span>
      </div>

      {/* Core EVM grid */}
      <div className="card mb-24">
        <div className="card-header"><h3><BarChart2 size={16} className="text-primary" /> EVM Metrics</h3></div>
        <div className="card-body">
          <div className="evm-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))' }}>
            <Metric label="BAC (Budget at Completion)" value={fmtPKR(summary.BAC)} sub="Total planned budget" />
            <Metric label="PV (Planned Value)" value={fmtPKR(summary.PV)} sub="Budgeted work scheduled" />
            <Metric label="EV (Earned Value)" value={fmtPKR(summary.EV)} sub="Value of work done" />
            <Metric label="AC (Actual Cost)" value={fmtPKR(summary.AC)} sub="Actual $ spent" />
            <Metric label="CV (Cost Variance)" value={fmtPKR(summary.CV)} cls={summary.CV >= 0 ? 'good' : 'bad'} sub="EV − AC" />
            <Metric label="SV (Schedule Variance)" value={fmtPKR(summary.SV)} cls={summary.SV >= 0 ? 'good' : 'bad'} sub="EV − PV" />
            <Metric label="CPI" value={fmtN(summary.CPI)} cls={cpiClass} sub="EV / AC (>1 good)" />
            <Metric label="SPI" value={fmtN(summary.SPI)} cls={spiClass} sub="EV / PV (>1 good)" />
            <Metric label="EAC (Estimate at Completion)" value={fmtPKR(summary.EAC)} sub="Projected total cost" />
            <Metric label="VAC (Variance at Completion)" value={fmtPKR(summary.VAC)} cls={summary.VAC >= 0 ? 'good' : 'bad'} sub="BAC − EAC" />
            <Metric label="TCPI" value={fmtN(summary.TCPI)} cls={summary.TCPI != null && summary.TCPI > 1.2 ? 'bad' : 'neutral'} sub="Work efficiency needed" />
            <Metric label="Budget Used" value={summary.budgetUsedPct != null ? `${summary.budgetUsedPct}%` : '—'} cls={summary.overBudget ? 'bad' : 'good'} sub={`of PKR ${summary.approvedBudget.toLocaleString()}`} />
          </div>
        </div>
      </div>

      {/* Budget bar */}
      <div className="card mb-24">
        <div className="card-header"><h3>Budget Utilization</h3></div>
        <div className="card-body">
          <div className="flex-between mb-8">
            <span className="text-sm">AC vs Approved Budget</span>
            <span className="text-sm font-bold">{fmtPKR(summary.AC)} / {fmtPKR(summary.approvedBudget)}</span>
          </div>
          <div className="progress-bar-wrap" style={{ height: 16 }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, (summary.AC / summary.approvedBudget) * 100)}%`,
                background: summary.overBudget ? 'var(--danger)' : 'var(--success)'
              }}
            />
          </div>
          <div className="flex-between mt-16">
            <div style={{ flex: 1 }}>
              <div className="flex-between mb-4"><span className="text-sm">PV</span><span className="text-sm">{fmtPKR(summary.PV)}</span></div>
              <div className="progress-bar-wrap" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${Math.min(100,(summary.PV/summary.approvedBudget)*100)}%`, background: 'var(--info)' }} />
              </div>
            </div>
            <div style={{ width: 20 }} />
            <div style={{ flex: 1 }}>
              <div className="flex-between mb-4"><span className="text-sm">EV</span><span className="text-sm">{fmtPKR(summary.EV)}</span></div>
              <div className="progress-bar-wrap" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${Math.min(100,(summary.EV/summary.approvedBudget)*100)}%`, background: 'var(--gold)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity-level EVM */}
      {acts.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Activity-Level EVM Report</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Activity</th><th>Status</th><th>%</th>
                  <th>BAC</th><th>PV</th><th>EV</th><th>AC</th>
                  <th>CV</th><th>SV</th><th>CPI</th><th>SPI</th>
                </tr>
              </thead>
              <tbody>
                {acts.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td><span className={`badge ${a.status==='Completed'?'badge-success':a.status==='Delayed'?'badge-danger':'badge-neutral'}`}>{a.status}</span></td>
                    <td>{a.percentComplete}%</td>
                    <td>{fmtPKR(a.BAC)}</td>
                    <td>{fmtPKR(a.PV)}</td>
                    <td>{fmtPKR(a.EV)}</td>
                    <td>{fmtPKR(a.AC)}</td>
                    <td style={{ color: a.CV >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtPKR(a.CV)}</td>
                    <td style={{ color: a.SV >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtPKR(a.SV)}</td>
                    <td style={{ color: a.CPI != null && a.CPI >= 1 ? 'var(--success)' : 'var(--danger)' }}>{fmtN(a.CPI)}</td>
                    <td style={{ color: a.SPI != null && a.SPI >= 1 ? 'var(--success)' : 'var(--danger)' }}>{fmtN(a.SPI)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
