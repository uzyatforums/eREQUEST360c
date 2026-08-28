# eREQUEST360 — Eligibility Architecture and Findings

## Status
Architecture investigation / business-rule baseline.

## Eligibility chain

    core.accounts
        → core.customers
        → customer_segment
        → card_segment_members
        → card_segments
        → card_segment_programmes
        → card_programmes

For the standalone phase, `core.customers.customer_segment` supplies the legacy `acct_seg` value and is authoritative. The local mapping is maintained in eREQUEST360.

`card_segment_members` maps `acct_seg → card_seg_grp`. Inactive membership or inactive segment prevents eligibility. No valid mapping means no eligible programme.

`card_segment_programmes` maps `card_seg_grp → card_program_id`. A segment may have several programmes. Inactive programmes do not qualify.

Programme ordering is contextual to the segment/programme relationship and uses `card_segment_programmes.seq`. Programme lists should also be grouped by `card_type` so each card brand appears contiguously.

The legacy optional `card_type` filter narrowed programmes by brand. This may be useful for bulk processing; the New Request form can establish its card-type context separately.

## Server-side enforcement

The backend must independently re-evaluate eligibility when a request is submitted. It must not trust the programme selected by the browser because external clients may call the API directly.

The submitted programme must be valid for the account's current segment and active configuration.

## Important boundary

Eligibility is separate from duplicate detection, No-Charge determination, and settlement.

The current architecture does not use a generic account-prefix rule to determine customer segment. NUBAN length is configurable, while `customer_segment` is authoritative for the standalone phase.

## Disallowed Products

*Note: Disallowed Products logic represents recovered legacy domain behavior. It is architecturally specified for eREQUEST360 as planned/deferred Phase 2 functionality and is not yet implemented in current database schemas or active endpoints.*

Card programme eligibility is permissive by default: once an account's customer segment maps to an active card segment and active card programmes are identified, the account may receive those programmes unless an explicit active disallowed-product rule excludes the combination.

The legacy source is:

`[ereq].[com_disallowed_products]`


Relevant fields:

- `programme_id` — the specific card programme being excluded.
- `prd_code` — the account product/class being excluded.
- `description` — descriptive text for the product.
- `inactive` — `0` means the exclusion is active; `1` means disabled.
- `request_type` — the request type to which the exclusion applies.

### Rule

A programme must be removed from the eligible programme list when an active disallowed-product record exists matching:

- the selected `programme_id`;
- the account's `product_code`; and
- the current `request_type`.

Absence of a matching active record means the programme is **not disallowed**.

This is therefore an **exclusion rule**, not an allow-list.

### Example

The active rules shown for `PSMCN` exclude product codes `SA_006`, `SA_007`, `SA_009`, and `SA_010` for request types `1` and `3`.

An inactive record does not exclude the product.

### Position in the eligibility pipeline

The standalone eligibility flow is:

`account → customer → customer_segment/acct_seg → card_seg_grp → active programmes → disallowed-product check`

The disallowed-product check is performed after determining the programmes available to the customer's segment.

### Backend enforcement

The browser-supplied programme must never be treated as authoritative.

When a request is submitted, the backend must repeat the eligibility determination using the current account/product, customer segment, request type, segment mappings, programme configuration and disallowed-product rules.

The submitted programme is accepted only if it remains in the resulting eligible programme set.
