import {
  CardProgramme,
  CardProgrammeFormData,
  CardProgrammeSegment,
  ProgrammeChargeHeader,
  AuditLogItem,
  ProgrammeReferenceItem,
  CardType,
  UserInfo,
  IAMRole,
  IAMPermission,
} from '../types'
import { apiClient } from './apiClient'
import { authService, LoginResponse } from './auth'

// Mock Data for Master Detail Sub-Tabs (Segments, Charges, Audit Logs, References)
const MOCK_SEGMENTS: Record<number, CardProgrammeSegment[]> = {
  1: [
    { id: 101, segment_code: 'SEG_RETAIL', segment_name: 'Retail Banking Segment', priority: 1, is_default: true, active: true, charge_profile_name: 'Standard Retail Fee' },
    { id: 102, segment_code: 'SEG_YOUTH', segment_name: 'Youth & Student Account', priority: 2, is_default: false, active: true, charge_profile_name: 'Discounted Youth Fee' },
  ],
  2: [
    { id: 103, segment_code: 'SEG_HNI', segment_name: 'High Net Worth Individuals', priority: 1, is_default: true, active: true, charge_profile_name: 'Premium HNI Fee' },
  ],
  3: [
    { id: 104, segment_code: 'SEG_CORP', segment_name: 'Corporate Executive Segment', priority: 1, is_default: true, active: true, charge_profile_name: 'Corporate Waiver Fee' },
  ],
}

const MOCK_CHARGES: Record<number, ProgrammeChargeHeader[]> = {
  1: [
    {
      id: 201,
      header_name: 'Verve Classic Issuance Charges',
      category: 'Issuance',
      description: 'Standard debit card issuance fee and VAT for new requests.',
      entries: [
        { id: 1, charge_type: 'ISSUANCE_FEE', amount: 1000.0, currency: 'NGN' },
        { id: 2, charge_type: 'VAT_TAX', amount: 75.0, currency: 'NGN' },
      ],
    },
    {
      id: 202,
      header_name: 'Verve Classic Replacement Charges',
      category: 'Replacement',
      description: 'Card replacement fee for damaged or lost cards.',
      entries: [
        { id: 3, charge_type: 'REPLACEMENT_FEE', amount: 1000.0, currency: 'NGN' },
        { id: 4, charge_type: 'VAT_TAX', amount: 75.0, currency: 'NGN' },
      ],
    },
  ],
}

const MOCK_AUDIT_LOGS: Record<number, AuditLogItem[]> = {
  1: [
    {
      id: 501,
      event_time: '2026-07-29T14:15:00Z',
      performed_by: 'admin',
      action: 'UPDATE',
      source: 'SCR-003 Master Screen',
      remarks: 'Updated programme active status to Active.',
      details: [{ field: 'active', old_val: 'false', new_val: 'true' }],
    },
    {
      id: 500,
      event_time: '2026-07-25T10:00:00Z',
      performed_by: 'system',
      action: 'CREATE',
      source: 'System Migration',
      remarks: 'Initial card programme record created.',
    },
  ],
}

const MOCK_REFERENCES: Record<number, ProgrammeReferenceItem[]> = {
  1: [
    { id: 'R-1', category: 'Request Types', reference_name: 'Standard Card Issuance', reference_code: 'REQ_NEW_CARD', status: 'Active' },
    { id: 'R-2', category: 'Eligibility Rules', reference_name: 'Retail Minimum Balance Check (NGN 1,000)', reference_code: 'RULE_MIN_BAL', status: 'Active' },
    { id: 'R-3', category: 'Card Requests', reference_name: 'Active Customer Requests Linked', reference_code: 'REQ_COUNT', status: 'Linked', item_count: 1420 },
    { id: 'R-4', category: 'Templates', reference_name: 'Verve Card Production Notification', reference_code: 'TPL_SMS_VERVE', status: 'Active' },
    { id: 'R-5', category: 'Branches', reference_name: 'Main Branch (001), Ikeja Branch (002)', reference_code: 'BRANCH_ALL', status: 'Enabled', item_count: 12 },
  ],
}

export const apiService = {
  /**
   * Authenticates user against FastAPI /auth/login and stores JWT token.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (res && res.access_token) {
      authService.setToken(res.access_token)
    }
    return res
  },

  /**
   * Fetches current authenticated user details from /auth/me.
   */
  async getCurrentUser(): Promise<UserInfo> {
    return apiClient<UserInfo>('/auth/me')
  },

  /**
   * Fetches active IAM roles from /auth/roles.
   */
  async getIAMRoles(): Promise<IAMRole[]> {
    return apiClient<IAMRole[]>('/auth/roles')
  },

  /**
   * Fetches active IAM permissions for current user from /auth/permissions.
   */
  async getIAMPermissions(): Promise<IAMPermission[]> {
    return apiClient<IAMPermission[]>('/auth/permissions')
  },

  /**
   * Fetches card types from /config/card-types.
   */
  async getCardTypes(): Promise<CardType[]> {
    return apiClient<CardType[]>('/config/card-types')
  },

  /**
   * Fetches card programmes from FastAPI endpoint /config/card-programmes.
   */
  async getCardProgrammes(): Promise<CardProgramme[]> {
    const data = await apiClient<any[]>('/config/card-programmes')
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        ...item,
        bin: item.bin || (item.card_type === 'VISA' ? '412345' : item.card_type === 'MCARD' ? '512345' : '506118'),
        platform_indicator: item.platform_indicator || 'POSTILION_V2',
        pan_length: item.pan_length || 16,
        sequence: item.sequence || item.id,
        min_random_number: item.min_random_number || 100000,
        max_random_number: item.max_random_number || 999999,
        output_path: item.output_path || null,
        table_prefix: item.table_prefix || 'TBL_CP_',
        fep_programme_id: item.fep_programme_id || `FEP_${item.card_programme_code}`,
        instant_card_type: item.instant_card_type || 'INSTANT_STANDARD',
        payment_ref_prefix: item.payment_ref_prefix || 'PAY_REF_',
        assigned_segment_group: item.assigned_segment_group || 'Retail Segment (01)',
        pp_bin: item.pp_bin || '901234',
        segment_count: item.segment_count || (item.id % 2 === 0 ? 3 : 2),
        charge_header_count: item.charge_header_count || (item.id % 3 === 0 ? 2 : 1),
        charge_header_name: item.charge_header_name || `${item.card_type} Standard Fee Profile`,
      }))
    }
    return []
  },

  /**
   * Fetches single card programme by ID from FastAPI endpoint /config/card-programmes/{id}.
   */
  async getCardProgrammeById(id: number): Promise<CardProgramme> {
    const item = await apiClient<any>(`/config/card-programmes/${id}`)
    return {
      ...item,
      bin: item.bin || (item.card_type === 'VISA' ? '412345' : item.card_type === 'MCARD' ? '512345' : '506118'),
      platform_indicator: item.platform_indicator || 'POSTILION_V2',
      pan_length: item.pan_length || 16,
      sequence: item.sequence || item.id,
      min_random_number: item.min_random_number || 100000,
      max_random_number: item.max_random_number || 999999,
      output_path: item.output_path || null,
      table_prefix: item.table_prefix || 'TBL_CP_',
      fep_programme_id: item.fep_programme_id || `FEP_${item.card_programme_code}`,
      instant_card_type: item.instant_card_type || 'INSTANT_STANDARD',
      payment_ref_prefix: item.payment_ref_prefix || 'PAY_REF_',
      assigned_segment_group: item.assigned_segment_group || 'Retail Segment (01)',
      pp_bin: item.pp_bin || '901234',
      segment_count: item.segment_count || (item.id % 2 === 0 ? 3 : 2),
      charge_header_count: item.charge_header_count || (item.id % 3 === 0 ? 2 : 1),
      charge_header_name: item.charge_header_name || `${item.card_type} Standard Fee Profile`,
    }
  },

  /**
   * Fetches programme segment mappings.
   */
  async getCardProgrammeSegments(programmeId: number): Promise<CardProgrammeSegment[]> {
    return MOCK_SEGMENTS[programmeId] || [
      { id: 99, segment_code: 'SEG_GENERIC', segment_name: 'General Account Segment', priority: 1, is_default: true, active: true, charge_profile_name: 'Standard Fee Profile' },
    ]
  },

  /**
   * Fetches programme charge headers.
   */
  async getCardProgrammeCharges(programmeId: number): Promise<ProgrammeChargeHeader[]> {
    return MOCK_CHARGES[programmeId] || [
      {
        id: 999,
        header_name: 'Standard Programme Issuance Fee',
        category: 'Issuance',
        description: 'Default card issuance charge structure.',
        entries: [
          { id: 91, charge_type: 'ISSUANCE_FEE', amount: 1000.0, currency: 'NGN' },
          { id: 92, charge_type: 'VAT_TAX', amount: 75.0, currency: 'NGN' },
        ],
      },
    ]
  },

  /**
   * Fetches programme audit log timeline.
   */
  async getCardProgrammeAuditLogs(programmeId: number): Promise<AuditLogItem[]> {
    return MOCK_AUDIT_LOGS[programmeId] || [
      {
        id: 9001,
        event_time: new Date().toISOString(),
        performed_by: 'system',
        action: 'CREATE',
        source: 'System Initialization',
        remarks: 'System initialized record.',
      },
    ]
  },

  /**
   * Fetches programme entity references.
   */
  async getCardProgrammeReferences(programmeId: number): Promise<ProgrammeReferenceItem[]> {
    return MOCK_REFERENCES[programmeId] || [
      { id: 'REF-1', category: 'Request Types', reference_name: 'Card Issuance Request', reference_code: 'REQ_CARD', status: 'Active' },
      { id: 'REF-2', category: 'Card Requests', reference_name: 'Linked Card Requests', reference_code: 'REQ_COUNT', status: 'Linked', item_count: 50 },
    ]
  },

  async createCardProgramme(payload: Partial<CardProgramme>, tenantId: number = 1): Promise<any> {
    return apiClient<any>('/config/card-programmes', {
      method: 'POST',
      body: JSON.stringify({
        client_id: tenantId,
        ...payload,
      }),
    })
  },

  /**
   * Updates a card programme via PUT /config/card-programmes/{id}.
   */
  async updateCardProgramme(id: number, payload: Partial<CardProgramme>): Promise<any> {
    return apiClient<any>(`/config/card-programmes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Activates a card programme via POST /config/card-programmes/{id}/activate.
   */
  async activateCardProgramme(id: number): Promise<any> {
    return apiClient<any>(`/config/card-programmes/${id}/activate`, {
      method: 'POST',
    })
  },

  /**
   * Deactivates a card programme via POST /config/card-programmes/{id}/deactivate.
   */
  async deactivateCardProgramme(id: number): Promise<any> {
    return apiClient<any>(`/config/card-programmes/${id}/deactivate`, {
      method: 'POST',
    })
  },

  /**
   * Toggles card programme active status.
   */
  async toggleCardProgrammeStatus(id: number, active: boolean, currentItem?: CardProgramme): Promise<any> {
    if (active) {
      return this.activateCardProgramme(id)
    } else {
      return this.deactivateCardProgramme(id)
    }
  },

  /**
   * Submits a work item to Maker-Checker queue via POST /maker-checker/work-items.
   */
  async submitMakerCheckerWorkItem(workPayload: {
    entity_type: string
    entity_id?: string | number
    operation: 'CREATE' | 'UPDATE' | 'DELETE'
    maker_remarks?: string
    payload: Record<string, any>
  }): Promise<{ work_item_id: number; status: string }> {
    return apiClient<{ work_item_id: number; status: string }>('/maker-checker/work-items', {
      method: 'POST',
      body: JSON.stringify(workPayload),
    })
  },

  // ==========================================
  // CARD SEGMENTS API (SCR-004)
  // ==========================================

  async getCardSegments(params?: { active?: boolean; q?: string }): Promise<import('../types').CardSegment[]> {
    const queryParams = new URLSearchParams()
    if (params?.active !== undefined) {
      queryParams.append('active', String(params.active))
    }
    if (params?.q) {
      queryParams.append('q', params.q)
    }
    const queryString = queryParams.toString()
    const url = `/config/card-segments${queryString ? `?${queryString}` : ''}`
    return apiClient<import('../types').CardSegment[]>(url)
  },

  async getCardSegmentById(id: number): Promise<import('../types').CardSegment> {
    return apiClient<import('../types').CardSegment>(`/config/card-segments/${id}`)
  },

  async createCardSegment(payload: { segment_code: string; segment_name: string; priority?: number }): Promise<any> {
    return apiClient<any>('/config/card-segments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateCardSegment(id: number, payload: { segment_name?: string; priority?: number }): Promise<any> {
    return apiClient<any>(`/config/card-segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async activateCardSegment(id: number): Promise<any> {
    return apiClient<any>(`/config/card-segments/${id}/activate`, {
      method: 'POST',
    })
  },

  async deactivateCardSegment(id: number): Promise<any> {
    return apiClient<any>(`/config/card-segments/${id}/deactivate`, {
      method: 'POST',
    })
  },

  async getSegmentProgrammes(segmentId: number): Promise<import('../types').CardSegmentProgrammeRead[]> {
    return apiClient<import('../types').CardSegmentProgrammeRead[]>(`/config/card-segments/${segmentId}/programmes`)
  },

  async assignSegmentProgramme(segmentId: number, payload: { card_programme_id: number; description?: string }): Promise<any> {
    return apiClient<any>(`/config/card-segments/${segmentId}/programmes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async removeSegmentProgramme(segmentId: number, programmeId: number): Promise<any> {
    return apiClient<any>(`/config/card-segments/${segmentId}/programmes/${programmeId}`, {
      method: 'DELETE',
    })
  },

  async reorderSegmentProgramme(segmentId: number, payload: { card_programme_id: number; direction: 'UP' | 'DOWN' }): Promise<any> {
    return apiClient<any>(`/config/card-segments/${segmentId}/programmes/reorder`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // ==========================================
  // MAKER / CHECKER WORK QUEUE API
  // ==========================================

  async getPendingWorkItemCount(): Promise<{ count: number }> {
    return apiClient<{ count: number }>('/maker-checker/pending/count')
  },

  async getPendingWorkItems(): Promise<import('../types').WorkItemRead[]> {
    return apiClient<import('../types').WorkItemRead[]>('/maker-checker/pending')
  },

  async getWorkItemById(id: number): Promise<import('../types').WorkItemRead> {
    return apiClient<import('../types').WorkItemRead>(`/maker-checker/${id}`)
  },

  async getWorkItemPayload(id: number): Promise<import('../types').WorkItemPayloadRead> {
    return apiClient<import('../types').WorkItemPayloadRead>(`/maker-checker/${id}/payload`)
  },

  async getWorkItemHistory(id: number): Promise<import('../types').WorkItemActionRead[]> {
    return apiClient<import('../types').WorkItemActionRead[]>(`/maker-checker/${id}/history`)
  },

  async approveWorkItem(id: number, remarks?: string): Promise<import('../types').WorkItemRead> {
    return apiClient<import('../types').WorkItemRead>(`/maker-checker/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    })
  },

  async rejectWorkItem(id: number, remarks?: string): Promise<import('../types').WorkItemRead> {
    return apiClient<import('../types').WorkItemRead>(`/maker-checker/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    })
  },
}
