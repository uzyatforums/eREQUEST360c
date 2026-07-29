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
  // Extended details for presentation
  assigned_segment_group?: string;
  charge_header_name?: string;
}



export interface UserInfo {
  user_id: string;
  username: string;
  client_id: number;
  branch_code?: string;
  roles: string[];
}

export interface CardProgrammeFormData {
  card_programme_code: string;
  card_programme_name: string;
  card_type: string;
  active: boolean;
}
