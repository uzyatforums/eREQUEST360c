# Wireframe: Request Details & Lifecycle Inspector

**Screen ID:** `SCR-009`  
**Module:** `Requests`  
**URL Path:** `/requests/:id`  
**Target Roles:** All Roles (`branch_submitter`, `branch_authorizer`, `operations_admin_checker`, `super_admin`)  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Requests / Request Details / REQ-2026-002                                    |
| 💳 Card Requests   | ========================================================================== |
| 🛡️ Maker-Checker  | REQUEST #REQ-2026-002 | Account: 1033344400 | [ PENDING_AUTHORIZATION ]          |
| ⚙️ Configuration   | Created by submitter1 on 2026-07-26 21:03 | Branch: 001                      |
| 👥 Administration  | -------------------------------------------------------------------------- |
| 📜 Audit Trail     | ACTIONS: [ ✓ Authorize Request ] [ ✗ Reject Request ] [ 💳 Link Account ] |
| 📈 Reports         | -------------------------------------------------------------------------- |
|                    | [ Overview & Account ] [ Charge Details ] [ Status History ] [ Audit Logs ] |
|                    | +------------------------------------------------------------------------+ |
|                    | | REQUEST OVERVIEW                                                       | |
|                    | | Request ID:     2                                                      | |
|                    | | Client Tenant:  Apex Microfinance Bank (100)                           | |
|                    | | Account Number: 1033344400                                             | |
|                    | | Card Programme: Apex Verve Classic (ID: 1)                              | |
|                    | | Card Brand:     VERVE                                                  | |
|                    | | Request Status: PENDING_AUTHORIZATION                                   | |
|                    | | Branch Code:    001                                                    | |
|                    | | Active:         True                                                   | |
|                    | +------------------------------------------------------------------------+ |
|                    |                                                                            |
|                    | +------------------------------------------------------------------------+ |
|                    | | CHARGE POSTING ATTEMPTS                                                | |
|                    | | Ref: PAY-SIM-SEEDED22 | Amount: NGN 1,500.00 | Status: [ SUCCESS ]      | |
|                    | +------------------------------------------------------------------------+ |
|                    |                                                                            |
|                    | +------------------------------------------------------------------------+ |
|                    | | WORKFLOW TIMELINE                                                      | |
|                    | | 🟢 2026-07-26 21:03 - Created by submitter1 (Status: PENDING)          | |
|                    | | 🔵 2026-07-26 22:03 - Settled by system (Status: PENDING_AUTHORIZATION)| |
|                    | +------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 27:12    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Header Metadata Bar:**
   - Monospaced Request ID, Account Number, Status Badge, Tenant ID, and Creation Timestamp.
2. **Action Controls Bar (Role-Gated):**
   - **`[✓ Authorize Request]`**: Available to `branch_authorizer` when status is `PENDING_AUTHORIZATION`. Triggers confirmation dialog (`POST /requests/{id}/approve`).
   - **`[✗ Reject Request]`**: Prompts modal with mandatory rejection remarks input.
   - **`[💳 Link Account]`**: Invokes account linking sheet (`POST /requests/{id}/link-account`).
   - **`[🔥 Hotlist Card]`**: Available for active cards (`POST /requests/{id}/hotlist`).
3. **Tabbed Content Container:**
   - **Overview Tab:** Complete fields mapping from `request.requests`.
   - **Charge Details Tab:** History of charge posting attempts (`eligibility.charge_posting_attempts`).
   - **Status History Tab:** Audit timeline of status transitions from `request_status_history`.
   - **Audit Logs Tab:** Change details and entity snapshots from `audit_snapshots`.

---

## 3. State Variations

- **Pending Authorization State:** Displays primary blue `[Authorize Request]` button for authorizers.
- **Approved / Completed State:** Displays green completion checkmark, authorization actions hidden.
- **Rejected State:** Displays red rejection banner with reviewer's remarks.

---

## 4. API Endpoints Mapping

- `GET /requests/{request_id}` - Fetch request details.
- `GET /requests/{request_id}/history` - Fetch status history.
- `GET /requests/{request_id}/audit` - Fetch audit snapshot & logs.
- `POST /requests/{request_id}/approve` - Branch authorization / approval.
- `POST /requests/{request_id}/hotlist` - Hotlist card.

---

**End of Request Details Wireframe**
