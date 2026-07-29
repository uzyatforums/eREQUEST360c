# Wireframe: Approvals & Dual-Control Queue

**Screen ID:** `SCR-010` & `SCR-011`  
**Module:** `Approvals / Maker-Checker`  
**URL Path:** `/requests/pending-authorization` & `/maker-checker/pending`  
**Target Roles:** `branch_authorizer`, `operations_admin_checker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Maker-Checker / Pending Approvals Queue                      [ 🔄 Refresh ]  |
| 💳 Card Requests   | Dual-control authorization queue for operational updates & request approvals. |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
|   ├─ Pending (2)   | [ All Categories ▼ ] [ All Operations ▼ ] [ Search work items...            ] |
|   └─ History       | +--------------------------------------------------------------------------+ |
| ⚙️ Configuration   | | Item ID | Module   | Operation | Maker        | Submitted At    | Actions  | |
| 👥 Administration  | |---------|----------|-----------|--------------|-----------------|----------| |
| 📜 Audit Trail     | | 101     | REQUEST  | SPECIAL_AP | submitter1   | 2026-07-26 21:00| [Review] | |
| 📈 Reports         | | 102     | CONFIG   | UPDATE_POL| ops_maker1   | 2026-07-27 10:15| [Review] | |
|                    | +--------------------------------------------------------------------------+ |
+--------------------+-+--------------------------------------------------------------------------+
|                    | | Review Work Item #101 (Special Approval)                          [ X ]  |
|                    | |--------------------------------------------------------------------------|
|                    | | Submitted By: submitter1 | Module: REQUEST | Submitted: 2026-07-26 21:00 |
|                    | | Reason: Duplicate card policy deviation (Account has active Verve card)  |
|                    | |                                                                          |
|                    | | PAYLOAD DETAILS                                                          | |
|                    | | +----------------------------------------------------------------------+ | |
|                    | | | Field                  | Value                                       | | |
|                    | | |------------------------|---------------------------------------------| | |
|                    | | | Account Number         | 1077788800                                  | | |
|                    | | | Card Programme         | Apex Visa Gold (ID: 2)                      | | |
|                    | | | Request Status         | PENDING_APPROVAL                            | | |
|                    | | +----------------------------------------------------------------------+ | |
|                    | |                                                                          |
|                    | | Mandatory Approver Remarks:                                              |
|                    | | [ Verified customer request form and branch manager sign-off.        ] |
|                    | |--------------------------------------------------------------------------|
|                    | | [ ✗ Reject ]                                           [ ✓ Approve Item ]|
+--------------------+----------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Work Items Queue Data Table:**
   - Displays all pending items from `maker_checker_work_items` where `status = 'PENDING'`.
   - Filters by Module (`REQUEST`, `CONFIG`, `IAM`), Operation (`CREATE`, `UPDATE`, `SPECIAL_APPROVAL`), and Maker User.
2. **Side-Sheet Review Panel (`components/shared/maker-checker-panel.tsx`):**
   - Launches when clicking `[Review]` on a row.
   - Shows Maker identity, timestamp, entity reference, and field payload diff.
   - For update operations, displays **Side-by-Side Diff Table** (Old Value vs New Value).
3. **Approval Execution (`POST /maker-checker/work-items/{id}/approve`):**
   - Clicking `[✓ Approve Item]` sends approval payload with optional remarks. Updates item status to `APPROVED` and executes underlying business operation.
4. **Rejection Execution (`POST /maker-checker/work-items/{id}/reject`):**
   - Requires mandatory rejection remarks text before enabling `[Confirm Rejection]` trigger.

---

## 3. State Variations

- **Empty Queue State:** Display green success badge: "No pending approval items in queue. You are all caught up!"
- **Self-Approval Block State:** If active user is the Maker who submitted the item, approval buttons are disabled with tooltip: *"Dual control policy: Makers cannot approve their own submissions."*

---

## 4. API Endpoints Mapping

- `GET /maker-checker/work-items` - Fetch pending items list.
- `POST /maker-checker/work-items/{id}/approve` - Approve work item.
- `POST /maker-checker/work-items/{id}/reject` - Reject work item.

---

**End of Approvals Wireframe**
