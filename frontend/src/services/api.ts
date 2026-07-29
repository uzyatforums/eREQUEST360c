import { CardProgramme, CardProgrammeFormData, UserInfo } from '../types'

// Default Mock Data in case backend is loading or standalone
const MOCK_CARD_PROGRAMMES: CardProgramme[] = [
  {
    id: 1,
    client_id: 100,
    card_programme_code: 'APEX_VERVE_CLASSIC',
    card_programme_name: 'Apex Verve Classic',
    card_type: 'VERVE',
    active: true,
    created_by: 'system',
    created_date: '2026-07-25T10:00:00Z',
    assigned_segment_group: 'Retail Segment (01)',
    charge_header_name: 'Verve Classic Fee (NGN 1,000 + VAT)',
  },
  {
    id: 2,
    client_id: 100,
    card_programme_code: 'APEX_VISA_GOLD',
    card_programme_name: 'Apex Visa Gold',
    card_type: 'VISA',
    active: true,
    created_by: 'system',
    created_date: '2026-07-25T11:30:00Z',
    assigned_segment_group: 'HNI Segment (02)',
    charge_header_name: 'Visa Gold Fee (NGN 1,500 + VAT)',
  },
  {
    id: 3,
    client_id: 200,
    card_programme_code: 'GLOBAL_MC_PLATINUM',
    card_programme_name: 'Global Mastercard Platinum',
    card_type: 'MASTERCARD',
    active: true,
    created_by: 'system',
    created_date: '2026-07-26T09:15:00Z',
    assigned_segment_group: 'HNI Segment (02)',
    charge_header_name: 'Mastercard Platinum Fee (NGN 2,500 + VAT)',
  },
]

let inMemoryProgrammes: CardProgramme[] = [...MOCK_CARD_PROGRAMMES]

export const apiService = {
  // Fetch Current Auth User
  async getCurrentUser(): Promise<UserInfo> {
    try {
      const res = await fetch('/auth/me')
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }
    return {
      user_id: 'admin',
      username: 'admin',
      client_id: 100,
      branch_code: '001',
      roles: ['branch_submitter', 'branch_authorizer', 'super_admin'],
    }
  },

  // Fetch Card Programmes
  async getCardProgrammes(): Promise<CardProgramme[]> {
    try {
      const res = await fetch('/config/card-programmes')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            assigned_segment_group: item.assigned_segment_group || 'Retail Segment (01)',
            charge_header_name: item.charge_header_name || `${item.card_type} Fee (NGN 1,000 + VAT)`,
          }))
        }
      }
    } catch {
      // Fallback to mock memory
    }
    return [...inMemoryProgrammes]
  },

  // Create Card Programme
  async createCardProgramme(payload: CardProgrammeFormData, tenantId: number): Promise<CardProgramme> {
    try {
      const res = await fetch('/config/table/card_programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: tenantId,
          ...payload,
          created_by: 'admin',
        }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    const newProgramme: CardProgramme = {
      id: Math.max(...inMemoryProgrammes.map((p) => p.id), 0) + 1,
      client_id: tenantId,
      card_programme_code: payload.card_programme_code,
      card_programme_name: payload.card_programme_name,
      card_type: payload.card_type,
      active: payload.active,
      created_by: 'admin',
      created_date: new Date().toISOString(),
      assigned_segment_group: 'Retail Segment (01)',
      charge_header_name: `${payload.card_type} Default Charges`,
    }
    inMemoryProgrammes.push(newProgramme)
    return newProgramme
  },

  // Update Card Programme
  async updateCardProgramme(id: number, payload: CardProgrammeFormData): Promise<CardProgramme> {
    try {
      const res = await fetch(`/config/table/card_programmes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    const index = inMemoryProgrammes.findIndex((p) => p.id === id)
    if (index !== -1) {
      inMemoryProgrammes[index] = {
        ...inMemoryProgrammes[index],
        ...payload,
        last_modified_by: 'admin',
        last_modified_date: new Date().toISOString(),
      }
      return inMemoryProgrammes[index]
    }
    throw new Error('Card Programme not found')
  },
}
