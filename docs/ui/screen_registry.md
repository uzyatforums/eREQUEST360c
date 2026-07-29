# eREQUEST360 Master Screen Registry

**Version:** 1.1  
**Status:** Official UI Architecture Specification  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  

---

## 1. Overview & Architectural Rules

The Screen Registry assigns a immutable Screen Code (`SCR-001`, `SCR-002`, etc.) to every user interface in eREQUEST360. All frontend routes, permission guard checks, wireframes, and documentation must reference these screen codes.

### Hierarchy & Navigation Rules
1. **Master-Detail Inheritance:** Master configuration entities (e.g. Card Segments `SCR-012`) own their child relationship tables via tabbed views or drawers rather than exposing relationship tables as top-level menu items.
2. **Permission Scoping:** Access to screens is guarded by backend permissions (`config.view`, `request.create`, `user.manage`, etc.).
3. **Reference Implementation:** `SCR-003` (Card Programmes) serves as the canonical UI reference implementation that all configuration screens follow.

---

## 2. Master Screen Registry Table

| Screen Code | Screen Name | Module | Parent Screen | Primary Table | Related Tables | API Endpoints | Required Permissions | Status |
|-------------|-------------|--------|---------------|---------------|----------------|---------------|----------------------|--------|
| `SCR-001` | **Login Screen** | `IAM / Auth` | None | `iam.users` | `iam.roles` | `POST /auth/login`, `GET /auth/me` | Public | Completed |
| `SCR-002` | **Executive & Operations Dashboard** | `Dashboard` | None | `request.requests` | `maker_checker_work_items`, `config.clients` | `GET /requests/`, `GET /maker-checker/work-items` | `request.view` | Completed (Wireframe/Mock) |
| `SCR-003` | **Card Programmes Master** | `Configuration` | None | `config.card_programmes` | `config.card_types`, `config.card_segment_programme_charges` | `GET /config/card-programmes`, `POST /config/table/card_programmes`, `PUT /config/table/card_programmes/{id}` | `config.view`, `config.manage` | **Reference Implemented (React+TS)** |
| `SCR-004` | **User Accounts Directory** | `IAM` | None | `iam.users` | `iam.roles`, `iam.user_branches`, `config.branches` | `GET /users/`, `POST /users/`, `PUT /users/{id}` | `user.manage` | Completed (Wireframe) |
| `SCR-005` | **Roles & Permissions Matrix** | `IAM` | None | `iam.roles` | `iam.permissions`, `iam.role_permissions` | `GET /roles/`, `POST /config/table/roles`, `POST /config/table/role_permissions` | `user.manage` (super_admin) | Completed (Wireframe) |
| `SCR-006` | **Branch Directory** | `Configuration` | None | `config.branches` | `config.clients` | `GET /branches/`, `POST /branches/` | `config.view`, `config.manage` | Completed (Wireframe) |
| `SCR-007` | **New Card Request Wizard** | `Card Requests` | None | `request.requests` | `config.card_programmes`, `config.card_segment_eligibility`, `config.card_segment_programme_charges` | `POST /requests/`, `GET /eligibility/account/{acc}`, `POST /eligibility/duplicate-check` | `request.create` | Completed (Wireframe) |
| `SCR-008` | **All Requests Catalog** | `Card Requests` | None | `request.requests` | `config.card_programmes`, `config.branches`, `request.request_status_history` | `GET /requests/` | `request.view` | Completed (Wireframe) |
| `SCR-009` | **Request Details Inspector** | `Card Requests` | `SCR-008` | `request.requests` | `request.request_status_history`, `eligibility.charge_posting_attempts`, `audit.audit_events` | `GET /requests/{id}`, `GET /requests/{id}/history`, `GET /requests/{id}/audit`, `POST /requests/{id}/approve`, `POST /requests/{id}/hotlist` | `request.view`, `request.authorize` | Completed (Wireframe) |
| `SCR-010` | **Branch Approvals Queue** | `Approvals` | None | `request.requests` | `request.special_approvals`, `config.branches` | `GET /requests/`, `POST /requests/{id}/approve` | `request.authorize` | Completed (Wireframe) |
| `SCR-011` | **Maker-Checker Work Queue** | `Maker-Checker` | None | `maker_checker_work_items` | `maker_checker_work_item_history`, `iam.users` | `GET /maker-checker/work-items`, `POST /maker-checker/work-items/{id}/approve`, `POST /maker-checker/work-items/{id}/reject` | `request.approve` | Completed (Wireframe) |
| `SCR-012` | **Card Segments Master** | `Configuration` | None | `config.card_segments` | `config.card_segment_eligibility`, `config.card_segment_programme_charges` | `GET /config/card-segments`, `GET /config/card-segment-programme-charges` | `config.view`, `config.manage` | Completed (Wireframe/Model) |
| `SCR-012A`| **Segment Eligibility Rules** | `Configuration` | `SCR-012` | `config.card_segment_eligibility` | `config.card_segments` | `GET /config/card-segment-eligibility` | `config.view`, `config.manage` | Child Tab under `SCR-012` |
| `SCR-012B`| **Segment Card Programmes** | `Configuration` | `SCR-012` | `config.card_segment_programme_charges` | `config.card_segments`, `config.card_programmes` | `GET /config/card-segment-programme-charges` | `config.view`, `config.manage` | Child Tab under `SCR-012` |
| `SCR-013` | **Card Charges & Pricing** | `Configuration` | None | `config.card_charges_headers` | `config.card_charge_entries` | `GET /config/card-charges` | `config.view`, `config.manage` | Completed (Wireframe) |
| `SCR-014` | **Enterprise Audit Inspector** | `Audit & Reports` | None | `audit.audit_events` | `audit.audit_event_details`, `audit.audit_snapshots` | `GET /reports/audit`, `GET /requests/{id}/audit` | `request.view` | Completed (Wireframe) |
| `SCR-015` | **Operational Reports & Analytics** | `Audit & Reports` | None | `request.requests` | `eligibility.charge_posting_attempts`, `config.branches` | `GET /requests/`, `GET /reports/operational` | `request.view` | Completed (Wireframe) |

---

## 3. Screen Details & Mapping Specifications

### 3.1 `SCR-003`: Card Programmes Master (Reference Implementation)
- **Module:** Configuration
- **Route:** `/config/card-programmes`
- **Primary Table:** `config.card_programmes`
- **Related Tables:** `config.card_types`, `config.card_segment_programme_charges`
- **Permissions:** `config.view` (Read), `config.manage` (Create/Edit)
- **UI Architecture:** PageHeader -> Toolbar (Search + Filters + Refresh + Export) -> DataTable -> Status Badges -> Sheet Drawer (Create/Edit) -> Toast Feedback.

### 3.2 `SCR-012`: Card Segments Master & Child Navigation
- **Module:** Configuration
- **Route:** `/config/segments`
- **Primary Table:** `config.card_segments`
- **Tab Layout Architecture:**
  - **Tab 1 (`SCR-012`):** General Segment Information (`config.card_segments`)
  - **Tab 2 (`SCR-012A`):** Eligibility Rules (`config.card_segment_eligibility`)
  - **Tab 3 (`SCR-012B`):** Card Programmes & Charges (`config.card_segment_programme_charges`)
  - **Tab 4 (`SCR-012C`):** Segment Audit History (`audit.audit_events`)

---

**End of Master Screen Registry**
