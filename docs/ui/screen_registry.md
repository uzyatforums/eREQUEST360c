Normative Reference: All screens and components described in this document shall conform to docs/ui/ui_standards.md.

# eREQUEST360 Screen Registry & Module Architecture

## SCR-003 Card Programmes Master (Reference Implementation)

### Architectural Pattern
Dedicated **Master → Detail Navigation Architecture** (React Router True Route-Based Navigation) serving as the benchmark reference implementation for all eREQUEST360 configuration modules.

### Frontend React Router Routes
- `/card-programmes` (Management Master List with sortable headers & row selection)
- `/card-programmes/new` (Full-Width 5-Section Create Maintenance Form Page)
- `/card-programmes/:id` (Aggregate Parent Details Inspector)
- `/card-programmes/:id/edit` (Full-Width 5-Section Edit Maintenance Form Page with Read-Only Audit Log)
- `/card-programmes/:id/segments` (Customer Segment Eligibility Workspace with Segment Lookups)
- `/card-programmes/:id/charges` (Fee Profiles Workspace with GL Account Lookups & NGN Ledger)
- `/card-programmes/:id/references` (Integration Mapping Workspace with Target Systems)
- `/card-programmes/:id/audit` (Audit Trail & Maker-Checker History Workspace)

### Key Specifications & Standards
1. **Full-Width Maintenance Form**:
   - Section 1: General Product Identity (Code, Name, Description, Brand, Active Status)
   - Section 2: Card Scheme & BIN Parameters (BIN, Platform Indicator, Service Code, Default Expiry, PAN Length)
   - Section 3: Financial & Pricing Rules (Base Currency NGN, Issuance Fee ₦, Maintenance Fee ₦, Account Binding)
   - Section 4: Operational & System Controls (Instant Print, NFC Contactless, PIN Mailer, Web 3DS, ATM Dispense)
   - Section 5: Audit Metadata (Read-only system log displaying Created By, Created Date, Modified By, Modified Date, Version)
2. **Nigerian Currency Formatting**: Standardized to `NGN` in data grids and `₦` prefix on monetary inputs.
3. **Sortable Column Headers**: Reusable `SortableHeader` component with chevron direction indicators on all master and child grids.
4. **DataGrid Row Selection Framework**: `useRowSelection` hook, `Checkbox` with `indeterminate` state, and `SelectionToolbar`.

### Backend API Endpoints (Unchanged)
- `GET /config/card-programmes`
- `POST /config/card-programmes`
- `PUT /config/card-programmes/{id}`
- `DELETE /config/card-programmes/{id}`

### Route Separation Standard

The eREQUEST360 frontend uses React Router with clean business-oriented URLs. Frontend routes **must never** reuse backend REST API paths.

Reserved backend API prefixes include: `/auth`, `/config`, `/iam`, `/maker-checker`, `/eligibility`, `/request`, `/audit`.

| Frontend | Backend API |
|----------|-------------|
| `/card-programmes` | `/config/card-programmes` |
| `/branches` | `/config/branches` |
| `/card-types` | `/config/card-types` |
| `/users` | `/iam/users` |
| `/roles` | `/iam/roles` |

### Child Operations

**Segments (`/card-programmes/:id/segments`)**
- Assign Segment drawer with structured segment code lookups (`SEG_MASS_RETAIL`, `SEG_AFFLUENT_VIP`, `SEG_CORPORATE`, `SEG_STAFF`)
- Remove Segment
- Priority Rank evaluation (P1, P2...)
- Default Fallback Flag

**Charges (`/card-programmes/:id/charges`)**
- Add Fee Entry drawer with GL Account lookups (`GL_3002938491`, `GL_2001928374`, `GL_4009283741`)
- Multi-column Posting Ledger (Sequence, DR/CR, Narration, GL Account, Amount ₦, Currency NGN)

**References (`/card-programmes/:id/references`)**
- Target Integration System Mappings (`FLEXCUBE_V12`, `POSTILION_HOST`, `FIRS_TAX_ENGINE`)
- Core Banking Code, Switch Product ID, Network Scheme Code

**Audit (`/card-programmes/:id/audit`)**
- Read-Only Timeline & Change Audit History Table with Initiating User, Action, Field Modified, Old/New Values, Maker/Checker