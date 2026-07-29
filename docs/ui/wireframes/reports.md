# Wireframe: Operational Reports & Analytics

**Screen ID:** `SCR-014`  
**Module:** `Reports`  
**URL Path:** `/reports/operational`  
**Target Roles:** All Roles (`branch_submitter`, `branch_authorizer`, `operations_admin_checker`, `super_admin`)  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Reports & Analytics / Operational Reports             [ 📊 Export PDF/Excel ]|
| 💳 Card Requests   | Generate card issuance, fee settlement & SLA performance reports.            |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | REPORT CONTROLS                                                              |
| 👥 Administration  | Report Type: [ Card Issuance Volume Summary ▼ ] Date Range: [ This Month ▼ ]  |
| 📜 Audit Trail     | Branch:      [ All Branches                 ▼ ] Client:     [ Apex MFB (100)▼ ]|
| 📈 Reports         | -----------------------------------------------------------------------------|
|                    | ISSUANCE VOLUME BY BRAND & STATUS                                            |
|                    | +--------------------------------------------------------------------------+ |
|                    | | Brand      | Pending | Pending Auth | Approved | Completed | Total Vol  | |
|                    | |------------|---------|--------------|----------|-----------|------------| |
|                    | | Verve      | 15      | 8            | 42       | 850       | 915        | |
|                    | | Visa       | 5       | 4            | 20       | 450       | 479        | |
|                    | | Mastercard | 0       | 0            | 0        | 26        | 26         | |
|                    | |------------|---------|--------------|----------|-----------|------------| |
|                    | | TOTAL      | 20      | 12           | 62       | 1,326     | 1,420      | |
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | OPERATIONAL PERFORMANCE METRICS                                              |
|                    | +--------------------------------------------------------------------------+ |
|                    | | Metric                          | Target SLA  | Actual Average Performance| |
|                    | |---------------------------------|-------------|---------------------------| |
|                    | | Average Time to Authorization   | < 2 Hours   | 45 Minutes (🟢 Met SLA)   | |
|                    | | Charge Settlement Success Rate  | > 99.0%     | 99.4%      (🟢 Met SLA)   | |
|                    | | Duplicate Card Prevention Rate  | 100.0%      | 100.0%     (🟢 Met SLA)   | |
|                    | +--------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 25:10    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Report Selection & Filter Bar:**
   - Dropdown options: `Card Issuance Volume Summary`, `Fee Settlement & Reconciliations`, `Branch SLA Turnaround`, `Policy Exceptions Log`.
   - Date range selector, Branch filter, and Tenant filter.
2. **Aggregated Data Summary Table:**
   - Displays aggregated figures grouped by Card Brand, Branch, or Request Status.
3. **Operational SLA Gauges:**
   - Highlights SLA turnaround performance with status indicators (`🟢 Met SLA`, `🔴 SLA Breached`).
4. **Export Action:**
   - Clicking `[Export PDF/Excel]` generates clean downloadable reports.

---

## 3. API Endpoints Mapping

- `GET /requests/` - Fetch requests dataset for aggregation.
- `GET /reports/operational` - Fetch pre-calculated operational metrics.

---

**End of Operational Reports Wireframe**
