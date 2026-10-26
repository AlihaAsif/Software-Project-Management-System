import React, { useEffect, useState } from 'react';
import {
  getChangeRequests, createChangeRequest, updateChangeRequest,
  approveChangeRequest, rejectChangeRequest
} from '../services/api';
import { Info, GitPullRequest } from 'lucide-react';

const SCOPE_IMPACTS = ['None','Minor','Major'];

function Badge({ text }) {
  const cls = {
    Pending:'badge-warning', 'Under Review':'badge-info',
    Approved:'badge-success', Rejected:'badge-danger',
    None:'badge-neutral', Minor:'badge-warning', Major:'badge-danger'
  };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = {
  title:'', description:'', justification:'',
  estimatedCostImpact: 800000, estimatedTimeImpactWeeks: 3,
  scopeImpact:'None'
};

export default function ChangeRequests({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getChangeRequests(projectId).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    if (!form.description?.trim()) { setError('Description is required'); return; }
    try {
      await createChangeRequest({
        ...form,
        project: projectId,
        estimatedCostImpact: Number(form.estimatedCostImpact),
        estimatedTimeImpactWeeks: Number(form.estimatedTimeImpactWeeks),
      });
      load();
      setShowForm(false);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to create change request');
    }
  };

  const handleApprove = async (id) => {
    const by = prompt('Approved by (name):');
    if (by == null) return;
    try {
      await approveChangeRequest(id, by);
      load();
    } catch (ex) { alert(ex.response?.data?.error); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason == null) return;
    const by = prompt('Reviewed by (name):') || 'Project Manager';
    try {
      await rejectChangeRequest(id, reason, by);
      load();
    } catch (ex) { alert(ex.response?.data?.error); }
  };

  const handleUnderReview = async (cr) => {
    try {
      await updateChangeRequest(cr._id, { status: 'Under Review' });
      load();
    } catch {}
  };

  const filtered = items.filter(i => !filterStatus || i.status === filterStatus);
  const totalCostImpact = items.filter(i => i.status === 'Pending' || i.status === 'Under Review')
    .reduce((s, cr) => s + (cr.estimatedCostImpact || 0), 0);

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Change Requests</h2>
          <p>{items.length} total · Pending cost impact: PKR {totalCostImpact.toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setForm(emptyForm); setError(''); }}>
          + New Change Request
        </button>
      </div>

      <div className="alert alert-info mb-24 flex-gap-8">
        <Info size={15} style={{ flexShrink: 0 }} />
        <span><strong>Scope Integrity Rule:</strong> Pending change requests do NOT modify the approved PKR 5,000,000 baseline or 16-week schedule until formally Approved.</span>
      </div>

      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {['Pending','Under Review','Approved','Rejected'].map(s => (
          <div key={s} className={`stat-card ${s==='Approved'?'green':s==='Rejected'?'danger':s==='Under Review'?'info':'warn'}`}>
            <div className="stat-card-label">{s}</div>
            <div className="stat-card-value">{items.filter(i => i.status === s).length}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <h3>Change Request Register</h3>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--cream-dark)', fontSize: 12 }}>
            <option value="">All Statuses</option>
            <option>Pending</option><option>Under Review</option><option>Approved</option><option>Rejected</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Description</th><th>Cost Impact</th>
                <th>Time Impact</th><th>Scope Impact</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cr => (
                <tr key={cr._id}>
                  <td style={{ fontWeight: 600, minWidth: 160 }}>{cr.title}</td>
                  <td className="text-sm" style={{ maxWidth: 200 }}>{cr.description}</td>
                  <td style={{ fontWeight: 600 }}>PKR {(cr.estimatedCostImpact || 0).toLocaleString()}</td>
                  <td>{cr.estimatedTimeImpactWeeks} week(s)</td>
                  <td><Badge text={cr.scopeImpact} /></td>
                  <td><Badge text={cr.status} /></td>
                  <td>
                    <div className="flex gap-8">
                      {cr.status === 'Pending' && (
                        <button className="btn btn-sm btn-outline" onClick={() => handleUnderReview(cr)}>Review</button>
                      )}
                      {(cr.status === 'Pending' || cr.status === 'Under Review') && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApprove(cr._id)}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(cr._id)}>Reject</button>
                        </>
                      )}
                      {cr.rejectionReason && (
                        <span className="text-sm text-muted inline-flex" title={cr.rejectionReason}><Info size={14} /></span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-muted" style={{ textAlign:'center', padding: 24 }}>No change requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>New Change Request</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI-based preliminary diagnosis + Mobile App" />
                  </div>
                  <div className="form-group full">
                    <label>Description *</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Justification</label>
                    <textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Cost Impact (PKR)</label>
                    <input type="number" value={form.estimatedCostImpact} onChange={e => setForm(f => ({ ...f, estimatedCostImpact: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Time Impact (weeks)</label>
                    <input type="number" value={form.estimatedTimeImpactWeeks} onChange={e => setForm(f => ({ ...f, estimatedTimeImpactWeeks: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Scope Impact</label>
                    <select value={form.scopeImpact} onChange={e => setForm(f => ({ ...f, scopeImpact: e.target.value }))}>
                      {SCOPE_IMPACTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit CR</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
