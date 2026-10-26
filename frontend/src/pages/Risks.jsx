import React, { useEffect, useState } from 'react';
import { getRisks, getProject, createRisk, updateRisk, updateRiskStatus, deleteRisk } from '../services/api';
import { Info, ShieldAlert } from 'lucide-react';

const CATEGORIES = ['Technical','Operational','Financial','Schedule','Compliance','Security','General'];
const STRATEGIES = ['Avoid','Transfer','Mitigate','Accept'];
const STATUSES   = ['Open','Identified','Analysed','Mitigating','Mitigated','Closed'];

function RiskLevel({ level }) {
  const cls = { Critical:'badge-danger', High:'badge-warning', Medium:'badge-gold', Low:'badge-success' };
  return <span className={`badge ${cls[level] || 'badge-neutral'}`}>{level}</span>;
}

const emptyForm = {
  title:'', description:'', category:'Technical',
  likelihood: 3, impact: 3,
  responseStrategy:'Mitigate', mitigationPlan:'',
  preventiveAction:'', contingencyAction:'', owner:''
};

export default function Risks({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [project, setProject] = useState(null);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getRisks(projectId).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);
  useEffect(() => {
    if (!projectId) { setProject(null); return; }
    getProject(projectId).then(r => setProject(r.data)).catch(() => setProject(null));
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    try {
      const data = {
        ...form,
        project: projectId,
        likelihood: Number(form.likelihood),
        impact: Number(form.impact),
      };
      if (editItem) {
        await updateRisk(editItem._id, data);
      } else {
        await createRisk(data);
      }
      load();
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to save risk');
    }
  };

  const handleStatusChange = async (id, status) => {
    await updateRiskStatus(id, status);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this risk?')) return;
    await deleteRisk(id);
    load();
  };

  const filtered = items.filter(i => !filterLevel || i.riskLevel === filterLevel);

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  const byLevel = { Critical:0, High:0, Medium:0, Low:0 };
  items.forEach(i => { if (byLevel[i.riskLevel] !== undefined) byLevel[i.riskLevel]++; });

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Risk Management</h2>
          <p>{items.length} risks · {byLevel.Critical} critical · {byLevel.High} high</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError(''); }}>
          + Add Risk
        </button>
      </div>

      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {['Critical','High','Medium','Low'].map(l => (
          <div key={l} className={`stat-card ${l==='Critical'?'danger':l==='High'?'warn':l==='Medium'?'gold':'green'}`}>
            <div className="stat-card-label">{l}</div>
            <div className="stat-card-value">{byLevel[l]}</div>
            <div className="stat-card-sub">Score: {l==='Critical'?'20-25':l==='High'?'13-19':l==='Medium'?'6-12':'1-5'}</div>
          </div>
        ))}
      </div>

      <div className="alert alert-info mb-24 flex-gap-8">
        <Info size={15} style={{ flexShrink: 0 }} />
        <span><strong>Risk Score = Likelihood (1–5) × Impact (1–5)</strong> · Low: 1–5 · Medium: 6–12 · High: 13–19 · Critical: 20–25</span>
      </div>

      <section className="card pdpc-card mb-24" aria-labelledby="pdpc-title">
        <div className="card-header"><h3 id="pdpc-title">Process Decision Program Chart (PDPC)</h3></div>
        <div className="pdpc-objective"><strong>{project?.projectName || 'Project objective'}</strong><span>{project?.charter?.purpose || project?.objectives?.[0] || 'Deliver reliable, secure healthcare services.'}</span></div>
        {items.length ? <div className="pdpc-branches">
          {items.map((risk, index) => <div className="pdpc-branch" key={risk._id}>
            <div className="pdpc-step"><span>Step {index + 1}</span><strong>{risk.category || 'Project'}: {risk.title}</strong></div>
            <div className="pdpc-problem"><span>Possible problem</span><strong>{risk.title}</strong><p>{risk.description || 'Risk recorded in the project risk register.'}</p></div>
            <div className="pdpc-actions">
              <div><span>Preventive action</span><p>{risk.preventiveAction || risk.mitigationPlan || 'No preventive action recorded.'}</p></div>
              <div><span>Contingency action</span><p>{risk.contingencyAction || 'No contingency action recorded.'}</p></div>
            </div>
          </div>)}
        </div> : <div className="card-body text-muted">Add project risks to populate the PDPC with problems and response actions.</div>}
      </section>

      <div className="card">
        <div className="card-header flex-between">
          <h3>Risk Register</h3>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{ padding:'5px 8px', borderRadius:6, border:'1.5px solid var(--cream-dark)', fontSize:12 }}>
            <option value="">All Levels</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Risk</th><th>Category</th><th>L</th><th>I</th><th>Score</th><th>Level</th>
                <th>Strategy</th><th>Owner</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    {r.mitigationPlan && <div className="text-muted text-sm">Plan: {r.mitigationPlan}</div>}
                  </td>
                  <td className="text-sm">{r.category}</td>
                  <td style={{ textAlign:'center' }}>{r.likelihood}</td>
                  <td style={{ textAlign:'center' }}>{r.impact}</td>
                  <td style={{ textAlign:'center', fontWeight:700 }}>{r.riskScore}</td>
                  <td><RiskLevel level={r.riskLevel} /></td>
                  <td className="text-sm">{r.responseStrategy}</td>
                  <td>{r.owner || '—'}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={e => handleStatusChange(r._id, e.target.value)}
                      style={{ padding:'4px 8px', borderRadius:6, border:'1.5px solid var(--cream-dark)', fontSize:12 }}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-ghost" onClick={() => {
                        setEditItem(r);
                        setForm({ title:r.title, description:r.description||'', category:r.category, likelihood:r.likelihood, impact:r.impact, responseStrategy:r.responseStrategy, mitigationPlan:r.mitigationPlan||'', preventiveAction:r.preventiveAction||'', contingencyAction:r.contingencyAction||'', owner:r.owner||'' });
                        setShowForm(true); setError('');
                      }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-muted" style={{ textAlign:'center', padding:24 }}>No risks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Risk' : 'Add Risk'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Risk Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Database downtime affecting all 5 hospitals" />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Response Strategy</label>
                    <select value={form.responseStrategy} onChange={e => setForm(f => ({ ...f, responseStrategy: e.target.value }))}>
                      {STRATEGIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Likelihood (1–5): {form.likelihood}</label>
                    <input type="range" min="1" max="5" value={form.likelihood} onChange={e => setForm(f => ({ ...f, likelihood: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Impact (1–5): {form.impact}</label>
                    <input type="range" min="1" max="5" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn:'1/-1', padding:'10px 12px', background:'var(--cream)', borderRadius:8, fontWeight:600 }}>
                    Risk Score: {form.likelihood * form.impact} →{' '}
                    <span className={`risk-level-${form.likelihood*form.impact>=20?'Critical':form.likelihood*form.impact>=13?'High':form.likelihood*form.impact>=6?'Medium':'Low'}`}>
                      {form.likelihood*form.impact>=20?'Critical':form.likelihood*form.impact>=13?'High':form.likelihood*form.impact>=6?'Medium':'Low'}
                    </span>
                  </div>
                  <div className="form-group">
                    <label>Owner</label>
                    <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Mitigation Plan</label>
                    <textarea value={form.mitigationPlan} onChange={e => setForm(f => ({ ...f, mitigationPlan: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Preventive Action</label>
                    <textarea value={form.preventiveAction} onChange={e => setForm(f => ({ ...f, preventiveAction: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Contingency Action</label>
                    <textarea value={form.contingencyAction} onChange={e => setForm(f => ({ ...f, contingencyAction: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save' : 'Add Risk'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
