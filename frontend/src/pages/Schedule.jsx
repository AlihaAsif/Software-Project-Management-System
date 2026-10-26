import React, { useEffect, useState } from 'react';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../services/api';

const STATUSES = ['Not Started','In Progress','Completed','Delayed','On Hold'];
const ROLES = ['Project Manager','Backend Developer','Frontend Developer','Database Developer','QA Engineer','Other'];

function Badge({ text }) {
  const cls = {
    'Not Started':'badge-neutral', 'In Progress':'badge-info', 'Completed':'badge-success',
    'Delayed':'badge-danger', 'On Hold':'badge-warning'
  };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = {
  title: '', description: '', assignedTo: '', role: 'Other',
  startDate: '', endDate: '', status: 'Not Started',
  estimatedCost: 0, plannedCost: 0, actualCost: 0, percentComplete: 0
};

export default function Schedule({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState('register');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getActivities(projectId).then(r => setActivities(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    if (!form.startDate) { setError('Start date is required'); return; }
    if (!form.endDate) { setError('End date is required'); return; }
    try {
      const data = {
        ...form,
        project: projectId,
        estimatedCost: Number(form.estimatedCost),
        plannedCost: Number(form.plannedCost),
        actualCost: Number(form.actualCost),
        percentComplete: Number(form.percentComplete),
      };
      if (editItem) {
        await updateActivity(editItem._id, data);
      } else {
        await createActivity(data);
      }
      load();
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to save activity');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this activity?')) return;
    await deleteActivity(id);
    load();
  };

  const filtered = activities.filter(a => !filterStatus || a.status === filterStatus);
  const totalEst = activities.reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const totalAC = activities.reduce((s, a) => s + (a.actualCost || 0), 0);
  const dated = activities.filter(a => a.startDate && a.endDate);
  const timelineStart = dated.length ? Math.min(...dated.map(a => new Date(a.startDate).getTime())) : 0;
  const timelineEnd = dated.length ? Math.max(...dated.map(a => new Date(a.endDate).getTime())) : 0;
  const timelineDays = Math.max(1, Math.ceil((timelineEnd - timelineStart) / 86400000) + 1);
  const tickDays = timelineDays > 180 ? 30 : timelineDays > 84 ? 14 : 7;

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Schedule & Resources</h2>
          <p>{activities.length} activities · Est: PKR {totalEst.toLocaleString()} · Actual: PKR {totalAC.toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError(''); }}>
          + Add Activity
        </button>
      </div>

      <div className="flex gap-8 mb-16" role="tablist" aria-label="Schedule views">
        <button className={`btn ${view === 'register' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('register')}>Activity Register</button>
        <button className={`btn ${view === 'gantt' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('gantt')}>Gantt Chart</button>
      </div>

      {view === 'register' && <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {STATUSES.map(s => (
          <div key={s} className={`stat-card ${s==='Completed'?'green':s==='In Progress'?'info':s==='Delayed'?'danger':s==='On Hold'?'warn':''}`}>
            <div className="stat-card-label">{s}</div>
            <div className="stat-card-value">{activities.filter(a => a.status === s).length}</div>
          </div>
        ))}
      </div>}

      {view === 'gantt' ? <div className="card gantt-card">
        <div className="card-header"><h3>Project Gantt Chart</h3></div>
        <div className="gantt-legend" aria-label="Gantt chart legend">
          <span><i className="gantt-swatch not-started" />Not Started</span>
          <span><i className="gantt-swatch in-progress" />In Progress</span>
          <span><i className="gantt-swatch complete" />Completed</span>
          <span><i className="gantt-swatch delayed" />Delayed / At Risk</span>
          <span><i className="gantt-swatch hold" />On Hold</span>
          <span className="gantt-legend-note"><i className="gantt-progress-key" />Light strip shows progress</span>
        </div>
        {!dated.length ? <div className="card-body text-muted">No dated activities are available for this project yet.</div> : <div className="gantt-scroll">
          <div className="gantt-axis-row"><div className="gantt-label">Activity</div><div className="gantt-track gantt-axis">
            <strong className="gantt-axis-title">Timeline · Dates</strong>
            {Array.from({ length: Math.floor((timelineDays - 1) / tickDays) + 1 }, (_, i) => <span key={i} style={{ left: `${Math.min(100, i * tickDays / timelineDays * 100)}%` }}>{new Date(timelineStart + i * tickDays * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>)}
          </div></div>
          {dated.map(a => {
            const left = ((new Date(a.startDate).getTime() - timelineStart) / 86400000) / timelineDays * 100;
            const width = Math.max(1, (Math.ceil((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 86400000) + 1) / timelineDays * 100);
            const statusClass = a.status === 'Completed' ? 'complete' : a.status === 'Delayed' || a.status === 'At Risk' ? 'delayed' : a.status === 'On Hold' ? 'hold' : a.status === 'Not Started' ? 'not-started' : 'in-progress';
            const deps = (a.dependencies || []).map(d => d.title).filter(Boolean);
            return <div className="gantt-row" key={a._id}>
              <div className="gantt-label"><strong>{a.title}</strong><span>{a.status} · {a.percentComplete || 0}%{deps.length ? ` · Depends on: ${deps.join(', ')}` : ''}</span></div>
              <div className="gantt-track"><div className={`gantt-bar ${statusClass}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} title={`${a.title}: ${new Date(a.startDate).toLocaleDateString()} – ${new Date(a.endDate).toLocaleDateString()}`}><i style={{ width: `${Math.max(0, Math.min(100, a.percentComplete || 0))}%` }} /></div></div>
            </div>;
          })}
        </div>}
      </div> : <div className="card">
        <div className="card-header flex-between">
          <h3>Activity Register</h3>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--cream-dark)', fontSize: 12 }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Assigned To</th><th>Role</th>
                <th>Start</th><th>End</th><th>Progress</th>
                <th>Est. Cost</th><th>Actual Cost</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td>{a.assignedTo || '—'}</td>
                  <td className="text-sm text-muted">{a.role}</td>
                  <td className="text-sm">{a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}</td>
                  <td className="text-sm">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}</td>
                  <td style={{ minWidth: 100 }}>
                    <div className="text-sm mb-4">{a.percentComplete}%</div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${a.percentComplete}%` }} />
                    </div>
                  </td>
                  <td>PKR {(a.estimatedCost || 0).toLocaleString()}</td>
                  <td>{a.actualCost > 0 ? `PKR ${a.actualCost.toLocaleString()}` : '—'}</td>
                  <td><Badge text={a.status} /></td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-outline" onClick={() => {
                        setEditItem(a);
                        setForm({
                          title: a.title, description: a.description || '', assignedTo: a.assignedTo || '',
                          role: a.role, startDate: a.startDate?.slice(0,10) || '', endDate: a.endDate?.slice(0,10) || '',
                          status: a.status, estimatedCost: a.estimatedCost, plannedCost: a.plannedCost,
                          actualCost: a.actualCost, percentComplete: a.percentComplete
                        });
                        setShowForm(true); setError('');
                      }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-muted" style={{ textAlign:'center', padding: 24 }}>No activities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Activity' : 'Add Activity'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>% Complete (0–100)</label>
                    <input type="number" min="0" max="100" value={form.percentComplete} onChange={e => setForm(f => ({ ...f, percentComplete: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Est. Cost / BAC (PKR)</label>
                    <input type="number" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Planned Cost / PV (PKR)</label>
                    <input type="number" value={form.plannedCost} onChange={e => setForm(f => ({ ...f, plannedCost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Actual Cost / AC (PKR)</label>
                    <input type="number" value={form.actualCost} onChange={e => setForm(f => ({ ...f, actualCost: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Activity'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
