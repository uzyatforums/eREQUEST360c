# Wireframe: Executive & Operations Dashboard

**Screen ID:** `SCR-002`  
**Module:** `Dashboard`  
**URL Path:** `/dashboard`  
**Target Roles:** `super_admin`, `branch_submitter`, `branch_authorizer`, `operations_admin_maker`, `operations_admin_checker`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Dashboard Overview                                     [ 🔄 Refresh ] [ Export ]|
| 💳 Card Requests   | Real-time operational summary for Apex Microfinance Bank                     |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | +-----------------+ +-----------------+ +-----------------+ +-----------------+ |
| 👥 Administration  | | Total Requests  | | Pending Auth    | | Cards Issued    | | Charge Failures | |
| 📜 Audit Trail     | | 1,420           | | 12              | | 1,385           | | 3 (Action Req.) | |
| 📈 Reports         | | 🡱 +12% vs last  | | ⏳ Awaiting branch| | 🡱 +8% this mo.  | | ⚠️ Core Banking | |
|                    | +-----------------+ +-----------------+ +-----------------+ +-----------------+ |
|                    |                                                                              |
|                    | +-----------------------------------------------+ +------------------------+ |
|                    | | Request Processing Pipeline                   | | System Alerts & Tasks  | |
|                    | | [Submitted] -> [Pending Auth] -> [Approved]   | | ⚠️ 3 Charge Postings   | |
|                    | |    (1,420)         (12)             (1,385)   | |    Failed (Retry req) | |
|                    | +-----------------------------------------------+ | ⏳ 2 Pending Policy    | |
|                    |                                                   |    Deviations          | |
|                    | +-----------------------------------------------+ +------------------------+ |
|                    | | Recent Card Requests               [View All] |                            |
|                    | |-----------------------------------------------|                            |
|                    | | Request ID | Account    | Programme | Status  |                            |
|                    | |------------|------------|-----------|---------|                            |
|                    | | REQ-2026-04| 1055566600 | Visa Gold |APPROVED |                            |
|                    | | REQ-2026-02| 1033344400 | Verve Cl. |PEND AUTH|                            |
|                    | +-----------------------------------------------+                            |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 29:15    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Top KPI Metric Cards Grid (`components/shared/kpi-card.tsx`):**
   - **Total Requests:** Cumulative request count for current tenant.
   - **Pending Authorization:** Urgent count of requests awaiting branch authorizer action. Clicking navigates to `/requests/pending-authorization`.
   - **Cards Issued:** Total completed cards count.
   - **Charge Failures:** Highlighted in Red/Amber warning variant if count > 0. Clicking navigates to charge reconciliation queue.
2. **Request Pipeline Visualizer:**
   - Sequential stage tracker displaying volume per lifecycle stage (`PENDING` -> `PENDING_AUTHORIZATION` -> `APPROVED` -> `COMPLETED`).
   - Interactive stage nodes filter the recent requests table below.
3. **Recent Card Requests Table:**
   - Compact 5-row table with `Request ID`, `Account Number`, `Programme`, `Branch`, `Status Badge`, and `Action View` trigger.
4. **System Alerts Panel:**
   - Lists urgent operational exceptions requiring immediate attention (e.g. Charge posting failures, pending policy approvals).

---

## 3. State Variations

- **Loading State:** Skeleton card loaders for KPI metrics and table rows.
- **Empty State:** Clean banner stating "No card requests recorded today. Click [Create New Request] to begin."
- **Error State:** Alert banner displaying API connectivity failure with manual `[Retry Connection]` button.

---

## 4. API Endpoints Mapping

- `GET /requests/?limit=5` - Fetch recent requests list.
- `GET /maker-checker/work-items?status=PENDING` - Fetch pending approval count.
- `GET /config/clients` - Fetch active tenant information.

---

**End of Dashboard Wireframe**
