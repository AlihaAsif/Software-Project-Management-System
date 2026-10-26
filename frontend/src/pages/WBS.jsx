import React, { useEffect, useState } from 'react';
import { getWBSTree, getProject, createWBSTask, updateWBSTask, updateWBSStatus, deleteWBSTask, getRequirements } from '../services/api';

const WBS_STATUSES = ['Not Started','In Progress','Completed','On Hold'];

function Badge({ text }) {
  const cls = { 'Not Started':'badge-neutral', 'In Progress':'badge-info', 'Completed':'badge-success', 'On Hold':'badge-warning' };
  return <span className={`badge ${cls[text] || 'badge-neutral'}`}>{text}</span>;
}

const emptyForm = { title: '', wbsCode: '', description: '', estimatedHours: 0, requirement: '', parent: '' };

function flattenTree(nodes, depth = 0, output = [], ancestors = []) {
  nodes.forEach(node => {
    output.push({ ...node, depth, ancestors });
    flattenTree(node.children || [], depth + 1, output, [...ancestors, node._id]);
  });
  return output;
}

function numberTree(nodes, parentCode = '', depth = 0) {
  return nodes.map((node, index) => {
    const displayCode = depth === 0
      ? `${index + 1}.0`
      : depth === 1
        ? `${parentCode.split('.')[0]}.${index + 1}`
        : `${parentCode}.${index + 1}`;
    return { ...node, displayCode, children: numberTree(node.children || [], displayCode, depth + 1) };
  });
}

export default function WBS({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [treeNodes, setTreeNodes] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('Project');
  const [expanded, setExpanded] = useState({});
  const [view, setView] = useState('table');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      getWBSTree(projectId),
      getRequirements(projectId),
      getProject(projectId),
    ]).then(([w, r, p]) => {
      const numberedTree = numberTree(w.data);
      const flattened = flattenTree(numberedTree);
      setTreeNodes(numberedTree);
      setTasks(flattened);
      setExpanded(Object.fromEntries(flattened.map(t => [t._id, true])));
      setRequirements(r.data.filter(x => x.approvalStatus === 'Approved'));
      setProjectName(p.data.projectName || 'Project');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim()) { setError('Title is required'); return; }
    if (!form.wbsCode?.trim()) { setError('WBS Code is required'); return; }
    try {
      const data = {
        ...form,
        project: projectId,
        estimatedHours: Number(form.estimatedHours) || 0,
        requirement: form.requirement || undefined,
        parent: form.parent || null,
      };
      if (editingTask) await updateWBSTask(editingTask._id, data);
      else await createWBSTask(data);
      load();
      setShowForm(false);
      setEditingTask(null);
      setForm(emptyForm);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Failed to create WBS task');
    }
  };

  const handleStatusChange = async (id, status) => {
    await updateWBSStatus(id, status);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this WBS task?')) return;
    try {
      await deleteWBSTask(id);
      load();
    } catch (ex) {
      alert(ex.response?.data?.error || 'Cannot delete');
    }
  };

  const startChild = (task) => {
    const siblings = tasks.filter(t => t.ancestors.join('/') === task.ancestors.concat(task._id).join('/'));
    const next = siblings.reduce((n, sibling) => Math.max(n, Number(sibling.displayCode.split('.').at(-1)) || 0), 0) + 1;
    const rootCode = /^\d+\.0$/.test(task.displayCode);
    const childCode = rootCode ? `${task.displayCode.split('.')[0]}.${next}` : `${task.displayCode}.${next}`;
    setForm({ ...emptyForm, parent: task._id, wbsCode: childCode });
    setEditingTask(null); setError(''); setShowForm(true);
  };
  const startEdit = (task) => {
    setEditingTask(task);
    setForm({ title: task.title || '', wbsCode: task.displayCode || task.wbsCode || '', description: task.description || '', estimatedHours: task.estimatedHours || 0, requirement: task.requirement?._id || '', parent: task.parent ? String(task.parent) : '' });
    setError(''); setShowForm(true);
  };

  const startRoot = () => {
    const next = tasks.filter(t => t.depth === 0).reduce((n, task) => Math.max(n, Number.parseInt(task.displayCode, 10) || 0), 0) + 1;
    setEditingTask(null); setForm({ ...emptyForm, wbsCode: `${next}.0` }); setError(''); setShowForm(true);
  };

  const renderDiagramNode = (node, depth = 0) => <li className="wbs-diagram-item" key={node._id}>
    <article className="wbs-diagram-box">
      <span className="wbs-diagram-code">{node.displayCode}</span>
      <strong>{node.title}</strong>
      <small>{depth === 0 ? 'Deliverable' : depth === 1 ? 'Sub-deliverable' : 'Work Package / Activity'}</small>
      {node.description && <small>{node.description}</small>}
      <div className="wbs-diagram-meta"><span>{node.estimatedHours || 0} hrs</span><span>{node.status}</span></div>
      <select aria-label={`Status for ${node.title}`} value={node.status} onChange={e => handleStatusChange(node._id, e.target.value)}>
        {WBS_STATUSES.map(status => <option key={status}>{status}</option>)}
      </select>
      <div className="wbs-diagram-actions">
        <button className="btn btn-sm btn-outline" onClick={() => startEdit(node)}>Edit</button>
        <button className="btn btn-sm btn-outline" onClick={() => startChild(node)}>Add Child</button>
        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(node._id)}>Delete</button>
        {node.children?.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(x => ({ ...x, [node._id]: x[node._id] === false }))}>{expanded[node._id] === false ? 'Expand' : 'Collapse'}</button>}
      </div>
    </article>
    {node.children?.length > 0 && expanded[node._id] !== false && <ul>{node.children.map(child => renderDiagramNode(child, depth + 1))}</ul>}
  </li>;

  if (!projectId) return <div className="empty-state"><p>Select a project first.</p></div>;
  if (loading) return <div className="loading-center"><div className="spinner" />Loading...</div>;

  const totalHours = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
  const completed = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Work Breakdown Structure</h2>
          <p>{projectName} · {tasks.length} work items · {completed} completed · {totalHours} estimated hours</p>
        </div>
        <button className="btn btn-primary" onClick={startRoot}>
          + Add WBS Task
        </button>
      </div>

      <div className="stat-grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {WBS_STATUSES.map(s => (
          <div key={s} className={`stat-card ${s==='Completed'?'green':s==='In Progress'?'info':s==='On Hold'?'warn':''}`}>
            <div className="stat-card-label">{s}</div>
            <div className="stat-card-value">{tasks.filter(t => t.status === s).length}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-8 mb-16" role="tablist" aria-label="WBS views">
        {view === 'table'
          ? <button className="btn btn-outline" onClick={() => setView('hierarchy')}>View Hierarchy</button>
          : <button className="btn btn-outline" onClick={() => setView('table')}>Back to Table</button>}
      </div>

      {view === 'table' ? <div className="card">
        <div className="card-header"><h3>WBS Deliverables</h3></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Deliverable</th><th>Requirement</th><th>Estimated Hours</th><th>Status</th><th>Section</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.map(task => <tr key={task._id}>
                <td><strong>{task.title}</strong>{task.description && <div className="text-muted text-sm">{task.description}</div>}</td>
                <td className="text-muted text-sm">{task.requirement?.title || '—'}</td>
                <td>{task.estimatedHours || 0}</td>
                <td><select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid var(--cream-dark)', fontSize: 12 }}>{WBS_STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td><span className="badge badge-info">{task.displayCode}</span></td>
                <td><button className="btn btn-sm btn-outline" onClick={() => startEdit(task)}>Edit</button>{' '}<button className="btn btn-sm btn-outline" onClick={() => startChild(task)}>Add Child</button>{' '}<button className="btn btn-sm btn-danger" onClick={() => handleDelete(task._id)}>Delete</button></td>
              </tr>)}
              {!tasks.length && <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>No WBS items yet. Add a root deliverable to begin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div> : <div className="card wbs-diagram-card">
        <div className="card-header"><h3>{projectName} Work Breakdown Structure</h3></div>
        {treeNodes.length ? <div className="wbs-diagram-scroll"><ul className="wbs-diagram-root"><li>
          <article className="wbs-diagram-box wbs-project-box"><strong>PROJECT</strong><span>{projectName}</span></article>
          <ul>{treeNodes.map(node => renderDiagramNode(node))}</ul>
        </li></ul></div> : <div className="card-body text-muted">No deliverables yet. Add a root deliverable to start the hierarchy.</div>}
      </div>}

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditingTask(null); } }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingTask ? 'Edit WBS Item' : 'Add WBS Task'}</h3>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingTask(null); }}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-16">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>WBS Code *</label>
                    <input value={form.wbsCode} onChange={e => setForm(f => ({ ...f, wbsCode: e.target.value }))} placeholder="1.1.1" />
                  </div>
                  <div className="form-group">
                    <label>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Appointment Module" />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Hours</label>
                    <input type="number" min="0" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Parent Task (optional)</label>
                    <select value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
                      <option value="">— No parent —</option>
                      {tasks.map(t => <option key={t._id} value={t._id}>{t.wbsCode} — {t.title}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Link to Requirement</label>
                    <select value={form.requirement} onChange={e => setForm(f => ({ ...f, requirement: e.target.value }))}>
                      <option value="">— None —</option>
                      {requirements.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingTask(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingTask ? 'Save Changes' : 'Add Task'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
