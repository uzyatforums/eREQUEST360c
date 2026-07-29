# Wireframe: Roles & Permissions Matrix

**Screen ID:** `SCR-005`  
**Module:** `IAM`  
**URL Path:** `/iam/roles`  
**Target Roles:** `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | IAM / Roles & Permission Matrix                       [ + Create Role ]   |
| 💳 Card Requests   | Define system roles, maker/checker properties & mapped permissions.           |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | ROLES OVERVIEW                                                               |
| 👥 Administration  | +--------------------------------------------------------------------------+ |
|   ├─ Users         | | Role Code    | Role Name          | Maker | Checker | Active | Actions   | |
|   └─ Roles         | |--------------|--------------------|-------|---------|--------|-----------| |
| 📜 Audit Trail     | | super_admin  | Super Admin        | [YES] | [YES]   | [YES]  | [Edit Matrix]|
| 📈 Reports         | | branch_sub   | Branch Submitter   | [YES] | [ NO]   | [YES]  | [Edit Matrix]|
|                    | | branch_auth  | Branch Authorizer  | [ NO] | [YES]   | [YES]  | [Edit Matrix]|
|                    | | ops_maker    | Ops Admin Maker    | [YES] | [ NO]   | [YES]  | [Edit Matrix]|
|                    | | ops_checker  | Ops Admin Checker  | [ NO] | [YES]   | [YES]  | [Edit Matrix]|
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | PERMISSION MATRIX FOR ROLE: branch_submitter                                 |
|                    | +--------------------------------------------------------------------------+ |
|                    | | Module  | Permission Code    | Description                | Assigned     | |
|                    | |---------|--------------------|----------------------------|--------------| |
|                    | | REQUEST | request.create     | Create card request        | [x] Enabled  | |
|                    | | REQUEST | request.authorize  | Authorize request          | [ ] Disabled | |
|                    | | REQUEST | request.approve    | Approve policy deviation   | [ ] Disabled | |
|                    | | REQUEST | request.view       | View requests              | [x] Enabled  | |
|                    | | CONFIG  | config.view        | View configurations        | [x] Enabled  | |
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                          [ Save Matrix ]     |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 26:40    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Roles Overview Table:**
   - Displays all defined roles in `iam.roles`.
   - Highlights `is_maker` and `is_checker` flags.
2. **Permission Matrix Selector:**
   - Selecting a role populates the interactive permissions checklist from `iam.permissions`.
   - Allows super admin to toggle specific permissions and click `[Save Matrix]` (`POST /config/table/role_permissions`).

---

## 3. API Endpoints Mapping

- `GET /roles/` - List all roles.
- `GET /config/table/permissions` - List available permissions.
- `POST /config/table/roles` - Create new role.
- `POST /config/table/role_permissions` - Assign permissions to role.

---

**End of Roles Wireframe**
