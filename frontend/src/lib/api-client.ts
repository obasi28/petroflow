import type { ApiResponse } from "@/types/api";

const API_BASE = "/api/v1";

function isDemoToken(token: string | null): boolean {
  return !!token && token.startsWith("demo-token-");
}

function canUseDevAuthFallback(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === "true";
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("petroflow_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("petroflow_token");
          // In development demo mode, keep local auth and avoid redirect loops.
          if (!(canUseDevAuthFallback() && isDemoToken(token))) {
            localStorage.removeItem("petroflow_token");
            localStorage.removeItem("petroflow_user");
            window.location.href = "/login";
          }
        }
      }

      const errorBody = await response.json().catch(() => null);
      return {
        status: "error",
        data: null,
        meta: null,
        errors: errorBody?.errors || [
          {
            code: `HTTP_${response.status}`,
            message: errorBody?.detail || response.statusText,
          },
        ],
      };
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async del<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async upload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("petroflow_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();
