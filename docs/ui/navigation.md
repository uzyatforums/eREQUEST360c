# eREQUEST360 Navigation & Information Architecture

**Version:** 1.1  
**Status:** Approved  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  

---

## 1. Site Map & Module Structure

eREQUEST360 organizes enterprise functionality into 6 primary operational domains:

```
eREQUEST360 Portal
├── 📊 Executive & Operations Dashboard (/dashboard)
├── 💳 Card Requests (/requests)
│   ├── 📝 New Card Request (/requests/new)
│   ├── 📋 My Requests (/requests/my-requests)
│   ├── ⏳ Pending Authorization (/requests/pending-authorization)
│   └── 🗃️ All Requests Catalog (/requests/all)
├── 🛡️ Maker-Checker Work Queue (/maker-checker)
│   ├── 📥 Pending Approval Queue (/maker-checker/pending)
│   └── 📜 Authorization History (/maker-checker/history)
├── 🎛️ Card & System Configuration (/config)
│   ├── 💳 Card Programmes & Types (/config/card-programmes)
│   ├── 📐 Card Segments & Eligibility (/config/segments)
│   ├── 💰 Charge Headers & Pricing (/config/charges)
│   ├── 🏛️ Branch Directory (/config/branches)
│   └── ⚙️ System Lookup Tables (/config/lookups)
├── 👥 User & Access Management (/iam)
│   ├── 👤 User Accounts (/iam/users)
│   └── 🔐 Roles & Permissions (/iam/roles)
└── 📊 Audit & Operational Reports (/reports)
    ├── 📜 Enterprise Audit Inspector (/reports/audit)
    └── 📈 Operational SLA & Production Reports (/reports/operational)
```

---

## 2. Top Bar Navigation Elements

The Top Header Bar (`h-14`, sticky top) provides universal context controls across all pages:

1. **Brand & App Title:** `eREQUEST360` logo linked to `/dashboard`.
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

| Navigation Item | Path / Route | Required Role(s) | Required Permission |
|-----------------|--------------|------------------|---------------------|
| **Dashboard** | `/dashboard` | All Roles | `request.view` |
| **New Request** | `/requests/new` | `branch_submitter`, `operations_admin_maker`, `super_admin` | `request.create` |
| **My Requests** | `/requests/my-requests` | `branch_submitter`, `operations_admin_maker`, `super_admin` | `request.view` |
| **Pending Authorization** | `/requests/pending-authorization` | `branch_authorizer`, `super_admin` | `request.authorize` |
| **All Requests Catalog** | `/requests/all` | All Roles | `request.view` |
| **Maker-Checker Queue** | `/maker-checker/pending` | `operations_admin_checker`, `super_admin` | `request.approve` |
| **Maker-Checker History**| `/maker-checker/history` | `operations_admin_checker`, `super_admin` | `request.view` |
| **Card Programmes** | `/config/card-programmes` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| **Card Segments** | `/config/segments` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| **Charge Headers** | `/config/charges` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| **Branch Directory** | `/config/branches` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| **System Lookups** | `/config/lookups` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `config.view` |
| **User Accounts** | `/iam/users` | `operations_admin_maker`, `operations_admin_checker`, `super_admin` | `user.manage` |
| **Roles & Permissions** | `/iam/roles` | `super_admin` | `user.manage` |
| **Audit Inspector** | `/reports/audit` | `operations_admin_checker`, `super_admin` | `request.view` |
| **Operational Reports** | `/reports/operational` | All Roles | `request.view` |

---

## 4. Command Palette (`Ctrl+K`) Shortcut Specification

Pressing `Ctrl+K` or `Cmd+K` anywhere in the application opens a floating search modal with keyboard navigation:

```
+-------------------------------------------------------------------------+
| 🔍 Type a command or search request / account...                        |
+-------------------------------------------------------------------------+
| Quick Navigation                                                        |
|   📝 Submit New Card Request                                            |
|   ⏳ Review Pending Approvals (2 items)                                 |
|   💳 Manage Card Programmes                                             |
|   👥 User Management                                                    |
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
