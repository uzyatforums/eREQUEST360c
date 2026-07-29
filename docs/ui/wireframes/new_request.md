# Wireframe: New Card Request Wizard

**Screen ID:** `SCR-007`  
**Module:** `Requests`  
**URL Path:** `/requests/new`  
**Target Roles:** `branch_submitter`, `operations_admin_maker`, `super_admin`  

---

## 1. Screen Layout (ASCII Blueprint)

```
+---------------------------------------------------------------------------------------------------+
| [Logo] eREQUEST360 | Tenant: Apex MFB (100) ▼ | Branch: Main (001) | 🔍 Ctrl+K | 🔔(3) | Admin (Uzy) ▼|
+---------------------------------------------------------------------------------------------------+
| 📊 Dashboard       | Requests / New Card Request                                                  |
| 💳 Card Requests   | Initiate new card issuance request with automated eligibility & fee checks.   |
|   ├─ New Request   | -----------------------------------------------------------------------------|
|   └─ My Requests   | [ Step 1: Customer & Account ] -> [ Step 2: Card & Fees ] -> [ Step 3: Submit]|
| 🛡️ Maker-Checker  | -----------------------------------------------------------------------------|
| ⚙️ Configuration   | STEP 1: CUSTOMER ACCOUNT VALIDATION                                           |
| 👥 Administration  | +--------------------------------------------------------------------------+ |
| 📜 Audit Trail     | | Account Number: [ 1011122200          ] [ 🔍 Validate Eligibility ]        | |
| 📈 Reports         | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | VERIFIED ACCOUNT DETAILS                                                     |
|                    | +--------------------------------------------------------------------------+ |
|                    | | Account Name:     Victor Uzoma Nwosu                                    | |
|                    | | Client Tenant:    Apex Microfinance Bank (100)                           | |
|                    | | Branch:           Apex Main Branch (001)                                 | |
|                    | | Customer Segment: Retail Segment (Acct Seg: 10 -> Seg Grp: 01)            | |
|                    | | Eligibility Status: [ PASS - 2 Programmes Available ]                    | |
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | SELECT ELIGIBLE CARD PROGRAMME                                               |
|                    | +--------------------------------------------------------------------------+ |
|                    | | (o) Apex Verve Classic (VERVE)    - Fee: NGN 1,075.00 (Issuance + VAT)    | |
|                    | | ( ) Apex Visa Gold (VISA)        - Fee: NGN 1,612.50 (Issuance + VAT)    | |
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | DELIVERY METHOD & PICKUP BRANCH                                              |
|                    | +--------------------------------------------------------------------------+ |
|                    | | Pickup Branch:   [ 001 - Apex Main Branch                         ▼ ] | |
|                    | | Delivery Method: [ Branch Collection                             ▼ ] | |
|                    | +--------------------------------------------------------------------------+ |
|                    |                                                                              |
|                    | [ Cancel ]                                         [ Submit Card Request > ] |
+---------------------------------------------------------------------------------------------------+
| Connected to SQL Server (erequest360c) | API v0.1.0 | Environment: DEVELOPMENT | Session: 28:04    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components & Interactions

1. **Account Number Input & Verification (`GET /eligibility/account/{acc}`):**
   - User inputs 10-digit NUBAN account number.
   - Clicking `[Validate Eligibility]` triggers backend evaluation:
     - Derives `acct_seg` from first 2 digits (e.g. `'10'`).
     - Maps to `CardSegmentMember` (`card_seg_grp = '01'`).
     - Resolves eligible `CardProgramme` records.
     - Performs duplicate request check (`POST /eligibility/duplicate-check`).
2. **Eligibility Results Banner:**
   - Displays green `[PASS]` badge or red `[FAILED]` badge with specific reasons (e.g. "Duplicate card exists for brand Verve").
3. **Card Programme Radio Selector:**
   - Renders only eligible programmes with transparent fee breakdown (Issuance Fee + VAT).
4. **Duplicate & Policy Override Alert (if applicable):**
   - If account violates active card policy (`one_card_per_account`), an Amber notice appears: `⚠️ Duplicate Card Policy Triggered. Request will be routed for Branch Authorizer Approval (PENDING_APPROVAL).`
5. **Submission Action:**
   - `[Submit Card Request]` posts to `POST /requests/`, creates request in `PENDING` state, logs initial history, and redirects to Request Details screen.

---

## 3. State Variations

- **Initial State:** Empty account field, submit button disabled.
- **Validating State:** Spinner on `Validate` button, account fields locked.
- **Ineligible State:** Red alert panel detailing why customer cannot request card (e.g. "Account Frozen / PND active").

---

## 4. API Endpoints Mapping

- `GET /eligibility/account/{account_number}` - Evaluate account eligibility.
- `POST /eligibility/duplicate-check` - Check duplicate card rules.
- `POST /requests/` - Create card issuance request.

---

**End of New Request Wireframe**
