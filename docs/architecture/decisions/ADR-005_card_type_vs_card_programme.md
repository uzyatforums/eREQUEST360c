# ADR-005: Global Shared Card Types vs. Tenant-Bound Card Programmes

## Status
Accepted

## Context
In a multi-tenant card request and lifecycle platform serving multiple banks, a critical domain modeling distinction exists between physical card scheme brand networks (Verve, Visa, Mastercard) and institution-specific card product specifications. 

Confusing these concepts leads to data duplication, compromised multi-tenant isolation, or rigid hardcoding of payment scheme parameters.

## Decision
Establish a strict architectural separation between **`CardType`** and **`CardProgramme`**:

1. **`CardType` (`config.card_types`)**: Global, shared lookup reference entity representing payment scheme network brands (`VERVE_CLASSIC`, `VERVE_WORLD`, `VISA_GOLD`, `MASTERCARD_WORLD`). Card Types are shared across all tenants (`client_id` is null or global) and define the underlying payment scheme network association.
2. **`CardProgramme` (`config.card_programmes`)**: Tenant-bound card product specification owned by a single bank (`client_id`). Card Programmes bind a global `CardType` to specific institution rules:
   - Bank Identification Number (BIN routing prefix).
   - Switch platform indicator (`POSTILION_V2`, `ISO_8583`, `PRIME`, `FLEXCUBE`).
   - Service code, PAN length, and validity period.
   - Financial pricing rules (issuance fee `₦`, maintenance fee `₦`, base currency `NGN`).
   - Eligible core banking account type bindings (`SAVINGS_CURRENT`, `SAVINGS_ONLY`, etc.).
   - Operational channel permissions (instant print, NFC contactless, PIN mailer, web 3DS, ATM dispense).

In maintenance forms, the **Card Scheme Brand** field acts as a lookup dropdown referencing global `CardType` records, while the Card Programme record itself is stored under the current user's `client_id`.

## Consequences
### Positive
- **Strict Multi-Tenant Isolation**: Every Card Programme record is isolated by `client_id`, while utilizing global payment scheme definitions.
- **Data Integrity**: Prevents hardcoded brand strings or typos by enforcing foreign key references to `config.card_types`.
- **Flexibility**: A bank can configure multiple distinct Card Programmes (e.g. Retail Verve, Youth Verve, Staff Verve) referencing the same global `VERVE_CLASSIC` Card Type.

### Negative
- System initialization requires seeding `config.card_types` before tenant admins can create Card Programmes.

## Alternatives Considered
1. **Free-Text Brand Input on Card Programmes**: Rejected due to vulnerability to typos and inability to perform automated scheme API validation.
2. **Duplicating Card Types per Tenant**: Rejected because payment scheme brand networks are global industry standards.

## References
- `docs/architecture/Configuration_Data_Model.md` (`config.card_types` & `config.card_programmes`)
- `docs/architecture/eREQUEST360_Architecture_v1.0.md` (Section 4: Configuration)
- `docs/ui/screen_registry.md` (SCR-003 Specifications)
