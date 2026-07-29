# Wireframe: Card Programmes & Configuration Management

**Screen ID:** `SCR-003`  
**Module:** `Configuration`  
**URL Path:** `/config/card-programmes`  
**Target Roles:** `operations_admin_maker`, `operations_admin_checker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Configuration / Card Programmes                        [ + New Programme ]   |
| 💳 Card Requests   | Configure card products, brand types, segment mappings & fee structures.     |
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | [ Search programmes...  ] [ All Brands ▼ ] [ Active Status ▼ ] [ 🔄 Refresh ]  |
|   ├─ Programmes    | +--------------------------------------------------------------------------+ |
|   ├─ Segments      | | ID | Programme Code     | Programme Name        | Brand | Active | Actions | |
|   └─ Charges       | |----|--------------------|-----------------------|-------|--------|---------| |
| 👥 Administration  | | 1  | APEX_VERVE_CLASSIC | Apex Verve Classic    | VERVE | [YES]  | [Edit]  | |
| 📜 Audit Trail     | | 2  | APEX_VISA_GOLD     | Apex Visa Gold        | VISA  | [YES]  | [Edit]  | |
| 📈 Reports         | | 3  | GLOBAL_MC_PLATINUM | Global MC Platinum    | MAST  | [YES]  | [Edit]  | |
|                    | +--------------------------------------------------------------------------+ |
|                    | Showing 1-3 of 3 items                                  [< Prev] [Next >] |
+--------------------+-+--------------------------------------------------------------------------+
|                    | | Edit Card Programme (#1)                                          [ X ]  |
|                    | |--------------------------------------------------------------------------|
|                    | | Programme Code:  [ APEX_VERVE_CLASSIC        ]                       |
|                    | | Programme Name:  [ Apex Verve Classic        ]                       |
|                    | | Card Type Brand: [ VERVE                     ▼ ]                       |
|                    | | Active Status:   [x] Active Product                                      |
|                    | | Assigned Segment Group: Retail Segment (01)                             |
|                    | | Attached Fee Header:    Verve Classic Fee (NGN 1,000 + VAT)             |
|                    | |--------------------------------------------------------------------------|
|                    | | [ Cancel ]                                            [ Save Changes ]   |
+--------------------+----------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Toolbar Controls:**
   - Instant Search input filtering by programme code or name.
   - Brand Dropdown (`VERVE`, `VISA`, `MASTERCARD`).
   - `[+ New Programme]` primary button trigger opening right-side form drawer sheet.
2. **Card Programmes Data Grid:**
   - 36px row height with `ID`, `Programme Code`, `Programme Name`, `Card Type`, `Status Badge`, and `Action Menu`.
3. **Slide-Over Edit Sheet Drawer (`components/shared/form-sheet.tsx`):**
   - 480px right-side drawer containing inputs for `Programme Code`, `Programme Name`, `Card Type Select`, and `Active Checkbox`.
   - Displays linked fee header and segment mappings.
   - Dual-Control Check: Submitting changes by non-super-admin triggers a Maker-Checker work item submission (`POST /maker-checker/work-items`).

---

## 3. State Variations

- **Loading State:** Table skeleton loader rows while querying API.
- **Empty State:** "No card programmes configured for this tenant. Click [+ New Programme] to add one."

---

## 4. API Endpoints Mapping

- `GET /config/card-programmes` - List all card programmes.
- `GET /config/card-types` - Fetch available card brand types.
- `POST /config/table/card_programmes` - Create card programme.
- `PUT /config/table/card_programmes/{id}` - Update card programme.

---

**End of Card Programmes Wireframe**
