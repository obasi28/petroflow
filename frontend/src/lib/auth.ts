import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from "@/types/api";

const TOKEN_KEY = "petroflow_token";
const USER_KEY = "petroflow_user";

function buildDemoUser(email?: string): UserProfile {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: email || "demo@petroflow.local",
    name: "Demo Engineer",
    team_id: "00000000-0000-0000-0000-000000000001",
    role: "owner",
    created_at: new Date().toISOString(),
  };
}

function canUseDevAuthFallback(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === "true";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function setAuth(token: string, user: UserProfile): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(credentials: LoginRequest): Promise<{ token: string; user: UserProfile }> {
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Login failed" }));
      const message = error.detail || error.errors?.[0]?.message || "Invalid email or password";

      // Development preview fallback when backend/database is unavailable.
      if (canUseDevAuthFallback() && res.status >= 500) {
        const demoUser = buildDemoUser(credentials.email);
        const demoToken = `demo-token-${Date.now()}`;
        setAuth(demoToken, demoUser);
        return { token: demoToken, user: demoUser };
      }

      throw new Error(message);
    }

    const data: { status: string; data: AuthTokens } = await res.json();
    const token = data.data.token;

    // Fetch full user profile (includes team_id and role)
    const profileRes = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileRes.ok) {
      if (canUseDevAuthFallback() && profileRes.status >= 500) {
        const demoUser = buildDemoUser(credentials.email);
        setAuth(token, demoUser);
        return { token, user: demoUser };
      }
      throw new Error("Failed to fetch user profile");
    }

    const profileData: { status: string; data: UserProfile } = await profileRes.json();
    const user = profileData.data;

    setAuth(token, user);
    return { token, user };
  } catch (err) {
    if (canUseDevAuthFallback()) {
      const demoUser = buildDemoUser(credentials.email);
      const demoToken = `demo-token-${Date.now()}`;
      setAuth(demoToken, demoUser);
      return { token: demoToken, user: demoUser };
    }
    throw err;
  }
}

export async function register(data: RegisterRequest): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || error.errors?.[0]?.message || "Registration failed");
  }

  // Auto-login after registration
  return login({ email: data.email, password: data.password });
}

export function logout(): void {
  clearAuth();
  window.location.href = "/login";
}
