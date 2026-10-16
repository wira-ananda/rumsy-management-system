export interface AuthUser {
  id: number | string;
  email: string;
  full_name: string;
  role: string;
  scope_name: string | null;
  active: number;
  must_change_password: number;
  session_id?: string;
  refresh_session_id?: string;
  expires_at?: string;
}
export interface UserRow extends AuthUser {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
}
export interface SessionUser {
  id: number | string;
  email: string;
  name: string;
  role: string;
  scopeName: string;
  mustChangePassword: boolean;
}
