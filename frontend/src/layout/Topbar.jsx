import React from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, AlertOctagon, AlertTriangle, FolderKanban } from 'lucide-react';

const TITLES = {
  '/': 'Project Dashboard',
  '/project': 'Project Initiation',
  '/requirements': 'Requirements Management',
  '/wbs': 'Work Breakdown Structure',
  '/schedule': 'Schedule & Resource Allocation',
  '/change-requests': 'Change Request Control',
  '/evm': 'Cost & Earned Value Management',
  '/quality': 'Quality Assurance & Testing',
  '/defects': 'Defect Tracking & Resolution',
  '/risks': 'Risk Management & Mitigation',
  '/reports': 'Executive Reports & Summary',
};

export default function Topbar({ health, activeProjectName, onSwitchProject }) {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Smart Healthcare PM';

  const renderHealthBadge = () => {
    if (!health) return null;
    if (health === 'Healthy' || health.includes('Healthy')) {
      return (
        <div className="health-badge healthy">
          <CheckCircle2 size={13} strokeWidth={2.5} />
          <span>Project Healthy</span>
        </div>
      );
    }
    if (health === 'Critical' || health.includes('Critical')) {
      return (
        <div className="health-badge critical">
          <AlertOctagon size={13} strokeWidth={2.5} />
          <span>Critical Action Needed</span>
        </div>
      );
    }
    return (
      <div className="health-badge warning">
        <AlertTriangle size={13} strokeWidth={2.5} />
        <span>Attention Required</span>
      </div>
    );
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-crumb">Healthcare SPM</span>
        <span className="topbar-crumb-sep">/</span>
        <h1 className="topbar-title">{title}</h1>
        {activeProjectName && (
          <span className="topbar-project-tag" title="Current Active Workspace">
            {activeProjectName}
          </span>
        )}
      </div>
      <div className="topbar-right">
        {onSwitchProject && (
          <button
            type="button"
            className="topbar-switch-btn"
            onClick={onSwitchProject}
            title="Switch Project Workspace"
          >
            <FolderKanban size={13} strokeWidth={2.2} />
            <span>Switch Workspace</span>
          </button>
        )}
        {renderHealthBadge()}
      </div>
    </header>
  );
}

