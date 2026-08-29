# eREQUEST360 — No-Charge Rules and Architecture

## Standing No-Charge Product

The legacy `ereq.com_nocharge_products` represents a standing entitlement based on account product/class + programme.

The redesigned directive is:

- `FREE-CARD` — every qualifying card request for that programme is free.
- `FIRST-CARD-ONLY` — only the first card for the relevant account/customer is free.
- `active=false` — directive disabled.

Multiple matching rules create no conflict: if the account/programme qualifies for a free-card benefit, it is free.

## First-card determination

For `FIRST-CARD-ONLY`, the check is both account-based and customer-based.

Prior card presence is determined from switch records:
- `switch.pc_accounts`
- `switch.pc_card_accounts`
- `switch.pc_customers`

These are operational switch/card records, not merely an archive. A failed eREQUEST request never creates a switch card record.

## Switch physical tables and views

Production physically contains:
- `pc_accounts_1_B` / `pc_accounts_3_B`
- `pc_card_accounts_1_B` / `pc_card_accounts_3_B`
- `pc_cards_1_B` / `pc_cards_3_B`
- `pc_customers_1_B` / `pc_customers_3_B`

The `pc_*` objects are views over those physical tables. The `_1_B` tables represent Naira cards and `_3_B` represent USD cards.

Development-only `plain` columns must not form part of production architecture.

There is no direct DB relationship between `core.accounts` / `core.customers` and the switch `pc_*` objects.

## PAN encryption boundary

eREQUEST and the switch do not use the same PAN encryption algorithm.

- eREQUEST uses its own encryption.
- The switch uses the bank-provided encryption/decryption mechanism.

Therefore ciphertext must not be compared directly across systems. Where PAN identity must be established across the two systems, use the appropriate bank-provided mechanism.

## One-time No-Charge Approval

The legacy `ereq.com_nochargepermissions` mechanism provides a one-time approval specific to account + programme (business context: account/class + programme).

It is:
- one-time;
- account-specific;
- programme-specific;
- Maker/Checker controlled;
- commonly checked by a Head Office user or requesting branch checker;
- required before the New Request is submitted.

If the card request is submitted before the No-Charge Approval is authorized, the account is charged.

### Lifetime and Expiration (Proposed Architectural Rule)

1. **Configurable Lifetime:** The authorization validity lifetime is configurable per tenant (proposed baseline: **48 hours**). It must not be hardcoded into business logic.
2. **Start of Validity Window:** The validity window begins strictly at authorization time (`authorized_at`), NOT at initial creation/submission time. `expires_at = authorized_at + configured_lifetime`.
3. **Explicit State Model:**
   - `PENDING` → Requested / awaiting Checker authorization.
   - `AUTHORIZED` → Checker authorized; active and valid until `expires_at`.
   - `CONSUMED` → Successfully applied to an accepted request record via atomic update.
   - `EXPIRED` → Reached `expires_at` without being consumed. Expired permissions cannot be consumed and must not be silently renewed or extended.

### Atomic Consumption Invariant

Consumption occurs during request pre-commitment evaluation and MUST execute via an atomic conditional update:

```sql
UPDATE nocharge_permissions
SET status = 'CONSUMED',
    consumed_at = CURRENT_TIMESTAMP,
    consumed_by_request_id = :request_id
WHERE id = :permission_id
  AND status = 'AUTHORIZED'
  AND expires_at > CURRENT_TIMESTAMP;
```

**Verification:** Exactly one row must be affected. If zero rows are updated (due to expiration, concurrent consumption, or unapproved status), the no-charge authorization fails and the request cannot be accepted as a no-charge permission request.

### Approval Authorization (Authoritative Branch / Checker Rule)

In alignment with **BR-023**:
- A No-Charge Permission initiated by Branch A can only be approved by a **Branch A Checker** or a **Head Office Checker of the SAME TENANT/CLIENT**.
- Cross-branch Checkers (Branch B) and Other-Tenant Head Office Checkers are strictly denied.
- Maker/Checker dual control applies: The Maker who initiated the permission request cannot approve it (`Creator/Maker ≠ Approving Checker`).

## Request-level recording

*Architecture Specification:* Store the No-Charge evaluation outcome directly on the request record to preserve historical context regardless of future configuration changes.

Do not store a redundant `charge_required` field.

Use:
- `nocharge_source`
- `nocharge_permission_id`

Semantics:
- `nocharge_source IS NULL` → normal charge applies
- `NOCHARGE_PRODUCT` → standing free-card entitlement
- `FIRST_CARD` → first-card-only entitlement
- `NOCHARGE_PERMISSION` → authorized one-time approval

`nocharge_permission_id` is populated only for the one-time approval source.

The request preserves the decision made at submission so later configuration changes do not alter the historical audit rationale. (Note: adding these fields to the `request.requests` table schema is an architectural specification required for Request implementation and is not yet added to current database migrations).

## Settlement separation

No-Charge entitlement evaluation and financial settlement execution are separate concerns:

1. **Pre-commitment Evaluation:** No-Charge entitlement/rule evaluation occurs pre-commitment during request creation, determining and recording `nocharge_source` and `nocharge_permission_id` on the request.
2. **Post-commitment Execution:** Financial charge posting occurs post-commitment. If `nocharge_source` is populated, charge posting is bypassed entirely. If `nocharge_source IS NULL`, financial charge posting proceeds post-commitment.

A settlement failure does not invalidate an accepted request; settlement may be retried. The operator may be warned if settlement may fail, but the valid request can still be accepted.

No-Charge does not bypass duplicate detection.
