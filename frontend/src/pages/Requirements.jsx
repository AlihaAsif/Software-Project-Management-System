import React, { useEffect, useState } from 'react';
import { getRequirements, createRequirement, updateRequirement, approveRequirement, rejectRequirement } from '../services/api';

const TYPES = ['Functional','Non-Functional','Technical','Business'];
const PRIORITIES = ['Low','Medium','High','Critical'];

function Badge({ text }) {
  const cls = {
    Approved: 'badge-success', Pending: 'badge-warning', Rejected: 'badge-danger',
    Critical: 'badge-danger', High: 'badge-warning', Medium: 'badge-gold', Low: 'badge-success',
    Functional: 'badge-info', 'Non-Functional': 'badge-neutral', Technical: 'badge-green', Business: 'badge-gold',
  };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = { title: '', description: '', type: 'Functional', priority: 'Medium' };

export default function Requirements({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getRequirements(projectId).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    try {
      if (editItem) {
        await updateRequirement(editItem._id, form);
      } else {
        await createRequirement({ ...form, project: projectId });
      }
      load();
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to save requirement');
    }
  };

  const handleApprove = async (id) => {
    await approveRequirement(id, 'Project Manager');
    load();
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason == null) return;
    await rejectRequirement(id, reason);
    load();
  };

  const filtered = items.filter(i =>
    (!filterStatus || i.approvalStatus === filterStatus) &&
    (!filterType || i.type === filterType)
  );

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  const approved = items.filter(i => i.approvalStatus === 'Approved').length;
  const pending = items.filter(i => i.approvalStatus === 'Pending').length;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Requirements</h2>
          <p>{items.length} total · {approved} approved · {pending} pending</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError(''); }}>
          + Add Requirement
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card green"><div className="stat-card-label">Approved</div><div className="stat-card-value">{approved}</div></div>
        <div className="stat-card warn"><div className="stat-card-label">Pending</div><div className="stat-card-value">{pending}</div></div>
        <div className="stat-card danger"><div className="stat-card-label">Rejected</div><div className="stat-card-value">{items.filter(i => i.approvalStatus === 'Rejected').length}</div></div>
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <h3>Requirements Register</h3>
          <div className="flex gap-8">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--cream-dark)', fontSize: 12 }}>
              <option value="">All Statuses</option>
              <option>Pending</option><option>Approved</option><option>Rejected</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--cream-dark)', fontSize: 12 }}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item._id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.description && <div className="text-muted text-sm">{item.description}</div>}
                  </td>
                  <td><Badge text={item.type} /></td>
                  <td><Badge text={item.priority} /></td>
                  <td><Badge text={item.approvalStatus} /></td>
                  <td>
                    <div className="flex gap-8">
                      {item.approvalStatus === 'Pending' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApprove(item._id)}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(item._id)}>Reject</button>
                        </>
                      )}
                      {item.approvalStatus !== 'Approved' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => { setEditItem(item); setForm({ title: item.title, description: item.description, type: item.type, priority: item.priority }); setShowForm(true); setError(''); }}>Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No requirements found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? 'Edit Requirement' : 'Add Requirement'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Appointment scheduling module" />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Requirement'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
