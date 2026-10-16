// Production snapshots are extensible: preserve fields not known by this version.
export interface RmsState {
  [field: string]: any;
  projects: any[];
  leads: any[];
  tasks: any[];
  audit: any[];
  escalations?: any[];
}
export interface StateRow {
  version: number;
  data: string;
  updated_at?: string;
}
export interface FileRow {
  id: string;
  object_key: string;
  original_name: string;
  content_type: string;
  size: number;
  entity_type: string;
  entity_id: string;
}
