# eREQUEST360 Request Processing Architecture

## 1. Purpose

Request Processing is responsible for accepting a card request only after
server-side validation of the account, customer, segment, programme
eligibility, duplicate conditions, charge/no-charge entitlement, and
applicable approvals.

The browser is never trusted as the authority for eligibility or entitlement.

### 1.1 Request Identifier Model

Request processing uses the standard three-tier identifier pattern:

- `request_id`: Internal database surrogate key (`BIGINT` / `BIGINT IDENTITY`). Used strictly for internal relational integrity, database joins, and primary key indexing. Must not be exposed as the external API identifier.
- `request_uid`: External unique identifier (`UUID` / `UNIQUEIDENTIFIER`). Used by external REST APIs, integrations, webhooks, and all externally visible request references.
- `request_number`: Human/business-facing request reference (`VARCHAR` / string). Used for user-facing business identification, receipts, operational references, and branch delivery tracking.

> [!IMPORTANT]
> **Scope Note (ADR-007 Alignment):** ADR-007 does NOT decide the final roles, types, persistence mechanics, or generation mechanisms of:
> - `request_id`
> - `request_uid`
> - `request_number`
> 
> Those decisions remain reserved for the dedicated Request Processing architecture review.



## 2. Core Account and Customer Model

core.accounts
    ├── account_number
    ├── customer_key
    ├── product_code
    ├── account_type
    ├── branch_code
    ├── currency_code
    └── account_status

core.customers
    ├── customer_number
    ├── customer_segment
    ├── customer_type
    ├── name/details
    └── ...

For the standalone phase:

- core.accounts is the local representation of account information.
- core.customers is the local representation of customer information.
- core.accounts.customer_key identifies the customer.
- One customer may have multiple accounts.
- Different accounts belonging to the same customer may have different
  product classes.
- core.customers.customer_segment is authoritative for the standalone phase.
- Segment values such as SME_400, COM_210, ECO_001, etc. are stored there.

Future bank integration will replace/augment these local representations
with the bank's account/customer enquiry services.

## 3. Account → Customer → Segment

Given an account number:

1. Locate the account in core.accounts.
2. Resolve the customer through customer_key.
3. Obtain customer_segment from core.customers.
4. Use that segment to determine the applicable card segment group.
5. Determine the programmes available to that segment.

The customer's segment may change over time. Therefore the current
customer_segment must be evaluated at request time.

## 4. Card Segment Groups

Card segment groups are configuration concepts such as:

PS = Personal Banking
CP = Corporate Banking
RO = Royalty Banking
EL = Elite Banking
BZ = Business Banking
CM = Commercial
UL = UnionLegend Banking
UV = UnionVibe Banking

The mapping between customer-segment codes and card-segment groups is
configuration, not something the Request Processing API should hard-code.

## 5. Programme Eligibility

The legacy flow is conceptually:

account
  → customer
  → customer segment
  → card segment group
  → eligible card programmes

The browser may obtain a list of eligible programmes to populate the
programme dropdown.

However, this is only a convenience/read operation.

At POST /requests/ the backend MUST independently determine whether the
selected programme is currently eligible for the supplied account.

The backend MUST NOT trust programme_id supplied by the browser merely
because it appeared in an earlier eligibility response.

This is required because:
- configuration may change between screen load and submission;
- customer segment may change;
- accounts may have multiple product classes;
- external clients may call the API without using the eREQUEST360 UI.

## 6. One Programme Per Request

A request represents one card programme.

A single request MUST NOT contain multiple programmes.

## 7. No-Charge Entitlement

No-charge determination answers:

"Does this account/product class qualify for this specific card programme
to be issued without charge?"

It is NOT simply:

"Does this account qualify for free cards?"

The programme is therefore part of the determination.

**Timing Distinction:** No-Charge entitlement/rule evaluation occurs pre-commitment as part of request creation and validation (determining and persisting `nocharge_source` and `nocharge_permission_id` on the request record). Actual financial charge posting occurs post-commitment. If `nocharge_source` is set, financial charge posting is bypassed.


### 7.1 Standing FREE-CARD entitlement

A configured account product/programme combination may provide a perpetual
no-charge entitlement.

Representation:

free_card = FREE-CARD
active = true

This means the applicable account product class is entitled to that
specific programme without charge.

### 7.2 FIRST-CARD-ONLY entitlement

A configured account product/programme combination may provide a
first-card-only no-charge entitlement.

Representation:

free_card = FIRST-CARD-ONLY
active = true

This means the specific programme is free only when the account/customer
has never previously had a card.

For the initial implementation, the first-card-only benefit must support
the PAYROLL class first.

### 7.3 Disabled entitlement

If:

active = false

the directive is disabled and must not grant the entitlement.

## 8. First-Card Determination

The local switch representation is operational card data.

It is NOT an eREQUEST360 request-history table.

The application-facing objects are:

switch.pc_accounts
switch.pc_card_accounts
switch.pc_cards
switch.pc_customers

The underlying physical tables include separate Naira and USD tables.
The pc_* objects exposed to the application are views over those physical
tables.

For example:

pc_accounts_1_B
pc_accounts_3_B

are underlying tables, while:

switch.pc_accounts

is the application-facing view.

The same pattern applies to pc_card_accounts, pc_cards and pc_customers.

### First-card rule

If the account/customer has any existing presence in the relevant switch
records, the account/customer has had card history and is NOT eligible
for FIRST-CARD-ONLY.

Specifically, if the account is present in:

- switch.pc_card_accounts
- switch.pc_accounts

OR the customer is present in:

- switch.pc_customers

then first-card eligibility fails.

These are actual operational card records. A failed card request does not
create a record in these tables.

The bank provides encryption/decryption services for account identifiers.
The production application must use the bank-provided mechanism when
querying the switch data.

The *_plain columns in the development database exist solely for local
development/testing and MUST NOT be treated as production fields.

## 9. Legacy No-Charge Concepts

The legacy implementation contains:

nocharge_product()
nocharge_approval()
nocharge_first_card()

These represent distinct concepts and must not be collapsed into one
generic "free card" check.

The new architecture must preserve that distinction.

## 10. Duplicate Approval

Duplicate approval is a one-time approval allowing a specific account to
receive a specific card programme despite the applicable duplicate-card
rules.

The approval:

- must exist in `AUTHORIZED` status before request submission;
- possesses a configurable lifetime (proposed baseline: 48 hours) starting strictly at `authorized_at`;
- expires when `current_time >= expires_at` and cannot be consumed once expired;
- is specific to the account and programme;
- requires Maker/Checker governed by **BR-023** (approvable only by Branch A Checker or Same-Tenant HO Checker; Maker ≠ Checker);
- is consumed atomically (`UPDATE ... WHERE id = ? AND status = 'AUTHORIZED' AND expires_at > now()`) when the card request is accepted;
- must verify exactly one row affected;
- must not be reusable after consumption.

The request should record/indicate that duplicate approval was used.

## 11. No-Charge Approval

A no-charge approval is a separate one-time approval that allows a
specific account to receive a specific card programme without charge.

It:

- must be granted (`AUTHORIZED`) before request submission;
- possesses a configurable lifetime (proposed baseline: 48 hours) starting strictly at `authorized_at`;
- expires when `current_time >= expires_at` and cannot be consumed once expired;
- is specific to the account and programme;
- requires Maker/Checker governed by **BR-023** (approvable only by Branch A Checker or Same-Tenant HO Checker; Maker ≠ Checker);
- is consumed atomically during pre-commitment validation when the applicable request is accepted;
- verifies exactly one row affected.

This is distinct from standing FREE-CARD and FIRST-CARD-ONLY rules.

## 12. Request Submission Principle

Eligibility and entitlement are evaluated twice conceptually:

1. During the interactive request-entry process to provide useful
   information to the operator.
2. At request submission on the server, authoritatively.

Only the second determination is authoritative.

## 13. External API Consumers

Request Processing APIs may be consumed by clients that do not use the
eREQUEST360 UI.

Therefore all business rules must be enforced by the backend API.

UI-only validation is never sufficient.

## 14. Future Core-Banking Integration

The current core.* tables are local abstractions that allow eREQUEST360
to operate standalone.

Later, integration with the bank/core-banking environment may obtain:

- account details;
- customer details;
- customer segment;
- account product/class;
- other eligibility information

through bank-provided enquiry APIs/services.

The Request Processing business rules should therefore be designed
against the eREQUEST360 abstraction rather than tightly coupling the
business logic to a particular external banking system.

## 15. Open Decisions

The following must be resolved before implementation where applicable:

- exact card-segment-group mapping configuration;
- complete programme eligibility rules;
- duplicate rule definitions;
- duplicate approval persistence and consumption;
- no-charge approval persistence and consumption;
- charge calculation;
- request lifecycle/state transitions;
- Maker/Checker points;
- account/customer enquiry abstraction;
- switch encryption/decryption integration boundary.