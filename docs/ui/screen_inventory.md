# eREQUEST360 Master Screen Inventory

**Version:** 1.1  
**Status:** Approved Specification  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  

---

## 1. Overview & Summary Metrics

The eREQUEST360 screen inventory categorizes all system user interfaces into logical implementation phases. Every screen corresponds to a unique **Screen Code** registered in `docs/ui/screen_registry.md`.

- **Total Primary Screens:** 15 Primary Views (Plus 3 Relationship Sub-Tabs)
- **Phase 1 (Foundation & Security):** 6 Screens
- **Phase 2 (Request Lifecycle & Configuration):** 6 Screens
- **Phase 3 (Audit & Reporting):** 3 Screens

---

## 2. Screen Inventory Catalog

### Phase 1: Security, Foundation & Core Reference

| Screen Code | Screen Name | Module | URL Path | Required Roles | Key Features | Backend API Endpoint(s) | Wireframe Ref |
|-------------|-------------|--------|----------|----------------|--------------|------------------------|---------------|
| `SCR-001` | **Login Screen** | `IAM / Auth` | `/login` | Public / All | Single-Sign-On login, credentials authentication, session handling. | `POST /auth/login` | `wireframes/users.md` |
| `SCR-002` | **Executive & Ops Dashboard** | `Dashboard` | `/dashboard` | All Roles | Real-time KPI metrics, pending approval alerts, request pipeline, recent activity. | `GET /requests/`, `GET /maker-checker/work-items` | `wireframes/dashboard.md` |
| `SCR-003` | **Card Programmes Master** | `Config` | `/card-programmes` (Sub-routes: `/new`, `/:id`, `/:id/edit`, `/:id/segments`, `/:id/charges`, `/:id/references`, `/:id/audit`) | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | **Reference Implementation:** Dedicated Master → Detail React Router true navigation pattern with aggregate parent details page, dedicated edit page, dynamic card types, and full-width management child workspaces (Segments, Charges, References, Audit). | `GET /config/card-programmes`, `POST /config/card-programmes`, `PUT /config/card-programmes/{id}`, `GET /config/card-types` | `wireframes/card_programmes.md` |
| `SCR-004` | **User Accounts Directory** | `IAM` | `/iam/users` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | User accounts table, tenant/branch filtering, user create/edit drawer, password reset. | `GET /users/`, `POST /users/`, `PUT /users/{id}` | `wireframes/users.md` |
| `SCR-005` | **Roles & Permissions Matrix** | `IAM` | `/iam/roles` | `super_admin` | Role listing, permission mapping matrix, Maker/Checker role flags. | `GET /roles/`, `POST /config/table/roles` | `wireframes/roles.md` |
| `SCR-006` | **Branch Directory** | `Config` | `/config/branches` | All Admin Roles | Branch directory, client mapping, branch creation sheet. | `GET /branches/`, `POST /branches/` | `wireframes/card_programmes.md` |

---

### Phase 2: Request Entry, Eligibility & Dual-Control

| Screen Code | Screen Name | Module | URL Path | Required Roles | Key Features | Backend API Endpoint(s) | Wireframe Ref |
|-------------|-------------|--------|----------|----------------|--------------|------------------------|---------------|
| `SCR-007` | **New Card Request Wizard** | `Requests` | `/requests/new` | `branch_submitter`, `operations_admin_maker`, `super_admin` | Multi-step form: Customer account lookup, eligibility check, charge preview, submission. | `POST /requests/`, `GET /eligibility/account/{acc}`, `POST /eligibility/duplicate-check` | `wireframes/new_request.md` |
| `SCR-008` | **All Requests Catalog** | `Requests` | `/requests/all` | All Roles | Grid view of all card requests, status filters, search by ID/Account, export to Excel. | `GET /requests/` | `wireframes/request_details.md` |
| `SCR-009` | **Request Details Inspector** | `Requests` | `/requests/:id` | All Roles | Full request overview, status history timeline, charge attempts, policy deviation details. | `GET /requests/{id}`, `GET /requests/{id}/history`, `GET /requests/{id}/audit` | `wireframes/request_details.md` |
| `SCR-010` | **Branch Approvals Queue** | `Approvals` | `/requests/pending-authorization` | `branch_authorizer`, `super_admin` | Branch level pending requests list, quick authorization, batch approval controls. | `GET /requests/`, `POST /requests/{id}/approve` | `wireframes/approvals.md` |
| `SCR-011` | **Maker-Checker Work Queue** | `Maker-Checker` | `/maker-checker/pending` | `operations_admin_checker`, `super_admin` | Ops level maker-checker queue, payload change diff, approve/reject with remarks. | `GET /maker-checker/work-items`, `POST /maker-checker/work-items/{id}/approve` | `wireframes/approvals.md` |
| `SCR-012` | **Card Segments Master** | `Config` | `/config/segments` | Admin Roles | Master segment management with child tabs for Eligibility (`SCR-012A`) and Card Programmes (`SCR-012B`). | `GET /config/card-segments`, `GET /config/card-segment-programme-charges` | `wireframes/card_programmes.md` |

---

### Phase 3: Enterprise Audit, Reporting & Monitoring

| Screen Code | Screen Name | Module | URL Path | Required Roles | Key Features | Backend API Endpoint(s) | Wireframe Ref |
|-------------|-------------|--------|----------|----------------|--------------|------------------------|---------------|
| `SCR-013` | **Card Charges & Pricing** | `Config` | `/config/charges` | Admin Roles | Charge headers, charge entries (issuance fee, VAT), segment programme charge linking. | `GET /config/card-charges`, `GET /config/card-segment-programme-charges` | `wireframes/card_programmes.md` |
| `SCR-014` | **Enterprise Audit Inspector** | `Audit` | `/reports/audit` | `operations_admin_checker`, `super_admin` | Audit log viewer, entity snapshot comparison, filter by user/event/date. | `GET /reports/audit`, `GET /requests/{id}/audit` | `wireframes/audit.md` |
| `SCR-015` | **Operational Reports** | `Reports` | `/reports/operational` | All Roles | Card issuance volume report, charge settlement summary, SLA turnaround report, export. | `GET /requests/`, `GET /reports/operational` | `wireframes/reports.md` |

---

| Screen | UI | CRUD | Child CRUD | Audit | Complete |
|---------|----|------|------------|-------|----------|
| SCR-003 | ✓ | ✓ | 20% | ✓ | 40% |

**End of Master Screen Inventory**
