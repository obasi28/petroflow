import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from "@/types/api";

const TOKEN_KEY = "petroflow_token";
const USER_KEY = "petroflow_user";

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
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Invalid email or password");
  }

  const data: { status: string; data: AuthTokens } = await res.json();
  const token = data.data.access_token;

  // Fetch user profile
  const profileRes = await fetch("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!profileRes.ok) {
    throw new Error("Failed to fetch user profile");
  }

  const profileData: { status: string; data: UserProfile } = await profileRes.json();
  const user = profileData.data;

  setAuth(token, user);
  return { token, user };
}

export async function register(data: RegisterRequest): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || "Registration failed");
  }

  // Auto-login after registration
  return login({ email: data.email, password: data.password });
}

export function logout(): void {
  clearAuth();
  window.location.href = "/login";
}
