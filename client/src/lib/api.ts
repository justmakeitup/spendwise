import { UserProfile, AuthResponse } from '@spendwise/shared';

export const TOKEN_STORAGE_KEY = 'spendwise_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Detect Capacitor native app or native mobile WebView scheme
  if (
    typeof window !== 'undefined' &&
    ((window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && !import.meta.env.DEV))
  ) {
    return 'https://spendwise-five-liart.vercel.app/api';
  }

  return '/api';
};

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      credentials: 'include'
    });
  } catch (netErr: any) {
    throw new ApiError(netErr.message || 'Network connection failed. Please check your internet or server status.', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      setStoredToken(null);
    }
    throw new ApiError(data.error || `Server returned error (${res.status})`, res.status);
  }

  // Automatically save JWT token if returned in response
  if (data && typeof data === 'object' && 'token' in data && typeof (data as any).token === 'string') {
    setStoredToken((data as any).token);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => {
    setStoredToken(null);
    return request<{ message: string }>('/auth/logout', { method: 'POST' });
  },
  getCurrentUser: () => request<{ user: UserProfile }>('/auth/me'),
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  deleteAccount: () => {
    setStoredToken(null);
    return request<{ message: string }>('/auth/account', { method: 'DELETE' });
  },

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
