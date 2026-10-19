import { UserProfile, AuthResponse } from '@spendwise/shared';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Network request failed', res.status);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<{ user: UserProfile }>('/auth/me'),
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  deleteAccount: () => request<{ message: string }>('/auth/account', { method: 'DELETE' }),

  // Google Drive
  getDriveAuthUrl: () => request<{ url: string }>('/drive/auth-url'),
  getDriveStatus: () => request<{ connected: boolean; email?: string }>('/drive/status'),
  disconnectDrive: () => request<{ message: string }>('/drive/disconnect', { method: 'POST' }),
  uploadBackupToDrive: (filename: string, content: string | object) =>
    request<{ success: boolean; file: any; message: string }>('/drive/backup', {
      method: 'POST',
      body: JSON.stringify({ filename, content })
    }),
  listDriveBackups: () => request<{ backups: Array<{ id: string; name: string; modifiedTime: string; size?: string }> }>('/drive/backups'),
  downloadDriveBackup: (fileId: string) => request<{ content: string }>(`/drive/backup/${fileId}`)
};
