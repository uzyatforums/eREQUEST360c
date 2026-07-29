# Wireframe: Audit Trail & Event Inspector

**Screen ID:** `SCR-013`  
**Module:** `Audit`  
**URL Path:** `/reports/audit`  
**Target Roles:** `operations_admin_checker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Audit & Compliance / Enterprise Audit Inspector               [ Export Audit]|
| 💳 Card Requests   | Search and inspect immutable audit events and entity snapshots.               |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | [ Filter Entity Type ▼ ] [ Filter User ▼ ] [ Date Range: Last 7 Days ▼ ]     |
| 👥 Administration  | +--------------------------------------------------------------------------+ |
| 📜 Audit Trail     | | Event ID | Entity | Entity ID | Source | Performed By | Timestamp    | Actions| |
| 📈 Reports         | |----------|--------|-----------|--------|--------------|--------------|--------| |
|                    | | 5001     | request| 1         | API    | submitter1   | 2026-07-26 21| [View] | |
|                    | | 5002     | request| 2         | SYSTEM | system       | 2026-07-26 22| [View] | |
|                    | | 5003     | user   | admin     | API    | super_admin  | 2026-07-27 09| [View] | |
|                    | +--------------------------------------------------------------------------+ |
|                    | Showing 1-3 of 350 items                                [< Prev] [Next >] |
+--------------------+-+--------------------------------------------------------------------------+
|                    | | Audit Event Detail (#5002)                                        [ X ]  |
|                    | |--------------------------------------------------------------------------|
|                    | | Event ID: 5002 | Source: SYSTEM | Performed By: system                    |
|                    | | Entity Type: request | Entity ID: 2                                      |
|                    | | Timestamp: 2026-07-26 22:03:15 UTC                                      |
|                    | | Remarks: Settlement status: SUCCESS. Charge posting succeeded.          |
|                    | |                                                                          |
|                    | | FIELD MODIFICATION DETAILS                                               |
|                    | | +----------------------------------------------------------------------+ |
|                    | | | Column Name     | Old Value            | New Value                    | |
|                    | | |-----------------|----------------------|------------------------------| |
|                    | | | request_status  | PENDING              | PENDING_AUTHORIZATION        | |
|                    | | +----------------------------------------------------------------------+ |
|                    | |                                                                          |
|                    | | ENTITY SNAPSHOT JSON DATA                                                |
|                    | | { "request_id": 2, "client_id": 100, "status": "PENDING_AUTHORIZATION" }  |
|                    | |--------------------------------------------------------------------------|
|                    | | [ Close Inspector ]                                                      |
+--------------------+----------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Audit Event Filter Bar:**
   - Filters by `Entity Type` (`request`, `user`, `config`, `client_policy`), `Performed By` user, `Event Source` (`API`, `SYSTEM`), and Date Range.
2. **Audit Event Grid:**
   - Displays immutable audit events from `audit.audit_events`.
3. **Audit Event Side Sheet Inspector:**
   - Displays changed column values (`audit_event_details`) and formatted JSON snapshot (`audit_snapshots`).

---

## 3. API Endpoints Mapping

- `GET /reports/audit` - List audit events with filters.
- `GET /requests/{id}/audit` - List audit events for a specific card request.

---

**End of Audit Wireframe**
