import axios from 'axios';

const IDENTITY_URL = 'https://identity.tuwalink.com/api/v1';
const NOC_URL = 'https://noc.tuwalink.com/api/v1';

export function getToken() {
  return localStorage.getItem('tuwa_token');
}

export function setToken(token) {
  localStorage.setItem('tuwa_token', token);
}

export function clearToken() {
  localStorage.removeItem('tuwa_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function bearerHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export const identityApi = {
  login: (email, password) =>
    axios.post(`${IDENTITY_URL}/login`, { email, password }),

  verifyTwoFactor: (pendingToken, code) =>
    axios.post(`${IDENTITY_URL}/login/verify-two-factor`, { code }, { headers: bearerHeader(pendingToken) }),

  me: () =>
    axios.get(`${IDENTITY_URL}/me`, { headers: authHeaders() }),

  logout: () =>
    axios.post(`${IDENTITY_URL}/logout`, {}, { headers: authHeaders() }),

  activity: () =>
    axios.get(`${IDENTITY_URL}/activity`, { headers: authHeaders() }),

  twoFactorStatus: () =>
    axios.get(`${IDENTITY_URL}/two-factor/status`, { headers: authHeaders() }),

  twoFactorSetup: () =>
    axios.post(`${IDENTITY_URL}/two-factor/setup`, {}, { headers: authHeaders() }),

  twoFactorConfirm: (code) =>
    axios.post(`${IDENTITY_URL}/two-factor/confirm`, { code }, { headers: authHeaders() }),

  twoFactorDisable: (password) =>
    axios.post(`${IDENTITY_URL}/two-factor/disable`, { password }, { headers: authHeaders() }),
};

export const nocApi = {
  dashboard: () =>
    axios.get(`${NOC_URL}/dashboard`, { headers: authHeaders() }),

  bandwidthHistory: () =>
    axios.get(`${NOC_URL}/dashboard/bandwidth-history`, { headers: authHeaders() }),

  devices: () =>
    axios.get(`${NOC_URL}/devices`, { headers: authHeaders() }),

  billingStatus: () =>
    axios.get(`${NOC_URL}/billing/status`, { headers: authHeaders() }),

  subnets: () =>
    axios.get(`${NOC_URL}/subnets`, { headers: authHeaders() }),

  subnet: (id) =>
    axios.get(`${NOC_URL}/subnets/${id}`, { headers: authHeaders() }),

  invoices: () =>
    axios.get(`${NOC_URL}/invoices`, { headers: authHeaders() }),

  customers: () =>
    axios.get(`${NOC_URL}/customers`, { headers: authHeaders() }),

  createCustomer: (data) =>
    axios.post(`${NOC_URL}/customers`, data, { headers: authHeaders() }),

  activity: () =>
    axios.get(`${NOC_URL}/activity`, { headers: authHeaders() }),

  incidents: (status) =>
    axios.get(`${NOC_URL}/incidents`, { headers: authHeaders(), params: status ? { status } : {} }),

  acknowledgeIncident: (id) =>
    axios.post(`${NOC_URL}/incidents/${id}/acknowledge`, {}, { headers: authHeaders() }),

  resolveIncident: (id) =>
    axios.post(`${NOC_URL}/incidents/${id}/resolve`, {}, { headers: authHeaders() }),

  maintenanceWindows: () =>
    axios.get(`${NOC_URL}/maintenance-windows`, { headers: authHeaders() }),

  createMaintenanceWindow: (data) =>
    axios.post(`${NOC_URL}/maintenance-windows`, data, { headers: authHeaders() }),

  endMaintenanceWindowEarly: (id) =>
    axios.post(`${NOC_URL}/maintenance-windows/${id}/end-early`, {}, { headers: authHeaders() }),

  deleteMaintenanceWindow: (id) =>
    axios.delete(`${NOC_URL}/maintenance-windows/${id}`, { headers: authHeaders() }),

  topology: () =>
    axios.get(`${NOC_URL}/topology`, { headers: authHeaders() }),

  createTopologyLink: (data) =>
    axios.post(`${NOC_URL}/topology/links`, data, { headers: authHeaders() }),

  deleteTopologyLink: (id) =>
    axios.delete(`${NOC_URL}/topology/links/${id}`, { headers: authHeaders() }),
};
