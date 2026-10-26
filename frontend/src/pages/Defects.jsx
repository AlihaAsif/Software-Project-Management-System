import React, { useEffect, useState } from 'react';
import { getDefects, createDefect, updateDefect, deleteDefect } from '../services/api';
import { AlertOctagon, Bug } from 'lucide-react';

const SEVERITIES = ['Critical','High','Medium','Low'];
const STATUSES   = ['Open','In Progress','Resolved','Closed'];
const MODULES    = ['Appointment Scheduling','Patient Record Management','Lab Reports','Doctor Schedules','Online Consultations','Billing','Other'];

function Badge({ text }) {
  const cls = {
    Critical:'badge-danger', High:'badge-warning', Medium:'badge-gold', Low:'badge-success',
    Open:'badge-danger', 'In Progress':'badge-info', Resolved:'badge-success', Closed:'badge-neutral'
  };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = {
  title:'', description:'', relatedModule:'Appointment Scheduling',
  severity:'Critical', status:'Open', assignedTo:'', resolutionNotes:''
};

export default function Defects({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [filterSev, setFilterSev] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getDefects(projectId).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    try {
      const data = { ...form, project: projectId };
      if (editItem) {
        await updateDefect(editItem._id, data);
      } else {
        await createDefect(data);
      }
      load();
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to save defect');
    }
  };

  const handleStatusChange = async (id, status) => {
    await updateDefect(id, { status });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this defect?')) return;
    await deleteDefect(id);
    load();
  };

  const filtered = items.filter(i =>
    (!filterSev || i.severity === filterSev) &&
    (!filterStatus || i.status === filterStatus)
  );

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  const bySev = { Critical:0, High:0, Medium:0, Low:0 };
  items.forEach(i => { if (bySev[i.severity] !== undefined) bySev[i.severity]++; });
  const openCritical = items.filter(i => i.severity === 'Critical' && !['Resolved','Closed'].includes(i.status)).length;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Defect Tracking</h2>
          <p>{items.length} total · {openCritical} unresolved critical defects</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError(''); }}>
          + Report Defect
        </button>
      </div>

      {openCritical > 0 && (
        <div className="alert alert-danger mb-16 flex-gap-8">
          <AlertOctagon size={16} style={{ flexShrink: 0 }} />
          <span><strong>{openCritical} critical defect(s) are unresolved</strong> — immediate action required in Appointment Scheduling and Patient Record Management modules.</span>
        </div>
      )}

      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {SEVERITIES.map(s => (
          <div key={s} className={`stat-card ${s==='Critical'?'danger':s==='High'?'warn':s==='Medium'?'gold':'green'}`}>
            <div className="stat-card-label">{s}</div>
            <div className="stat-card-value">{bySev[s]}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <h3>Defect Register</h3>
          <div className="flex gap-8">
            <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ padding:'5px 8px', borderRadius:6, border:'1.5px solid var(--cream-dark)', fontSize:12 }}>
              <option value="">All Severities</option>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding:'5px 8px', borderRadius:6, border:'1.5px solid var(--cream-dark)', fontSize:12 }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Title</th><th>Module</th><th>Severity</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d._id} style={{ background: d.severity === 'Critical' && d.status === 'Open' ? '#fff5f5' : '' }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.title}</div>
                    {d.description && <div className="text-muted text-sm">{d.description}</div>}
                  </td>
                  <td className="text-sm">{d.relatedModule || '—'}</td>
                  <td><Badge text={d.severity} /></td>
                  <td>
                    <select
                      value={d.status}
                      onChange={e => handleStatusChange(d._id, e.target.value)}
                      style={{ padding:'4px 8px', borderRadius:6, border:'1.5px solid var(--cream-dark)', fontSize:12 }}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{d.assignedTo || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-ghost" onClick={() => {
                        setEditItem(d);
                        setForm({ title:d.title, description:d.description||'', relatedModule:d.relatedModule||'', severity:d.severity, status:d.status, assignedTo:d.assignedTo||'', resolutionNotes:d.resolutionNotes||'' });
                        setShowForm(true); setError('');
                      }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-muted" style={{ textAlign:'center', padding:24 }}>No defects found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? 'Edit Defect' : 'Report Defect'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Appointment booking fails for concurrent users" />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Related Module</label>
                    <select value={form.relatedModule} onChange={e => setForm(f => ({ ...f, relatedModule: e.target.value }))}>
                      {MODULES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity *</label>
                    <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                      {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Resolution Notes</label>
                    <textarea value={form.resolutionNotes} onChange={e => setForm(f => ({ ...f, resolutionNotes: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save' : 'Report Defect'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
