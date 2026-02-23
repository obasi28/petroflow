export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T | null;
  meta: PaginationMeta | null;
  errors: ErrorDetail[] | null;
}

export interface PaginatedParams {
  page?: number;
  per_page?: number;
}

export interface AuthTokens {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  team_id: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}
