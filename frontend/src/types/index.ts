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
  description?: string;
  service_code?: string;
  default_validity_years?: number;
  currency?: string;
  issuance_fee?: number;
  maintenance_fee?: number;
  account_type_binding?: string;
  version?: number;
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
  has_pending_change?: boolean;
  pending_work_item_id?: number | null;
  pending_work_item_number?: string | null;
  pending_operation_code?: string | null;
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

export interface CardSegment {
  id: number;
  client_id: number;
  segment_code: string;
  segment_name: string;
  priority: number;
  active: boolean;
  created_by: string;
  created_date?: string;
  last_modified_by?: string | null;
  last_modified_date?: string | null;
  assigned_programmes_count?: number;
  has_pending_change?: boolean;
  pending_work_item_id?: number | null;
  pending_work_item_number?: string | null;
  pending_operation_code?: string | null;
}

export interface CardSegmentProgrammeRead {
  id: number;
  client_id: number;
  segment_id: number;
  card_programme_id: number;
  card_programme_code: string;
  card_programme_name: string;
  card_brand: string;
  priority: number;
  description?: string;
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
  id: string | number;
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

export interface WorkItemRead {
  id: number;
  work_item_number: string;
  client_id: number;
  entity_type_code: string;
  entity_id: number;
  operation_code: string;
  status_code: string;
  checker_user_id?: string | null;
  approved_date?: string | null;
  rejected_date?: string | null;
  cancelled_date?: string | null;
  active: boolean;
  created_by: string;
  created_date: string;
  last_modified_by?: string | null;
  last_modified_date?: string | null;
}

export interface WorkItemPayloadRead {
  work_item_id: number;
  entity_name?: string | null;
  before_payload?: string | null;
  after_payload: string;
  created_by: string;
  created_date: string;
}

export interface WorkItemActionRead {
  id: number;
  work_item_id: number;
  action_sequence: number;
  operation_code: string;
  status_code: string;
  action_by: string;
  remarks?: string | null;
  action_date: string;
  created_by: string;
  created_date: string;
  change_summary?: string | null;
}
