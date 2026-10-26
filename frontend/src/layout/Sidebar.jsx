import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  ListTodo,
  Network,
  CalendarDays,
  GitPullRequest,
  TrendingUp,
  ShieldCheck,
  Bug,
  AlertTriangle,
  BarChart3,
  Plus,
  Activity
} from 'lucide-react';

const NAV = [
  { path: '/',                icon: LayoutDashboard, label: 'Dashboard'            },
  { path: '/project',         icon: FileCheck2,      label: 'Project Initiation'   },
  { path: '/requirements',    icon: ListTodo,        label: 'Requirements'         },
  { path: '/wbs',             icon: Network,         label: 'WBS'                 },
  { path: '/schedule',        icon: CalendarDays,    label: 'Schedule & Resources' },
  { path: '/change-requests', icon: GitPullRequest,  label: 'Change Requests'      },
  { path: '/evm',             icon: TrendingUp,      label: 'Cost & EVM'           },
  { path: '/quality',         icon: ShieldCheck,     label: 'Quality & Testing'    },
  { path: '/defects',         icon: Bug,             label: 'Defects'              },
  { path: '/risks',           icon: AlertTriangle,   label: 'Risk Management'      },
  { path: '/reports',         icon: BarChart3,       label: 'Reports'              },
];

export default function Sidebar({ projects = [], selectedProject, onProjectChange }) {
  const navigate = useNavigate();

  const handleChange = (e) => {
    onProjectChange(e.target.value);
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Activity size={18} strokeWidth={2.4} />
        </div>
        <div className="sidebar-brand-text">
          <h1>Smart Healthcare PM</h1>
          <p>Enterprise SPM Platform</p>
        </div>
      </div>

      <div className="sidebar-project-selector">
        <label>Active Project Workspace</label>
        <select value={selectedProject || ''} onChange={handleChange}>
          <option value="">— Select Project —</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.projectName}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary sidebar-add-project"
          onClick={() => navigate('/project?new=1')}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Project</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation Modules</div>
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
