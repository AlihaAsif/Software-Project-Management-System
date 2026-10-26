import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProject, createProject as createProjectRequest, updateProject, getDefects } from '../services/api';
import { Pencil } from 'lucide-react';

const STATUS = [
  'Initiation',
  'Planning',
  'Execution',
  'Monitoring',
  'Closing',
  'Closed',
  'In Progress',
  'Planned',
  'On Hold',
  'Completed',
  'Cancelled'
];
const SECTIONS = ['Project Charter', 'Scope & Boundaries', 'Project Management Plan', 'Project Status & Milestones', 'Project Closure'];
const copy = value => JSON.parse(JSON.stringify(value || {}));
const dateValue = value => value ? String(value).slice(0, 10) : '';

function Field({ label, value, onChange, type = 'text', textarea = false, required = false, className = '', ...props }) {
  return (
    <div className={`form-group ${className}`}>
      <label>
        {label}
        {required && <span className="text-danger" style={{ marginLeft: 3 }}>*</span>}
      </label>
      {textarea ? (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          required={required}
          rows={3}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(type === 'number' ? e.target.value : e.target.value)}
          required={required}
          {...props}
        />
      )}
    </div>
  );
}

function Actions({ editing, onEdit, onCancel, onSave, busy }) {
  return (
    <div className="flex-gap-8">
      {editing ? (
        <>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      ) : (
        <button className="btn btn-outline btn-sm" type="button" onClick={onEdit}>
          <Pencil size={13} strokeWidth={2.2} /> Edit Section
        </button>
      )}
    </div>
  );
}

function ListEditor({ title, items = [], onChange, placeholder = 'Add an item...' }) {
  const [draft, setDraft] = useState('');
  const handleAdd = () => {
    if (draft.trim()) {
      onChange([...items, draft.trim()]);
      setDraft('');
    }
  };

  return (
    <div className="init-card-sub mb-12">
      <div className="flex-between mb-8">
        <label className="font-600 text-sm">{title}</label>
        <span className="text-xs text-muted">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </div>
      <div className="flex-gap-8 mb-10">
        <input
          style={{ flex: 1 }}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button className="btn btn-primary btn-sm" type="button" onClick={handleAdd}>
          + Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-xs">No items added yet.</p>
      ) : (
        <div className="scope-badge-list">
          {items.map((item, i) => (
            <span key={`${item}-${i}`} className="scope-badge in-scope">
              <span>{item}</span>
              <button
                className="remove-tag-btn"
                type="button"
                title={`Delete "${item}"`}
                onClick={() => {
                  if (window.confirm(`Delete "${item}"?`)) {
                    onChange(items.filter((_, n) => n !== i));
                  }
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordEditor({ title, items = [], fields, onChange, addLabel = 'Add', empty = 'No records added.' }) {
  const blank = () => Object.fromEntries(fields.map(f => [f.key, '']));
  const [draft, setDraft] = useState(null);
  const [editIndex, setEditIndex] = useState(-1);

  const save = () => {
    if (!draft) return;
    const saved = { ...draft };
    if (saved.status === 'Completed' && title === 'Milestones') {
      saved.completed = true;
      saved.actualCompletionDate = saved.actualCompletionDate || new Date().toISOString().slice(0, 10);
    }
    const next = [...items];
    if (editIndex < 0) next.push(saved);
    else next[editIndex] = saved;
    onChange(next);
    setDraft(null);
    setEditIndex(-1);
  };

  const start = (item, index) => {
    setDraft(copy(item));
    setEditIndex(index);
  };

  return (
    <div className="init-card-sub mb-16">
      <div className="flex-between mb-12">
        <div className="flex-gap-8">
          <label className="font-600 text-sm">{title}</label>
          <span className="badge badge-neutral text-xs">{items.length} records</span>
        </div>
        {!draft && (
          <button className="btn btn-outline btn-xs" type="button" onClick={() => { setDraft(blank()); setEditIndex(-1); }}>
            + {addLabel}
          </button>
        )}
      </div>

      {draft && (
        <div className="record-editor-card mb-16">
          <div className="record-editor-header mb-12">
            <span className="font-600 text-xs text-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {editIndex >= 0 ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}
            </span>
            <button className="btn-close-sm" type="button" onClick={() => setDraft(null)}>×</button>
          </div>
          <div className="form-grid compact-grid">
            {fields.map(f => (
              <Field
                key={f.key}
                label={f.label}
                value={draft[f.key] ?? ''}
                type={f.type || 'text'}
                textarea={f.textarea}
                onChange={v => setDraft({ ...draft, [f.key]: v })}
              />
            ))}
          </div>
          <div className="form-actions mt-12 pt-8">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={save}>
              Save item
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-muted text-xs">{empty}</p>
      ) : (
        <div className="table-wrapper compact-table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                {fields.map(f => <th key={f.key}>{f.label}</th>)}
                <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item._id || i}>
                  {fields.map(f => <td key={f.key}>{item[f.key] || '—'}</td>)}
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-ghost btn-xs" type="button" onClick={() => start(item, i)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-danger"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete this ${title.toLowerCase()} record?`)) {
                            onChange(items.filter((_, n) => n !== i));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getSectionSummary(key, proj) {
  if (!proj) return '';
  switch (key) {
    case 'Project Charter': {
      const pm = proj.charter?.projectManager || 'PM not assigned';
      const budget = proj.budget?.total ? `PKR ${Number(proj.budget.total).toLocaleString()}` : 'Budget unset';
      const st = proj.status || 'Planned';
      return `${pm} · ${budget} · Status: ${st}`;
    }
    case 'Scope & Boundaries': {
      const inc = (proj.scopeIncluded || []).length;
      const exc = (proj.scopeExcluded || []).length;
      const prop = (proj.scopeDetails?.proposedChanges || []).length;
      return `${inc} in-scope · ${exc} out-of-scope · ${prop} proposed changes`;
    }
    case 'Project Management Plan': {
      const wks = proj.deadline?.durationWeeks || 16;
      return `Scope, Schedule (${wks} wks), Cost & Quality plans configured`;
    }
    case 'Project Status & Milestones': {
      const miles = proj.milestones || [];
      const done = miles.filter(m => m.status === 'Completed' || m.completed).length;
      const team = (proj.teamResponsibilities || []).length;
      return `${done}/${miles.length} milestones completed · ${team} team members`;
    }
    case 'Project Closure': {
      if (proj.closure?.isClosed) {
        return `Closed · Actual Cost: PKR ${Number(proj.closure.actualTotalCost || 0).toLocaleString()} · Sign-off: ${proj.closure.signedOffBy || 'Done'}`;
      }
      return `Pending closure · Current Status: ${proj.status || 'Active'}`;
    }
    default:
      return '';
  }
}

export default function ProjectOverview({ projectId, onProjectChange, projects: sharedProjects = [], onProjectsChange = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState(sharedProjects);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [closureWarnings, setClosureWarnings] = useState([]);
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [openSection, setOpenSection] = useState(SECTIONS[0]);
  const [create, setCreate] = useState({ projectName: '', budget: '', startDate: '', endDate: '', description: '', projectManager: '' });

  const load = async id => {
    if (!id) {
      setProject(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getProject(id);
      setProject(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProjects(sharedProjects);
    load(projectId);
    if (searchParams.get('new') === '1') {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [projectId, sharedProjects]);

  const begin = async key => {
    setError('');
    setNotice('');
    const next = copy(project);
    if (key === 'Scope & Boundaries' && project.projectName?.toLowerCase().includes('smart healthcare')) {
      next.scopeIncluded = next.scopeIncluded?.length
        ? next.scopeIncluded
        : ['Patient appointments', 'Laboratory reports', 'Doctor schedules', 'Online consultations', 'Hospital billing'];
      next.scopeDetails = next.scopeDetails || {};
      next.scopeDetails.proposedChanges = next.scopeDetails.proposedChanges?.length
        ? next.scopeDetails.proposedChanges
        : ['AI preliminary diagnosis (proposed; pending approval)', 'Mobile application (proposed; pending approval)'];
    }
    if (key === 'Project Closure') {
      const warnings = [];
      if ((project.milestones || []).some(m => m.status !== 'Completed' && !m.completed)) {
        warnings.push('Some project milestones are incomplete.');
      }
      try {
        const { data } = await getDefects(projectId);
        if (data.some(d => d.severity === 'Critical' && !['Resolved', 'Closed'].includes(d.status))) {
          warnings.push('Critical unresolved defects remain.');
        }
      } catch {
        warnings.push('Unable to check unresolved defects right now.');
      }
      setClosureWarnings(warnings);
    } else {
      setClosureWarnings([]);
    }
    setDraft(next);
    setEditing(key);
  };

  const save = async key => {
    setError('');
    setNotice('');
    try {
      const data = copy(draft);
      if (key === 'Project Charter') {
        data.budget.total = Number(data.budget?.total || 0);
        if (!data.projectName?.trim()) throw Error('Project name is required');
        if (data.budget.total < 0) throw Error('Budget cannot be negative');
        if (data.deadline?.startDate && data.deadline?.endDate && new Date(data.deadline.startDate) > new Date(data.deadline.endDate)) {
          throw Error('Completion date must be on or after the start date');
        }
      }
      if (key === 'Project Management Plan') {
        const s = data.deadline?.startDate;
        const e = data.deadline?.endDate;
        data.deadline.durationWeeks = s && e
          ? Math.max(1, Math.ceil((new Date(e) - new Date(s)) / 604800000))
          : data.deadline?.durationWeeks;
      }
      if (key === 'Project Closure') {
        const cost = Number(data.closure?.actualTotalCost || 0);
        if (cost < 0) throw Error('Actual cost cannot be negative');
        data.closure.actualTotalCost = cost;
        data.closure.budgetVariance = cost - Number(data.budget?.total || 0);
        data.closure.isClosed = true;
        data.closure.closedAt = data.closure.closureDate || new Date();
        data.status = data.closure.finalStatus || 'Completed';
      }

      const { data: saved } = await updateProject(projectId, data);
      setProject(saved);
      const next = sharedProjects.map(p => p._id === saved._id ? saved : p);
      setProjects(next);
      onProjectsChange(next);
      setEditing('');
      setDraft(null);
      setNotice(`${key} saved successfully.`);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Unable to save changes');
    }
  };

  const createProjectHandler = async e => {
    e.preventDefault();
    setError('');
    if (!create.projectName.trim()) return setError('Project name is required');
    if (Number(create.budget) < 0) return setError('Budget cannot be negative');
    if (create.startDate && create.endDate && new Date(create.startDate) > new Date(create.endDate)) {
      return setError('Deadline must be on or after start date');
    }
    const isSmart = create.projectName.toLowerCase().includes('smart healthcare');
    try {
      const { data } = await createProjectRequest({
        projectName: create.projectName,
        charter: {
          purpose: create.description,
          description: create.description,
          projectManager: create.projectManager
        },
        budget: {
          total: Number(create.budget || 0),
          currency: 'PKR'
        },
        deadline: {
          startDate: create.startDate || undefined,
          endDate: create.endDate || undefined,
          durationWeeks: create.startDate && create.endDate
            ? Math.max(1, Math.ceil((new Date(create.endDate) - new Date(create.startDate)) / 604800000))
            : undefined
        },
        status: 'Planned',
        ...(isSmart ? {
          scopeIncluded: ['Patient appointments', 'Laboratory reports', 'Doctor schedules', 'Online consultations', 'Hospital billing'],
          scopeDetails: {
            proposedChanges: ['AI preliminary diagnosis (proposed; pending approval)', 'Mobile application (proposed; pending approval)']
          }
        } : {})
      });
      const next = [data, ...sharedProjects];
      onProjectsChange(next);
      setProjects(next);
      onProjectChange(data._id);
      setShowCreate(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to create project');
    }
  };

  const patch = (path, value) => {
    const keys = path.split('.');
    setDraft(prev => {
      const next = copy(prev);
      let node = next;
      for (const key of keys.slice(0, -1)) {
        node = node[key] ??= {};
      }
      node[keys.at(-1)] = value;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        Loading project records…
      </div>
    );
  }

  const current = editing ? draft : project;
  const editable = key => editing === key;

  const val = path => path.split('.').reduce((x, k) => x?.[k], current) ?? '';
  const field = (label, path, opts = {}) => (
    <Field key={path} label={label} value={val(path)} onChange={v => patch(path, v)} {...opts} />
  );

  const section = (key, title, children) => {
    const isOpen = openSection === key;
    const isEditing = editable(key);
    const index = SECTIONS.indexOf(key);
    const descriptions = [
      'Project overview, goals, stakeholders and approved budget',
      'Approved boundaries and proposed changes',
      'Scope, schedule, cost and quality approaches',
      'Project ownership and delivery milestones',
      'Final outcomes, costs and sign-off'
    ];

    return (
      <section
        className={`initiation-section ${isOpen ? 'is-open' : ''}`}
        id={`section-${index + 1}`}
        key={key}
      >
        <div className="card-header flex-between">
          <button
            className="init-section-toggle"
            type="button"
            aria-expanded={isOpen}
            onClick={() => setOpenSection(isOpen ? '' : key)}
          >
            <span className="init-section-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="init-section-heading">
              <h3>{title}</h3>
              {isOpen ? (
                <small className="text-muted">{descriptions[index]}</small>
              ) : (
                <span className="init-section-summary">
                  {getSectionSummary(key, project) || descriptions[index]}
                </span>
              )}
            </span>
            <span className="init-section-chevron">{isOpen ? '−' : '+'}</span>
          </button>

          <Actions
            editing={isEditing}
            onEdit={e => {
              e?.stopPropagation?.();
              setOpenSection(key);
              begin(key);
            }}
            onCancel={() => {
              setEditing('');
              setDraft(null);
            }}
            onSave={() => save(key)}
            busy={false}
          />
        </div>

        {isOpen && (
          <div className="card-body">
            {children}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="project-initiation">
      <div className="page-header flex-between mb-16">
        <div>
          <p className="init-eyebrow">PROJECT LIFECYCLE & INTEGRATION</p>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-dark)', margin: '0 0 4px 0' }}>
            Project Initiation
          </h2>
          <p className="text-muted text-sm">
            Charter, scope boundaries, management plans, milestones, and project closure in one unified view.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setShowCreate(true); }}>
          + New Project
        </button>
      </div>

      {!!error && <div className="alert alert-danger mb-16">{error}</div>}
      {!!notice && <div className="alert alert-success mb-16">{notice}</div>}

      {/* All Projects Table */}
      <div className="card mb-16">
        <div className="card-header flex-between">
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>All Projects</h3>
            <span className="text-muted text-xs">Select a project to load and manage its initiation records</span>
          </div>
          <span className="badge badge-neutral">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
        </div>
        <div className="table-wrapper compact-table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Approved Budget</th>
                <th>Deadline</th>
                <th>Project Manager</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const isSelected = p._id === projectId;
                return (
                  <tr key={p._id} className={isSelected ? 'active-row' : ''}>
                    <td>
                      <strong style={{ color: isSelected ? 'var(--primary)' : 'inherit' }}>
                        {isSelected ? '● ' : ''}{p.projectName}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'In Progress' ? 'badge-success' : p.status === 'Completed' ? 'badge-green' : 'badge-info'}`}>
                        {p.status || 'Planned'}
                      </span>
                    </td>
                    <td>PKR {Number(p.budget?.total || 0).toLocaleString()}</td>
                    <td>{p.deadline?.endDate ? new Date(p.deadline.endDate).toLocaleDateString() : '—'}</td>
                    <td>{p.charter?.projectManager || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isSelected ? (
                        <span className="badge badge-success">Selected</span>
                      ) : (
                        <button className="btn btn-outline btn-xs" type="button" onClick={() => onProjectChange(p._id)}>
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!projects.length && (
                <tr>
                  <td colSpan="6" className="text-muted text-center" style={{ padding: '24px' }}>
                    No projects available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!project ? (
        <div className="card card-body text-center" style={{ padding: '40px 20px', color: 'var(--text-muted)' }}>
          Please select or create a project above to inspect and edit its initiation record.
        </div>
      ) : (
        <>
          {/* Active Project Banner */}
          <div className="init-active-bar">
            <div className="init-active-left">
              <span className="init-eyebrow">ACTIVE WORKSPACE</span>
              <div className="init-active-title">
                <h3>{project.projectName}</h3>
                <span className="badge badge-gold">{project.status || 'Planned'}</span>
              </div>
              <p className="init-active-desc">
                {project.charter?.description || project.charter?.purpose || 'Manage scope, charter, management plan, milestones and closure below.'}
              </p>
            </div>
            <div className="init-active-stats">
              <div className="init-active-stat">
                <span className="init-active-stat-label">Project Manager</span>
                <span className="init-active-stat-val">{project.charter?.projectManager || '—'}</span>
              </div>
              <div className="init-active-stat">
                <span className="init-active-stat-label">Approved Budget</span>
                <span className="init-active-stat-val">PKR {Number(project.budget?.total || 0).toLocaleString()}</span>
              </div>
              <div className="init-active-stat">
                <span className="init-active-stat-label">Target Deadline</span>
                <span className="init-active-stat-val">{project.deadline?.endDate ? new Date(project.deadline.endDate).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <nav className="init-section-nav" aria-label="Project initiation sections">
            {SECTIONS.map((name, index) => (
              <button
                type="button"
                key={name}
                className={openSection === name ? 'active' : ''}
                onClick={() => setOpenSection(name)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {name}
              </button>
            ))}
          </nav>

          {/* 1. Project Charter */}
          {section('Project Charter', 'Project Charter', (
            editable('Project Charter') ? (
              <div className="form-grid">
                {field('Project name', 'projectName', { required: true })}
                {field('Project manager', 'charter.projectManager', { required: true })}
                {field('Approved budget (PKR)', 'budget.total', { type: 'number', min: 0, required: true })}
                <div className="form-group">
                  <label>Lifecycle Status</label>
                  <select value={val('status') || 'Planned'} onChange={e => patch('status', e.target.value)}>
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {field('Planned start date', 'deadline.startDate', { type: 'date', value: dateValue(val('deadline.startDate')) })}
                {field('Project deadline', 'deadline.endDate', { type: 'date', value: dateValue(val('deadline.endDate')) })}
                <div className="form-group full">
                  {field('Description & Purpose', 'charter.description', { textarea: true })}
                </div>
                <div className="full">
                  <ListEditor
                    title="Project Objectives"
                    placeholder="Add project objective..."
                    items={current.objectives || []}
                    onChange={v => patch('objectives', v)}
                  />
                </div>
                <div className="full">
                  <RecordEditor
                    title="Stakeholders"
                    addLabel="Add Stakeholder"
                    items={current.stakeholders || []}
                    onChange={v => patch('stakeholders', v)}
                    fields={[
                      { key: 'name', label: 'Name' },
                      { key: 'role', label: 'Role' },
                      { key: 'organization', label: 'Organization' },
                      { key: 'contact', label: 'Contact details' },
                      { key: 'responsibilities', label: 'Responsibilities' }
                    ]}
                  />
                </div>
              </div>
            ) : (
              <div className="init-view-container">
                <div className="init-kpi-grid mb-16">
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Project Manager</span>
                    <span className="init-kpi-val">{project.charter?.projectManager || '—'}</span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Approved Budget</span>
                    <span className="init-kpi-val text-primary font-bold">PKR {Number(project.budget?.total || 0).toLocaleString()}</span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Project Timeline</span>
                    <span className="init-kpi-val">{dateValue(project.deadline?.startDate) || '—'} → {dateValue(project.deadline?.endDate) || '—'}</span>
                  </div>
                  <div
                    className="init-kpi-card"
                    style={{ cursor: 'pointer' }}
                    title="Click to edit Lifecycle Status"
                    onClick={() => { setOpenSection('Project Charter'); begin('Project Charter'); }}
                  >
                    <span className="init-kpi-label">Lifecycle Status (Click to Edit)</span>
                    <span className="init-kpi-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-info">{project.status || 'Planned'}</span>
                      <Pencil size={11} className="text-muted" style={{ opacity: 0.7 }} />
                    </span>
                  </div>
                </div>

                <div className="init-card-sub mb-16">
                  <h4 className="init-sub-title">Project Purpose & Description</h4>
                  <p className="init-desc-text">{project.charter?.description || project.charter?.purpose || 'No description recorded.'}</p>
                </div>

                <div className="init-card-sub mb-16">
                  <div className="flex-between mb-8">
                    <h4 className="init-sub-title" style={{ margin: 0 }}>Project Objectives</h4>
                    <span className="badge badge-neutral">{(project.objectives || []).length} objectives</span>
                  </div>
                  {(project.objectives || []).length === 0 ? (
                    <p className="text-muted text-xs">No objectives recorded.</p>
                  ) : (
                    <ul className="init-objectives-list">
                      {(project.objectives || []).map((o, i) => (
                        <li key={i}>
                          <span className="init-obj-bullet">{i + 1}</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="init-card-sub">
                  <div className="flex-between mb-8">
                    <h4 className="init-sub-title" style={{ margin: 0 }}>Key Stakeholders</h4>
                    <span className="badge badge-neutral">{(project.stakeholders || []).length} stakeholders</span>
                  </div>
                  {(project.stakeholders || []).length === 0 ? (
                    <p className="text-muted text-xs">No stakeholders recorded.</p>
                  ) : (
                    <div className="table-wrapper compact-table-wrap">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Organization</th>
                            <th>Contact</th>
                            <th>Responsibilities</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(project.stakeholders || []).map((s, i) => (
                            <tr key={i}>
                              <td><strong>{s.name}</strong></td>
                              <td><span className="badge badge-neutral">{s.role || '—'}</span></td>
                              <td>{s.organization || '—'}</td>
                              <td>{s.contact || '—'}</td>
                              <td>{s.responsibilities || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {/* 2. Scope & Boundaries */}
          {section('Scope & Boundaries', 'Scope & Boundaries', (
            editable('Scope & Boundaries') ? (
              <div className="form-grid">
                <div className="form-group full">
                  {field('Scope statement', 'scopeDetails.statement', { textarea: true })}
                </div>
                <div className="full">
                  <ListEditor
                    title="Approved in-scope features"
                    placeholder="Add in-scope feature..."
                    items={current.scopeIncluded || []}
                    onChange={v => patch('scopeIncluded', v)}
                  />
                </div>
                <div className="full">
                  <ListEditor
                    title="Approved out-of-scope features (Boundaries)"
                    placeholder="Add out-of-scope item..."
                    items={current.scopeExcluded || []}
                    onChange={v => patch('scopeExcluded', v)}
                  />
                </div>
                {[
                  ['assumptions', 'Assumptions (one per line)'],
                  ['constraints', 'Constraints (one per line)'],
                  ['acceptanceCriteria', 'Scope acceptance criteria (one per line)'],
                  ['proposedChanges', 'Proposed changes (not approved yet)']
                ].map(([k, label]) => (
                  <Field
                    key={k}
                    label={label}
                    value={(current.scopeDetails?.[k] || []).join('\n')}
                    textarea
                    onChange={v => patch(`scopeDetails.${k}`, v.split('\n').map(x => x.trim()).filter(Boolean))}
                  />
                ))}
                <div className="full">
                  <p className="text-muted text-xs">
                    Note: Pending or rejected change requests remain proposals and do not alter this approved scope.
                  </p>
                </div>
              </div>
            ) : (
              <div className="init-view-container">
                <div className="init-card-sub mb-16">
                  <h4 className="init-sub-title">Approved Scope Statement</h4>
                  <p className="init-desc-text">{project.scopeDetails?.statement || 'No scope statement recorded.'}</p>
                </div>

                <div className="two-col gap-16 mb-16">
                  <div className="init-card-sub scope-in-box">
                    <div className="flex-between mb-8">
                      <h4 className="init-sub-title" style={{ color: 'var(--success)', margin: 0 }}>✓ Approved In-Scope Deliverables</h4>
                      <span className="badge badge-success">{(project.scopeIncluded || []).length} items</span>
                    </div>
                    {(project.scopeIncluded || []).length === 0 ? (
                      <p className="text-muted text-xs">No in-scope items defined.</p>
                    ) : (
                      <div className="scope-badge-list">
                        {(project.scopeIncluded || []).map((item, i) => (
                          <span key={i} className="scope-badge in-scope">✓ {item}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="init-card-sub scope-out-box">
                    <div className="flex-between mb-8">
                      <h4 className="init-sub-title" style={{ color: 'var(--danger)', margin: 0 }}>✕ Approved Out-of-Scope (Boundaries)</h4>
                      <span className="badge badge-danger">{(project.scopeExcluded || []).length} items</span>
                    </div>
                    {(project.scopeExcluded || []).length === 0 ? (
                      <p className="text-muted text-xs">No out-of-scope boundaries defined.</p>
                    ) : (
                      <div className="scope-badge-list">
                        {(project.scopeExcluded || []).map((item, i) => (
                          <span key={i} className="scope-badge out-scope">✕ {item}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="three-col gap-16 mb-16">
                  <div className="init-card-sub">
                    <h4 className="init-sub-title">Assumptions</h4>
                    {(project.scopeDetails?.assumptions || []).length === 0 ? (
                      <p className="text-muted text-xs">—</p>
                    ) : (
                      <ul className="init-bullet-list">
                        {(project.scopeDetails.assumptions).map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="init-card-sub">
                    <h4 className="init-sub-title">Constraints</h4>
                    {(project.scopeDetails?.constraints || []).length === 0 ? (
                      <p className="text-muted text-xs">—</p>
                    ) : (
                      <ul className="init-bullet-list">
                        {(project.scopeDetails.constraints).map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="init-card-sub">
                    <h4 className="init-sub-title">Acceptance Criteria</h4>
                    {(project.scopeDetails?.acceptanceCriteria || []).length === 0 ? (
                      <p className="text-muted text-xs">—</p>
                    ) : (
                      <ul className="init-bullet-list">
                        {(project.scopeDetails.acceptanceCriteria).map((ac, i) => <li key={i}>{ac}</li>)}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="init-card-sub scope-proposed-box">
                  <div className="flex-between mb-8">
                    <h4 className="init-sub-title" style={{ color: 'var(--warning)', margin: 0 }}>Proposed Changes (Pending Formal Approval)</h4>
                    <span className="badge badge-warning">{(project.scopeDetails?.proposedChanges || []).length} pending</span>
                  </div>
                  <p className="text-xs text-muted mb-8">
                    Pending or rejected change requests remain proposals and do not alter approved scope until formal review.
                  </p>
                  {(project.scopeDetails?.proposedChanges || []).length === 0 ? (
                    <p className="text-muted text-xs">No proposed changes pending.</p>
                  ) : (
                    <div className="scope-badge-list">
                      {(project.scopeDetails.proposedChanges).map((p, i) => (
                        <span key={i} className="scope-badge badge-gold">⏳ {p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {/* 3. Project Management Plan */}
          {section('Project Management Plan', 'Project Management Plan', (
            editable('Project Management Plan') ? (
              <div className="init-plan-grid">
                {[
                  ['scope', 'A. Scope Management Plan', [
                    ['approach', 'Scope management approach'],
                    ['requirementsProcess', 'Requirements review & approval process'],
                    ['changeControl', 'Scope change control process'],
                    ['acceptanceMethod', 'Acceptance and verification method']
                  ]],
                  ['schedule', 'B. Schedule Management Plan', [
                    ['approach', 'Scheduling approach'],
                    ['reviewFrequency', 'Milestone review frequency'],
                    ['monitoring', 'Schedule monitoring approach']
                  ]],
                  ['cost', 'C. Cost Management Plan', [
                    ['allocation', 'Planned cost allocation'],
                    ['monitoring', 'Cost monitoring approach'],
                    ['reportingFrequency', 'Cost reporting frequency'],
                    ['warningThreshold', 'Budget warning threshold (%)']
                  ]],
                  ['quality', 'D. Quality Management Plan', [
                    ['objectives', 'Quality objectives'],
                    ['standards', 'Standards and acceptance criteria'],
                    ['inspection', 'Inspection and review approach'],
                    ['testing', 'Testing approach'],
                    ['defects', 'Defect severity & resolution expectations']
                  ]]
                ].map(([key, title, fields]) => (
                  <div className="init-plan-box" key={key}>
                    <h4>{title}</h4>
                    <div className="form-grid compact-grid">
                      {key === 'schedule' && (
                        <>
                          {field('Planned start date', 'deadline.startDate', { type: 'date', value: dateValue(val('deadline.startDate')) })}
                          {field('Planned completion date', 'deadline.endDate', { type: 'date', value: dateValue(val('deadline.endDate')) })}
                          <div className="form-group full">
                            <span className="text-xs text-muted">
                              Planned duration: {current.deadline?.startDate && current.deadline?.endDate
                                ? `${Math.max(1, Math.ceil((new Date(current.deadline.endDate) - new Date(current.deadline.startDate)) / 604800000))} weeks`
                                : `${current.deadline?.durationWeeks || '—'} weeks`}
                            </span>
                          </div>
                        </>
                      )}
                      {fields.map(([k, label]) => (
                        field(label, `plans.${key}.${k}`, {
                          textarea: key !== 'cost' || k !== 'warningThreshold',
                          type: key === 'cost' && k === 'warningThreshold' ? 'number' : 'text'
                        })
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="init-plan-grid">
                {/* Scope Plan */}
                <div className="init-plan-box">
                  <h4>A. Scope Management Plan</h4>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Scope Management Approach</span>
                    <span className="init-plan-field-val">{project.plans?.scope?.approach || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Requirements Review Process</span>
                    <span className="init-plan-field-val">{project.plans?.scope?.requirementsProcess || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Change Control Process</span>
                    <span className="init-plan-field-val">{project.plans?.scope?.changeControl || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Acceptance Verification Method</span>
                    <span className="init-plan-field-val">{project.plans?.scope?.acceptanceMethod || '—'}</span>
                  </div>
                </div>

                {/* Schedule Plan */}
                <div className="init-plan-box">
                  <h4>B. Schedule Management Plan</h4>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Planned Schedule Timeline</span>
                    <span className="init-plan-field-val">
                      {dateValue(project.deadline?.startDate) || '—'} → {dateValue(project.deadline?.endDate) || '—'}
                      {' '}({project.deadline?.durationWeeks || 16} weeks planned)
                    </span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Scheduling Approach</span>
                    <span className="init-plan-field-val">{project.plans?.schedule?.approach || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Milestone Review Frequency</span>
                    <span className="init-plan-field-val">{project.plans?.schedule?.reviewFrequency || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Schedule Monitoring</span>
                    <span className="init-plan-field-val">{project.plans?.schedule?.monitoring || '—'}</span>
                  </div>
                </div>

                {/* Cost Plan */}
                <div className="init-plan-box">
                  <h4>C. Cost Management Plan</h4>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Planned Cost Allocation</span>
                    <span className="init-plan-field-val">{project.plans?.cost?.allocation || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Cost Monitoring Approach</span>
                    <span className="init-plan-field-val">{project.plans?.cost?.monitoring || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Reporting Frequency</span>
                    <span className="init-plan-field-val">{project.plans?.cost?.reportingFrequency || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Budget Warning Threshold</span>
                    <span className="init-plan-field-val">
                      {project.plans?.cost?.warningThreshold != null && project.plans.cost.warningThreshold !== ''
                        ? `${project.plans.cost.warningThreshold}%`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Quality Plan */}
                <div className="init-plan-box">
                  <h4>D. Quality Management Plan</h4>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Quality Objectives</span>
                    <span className="init-plan-field-val">{project.plans?.quality?.objectives || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Standards & Acceptance Criteria</span>
                    <span className="init-plan-field-val">{project.plans?.quality?.standards || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Inspection & Review Approach</span>
                    <span className="init-plan-field-val">{project.plans?.quality?.inspection || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Testing Approach</span>
                    <span className="init-plan-field-val">{project.plans?.quality?.testing || '—'}</span>
                  </div>
                  <div className="init-plan-field">
                    <span className="init-plan-field-label">Defect Resolution Expectations</span>
                    <span className="init-plan-field-val">{project.plans?.quality?.defects || '—'}</span>
                  </div>
                </div>
              </div>
            )
          ))}

          {/* 4. Project Status & Milestones */}
          {section('Project Status & Milestones', 'Project Status & Milestones', (
            editable('Project Status & Milestones') ? (
              <div className="form-grid">
                <div className="form-group full">
                  <label>Project Status</label>
                  <select value={val('status') || 'Planned'} onChange={e => patch('status', e.target.value)}>
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="full">
                  <RecordEditor
                    title="Team Responsibilities"
                    addLabel="Add Team Member"
                    items={current.teamResponsibilities || []}
                    onChange={v => patch('teamResponsibilities', v)}
                    fields={[
                      { key: 'name', label: 'Team member' },
                      { key: 'role', label: 'Role' },
                      { key: 'responsibility', label: 'Responsibility / deliverable' },
                      { key: 'status', label: 'Assignment status' }
                    ]}
                  />
                </div>
                <div className="full">
                  <RecordEditor
                    title="Milestones"
                    addLabel="Add Milestone"
                    items={current.milestones || []}
                    onChange={v => patch('milestones', v)}
                    fields={[
                      { key: 'title', label: 'Milestone name' },
                      { key: 'description', label: 'Description' },
                      { key: 'dueDate', label: 'Planned due date', type: 'date' },
                      { key: 'responsiblePerson', label: 'Responsible person' },
                      { key: 'status', label: 'Status' },
                      { key: 'actualCompletionDate', label: 'Actual completion date', type: 'date' },
                      { key: 'remarks', label: 'Remarks' }
                    ]}
                  />
                </div>
              </div>
            ) : (
              <div className="init-view-container">
                <div className="init-kpi-grid mb-16">
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Project Status</span>
                    <span className="init-kpi-val">
                      <span className="badge badge-info">{project.status || 'Planned'}</span>
                    </span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Total Milestones</span>
                    <span className="init-kpi-val font-bold">{(project.milestones || []).length}</span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Completed Milestones</span>
                    <span className="init-kpi-val text-primary font-bold">
                      {(project.milestones || []).filter(m => m.status === 'Completed' || m.completed).length}
                    </span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Team Members Assigned</span>
                    <span className="init-kpi-val">{(project.teamResponsibilities || []).length}</span>
                  </div>
                </div>

                <div className="init-card-sub mb-16">
                  <div className="flex-between mb-8">
                    <h4 className="init-sub-title" style={{ margin: 0 }}>Project Milestones</h4>
                    <span className="badge badge-neutral">{(project.milestones || []).length} milestones</span>
                  </div>
                  {(project.milestones || []).length === 0 ? (
                    <p className="text-muted text-xs">No milestones recorded.</p>
                  ) : (
                    <div className="table-wrapper compact-table-wrap">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Milestone</th>
                            <th>Planned Due</th>
                            <th>Responsible</th>
                            <th>Status</th>
                            <th>Actual Completion</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(project.milestones || []).map((m, i) => {
                            const state = m.status || (m.completed ? 'Completed' : 'Not Started');
                            const overdue = state !== 'Completed' && m.dueDate && new Date(m.dueDate) < new Date();
                            return (
                              <tr key={i}>
                                <td><strong>{m.title}</strong></td>
                                <td>{dateValue(m.dueDate) || '—'}</td>
                                <td>{m.responsiblePerson || '—'}</td>
                                <td>
                                  <span className={`badge ${overdue ? 'badge-danger' : state === 'Completed' ? 'badge-success' : 'badge-info'}`}>
                                    {overdue ? 'Overdue' : state}
                                  </span>
                                </td>
                                <td>{dateValue(m.actualCompletionDate) || '—'}</td>
                                <td>{m.remarks || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="init-card-sub">
                  <div className="flex-between mb-8">
                    <h4 className="init-sub-title" style={{ margin: 0 }}>Team Roles & Responsibilities</h4>
                    <span className="badge badge-neutral">{(project.teamResponsibilities || []).length} members</span>
                  </div>
                  {(project.teamResponsibilities || []).length === 0 ? (
                    <p className="text-muted text-xs">No team members assigned.</p>
                  ) : (
                    <div className="table-wrapper compact-table-wrap">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Team Member</th>
                            <th>Role</th>
                            <th>Responsibility / Deliverable</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(project.teamResponsibilities || []).map((r, i) => (
                            <tr key={i}>
                              <td><strong>{r.name}</strong></td>
                              <td><span className="badge badge-neutral">{r.role || '—'}</span></td>
                              <td>{r.responsibility || '—'}</td>
                              <td><span className="badge badge-info">{r.status || 'Active'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {/* 5. Project Closure */}
          {section('Project Closure', 'Project Closure', (
            editable('Project Closure') ? (
              <div className="form-grid">
                {closureWarnings.map((warning, i) => (
                  <div key={i} className="alert alert-warning full">{warning}</div>
                ))}
                {field('Final project status', 'closure.finalStatus')}
                {field('Actual completion date', 'closure.actualCompletionDate', { type: 'date', value: dateValue(val('closure.actualCompletionDate')) })}
                {field('Actual total project cost (PKR)', 'closure.actualTotalCost', { type: 'number', min: 0 })}
                <div className="form-group">
                  <label>Final budget variance preview</label>
                  <div style={{ padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <strong>PKR {(Number(current.closure?.actualTotalCost || 0) - Number(current.budget?.total || 0)).toLocaleString()}</strong>
                    <span className="text-xs text-muted" style={{ marginLeft: 6 }}>
                      ({Number(current.closure?.actualTotalCost || 0) - Number(current.budget?.total || 0) > 0 ? 'over budget' : 'under or on budget'})
                    </span>
                  </div>
                </div>
                <div className="form-group full">
                  {field('Deliverables completion summary', 'closure.deliverablesSummary', { textarea: true })}
                </div>
                <div className="form-group full">
                  {field('Outstanding issues / unresolved defects', 'closure.outstandingIssues', { textarea: true })}
                </div>
                <div className="form-group full">
                  {field('Closure remarks & lessons learned', 'closure.closureNotes', { textarea: true })}
                </div>
                {field('Closure date', 'closure.closureDate', { type: 'date', value: dateValue(val('closure.closureDate')) })}
                {field('Closed by / Sign-off authority', 'closure.signedOffBy')}
              </div>
            ) : (
              <div className="init-view-container">
                <div className="init-kpi-grid mb-16">
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Closure Status</span>
                    <span className="init-kpi-val">
                      <span className={`badge ${project.closure?.isClosed ? 'badge-success' : 'badge-neutral'}`}>
                        {project.closure?.finalStatus || project.status || 'Planned'}
                      </span>
                    </span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Actual Completion</span>
                    <span className="init-kpi-val">{dateValue(project.closure?.actualCompletionDate) || '—'}</span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Actual Total Cost</span>
                    <span className="init-kpi-val font-bold">
                      {project.closure?.actualTotalCost != null
                        ? `PKR ${Number(project.closure.actualTotalCost).toLocaleString()}`
                        : '—'}
                    </span>
                  </div>
                  <div className="init-kpi-card">
                    <span className="init-kpi-label">Budget Variance</span>
                    <span className="init-kpi-val">
                      {project.closure?.actualTotalCost != null ? (
                        <span className={`badge ${Number(project.closure.actualTotalCost) - Number(project.budget?.total || 0) > 0 ? 'badge-danger' : 'badge-success'}`}>
                          PKR {(Number(project.closure.actualTotalCost) - Number(project.budget?.total || 0)).toLocaleString()}
                        </span>
                      ) : '—'}
                    </span>
                  </div>
                </div>

                <div className="init-card-sub mb-16">
                  <h4 className="init-sub-title">Deliverables Completion Summary</h4>
                  <p className="init-desc-text">{project.closure?.deliverablesSummary || 'No deliverables summary recorded.'}</p>
                </div>

                <div className="init-card-sub mb-16">
                  <h4 className="init-sub-title">Outstanding Issues & Unresolved Defects</h4>
                  <p className="init-desc-text">{project.closure?.outstandingIssues || 'None recorded.'}</p>
                </div>

                <div className="init-card-sub mb-16">
                  <h4 className="init-sub-title">Closure Remarks & Notes</h4>
                  <p className="init-desc-text">{project.closure?.closureNotes || 'No closure remarks recorded.'}</p>
                </div>

                <div className="two-col gap-16">
                  <div className="init-card-sub">
                    <span className="init-kpi-label">Closed By / Signed Off By</span>
                    <span className="font-600">{project.closure?.signedOffBy || 'Pending sign-off'}</span>
                  </div>
                  <div className="init-card-sub">
                    <span className="init-kpi-label">Closure Date</span>
                    <span className="font-600">{dateValue(project.closure?.closureDate) || 'Pending'}</span>
                  </div>
                </div>
              </div>
            )
          ))}
        </>
      )}

      {/* New Project Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>New Project Initiation</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={createProjectHandler}>
                <div className="form-grid">
                  <Field label="Project name" value={create.projectName} required onChange={v => setCreate({ ...create, projectName: v })} />
                  <Field label="Project manager" value={create.projectManager} onChange={v => setCreate({ ...create, projectManager: v })} />
                  <Field label="Approved budget (PKR)" type="number" min="0" value={create.budget} onChange={v => setCreate({ ...create, budget: v })} />
                  <Field label="Planned start date" type="date" value={create.startDate} onChange={v => setCreate({ ...create, startDate: v })} />
                  <Field label="Project deadline" type="date" value={create.endDate} onChange={v => setCreate({ ...create, endDate: v })} />
                  <div className="form-group full">
                    <Field label="Description & Purpose" textarea value={create.description} onChange={v => setCreate({ ...create, description: v })} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="btn btn-primary" type="submit">Create Project</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
