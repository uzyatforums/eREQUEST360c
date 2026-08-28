# eREQUEST360 — Duplicate Detection Rules

## Status

**Status:** Business rules established during architecture investigation
**Scope:** New Card Request duplicate detection
**Source:** Legacy `dupchecker.php`, legacy `atm_requests`, switch `pc_*` tables, and business clarifications

---

## 1. Purpose

Duplicate detection determines whether an account has an existing or outstanding card that conflicts with the tenant's configured duplicate-card policy.

Duplicate detection is **separate from**:
- programme eligibility;
- First-Card-Only No-Charge determination;
- standing No-Charge Product benefits;
- one-time No-Charge Approval;
- one-time Duplicate Approval.

These rules must not be collapsed into a single generic "eligibility" check.

## 2. Tenant Duplicate Policies

Duplicate policy is configurable per client/tenant.

### 2.1 One Card Per Card Type

An account may have one card within each card type/brand.

```text
Existing card: VERVE

Request VERVE  -> duplicate
Request AFRIGO -> allowed
```

### 2.2 One Card Across All Card Types

An account may have only one applicable card in total, regardless of card type.

```text
Existing card: VERVE

Request VERVE  -> duplicate
Request AFRIGO -> duplicate
```

## 3. What Counts Toward Duplicate Detection

A card may be represented in two places:

1. An outstanding/fulfilled request in eREQUEST360.
2. An issued card in the switch `pc_*` tables.

The duplicate engine must reconcile these representations so that the same physical card is counted only once.

### 3.1 Outstanding eREQUEST Requests

A request that has not yet been fulfilled exists in eREQUEST360 and counts toward duplicate detection.

In the target eREQUEST360 architecture, requests in the following active statuses count toward duplicate calculation:

- `PENDING_CHARGE` — Awaiting financial settlement
- `PENDING_APPROVAL` — Awaiting branch/ops authorization
- `APPROVED` — Authorized and pending card production
- `READY_FOR_PRODUCTION` — Queued for card production
- `IN_PRODUCTION` — Currently being personalized/printed
- `READY_FOR_DISPATCH` — Prepared for delivery
- `DISPATCHED` — In transit / awaiting collection

Statuses such as `CANCELLED`, `REJECTED`, or `ELIGIBILITY_FAILED` explicitly do NOT count toward duplicate detection.

#### Recovered Legacy PHP Status Reference (Historical)

For historical reference during migration from the legacy application, the legacy `dupchecker.php` process codes were:

```text
BACC   Awaiting Card Charges
ACC    Awaiting card charges
AA     Awaiting authorization
AP     Awaiting processing
ADB    Awaiting dispatch to branch
ABR    Awaiting branch receipt
ADC    Awaiting dispatch to customer
DTC    Dispatched to customer
CAN    Cancelled (Explicitly excluded)
```

The duplicate-counting status set should be maintained as configuration/data rather than scattered as hard-coded status values throughout the application.


## 4. Fulfilled Requests and Switch Cards

Once a request is fulfilled, the corresponding card exists in both eREQUEST360 and the switch `pc_*` data.

The request-to-card relationship is established by:

```text
PAN + sequence number
```

The PAN is encrypted in both systems.

The duplicate engine compares the stored encrypted PAN values; plaintext PAN is not required.

```text
same encrypted PAN
+
same sequence number
=
same physical card
```

An eREQUEST request and switch card with matching PAN + sequence contribute **one** card to the duplicate calculation.

## 5. Switch Card History

*Note: Reconciliation against switch `pc_*` tables represents recovered legacy domain behavior. It is architecturally specified as planned Phase 2 integration functionality and is not currently implemented in active endpoints or local ORM queries.*

The production-facing switch structures are:


```text
switch.pc_accounts
switch.pc_card_accounts
switch.pc_cards
switch.pc_customers
```

The underlying physical tables are split by currency/card environment, with views presenting consolidated data.

Development-only columns containing `plain` are not part of the production design and must not be relied upon.

The switch tables contain actual card/transaction records. A failed card request does not create a switch card record.

## 6. Expiry Rule

A fulfilled card does not count toward duplicate detection if it expires **within the current calendar month**.

Business interpretation:

> The customer is assumed to be obtaining a replacement card.

Therefore:

```text
card expiry month == current month
    -> does NOT count toward duplicate count
```

A card expiring in a future month continues to count, subject to the other duplicate rules.

## 7. Cancelled / Hotlisted Cards

Cancelled or hotlisted cards do not count toward duplicate detection.

The exact switch-card status interpretation must follow the legacy switch query/status semantics rather than being inferred from column names alone.

## 8. Duplicate Reconciliation

The effective card set used by duplicate detection is constructed conceptually as:

```text
Outstanding eREQUEST requests
            +
Issued switch cards
            |
            v
Reconcile request/card pairs
using encrypted PAN + sequence
            |
            v
Remove non-counting records
            |
            v
Effective existing-card set
            |
            v
Apply tenant duplicate policy
```

The same fulfilled card must never be counted once from eREQUEST360 and again from the switch.

## 9. Duplicate Approval

A Duplicate Approval is a one-time exception allowing an otherwise duplicate request to proceed.

The sequence is:

```text
Determine duplicate
       |
       +-- No --> continue request processing
       |
       +-- Yes
             |
             v
      Check Duplicate Approval
             |
       +-----+-----+
       |           |
      Valid      Not valid
       |           |
       v           v
    consume      duplicate
    approval     handling required
```

The approval must be consumed when the request is accepted.

## 10. Duplicate Approval Branch Restriction

The legacy function is conceptually:

```php
is_dup_permitted($programme_id, $use_branch = TRUE)
```

Branch restriction is configurable.

Default:

```text
use_branch = TRUE
```

Only the `request_branch` may consume the duplicate approval.

Optional:

```text
use_branch = FALSE
```

The approval may be consumed by another branch.

Therefore branch restriction must not be hard-coded.

## 11. First-Card-Free Is Separate

First-Card-Only No-Charge is intentionally different from duplicate detection.

For a qualifying account/product class such as PAYROLL:

```text
free_card = FIRST-CARD-ONLY
active = true
```

the account/customer is not eligible if historical switch data shows that a card has ever been issued.

The agreed historical-existence rule is broader:

> If the account/customer is present in `switch.pc_accounts`, `switch.pc_card_accounts`, or `switch.pc_customers`, the account/customer is not eligible for the First-Card-Only benefit.

This does **not** mean that every such historical record counts as a duplicate.

## 12. Programme / Card-Type Resolution

For `ONE_PER_CARD_TYPE`, existing cards must be resolved to their card type so they can be compared with the requested programme's `card_type`.

The local programme configuration provides the programme-to-card-type mapping.

The switch `pc_cards.card_program` identifies the issued card programme and can be related to local `card_programmes` configuration to determine its card type.

## 13. Server-Side Enforcement

Duplicate detection must be performed server-side during request submission.

The browser must never be trusted to determine whether a request is a duplicate.

The backend must independently:

1. identify the account;
2. determine the selected programme;
3. resolve the programme's card type;
4. load applicable outstanding eREQUEST requests;
5. load applicable switch card history;
6. reconcile duplicate representations using encrypted PAN + sequence;
7. remove non-counting records;
8. apply the tenant's duplicate policy;
9. check for a valid Duplicate Approval where required;
10. consume the approval when the request is accepted.

This is important because external clients may call eREQUEST360 APIs directly without using the UI.

## 14. Relationship to Request Processing

```text
Account
  |
  v
Programme Eligibility
  |
  v
Selected Programme
  |
  v
Duplicate Detection
  |
  +-- No duplicate --------------------+
  |                                    |
  +-- Duplicate                        |
         |                             |
         v                             |
  Duplicate Approval?                  |
         |                             |
    +----+----+                        |
    |         |                        |
   Yes        No                       |
    |         |                        |
    v         v                        |
 consume    duplicate handling        |
 approval      required                |
    |              |                   |
    +--------------+-------------------+
                   |
                   v
             Continue Request
```

No-Charge determination is a separate subsequent concern:

```text
Duplicate Detection
        |
        v
No-Charge Determination
        |
        +-- FREE-CARD
        |
        +-- FIRST-CARD-ONLY
        |
        +-- No-Charge Approval
        |
        +-- Chargeable
```

## 15. Outstanding Questions

These should remain explicit questions until resolved rather than being inferred by implementation:

1. Exact switch-card status values that constitute "cancelled" or "hotlisted" for duplicate purposes.
2. Exact local eREQUEST360 request status model corresponding to "fulfilled".
3. Exact mechanism for resolving `switch.pc_cards.card_program` to local `card_programmes.card_type`.
4. Exact tenant configuration representation for:
   - one card per card type;
   - one card across all card types;
   - Duplicate Approval branch restriction.

These should be resolved before the duplicate engine is coded.
