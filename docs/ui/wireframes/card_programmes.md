# Wireframe: Card Programmes Master-Detail Configuration Screen

**Screen Code:** `SCR-003`  
**Module:** `Configuration`  
**URL Path:** `/config/card-programmes`  
**Layout Pattern:** Master-Detail Split View (2-Column)  
**Target Roles:** `operations_admin_maker`, `operations_admin_checker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Configuration / Card Programmes                                              |
| 💳 Card Requests   | Master-Detail management of card products, segments, fees, audit & usage.     |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | MASTER SELECTOR (LEFT: 380px)        | DETAIL WORKSPACE (RIGHT: FLEX-1)               |
|   ├─ Programmes    | [ Search programmes... ] [+ New ]    | APEX_VERVE_CLASSIC | Apex Verve Classic          |
|   ├─ Segments      | +----------------------------------+ | Brand: [VERVE] | Status: [ACTIVE] | [Edit] [...]|
|   └─ Charges       | | Code / Name             | Status | |---------------------------------------------|
| 👥 Administration  | |-------------------------|--------| | [General] [Segments] [Charges] [Audit] [Usage]|
| 📜 Audit Trail     | | > APEX_VERVE_CLASSIC    |[ACTIVE]| | +-----------------------------------------+ |
| 📈 Reports         | |   Apex Verve Classic    |        | | | GENERAL PROGRAMME PARAMETERS            | |
|                    | |   VERVE                 |        | | | Programme ID:    #1                       | |
|                    | |-------------------------|--------| | | Tenant Client:   Apex Microfinance Bank (100)|
|                    | |   APEX_VISA_GOLD        |[ACTIVE]| | | Programme Code:  APEX_VERVE_CLASSIC       | |
|                    | |   Apex Visa Gold        |        | | | Programme Name:  Apex Verve Classic       | |
|                    | |   VISA                  |        | | | Card Type Brand: VERVE (Verve Card)       | |
|                    | |-------------------------|--------| | | Active Status:   Active                   | |
|                    | |   GLOBAL_MC_PLATINUM    |[ACTIVE]| | | Created By:      system (2026-07-25 10:00)| |
|                    | |   Global MC Platinum    |        | | | Last Modified:   admin  (2026-07-29 14:15)| |
|                    | |   MASTERCARD            |        | | +-----------------------------------------+ |
|                    | +----------------------------------+ |                                             |
|                    | Showing 1-3 of 3 items   [< Prev] [Next>]                                        |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 29:15    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Master–Detail Component Specification

### 2.1 Left Panel: Master Selector (`w-96` / 380px)
- **Header & Search:** Integrated search bar filtering master list in real time.
- **`[+ New]` Button:** Launches right-side Create/Edit form drawer.
- **Selection List / Grid:** Displays compact cards/rows showing `Programme Code`, `Programme Name`, `Brand Badge`, and `StatusBadge`.
- **Single-Click Selection:** Clicking any row sets active programme state, highlights row with blue left accent border (`border-l-4 border-l-blue-600 bg-blue-50/50`), and re-renders the detail workspace on the right.

### 2.2 Right Panel: Detail Workspace (Flex-1)
- **Detail Header:** Displays full `Programme Code` in monospace font, `Programme Name`, `Card Type Brand`, `Status Badge`, and Action Menu (`[Edit]`, `[Toggle Status]`, `[View Audit Logs]`).
- **Tab Navigation Bar:**
  1. **`[General]` Tab:**
     - Displays master fields mapping `config.card_programmes`: `ID`, `client_id`, `card_programme_code`, `card_programme_name`, `card_type`, `active`, `created_by`, `created_date`, `last_modified_by`, `last_modified_date`.
  2. **`[Segments]` Tab:**
     - Displays mapped customer segment groups (`config.card_segment_programme_charges` / `config.card_segments`).
     - Lists segment codes, segment names, minimum balance rules, and active flags.
  3. **`[Charges]` Tab:**
     - Displays attached fee structures (`config.card_charges_headers` and `config.card_charge_entries`).
     - Detailed breakdown of Issuance Fee (NGN 1,000.00), VAT (NGN 75.00), total charge, GL account mappings, and reversal policies.
  4. **`[Audit]` Tab:**
     - Embedded audit log timeline filtered by `entity_type='card_programmes'` and `entity_id=selected.id` from `audit.audit_events`.
     - Displays timestamps, performed by user, action type (`CREATE`, `UPDATE`, `STATUS_CHANGE`), and old vs new field diffs.
  5. **`[Usage]` Tab:**
     - Operational metrics: Total cards issued under this programme, active cards in circulation, charge collection total, and recent card requests link table (`SCR-008`).

---

## 3. Form Drawer Integration (Slide-Over Sheet)

Editing and creating programmes continue to use the standard 480px slide-over Sheet drawer:
- **Trigger:** Clicking `[+ New Programme]` or `[Edit Programme]`.
- **Form Fields:** `card_programme_code` (`maxLength={35}` with `0/35` character counter), `card_programme_name` (`maxLength={100}`), `card_type` Select (`VERVE`, `VISA`, `MASTERCARD`), `active` Switch.
- **Maker-Checker Notice:** Amber workflow banner displayed for Maker users (`isMakerOnly`).

---

## 4. State Variations

- **Loading State:** Left master list renders skeleton rows; right workspace renders tab panel skeleton loaders.
- **Empty State:** If search returns 0 programmes, left panel displays "No programmes match search criteria"; right panel displays "Select a programme to view details".

---

## 5. API Endpoints Mapping

- `GET /config/card-programmes` - Fetch master list.
- `GET /config/card-segment-programme-charges` - Fetch mapped segments and charges for selected programme.
- `GET /requests/?card_programme_id={id}` - Fetch usage metrics.
- `GET /reports/audit?entity=card_programmes&entity_id={id}` - Fetch audit logs.

---

**End of Master-Detail Card Programmes Wireframe**
