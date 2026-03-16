export type UserRole = 'superadmin' | 'admin' | 'employee' | 'upa_user';

export interface UpaLegUser {
  name: string;
  upa_id: string;
}

export interface User {
  id: string;
  email: string | null;
  mobile: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  upa_id: string | null;
  photo_url: string | null;
  wallet_balance: string | null;
  department: string | null;
  permissions: string[] | null;
  date_joined: string;
  is_active: boolean;
  upa_parent: UpaLegUser | null;
  upa_legs: { L: UpaLegUser | null; M: UpaLegUser | null; R: UpaLegUser | null } | null;
  // backward compat
  created_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LegacyAuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface AdminLoginRequest   { identifier: string; password: string; }
export interface UPALoginRequest     { mobile: string; password: string; }
export interface UPARegisterRequest  { name: string; mobile: string; password: string; upa_ref_id?: string; add_standalone?: boolean; }
export interface UPARegisterResponse { success: boolean; suggest_standalone?: boolean; message?: string; access?: string; refresh?: string; user?: User; }
export interface EmployeeCreateRequest { name: string; email?: string; mobile?: string; password: string; department: string; role: 'employee'; permissions: string[]; }

// Keep existing types for backward compat
export interface LoginPayload  { email: string; password: string; }
export interface RegisterPayload { email: string; first_name: string; last_name: string; password: string; password_confirm: string; }

export interface RefreshResponse {
  access: string;
  refresh: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}
