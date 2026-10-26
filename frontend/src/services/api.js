import axios from 'axios';

const BASE = 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

/* ── Projects ───────────────────────────────────────────────────── */
export const getProjects         = ()          => api.get('/projects');
export const getProject          = (id)        => api.get(`/projects/${id}`);
export const createProject       = (data)      => api.post('/projects', data);
export const updateProject       = (id, data)  => api.put(`/projects/${id}`, data);
export const updateProjectStatus = (id, status)=> api.patch(`/projects/${id}/status`, { status });

/* ── Dashboard ──────────────────────────────────────────────────── */
export const getDashboard        = (id)        => api.get(`/dashboard/${id}`);
export const getPortfolio        = ()          => api.get('/dashboard');

/* ── Requirements ───────────────────────────────────────────────── */
export const getRequirements     = (projectId) => api.get(`/requirements?project=${projectId}`);
export const createRequirement   = (data)      => api.post('/requirements', data);
export const updateRequirement   = (id, data)  => api.put(`/requirements/${id}`, data);
export const approveRequirement  = (id, by)    => api.patch(`/requirements/${id}/approve`, { approvedBy: by });
export const rejectRequirement   = (id, reason)=> api.patch(`/requirements/${id}/reject`, { rejectionReason: reason });
export const deleteRequirement   = (id)        => api.delete(`/requirements/${id}`);

/* ── WBS ────────────────────────────────────────────────────────── */
export const getWBS              = (projectId) => api.get(`/wbs?project=${projectId}`);
export const getWBSTree          = (projectId) => api.get(`/wbs/project/${projectId}/tree`);
export const createWBSTask       = (data)      => api.post('/wbs', data);
export const updateWBSTask       = (id, data)  => api.put(`/wbs/${id}`, data);
export const updateWBSStatus     = (id, status)=> api.patch(`/wbs/${id}/status`, { status });
export const deleteWBSTask       = (id)        => api.delete(`/wbs/${id}`);

/* ── Activities (Schedule) ──────────────────────────────────────── */
export const getActivities       = (projectId) => api.get(`/activities?project=${projectId}`);
export const createActivity      = (data)      => api.post('/activities', data);
export const updateActivity      = (id, data)  => api.put(`/activities/${id}`, data);
export const deleteActivity      = (id)        => api.delete(`/activities/${id}`);

/* ── Change Requests ────────────────────────────────────────────── */
export const getChangeRequests   = (projectId) => api.get(`/change-requests?project=${projectId}`);
export const createChangeRequest = (data)      => api.post('/change-requests', data);
export const updateChangeRequest = (id, data)  => api.put(`/change-requests/${id}`, data);
export const approveChangeRequest= (id, by)    => api.patch(`/change-requests/${id}/approve`, { reviewedBy: by });
export const rejectChangeRequest = (id, reason, by) => api.patch(`/change-requests/${id}/reject`, { rejectionReason: reason, reviewedBy: by });

/* ── EVM ────────────────────────────────────────────────────────── */
export const getEVMSummary       = (projectId) => api.get(`/evm/${projectId}/summary`);
export const getEVMActivities    = (projectId) => api.get(`/evm/${projectId}/activities`);

/* ── Quality ────────────────────────────────────────────────────── */
export const getQualityChecks    = (projectId) => api.get(`/quality?project=${projectId}`);
export const createQualityCheck  = (data)      => api.post('/quality', data);
export const updateQualityCheck  = (id, data)  => api.put(`/quality/${id}`, data);
export const deleteQualityCheck  = (id)        => api.delete(`/quality/${id}`);

/* ── Defects ────────────────────────────────────────────────────── */
export const getDefects          = (projectId) => api.get(`/defects?project=${projectId}`);
export const createDefect        = (data)      => api.post('/defects', data);
export const updateDefect        = (id, data)  => api.put(`/defects/${id}`, data);
export const deleteDefect        = (id)        => api.delete(`/defects/${id}`);

/* ── Risks ──────────────────────────────────────────────────────── */
export const getRisks            = (projectId) => api.get(`/risks?project=${projectId}`);
export const createRisk          = (data)      => api.post('/risks', data);
export const updateRisk          = (id, data)  => api.put(`/risks/${id}`, data);
export const updateRiskStatus    = (id, status)=> api.patch(`/risks/${id}/status`, { status });
export const deleteRisk          = (id)        => api.delete(`/risks/${id}`);

/* ── QR Summary ─────────────────────────────────────────────────── */
export const getQRSummary        = (projectId) => api.get(`/qr-summary/${projectId}`);
