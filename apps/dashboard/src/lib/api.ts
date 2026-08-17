const AUTH_TOKEN_KEY = 'ai_privacy_admin_token';
const AUTH_USER_KEY = 'ai_privacy_admin_user';

export function getAdminKey(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAdminKey(key: string, remember = true) {
  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, key);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, key);
  }
}

export function clearAdminKey() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAdminKey());
}

export async function loginWithKey(key: string, remember = true): Promise<boolean> {
  const base = window.location.origin;
  const res = await fetch(`${base}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Invalid Admin Access Key');
  }

  const data = await res.json();
  setAdminKey(key, remember);
  if (remember) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user || { username: 'admin' }));
  }
  return true;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const adminKey = getAdminKey();
  const headers = new Headers(options.headers || {});
  if (adminKey) {
    headers.set('X-Admin-Key', adminKey);
  }
  headers.set('Content-Type', 'application/json');

  const base = window.location.origin;
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Session expired or invalid key
    clearAdminKey();
    window.dispatchEvent(new Event('auth_state_changed'));
    throw new Error('Session unauthorized. Please log in again.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error (${res.status}): ${errorText}`);
  }

  return res.json();
}
