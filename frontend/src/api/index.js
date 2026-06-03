import axios from 'axios';

// Use empty string to support relative domain host routing (HTTP/HTTPS agnostic)
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => {
        const form = new FormData();
        form.append('teacher_id', data.teacher_id);
        form.append('password', data.password);
        return api.post('/api/auth/login', form);
    },
    register: (data) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v != null) form.append(k, v); });
        return api.post('/api/auth/register', form);
    },
    me: () => api.get('/api/auth/me'),
};

// ── Subjects ─────────────────────────────────────────────────
export const subjectsAPI = {
    list: () => api.get('/api/subjects'),
    create: (name) => {
        const form = new FormData();
        form.append('name', name);
        return api.post('/api/subjects', form);
    },
    delete: (id) => api.delete(`/api/subjects/${id}`),
};

// ── Students ─────────────────────────────────────────────────
export const studentsAPI = {
    list: (subjectId) => api.get(`/api/subjects/${subjectId}/students`),
    add: (subjectId, formData) => api.post(`/api/subjects/${subjectId}/students`, formData),
    edit: (subjectId, studentId, data) => {
        const form = new FormData();
        form.append('name', data.name);
        form.append('roll_number', data.roll_number);
        return api.put(`/api/subjects/${subjectId}/students/${studentId}`, form);
    },
    delete: (subjectId, studentId) => api.delete(`/api/subjects/${subjectId}/students/${studentId}`),
};

// ── Sessions ─────────────────────────────────────────────────
export const sessionsAPI = {
    list: (subjectId) => api.get(`/api/subjects/${subjectId}/sessions`),
    create: (subjectId, name) => {
        const form = new FormData();
        form.append('name', name);
        return api.post(`/api/subjects/${subjectId}/sessions`, form);
    },
};

// ── Attendance ───────────────────────────────────────────────
export const attendanceAPI = {
    mark: (sessionId, imageFile) => {
        const form = new FormData();
        form.append('session_id', sessionId);
        form.append('image', imageFile);
        return api.post('/api/attendance/mark', form);
    },
    get: (sessionId) => api.get(`/api/attendance/${sessionId}`),
    update: (sessionId, studentId, status) => {
        const form = new FormData();
        form.append('status', status);
        return api.put(`/api/attendance/${sessionId}/${studentId}`, form);
    },
    peerMark: (data) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v != null) form.append(k, v); });
        return api.post('/api/attendance/peer-mark', form);
    },
    peerHistory: () => api.get('/api/attendance/peer-history'),
};

// ── Staff Attendance ─────────────────────────────────────────
export const staffAttendanceAPI = {
    mark: (data) => {
        const form = new FormData();
        form.append('image', data.image);
        if (data.lat) form.append('lat', data.lat);
        if (data.lng) form.append('lng', data.lng);
        return api.post('/api/staff-attendance/mark', form);
    },
    today: (deptId) => api.get('/api/staff-attendance/today', { params: { department_id: deptId } }),
    history: (startDate, endDate) =>
        api.get('/api/staff-attendance/history', { params: { start_date: startDate, end_date: endDate } }),
};

// ── Leave ────────────────────────────────────────────────────
export const leaveAPI = {
    apply: (data) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v != null) form.append(k, v); });
        return api.post('/api/leave/apply', form);
    },
    my: () => api.get('/api/leave/my'),
    pending: () => api.get('/api/leave/pending'),
    all: (deptId) => api.get('/api/leave/all', { params: { department_id: deptId } }),
    review: (id, status) => {
        const form = new FormData();
        form.append('status', status);
        return api.put(`/api/leave/${id}/review`, form);
    },
    override: (id, status) => {
        const form = new FormData();
        form.append('status', status);
        return api.put(`/api/leave/${id}/override`, form);
    },
};

// ── HOD ──────────────────────────────────────────────────────
export const hodAPI = {
    dashboard: () => api.get('/api/hod/dashboard'),
    students: () => api.get('/api/hod/students'),
    staff: () => api.get('/api/hod/staff'),
    staffAttendance: (date) => api.get('/api/hod/staff-attendance', { params: { date_str: date } }),
    defaulters: (threshold) => api.get('/api/hod/defaulters', { params: { threshold } }),
    trends: (months) => api.get('/api/hod/trends', { params: { months } }),
};

// ── Admin ────────────────────────────────────────────────────
export const adminAPI = {
    dashboard: () => api.get('/api/admin/dashboard'),
    departments: () => api.get('/api/admin/departments'),
    createDepartment: (data) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v != null) form.append(k, v); });
        return api.post('/api/admin/departments', form);
    },
    departmentStats: (id) => api.get(`/api/admin/departments/${id}/stats`),
    teachers: () => api.get('/api/admin/teachers'),
    updateRole: (teacherId, role) => {
        const form = new FormData();
        form.append('role', role);
        return api.put(`/api/admin/teachers/${teacherId}/role`, form);
    },
    systemMetrics: () => api.get('/api/admin/system-metrics'),
    auditLog: (limit) => api.get('/api/admin/audit-log', { params: { limit } }),
    exportCSV: (deptId) =>
        api.get('/api/admin/export/attendance-csv', {
            params: { department_id: deptId },
            responseType: 'blob',
        }),
    getSettings: () => api.get('/api/admin/settings'),
    updateSettings: (data) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v != null) form.append(k, v); });
        return api.post('/api/admin/settings', form);
    },
};

// ── Analytics ────────────────────────────────────────────────
export const analyticsAPI = {
    subjectAnalytics: (subjectId) => api.get(`/api/analytics/${subjectId}`),
    dailyTrends: (days, deptId) =>
        api.get('/api/analytics/daily-trends', { params: { days, department_id: deptId } }),
    monthlyTrends: (months, deptId) =>
        api.get('/api/analytics/monthly-trends', { params: { months, department_id: deptId } }),
    defaulters: (deptId, threshold) =>
        api.get('/api/analytics/defaulters', { params: { department_id: deptId, threshold } }),
    departmentComparison: () => api.get('/api/analytics/department-comparison'),
    staffInsights: (deptId) =>
        api.get('/api/analytics/staff-insights', { params: { department_id: deptId } }),
};

// ── Reports ──────────────────────────────────────────────────
export const reportsAPI = {
    downloadCSV: (sessionId) =>
        api.get(`/api/reports/csv/${sessionId}`, { responseType: 'blob' }),
    summary: (sessionId) => api.get(`/api/reports/summary/${sessionId}`),
};

export default api;
