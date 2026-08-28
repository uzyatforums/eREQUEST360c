# eREQUEST360 — Request Acceptance and Charging Decision Flow

## Agreed Order

1. Resolve account/customer.
2. Determine eligible programmes.
3. Validate submitted programme server-side.
4. Perform duplicate check and check/consume Duplicate Approval if required.
5. Evaluate No-Charge entitlement/rules (`FREE-CARD`, `FIRST-CARD-ONLY`, or `NOCHARGE_PERMISSION`).
6. Commit/accept the request into eREQUEST360 (persisting `nocharge_source` and `nocharge_permission_id`).
7. Execute financial charge posting post-commitment (if `nocharge_source IS NULL`).
8. Handle settlement success/failure, automatic retries, and manual retry flow.

## Duplicate Gate

Duplicate detection occurs before request acceptance. A request failing the duplicate rule does not proceed to normal acceptance unless a valid Duplicate Approval is present.

Duplicate rules are documented separately in `erequest360_duplicate_detection_rules.md`.

## Charge / No-Charge Timing & Decision

- **Pre-commitment Evaluation:** No-Charge entitlement/rule evaluation occurs as part of request creation and validation before commitment. The resulting decision (`nocharge_source` and optional `nocharge_permission_id`) is stored on the request record.
- **Post-commitment Execution:** Actual financial charge posting occurs after the request has been committed to eREQUEST360.
- If `nocharge_source` is populated, financial charge posting is bypassed entirely.
- If `nocharge_source IS NULL`, standard financial charge posting is required.

Do not store a redundant `charge_required` field; it is derivable because `nocharge_source IS NULL` indicates a normal charge applies.

The system should make its best effort to determine whether settlement is likely to succeed. If it may fail, warn the branch operator where appropriate, but do not reject an otherwise valid request solely because settlement may fail.

## Charge Retry Policy

- **Configurable Automatic Retries:** The maximum number of automatic charge retries is configurable per tenant/system policy. The current default configured value is 3. The value 3 must NOT be presented as a hard-coded application constant.
- **Automatic Retry Exhaustion:** When automatic retries are exhausted (e.g. 3 failed automatic attempts), the request transitions to the `CHARGES_FAILED` status.
- **Non-Terminal Failure:** `CHARGES_FAILED` is NOT a terminal state.
- **Manual Retry Capability:** A manual charge retry remains possible after `CHARGES_FAILED`. A successful manual retry allows the request to resume standard processing.

## Pre-Posting Verification Invariant (Critical Fail-Safe)

Before every external charge/posting attempt, eREQUEST360 MUST protect against the possibility that a previous attempt actually succeeded even though the local eREQUEST360 status does not reflect that success.

- **First Attempt:** Generate a unique payment reference.
- **Subsequent Attempts:** The previous payment reference and associated entry amount from the previous attempt must be used to perform a successful-posting verification before a new posting is submitted.

The check is conceptually:
*"Was payment reference X with entry amount Y successfully posted on the core banking / settlement system?"*

> **CRITICAL FAIL-SAFE RULE:**
> If the verification itself fails, times out, is unavailable, or cannot successfully establish the outcome, that does NOT constitute a negative response.
>
> In that situation:
> 1. eREQUEST360 MUST NOT assume that the previous posting was unsuccessful.
> 2. eREQUEST360 MUST NOT generate a new payment reference and proceed with another posting.
> 3. The request must remain safely unresolved until the verification outcome can be successfully established.

Only when verification successfully establishes that the previous posting was NOT successful may eREQUEST360 proceed to generate a new unique payment reference and submit another posting attempt.

## Unique Payment Reference Per Posting Attempt

Every external charge/posting attempt MUST use a new unique payment reference. A payment reference used for one attempt MUST NEVER be reused for a later posting attempt, even if the previous attempt failed or timed out.

- Attempt 1: payment reference = `MC000012344`
- Attempt 2 (after verifying Attempt 1 did not post): payment reference = `MC000012345` (new unique reference)

*Background Note:* The legacy system generated successive references by numeric incrementing. While numeric incrementing is useful historical background context, the mandatory architectural requirement in eREQUEST360 is uniqueness per posting attempt.

## Charge Posting Attempt History

Each external posting attempt retains its own unique payment reference, amount, timestamp, status, and gateway response in the charge posting attempt history (`charge_posting_attempts`).

## Separation of Concerns

Keep these distinct:

- Eligibility — may this account request this programme?
- Duplicate Detection — does another qualifying request/card already exist?
- No-Charge Determination — why is this request free, if applicable?
- Charge / Settlement — can the applicable charge be posted?

A settlement failure is not request rejection.

## External API Enforcement

Browser selections and UI indications are never authoritative. External API consumers must receive the same server-side eligibility and policy enforcement.
