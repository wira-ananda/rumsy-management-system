export interface Session {
  id: string | number;
  role: string;
  name: string;
  email: string;
  scopeName: string;
  mustChangePassword?: boolean;
}
export interface DirectoryUser {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  scopeName?: string;
}
export interface NavigationItem {
  section: string;
  label: string;
  icon: string;
  route: string;
  roles: string[];
}
export interface Route {
  page: string;
  id?: string;
  tab?: string;
}
export interface RuntimeState {
  // Existing business JSON remains open to preserve unknown production fields.
  data: Record<string, any> | null;
  session: Session | null;
  stateVersion: number;
  saveChain: Promise<unknown>;
  salesDirectory: DirectoryUser[];
  userDirectory: DirectoryUser[];
}
export interface ProgressPhoto {
  id?: string;
  fileId?: string;
  name?: string;
}
export interface ProgressReport {
  id: string;
  date?: string;
  start?: string;
  end?: string;
  progress: number;
  targetProgress?: number;
  activities?: string;
  issues?: string;
  nextPlan?: string;
  fileId?: string;
  fileName?: string;
  photos?: ProgressPhoto[];
}
export interface PublicProject {
  id: string;
  name: string;
  location: string;
  status: string;
  progress: number;
  startDate?: string;
  targetFinish?: string;
  daily: ProgressReport[];
  weekly: ProgressReport[];
}
