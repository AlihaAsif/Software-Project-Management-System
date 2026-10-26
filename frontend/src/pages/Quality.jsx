import React, { useEffect, useState } from 'react';
import { getQualityChecks, createQualityCheck, updateQualityCheck, deleteQualityCheck } from '../services/api';

function Badge({ text }) {
  const cls = { Passed:'badge-success', Failed:'badge-danger', Pending:'badge-warning' };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = { title: '', relatedModule: '', notes: '', checkedBy: '', result: 'Pending' };

export default function Quality({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    getQualityChecks(projectId).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    try {
      const data = { ...form, project: projectId };
      if (editItem) {
        await updateQualityCheck(editItem._id, data);
      } else {
        await createQualityCheck(data);
      }
      load();
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quality check?')) return;
    await deleteQualityCheck(id);
    load();
  };

  const handleResultUpdate = async (id, result, checkedBy) => {
    await updateQualityCheck(id, { result, checkedBy, checkedAt: result !== 'Pending' ? new Date() : null });
    load();
  };

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  const passed = items.filter(i => i.result === 'Passed').length;
  const failed = items.filter(i => i.result === 'Failed').length;
  const evaluated = passed + failed;
  const passRate = evaluated > 0 ? ((passed / evaluated) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Quality & Testing</h2>
          <p>{items.length} inspections · Pass rate: {passRate}%</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError(''); }}>
          + Add Inspection
        </button>
      </div>

      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card green"><div className="stat-card-label">Passed</div><div className="stat-card-value">{passed}</div></div>
        <div className="stat-card danger"><div className="stat-card-label">Failed</div><div className="stat-card-value">{failed}</div></div>
        <div className="stat-card warn"><div className="stat-card-label">Pending</div><div className="stat-card-value">{items.filter(i => i.result === 'Pending').length}</div></div>
        <div className="stat-card gold">
          <div className="stat-card-label">Pass Rate</div>
          <div className="stat-card-value">{passRate}%</div>
        </div>
      </div>

      {/* Pass rate bar */}
      <div className="card mb-24">
        <div className="card-body">
          <div className="flex-between mb-8">
            <span className="text-sm">Quality Pass Rate</span>
            <span className="text-sm font-bold">{passed} / {evaluated} evaluated</span>
          </div>
          <div className="progress-bar-wrap" style={{ height: 12 }}>
            <div className="progress-bar-fill" style={{ width: `${passRate}%`, background: passRate >= 80 ? 'var(--success)' : passRate >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Quality Inspections</h3></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Title</th><th>Module</th><th>Result</th><th>Checked By</th><th>Notes</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td className="text-muted text-sm">{item.relatedModule || '—'}</td>
                  <td><Badge text={item.result} /></td>
                  <td>{item.checkedBy || '—'}</td>
                  <td className="text-muted text-sm" style={{ maxWidth: 200 }}>{item.notes || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      {item.result === 'Pending' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleResultUpdate(item._id, 'Passed', item.checkedBy || 'QA Engineer')}>Pass</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleResultUpdate(item._id, 'Failed', item.checkedBy || 'QA Engineer')}>Fail</button>
                        </>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => {
                        setEditItem(item);
                        setForm({ title: item.title, relatedModule: item.relatedModule || '', notes: item.notes || '', checkedBy: item.checkedBy || '', result: item.result });
                        setShowForm(true); setError('');
                      }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-muted" style={{ textAlign:'center', padding: 24 }}>No quality checks yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? 'Edit Inspection' : 'Add Quality Inspection'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Inspection Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Appointment Scheduling Module QA" />
                  </div>
                  <div className="form-group">
                    <label>Related Module</label>
                    <input value={form.relatedModule} onChange={e => setForm(f => ({ ...f, relatedModule: e.target.value }))} placeholder="Appointment Scheduling" />
                  </div>
                  <div className="form-group">
                    <label>Checked By</label>
                    <input value={form.checkedBy} onChange={e => setForm(f => ({ ...f, checkedBy: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Result</label>
                    <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
                      <option>Pending</option><option>Passed</option><option>Failed</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Save' : 'Add Inspection'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
