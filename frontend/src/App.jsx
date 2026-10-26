import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './styles/global.css';

import Sidebar from './layout/Sidebar';
import Topbar  from './layout/Topbar';

import Dashboard       from './pages/Dashboard';
import ProjectOverview from './pages/ProjectOverview';
import Requirements    from './pages/Requirements';
import WBS             from './pages/WBS';
import Schedule        from './pages/Schedule';
import ChangeRequests  from './pages/ChangeRequests';
import EVM             from './pages/EVM';
import Quality         from './pages/Quality';
import Defects         from './pages/Defects';
import Risks           from './pages/Risks';
import Reports         from './pages/Reports';
import WelcomeProjectSelect from './pages/WelcomeProjectSelect';
import { getDashboard, getProjects } from './services/api';

function MainAppContent() {
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [health, setHealth] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load all projects on initial run
  useEffect(() => {
    getProjects()
      .then(({ data }) => {
        const available = Array.isArray(data) ? data : [];
        setProjects(available);
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleProjectChange = (id) => {
    setProjectId(id);
    if (id) {
      navigate('/');
    }
  };

  const handleSwitchProject = () => {
    setProjectId('');
    navigate('/');
  };

  // Update topbar health indicator for active project
  useEffect(() => {
    if (!projectId || projectId === 'new') {
      setHealth('');
      return;
    }
    getDashboard(projectId)
      .then((r) => {
        const h = r.data.healthSummary?.overallHealth || '';
        if (h.includes('Healthy')) setHealth('Healthy');
        else if (h.includes('Critical')) setHealth('Critical');
        else setHealth('Attention');
      })
      .catch(() => setHealth(''));
  }, [projectId]);

  const activeProject = projects.find((p) => p._id === projectId);
  const activeProjectName = activeProject ? activeProject.projectName : '';

  // 1. Initial Screen: If no project is selected, show the Welcome / Project Management System screen
  if (!projectId) {
    return (
      <WelcomeProjectSelect
        projects={projects}
        loading={loading}
        onSelectProject={handleProjectChange}
      />
    );
  }

  // 2. Dashboard & Workspaces: Once project is chosen, show the full SPM dashboard & modules
  return (
    <div className="app-layout">
      <Sidebar
        projects={projects}
        selectedProject={projectId}
        onProjectChange={handleProjectChange}
      />
      <div className="main-content">
        <Topbar
          health={health}
          activeProjectName={activeProjectName}
          onSwitchProject={handleSwitchProject}
        />
        <div className="page-body">
          <Routes>
            <Route path="/" element={<Dashboard projectId={projectId} />} />
            <Route
              path="/project"
              element={
                <ProjectOverview
                  projects={projects}
                  onProjectsChange={setProjects}
                  projectId={projectId}
                  onProjectChange={handleProjectChange}
                />
              }
            />
            <Route path="/requirements"    element={<Requirements     projectId={projectId} />} />
            <Route path="/wbs"             element={<WBS              projectId={projectId} />} />
            <Route path="/schedule"        element={<Schedule         projectId={projectId} />} />
            <Route path="/change-requests" element={<ChangeRequests   projectId={projectId} />} />
            <Route path="/evm"             element={<EVM              projectId={projectId} />} />
            <Route path="/quality"         element={<Quality          projectId={projectId} />} />
            <Route path="/defects"         element={<Defects          projectId={projectId} />} />
            <Route path="/risks"           element={<Risks            projectId={projectId} />} />
            <Route path="/reports"         element={<Reports          projectId={projectId} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainAppContent />
    </BrowserRouter>
  );
}
