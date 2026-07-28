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

Managed By

Operations

Import Source

Legacy card configuration

Editable

Yes

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

---

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