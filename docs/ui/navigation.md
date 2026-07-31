# eREQUEST360 Navigation & Information Architecture

**Version:** 1.1  
**Status:** Approved  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  

---

## 1. Site Map & Module Structure

eREQUEST360 organizes enterprise functionality into 6 primary operational domains. All screens map to Screen Codes registered in `docs/ui/screen_registry.md`. Relationship tables are embedded as child tabs within their parent master screens.

```
eREQUEST360 Portal
├── 📊 Executive & Operations Dashboard (SCR-002, /dashboard)
├── 💳 Card Requests (/requests)
│   ├── 📝 New Card Request (SCR-007, /requests/new)
│   ├── 📋 My Requests (/requests/my-requests)
│   ├── ⏳ Pending Authorization (SCR-010, /requests/pending-authorization)
│   └── 🗃️ All Requests Catalog (SCR-008, /requests/all)
├── 🛡️ Maker-Checker Work Queue (SCR-011, /maker-checker)
│   ├── 📥 Pending Approval Queue (/maker-checker/pending)
│   └── 📜 Authorization History (/maker-checker/history)
├── 🎛️ Card & System Configuration
│   ├── 💳 Card Programmes Master (SCR-003, /card-programmes) [React Router True Navigation]
│   │   ├── 📝 New Programme (/card-programmes/new)
│   │   ├── 📄 Details (/card-programmes/:id)
│   │   ├── ✏️ Edit (/card-programmes/:id/edit)
│   │   ├── 👥 Segments (/card-programmes/:id/segments)
│   │   ├── 💰 Charges (/card-programmes/:id/charges)
│   │   ├── 🔗 References (/card-programmes/:id/references)
│   │   └── 📜 Audit (/card-programmes/:id/audit)
│   ├── 💰 Charge Headers & Pricing (SCR-013, /config/charges)
│   └── 🏛️ Branch Directory (SCR-006, /config/branches)
├── 👥 User & Access Management (/iam)
│   ├── 👤 User Accounts (SCR-004, /iam/users)
│   └── 🔐 Roles & Permissions (SCR-005, /iam/roles)
└── 📊 Audit & Operational Reports (/reports)
    ├── 📜 Enterprise Audit Inspector (SCR-014, /reports/audit)
    └── 📈 Operational SLA & Production Reports (SCR-015, /reports/operational)
```

---

## 2. Top Bar Navigation Elements

The Top Header Bar (`h-14`, sticky top) provides universal context controls across all pages:

1. **Brand & App Title:** `eREQUEST360` logo linked to `/card-programmes`.
2. **Tenant Switcher (Multi-Tenant Indicator):**
   - Displays active tenant `[Apex Microfinance Bank (100)]`.
   - Accessible to `super_admin` role to switch operational scope between tenants.
3. **Branch Context Indicator:**
   - Displays user's assigned branch `[Main Branch - 001]`.
4. **Command Palette Trigger (`Ctrl+K` / `Cmd+K`):**
   - Clickable search input trigger: `Search requests, account numbers, or jump to screen (Ctrl+K)...`
5. **Notifications Bell Counter:**
   - Real-time popover displaying pending approval notifications, charge posting failures, or system alerts.
6. **User Profile Dropdown:**
   - Displays user avatar, Username (`admin`), Active Role (`Super Admin`), tenant ID, and `Logout` trigger.

---

## 3. Sidebar Navigation & Access Control Matrix

The sidebar automatically filters menu items based on the authenticated user's assigned roles (`current_user.roles`).

### 3.1 Role Navigation Matrix

| Screen Code | Navigation Item | Path / Route | Required Role(s) | Required Permission |
|-------------|-----------------|--------------|------------------|---------------------|
| `SCR-002` | **Dashboard** | `/dashboard` | All Roles | `request.view` |
| `SCR-007` | **New Request** | `/requests/new` | `branch_submitter`, `operations_admin_maker`, `super_admin` | `request.create` |
| `SCR-008` | **My Requests** | `/requests/my-requests` | `branch_submitter`, `operations_admin_maker`, `super_admin` | `request.view` |
| `SCR-010` | **Pending Authorization** | `/requests/pending-authorization` | `branch_authorizer`, `super_admin` | `request.authorize` |
| `SCR-008` | **All Requests Catalog** | `/requests/all` | All Roles | `request.view` |
| `SCR-011` | **Maker-Checker Queue** | `/maker-checker/pending` | `operations_admin_checker`, `super_admin` | `request.approve` |
| `SCR-011` | **Maker-Checker History**| `/maker-checker/history` | `operations_admin_checker`, `super_admin` | `request.view` |
| `SCR-003` | **Card Programmes** | `/card-programmes` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| `SCR-012` | **Card Segments** | `/config/segments` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| `SCR-013` | **Charge Headers** | `/config/charges` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| `SCR-006` | **Branch Directory** | `/config/branches` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| `SCR-004` | **User Accounts** | `/iam/users` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `user.manage` |
| `SCR-005` | **Roles & Permissions** | `/iam/roles` | `super_admin` | `user.manage` |
| `SCR-014` | **Audit Inspector** | `/reports/audit` | `operations_admin_checker`, `super_admin` | `request.view` |
| `SCR-015` | **Operational Reports** | `/reports/operational` | All Roles | `request.view` |

---

## 4. Command Palette (`Ctrl+K`) Shortcut Specification

Pressing `Ctrl+K` or `Cmd+K` anywhere in the application opens a floating search modal with keyboard navigation:

```
+-------------------------------------------------------------------------+
| 🔍 Type a command or search request / account...                        |
+-------------------------------------------------------------------------+
| Quick Navigation                                                        |
|   📝 Submit New Card Request (SCR-007)                                  |
|   ⏳ Review Pending Approvals (SCR-011)                                 |
|   💳 Manage Card Programmes (SCR-003)                                   |
|   👥 User Management (SCR-004)                                          |
|                                                                         |
| Recent Requests                                                         |
|   REQ-2026-004 - 1055566600 (Approved)                                  |
|   REQ-2026-002 - 1033344400 (Pending Auth)                               |
+-------------------------------------------------------------------------+
```

---

## 5. Breadcrumb & Deep Linking Standard

Every internal screen presents hierarchical breadcrumbs:
- `Home / Card Requests / Request Details (#REQ-2026-001)`
- `Home / Configuration / Card Programmes / Edit Programme (#1)`

All modal or drawer views mirror their primary ID in URL query parameters (e.g. `/requests/all?details=101`) to support direct bookmarking and link sharing among bank staff.

---

**End of Navigation Specification**
