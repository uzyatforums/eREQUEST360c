# Wireframe: User Management & Authentication

**Screen ID:** `SCR-001` & `SCR-004`  
**Module:** `IAM`  
**URL Path:** `/login` & `/iam/users`  
**Target Roles:** `operations_admin_maker`, `operations_admin_checker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | IAM / User Management                                    [ + Create User ]   |
| 💳 Card Requests   | Manage staff access accounts, branch assignments & assigned security roles.  |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | [ Search users...       ] [ All Roles ▼ ] [ All Branches ▼ ] [ 🔄 Refresh ]    |
| 👥 Administration  | +--------------------------------------------------------------------------+ |
|   ├─ Users         | | User ID    | Username   | Email            | Role        | Active | Actions | |
|   └─ Roles         | |------------|------------|------------------|-------------|--------|---------| |
| 📜 Audit Trail     | | admin      | admin      | admin@apexmfb.com| super_admin | [YES]  | [Edit]  | |
| 📈 Reports         | | submitter1 | submitter1 | sub1@apexmfb.com | branch_sub  | [YES]  | [Edit]  | |
|                    | | authorizer1| authorizer1| auth1@apexmfb.com| branch_auth | [YES]  | [Edit]  | |
|                    | +--------------------------------------------------------------------------+ |
+--------------------+-+--------------------------------------------------------------------------+
|                    | | Create New User Account                                           [ X ]  |
|                    | |--------------------------------------------------------------------------|
|                    | | User ID:   [ submitter2                      ] (Max 31 chars)        |
|                    | | Username:  [ submitter2                      ]                       |
|                    | | Email:     [ sub2@apexmfb.com                ]                       |
|                    | | Password:  [ ••••••••••••                    ]                       |
|                    | | Client:    [ Apex Microfinance Bank (100)  ▼ ]                       |
|                    | | Branch:    [ 001 - Apex Main Branch          ▼ ]                       |
|                    | | Role:      [ Branch Submitter (branch_sub)  ▼ ]                       |
|                    | | Phone:     [ +2348012345678                  ]                       |
|                    | | Status:    [x] Active Account                                        |
|                    | |--------------------------------------------------------------------------|
|                    | | [ Cancel ]                                             [ Create User ]   |
+--------------------+----------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **User Accounts Table:**
   - Displays `User ID`, `Username`, `Email`, `Role Code`, `Branch ID`, `Active Status`, and `Actions`.
   - Action dropdown provides: `Edit User`, `Reset Password`, `Lock/Unlock Account`, `Deactivate Account`.
2. **User Form Sheet Drawer:**
   - Slide-over panel for user creation and updates (`POST /users/`, `PUT /users/{id}`).
   - Form fields include `user_id`, `username`, `email`, `password`, `client_id`, `branch_id`, `role_code`, `phone_1`, and `active`.
3. **Tenant Isolation Enforcement:**
   - Non-super-admin users can only assign users to their own tenant (`current_user.client_id`).

---

## 3. State Variations

- **Locked Account State:** User row highlights red badge `[LOCKED]`. Action dropdown displays `[Unlock Account]`.

---

## 4. API Endpoints Mapping

- `POST /auth/login` - User login endpoint.
- `GET /users/` - List user accounts.
- `POST /users/` - Create new user account.
- `PUT /users/{user_id}` - Update user account.

---

**End of User Management Wireframe**
