import React, { useState } from 'react';
import {
  Activity,
  FolderKanban,
  ArrowRight,
  Calendar,
  Wallet,
  UserCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function WelcomeProjectSelect({
  projects = [],
  onSelectProject,
  loading = false
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleLaunch = () => {
    if (selectedId) {
      onSelectProject(selectedId);
    }
  };

  const handleSelectChange = (e) => {
    // Only update the selected project in state — DO NOT automatically launch
    setSelectedId(e.target.value);
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        {/* Brand Header */}
        <div className="welcome-header">
          <div className="welcome-badge">
            <Activity size={18} strokeWidth={2.5} />
            <span>Healthcare Enterprise SPM</span>
          </div>
          <h1 className="welcome-title">Project Management System</h1>
          <p className="welcome-subtitle">
            Consortium Multi-Hospital Healthcare Information Platform • Please select a project workspace to launch dashboard
          </p>
        </div>

        {/* Primary Selection Card */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-card-title">
              <FolderKanban size={20} className="text-primary" strokeWidth={2.2} />
              <div>
                <h2>Select Project Workspace</h2>
                <p>Choose an active project from the dropdown below and click "Open Dashboard"</p>
              </div>
            </div>
          </div>

          <div className="welcome-selector-row">
            <div className="welcome-dropdown-wrapper">
              <label htmlFor="project-workspace-select">Active Project</label>
              <select
                id="project-workspace-select"
                value={selectedId}
                onChange={handleSelectChange}
                disabled={loading || projects.length === 0}
                className="welcome-select"
              >
                <option value="">— Select a Project Workspace —</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.projectName} {p.status ? `(${p.status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary welcome-launch-btn"
              disabled={!selectedId}
              onClick={handleLaunch}
            >
              <span>Open Dashboard</span>
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Existing Projects Quick-Select Grid */}
        <div className="welcome-projects-section">
          <div className="welcome-section-header">
            <h3>Available Project Workspaces ({projects.length})</h3>
            <span className="welcome-section-tag">Choose your workspace below</span>
          </div>

          {loading ? (
            <div className="welcome-loading">Loading project workspaces...</div>
          ) : projects.length === 0 ? (
            <div className="welcome-empty">
              <p>No project workspaces found in the database.</p>
            </div>
          ) : (
            <div className="welcome-grid">
              {projects.map((p) => {
                const isSelected = p._id === selectedId;
                const budgetNum = p.budget?.total || 0;
                const pm = p.charter?.projectManager || 'PM Not Assigned';
                const weeks = p.deadline?.durationWeeks || 16;
                const status = p.status || 'In Progress';

                return (
                  <div
                    key={p._id}
                    className={`welcome-project-card${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedId(p._id)}
                  >
                    <div className="welcome-card-top">
                      <span className="welcome-status-pill">{status}</span>
                      <span className="welcome-budget-pill">
                        <Wallet size={12} strokeWidth={2.2} />
                        PKR {budgetNum > 0 ? Number(budgetNum).toLocaleString() : '5,000,000'}
                      </span>
                    </div>

                    <h4 className="welcome-project-name">{p.projectName}</h4>

                    <div className="welcome-project-meta">
                      <div className="meta-item">
                        <UserCheck size={13} className="text-muted" />
                        <span>{pm}</span>
                      </div>
                      <div className="meta-item">
                        <Calendar size={13} className="text-muted" />
                        <span>{weeks} Weeks Duration</span>
                      </div>
                    </div>

                    <div className="welcome-card-footer">
                      <span className="welcome-open-text">
                        {isSelected ? '✓ Selected — Click Open Dashboard Above' : 'Click to Select'}
                      </span>
                      <ChevronRight size={16} className="welcome-arrow-icon" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="welcome-footer">
          <div className="footer-item">
            <CheckCircle2 size={13} className="text-success" />
            <span>MongoDB Database Connected</span>
          </div>
          <span className="footer-dot">•</span>
          <div className="footer-item">
            <span>5 Teaching & General Hospitals Consortia</span>
          </div>
          <span className="footer-dot">•</span>
          <div className="footer-item">
            <span>SPM Governance Platform v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
