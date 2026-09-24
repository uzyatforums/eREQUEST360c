# eREQUEST 360 Configuration Data Model
Version: 1.0

---

# Purpose

This document defines the platform configuration data that drives eREQUEST 360.

The objective is to ensure that business behaviour is controlled through configuration rather than application code wherever practical.

This document complements:

- eREQUEST360_Architecture_v1.0.md
- eREQUEST360_Database_Migration_Strategy_v1.0.md

This document is considered the authoritative reference for configuration tables and their relationships.

---

# Design Principles

Configuration data shall:

- be tenant-aware
- be editable through the Configuration Console
- support CSV import during migration
- minimize hardcoded values
- support future multi-bank deployments

Configuration tables are considered master data.

Transactional data must never be stored in configuration tables.

---

# Configuration Categories

## 1. Tenant Administration

Purpose

Defines the financial institutions hosted by the platform.

Tables

- config.tenants

Managed By

Platform Administrator

Import Source

Legacy client database

Editable

Yes

---

## 2. Branch Configuration

Purpose

Defines branches belonging to a tenant.

Tables

- config.branches

Depends On

- config.tenants

Managed By

Bank Administrator

Import Source

Legacy branch table

Editable

Yes

---

## 3. Card Catalogue

Purpose

Defines available card products.

Tables

- config.card_types
- config.card_programmes

Depends On

- config.tenants
- config.card_types

Managed By

Operations

Import Source

Legacy card configuration

Editable

Yes

### 3.1 Card Types Architecture & Schema Standards (`config.card_types`)

`config.card_types` represents the GLOBAL shared payment scheme network brand master (7 columns total).

Key Architectural Rules (ADR-005):
- **Global Reference Scope**: `config.card_types` is a platform-wide shared reference lookup. It contains NO tenant identity (`client_id` is removed).
- **Primary Key**: `card_type` (`VARCHAR(20) NOT NULL PRIMARY KEY CLUSTERED`).
- **Columns**: `card_type` (PK), `description` (`VARCHAR(50) NULL`), `active` (`BIT NOT NULL`), and standard audit metadata (`created_by`, `created_date`, `last_modified_by`, `last_modified_date`).
- **Referential Relationship**: `config.card_programmes(card_type)` references `config.card_types(card_type)` via a standard single-column foreign key (`FK_card_programmes_card_types`).
- **Global Read Visibility**: Readily accessible across all tenants to populate scheme/brand selection dropdowns during Card Programme creation and maintenance.

### 3.2 Card Programme Architecture & Schema Standards (`config.card_programmes`)

`config.card_programmes` represents the tenant-bound Card Programme entity (24 columns total).

Key Architectural Rules:
- **Tenant-Bound**: Owned strictly by a single institution (`client_id`).
- **Single-Column Scheme Brand Reference**: References `config.card_types(card_type)` via single-column foreign key `FK_card_programmes_card_types`.
- **No Programme-Level Priority**: `config.card_programmes` does NOT contain a `priority` column. Priority is strictly an attribute of the Segment ↔ Programme mapping (`config.card_segment_programmes.priority`).
- **Mandatory Currency Code**: `currency_code` is `VARCHAR(3) NOT NULL` with default constraint `'NGN'`. Multi-currency capability is supported via ISO 4217 currency codes (e.g. `NGN`, `USD`).
- **Default Validity Years**: `default_validity_years` has a default constraint of `5` (updated from legacy default 3). Existing database records preserve their stored validity values.
- **ORM / API Alignment**: The active ORM (`CardProgramme`) and Pydantic schemas (`CardProgrammeCreate`, `CardProgrammeUpdate`, `CardProgrammeRead`) exactly mirror the 24-column physical table schema. Obsolete legacy fields have been removed.
- **Lookup Index**: Composite index `IX_card_programmes_lookup` is defined on `(client_id, active, card_type)`.

---

## 4. Segmentation

Purpose

Determines customer eligibility.

Tables

- config.card_segments
- config.card_segment_programmes
- config.card_segment_members
- config.card_segment_programme_charges

Managed By

Business Operations

Import Source

Legacy segmentation tables

Editable

Yes

### 4.1 Segment ↔ Programme Relationship & Priority (`config.card_segment_programmes`)

`config.card_segment_programmes` maps eligible Card Programmes to Card Segments.

Key Architectural Rules:
- **Authoritative Selection Priority**: `config.card_segment_programmes.priority` (`INT NOT NULL`) is the single authoritative source of programme selection and dropdown ordering within a segment and card brand.
- **Ordering Rule**: Lower priority numbers represent higher precedence (Priority 1 = highest precedence).
- **Intra-Segment Uniqueness**: Within the same Tenant, Segment, and Card Brand, Programme Selection Order is unique.

---

## 4.2 Migration 019: Card Programme Schema Alignment

Database migration `database/migrations/019_align_card_programmes_schema.sql` established the current Card Programme baseline:

1. **Currency Backfill & NOT NULL**: Backfilled 9 NULL development/test currency values to `'NGN'` and altered `currency_code` to `VARCHAR(3) NOT NULL` with default constraint `DF_config_card_programmes_currency_code DEFAULT ('NGN')`.
2. **Priority Removal**: Dropped default constraint `DF_card_programmes_priority`, dropped index `IX_card_programmes_lookup`, and dropped column `priority` from `config.card_programmes`.
3. **Index Recreation**: Recreated `IX_card_programmes_lookup` on `config.card_programmes (client_id, active, card_type)`.
4. **Default Validity Update**: Updated default constraint `DF_config_card_programmes_default_validity_years` to `DEFAULT (5)`, preserving all existing stored values without overwriting.
5. **Code Alignment**: Aligned ORM models, Pydantic schemas, executors, seed data, and tests to match the live schema.

---

## 4.3 Migration 020: Restore Global Card Types Architecture

Database migration `database/migrations/020_restore_global_card_types.sql` restored `config.card_types` to the authoritative ADR-005 GLOBAL shared reference design:

1. **Foreign Key Transition**: Dropped composite foreign key `FK_card_programmes_card_types (client_id, card_type)` and created replacement single-column foreign key `FK_card_programmes_card_types (card_type) REFERENCES config.card_types (card_type)`.
2. **Tenant Constraint & Column Removal**: Dropped foreign key `FK_card_types_clients`, dropped composite unique constraint `UQ_card_types_client_card_type`, and dropped column `client_id` from `config.card_types`.
3. **Data Preservation**: Preserved all 6 existing `config.card_types` rows (`AFRIGO`, `MASTERCARD`, `MCARD`, `VCL`, `VERVE`, `VISA`) and all 17 existing `config.card_programmes` rows without any data changes.
4. **Code & API Alignment**: Aligned ORM `CardType` (7 columns, no `client_id`), Pydantic `CardTypeRead`, seed data, test fixtures, and updated `GET /config/card-types` to return active global scheme brands without tenant restriction.

### Verification Evidence
- **Database Backup**: Full backup created and verified via `RESTORE VERIFYONLY FROM DISK` prior to DDL execution.
- **Post-Migration Audit**: Verified live table column structure, constraints, and indexes against SQL Server `erequest360c`.
- **Test Suite**: 100% pass rate across entire automated test suite (121 passed, 0 failed, 0 errors). Targeted Card Programme/Governance tests passed (12 passed).

## 5. Charge Configuration

Purpose

Defines card charges.

Tables

- config.card_charges_headers

Managed By

Finance

Editable

Yes

---

## 6. Courier Configuration

Purpose

Defines supported dispatch providers.

Tables

- config.couriers

Editable

Yes

---

## 7. Local Accounts

Purpose

Settlement and internal posting accounts.

Tables

- config.local_accounts

Editable

Yes

---

## 8. Email Notification

Purpose

Defines internal notification recipients.

Tables

- config.local_email_recipients

Editable

Yes

---

# Platform Lookup Tables

The following tables contain platform-defined values.

They are not expected to change frequently.

## Request

- request.request_statuses
- request.request_status_transitions
- request.request_categories
- request.request_channels

## Dispatch

- config.dispatch_statuses
- config.dispatch_types

## Instant Card

- config.instant_card_types
- config.instant_card_statuses
- config.instant_inventory_movement_types

## Audit

- audit.audit_event_types

These tables are normally seeded during installation.

---

# Data Ownership

| Category | Owner |
|-----------|-------|
| Tenant | Platform Administrator |
| Branch | Bank Administrator |
| Card Programmes | Operations |
| Segments | Business Operations |
| Charges | Finance |
| Couriers | Operations |
| Local Accounts | Finance |
| Email Recipients | Operations |

---

# CSV Migration Strategy

Legacy lookup data shall be migrated manually.

Workflow

Legacy Database

↓

CSV Export

↓

Data Cleansing

↓

Review

↓

Generated INSERT Script

↓

Database Migration

↓

Configuration Console Verification

Automated migration of legacy lookup data is intentionally not performed.

This allows data quality issues to be corrected before import.

---

# Configuration Console Scope

The Configuration Console shall provide CRUD functionality for all editable configuration tables.

Features

- Search
- Pagination
- Validation
- Soft delete where appropriate
- Audit logging
- Role-based access control
- Tenant isolation

---

# Future Enhancements

Potential future configuration modules include:

- Charge Rules
- BIN Management
- Card Design Templates
- Card Production Rules
- Holiday Calendars
- SLA Definitions
- Notification Templates
- Integration Endpoints

---

# Guiding Principle

Configuration drives behaviour.

Business rules belong in code.

Business parameters belong in configuration.