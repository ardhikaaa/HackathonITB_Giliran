const TOKEN_KEY = "base44_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY) || null;
}

export function saveAccessToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
}

export function removeAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem("token");
}

async function authFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.detail || data?.error || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const db = {
  auth: {
    hasToken: () => !!getAccessToken(),
    setToken: (token) => saveAccessToken(token),
    isAuthenticated: async () => {
      if (!getAccessToken()) return false;
      try {
        await db.auth.me();
        return true;
      } catch {
        return false;
      }
    },
    me: () => authFetch("/api/auth/me", { method: "GET" }),
    loginViaEmailPassword: async (email, password) => {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.access_token) saveAccessToken(res.access_token);
      return res;
    },
    register: async ({ email, password, full_name }) => {
      const res = await authFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name }),
      });
      if (res.access_token) saveAccessToken(res.access_token);
      return res;
    },
    verifyOtp: async () => ({ access_token: getAccessToken() }),
    logout: (redirectUrl) => {
      const token = getAccessToken();
      if (token) {
        fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      removeAccessToken();
      if (typeof window !== "undefined" && redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin: (returnTo) => {
      if (typeof window === "undefined") return;
      const url = new URL("/login", window.location.origin);
      if (returnTo) url.searchParams.set("returnTo", returnTo);
      window.location.href = url.toString();
    },
    loginWithProvider: () => {
      throw new Error("Login sosial tidak tersedia pada mode database lokal. Gunakan email dan kata sandi.");
    },
  },
  entities: new Proxy(
    {},
    {
      get: () => ({
        filter: async () => [],
        get: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
      }),
    },
  ),
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: "" }),
    },
  },
};

export const base44 = db;
export default db;
