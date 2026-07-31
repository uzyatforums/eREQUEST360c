export type StatusType = 
  | 'PENDING' 
  | 'PENDING_APPROVAL' 
  | 'PENDING_AUTHORIZATION' 
  | 'APPROVED' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'HOTLISTED' 
  | 'SETTLEMENT_FAILED' 
  | 'ACTIVE' 
  | 'INACTIVE';

export interface CardProgramme {
  id: number;
  client_id: number;
  card_programme_code: string;
  card_programme_name: string;
  card_type: string;
  active: boolean;
  created_by: string;
  created_date?: string;
  last_modified_by?: string | null;
  last_modified_date?: string | null;
  // Extended Banking Configuration Parameters
  bin?: string;
  platform_indicator?: string;
  pan_length?: number;
  sequence?: number;
  min_random_number?: number;
  max_random_number?: number;
  output_path?: string;
  table_prefix?: string;
  fep_programme_id?: string;
  instant_card_type?: string;
  payment_ref_prefix?: string;
  assigned_segment_group?: string;
  pp_bin?: string;
  segment_count?: number;
  charge_header_count?: number;
  charge_header_name?: string;
}

export interface CardProgrammeSegment {
  id: number;
  segment_code: string;
  segment_name: string;
  priority: number;
  is_default: boolean;
  active: boolean;
  charge_profile_name: string;
}

export interface ChargeEntry {
  id: number;
  charge_type: string;
  amount: number;
  currency: string;
}

export interface ProgrammeChargeHeader {
  id: number;
  header_name: string;
  category: 'Issuance' | 'Replacement' | 'Renewal' | 'PIN' | 'Hotlist';
  description: string;
  entries: ChargeEntry[];
}

export interface AuditLogItem {
  id: number;
  event_time: string;
  performed_by: string;
  action: string;
  source: string;
  remarks: string;
  timestamp?: string;
  user?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  maker?: string;
  checker?: string;
  details?: { field: string; old_val: string; new_val: string }[];
}

export interface ProgrammeReferenceItem {
  id: string;
  category: 'Request Types' | 'Eligibility Rules' | 'Card Requests' | 'Templates' | 'Branches';
  reference_name: string;
  reference_code: string;
  status: string;
  item_count?: number;
}

export interface UserInfo {
  user_id: string;
  username: string;
  client_id: number;
  branch_code?: string;
  roles: string[];
}

export interface IAMRole {
  role_code: string;
  role_name: string;
  description?: string;
  is_maker: boolean;
  is_checker: boolean;
  active: boolean;
}

export interface IAMPermission {
  permission_code: string;
  module_name?: string;
  permission_name: string;
  description?: string;
  active: boolean;
}

export interface CardType {
  card_type: string;
  description?: string;
  client_id?: number | null;
  active: boolean;
}

export interface CardProgrammeFormData {
  card_programme_code: string;
  card_programme_name: string;
  card_type: string;
  active: boolean;
}
