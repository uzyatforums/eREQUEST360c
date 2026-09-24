/******************************************************************************
Migration: 022_polymorphic_entity_key_and_audit_tenant_alignment.sql
Database:  erequest360c
Author:    eREQUEST360 Architecture Team
Governance: Conforms to Accepted ADR-008 (Polymorphic Entity Reference Architecture)
Purpose:   1. Transition shared polymorphic entity references from BIGINT entity_id
              to canonical VARCHAR(64) entity_key across maker_checker and audit.
           2. Eliminate legacy entity_id = 0 sentinel; permit NULL entity_key for
              Maker/Checker CREATE proposals.
           3. Add tenant qualification (client_id INT NOT NULL) to audit.audit_events
              and audit.audit_snapshots, backfilling historical data via deterministic
              snapshot, domain-table, and unique-user resolution hierarchies.
           4. Rebuild indexes to support composite tenant polymorphic lookups.
           5. Safely drop legacy entity_id columns after validation gates pass.
******************************************************************************/

USE [erequest360c];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

BEGIN TRY
    BEGIN TRANSACTION;

    ---------------------------------------------------------------------------
    -- 1. PRECONDITIONS
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 1: Precondition Gates...';

    -- 1.1 Verify required schemas exist
    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'maker_checker')
        THROW 52001, 'Precondition failed: Schema [maker_checker] does not exist.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit')
        THROW 52002, 'Precondition failed: Schema [audit] does not exist.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'config')
        THROW 52003, 'Precondition failed: Schema [config] does not exist.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'iam')
        THROW 52004, 'Precondition failed: Schema [iam] does not exist.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'request')
        THROW 52005, 'Precondition failed: Schema [request] does not exist.', 1;

    -- 1.2 Verify required tables exist
    IF OBJECT_ID('maker_checker.work_items', 'U') IS NULL
        THROW 52006, 'Precondition failed: Table [maker_checker].[work_items] does not exist.', 1;

    IF OBJECT_ID('audit.audit_events', 'U') IS NULL
        THROW 52007, 'Precondition failed: Table [audit].[audit_events] does not exist.', 1;

    IF OBJECT_ID('audit.audit_snapshots', 'U') IS NULL
        THROW 52008, 'Precondition failed: Table [audit].[audit_snapshots] does not exist.', 1;

    -- 1.3 Verify legacy entity_id columns exist
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('maker_checker.work_items') AND name = 'entity_id'
    )
        THROW 52009, 'Precondition failed: Column [maker_checker].[work_items].[entity_id] does not exist.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_events') AND name = 'entity_id'
    )
        THROW 52010, 'Precondition failed: Column [audit].[audit_events].[entity_id] does not exist.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_snapshots') AND name = 'entity_id'
    )
        THROW 52011, 'Precondition failed: Column [audit].[audit_snapshots].[entity_id] does not exist.', 1;

    -- 1.4 Verify Maker/Checker entity_id compatibility
    IF EXISTS (
        SELECT 1 FROM maker_checker.work_items 
        WHERE entity_id IS NULL
    )
        THROW 52040, 'Precondition failed: [maker_checker].[work_items] contains NULL entity_id values.', 1;

    -- 1.5 Verify Audit entity_id conversion feasibility
    IF EXISTS (
        SELECT 1 FROM audit.audit_events 
        WHERE entity_id IS NULL
    )
        THROW 52041, 'Precondition failed: [audit].[audit_events] contains NULL entity_id values.', 1;

    IF EXISTS (
        SELECT 1 FROM audit.audit_snapshots 
        WHERE entity_id IS NULL
    )
        THROW 52042, 'Precondition failed: [audit].[audit_snapshots] contains NULL entity_id values.', 1;

    PRINT 'Section 1 passed successfully.';

    ---------------------------------------------------------------------------
    -- 2. CAPTURE BASELINE
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 2: Capture Baseline Row Counts...';

    DECLARE @Baseline_MC_Count INT;
    DECLARE @Baseline_AE_Count INT;
    DECLARE @Baseline_AS_Count INT;

    SELECT @Baseline_MC_Count = COUNT(*) FROM maker_checker.work_items;
    SELECT @Baseline_AE_Count = COUNT(*) FROM audit.audit_events;
    SELECT @Baseline_AS_Count = COUNT(*) FROM audit.audit_snapshots;

    PRINT 'Baseline counts captured:';
    PRINT '  - maker_checker.work_items: ' + CAST(@Baseline_MC_Count AS VARCHAR(10));
    PRINT '  - audit.audit_events:       ' + CAST(@Baseline_AE_Count AS VARCHAR(10));
    PRINT '  - audit.audit_snapshots:    ' + CAST(@Baseline_AS_Count AS VARCHAR(10));

    ---------------------------------------------------------------------------
    -- 3. ADD TRANSITIONAL COLUMNS
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 3: Add Transitional Columns...';

    -- 3.1 maker_checker.work_items.entity_key (nullable)
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('maker_checker.work_items') AND name = 'entity_key'
    )
    BEGIN
        ALTER TABLE maker_checker.work_items
        ADD entity_key VARCHAR(64) NULL;
    END

    -- 3.2 audit.audit_events: entity_key and client_id (initially nullable)
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_events') AND name = 'entity_key'
    )
    BEGIN
        ALTER TABLE audit.audit_events
        ADD entity_key VARCHAR(64) NULL;
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_events') AND name = 'client_id'
    )
    BEGIN
        ALTER TABLE audit.audit_events
        ADD client_id INT NULL;
    END

    -- 3.3 audit.audit_snapshots: entity_key and client_id (initially nullable)
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_snapshots') AND name = 'entity_key'
    )
    BEGIN
        ALTER TABLE audit.audit_snapshots
        ADD entity_key VARCHAR(64) NULL;
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_snapshots') AND name = 'client_id'
    )
    BEGIN
        ALTER TABLE audit.audit_snapshots
        ADD client_id INT NULL;
    END

    ---------------------------------------------------------------------------
    -- 4. BACKFILL MAKER/CHECKER ENTITY_KEY
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 4: Backfill Maker/Checker entity_key...';

    EXEC sp_executesql N'
    -- Existing positive IDs convert to canonical decimal string representation
    UPDATE maker_checker.work_items
    SET entity_key = CAST(entity_id AS VARCHAR(64))
    WHERE entity_id > 0;

    -- Legacy non-positive sentinels (<= 0) convert strictly to NULL per ADR-008
    UPDATE maker_checker.work_items
    SET entity_key = NULL
    WHERE entity_id <= 0;

    -- Validate conversion integrity
    IF EXISTS (
        SELECT 1 FROM maker_checker.work_items
        WHERE entity_id > 0 AND (entity_key IS NULL OR entity_key <> CAST(entity_id AS VARCHAR(64)))
    )
        THROW 52012, ''Backfill validation failed: Conversion mismatch in maker_checker.work_items.entity_key.'', 1;

    IF EXISTS (
        SELECT 1 FROM maker_checker.work_items
        WHERE entity_id <= 0 AND entity_key IS NOT NULL
    )
        THROW 52013, ''Backfill validation failed: Sentinel entity_id <= 0 was not converted to NULL in maker_checker.work_items.'', 1;

    IF EXISTS (
        SELECT 1 FROM maker_checker.work_items
        WHERE entity_key = '''' OR entity_key = ''0''
    )
        THROW 52014, ''Backfill validation failed: Forbidden empty string or sentinel "0" found in maker_checker.work_items.entity_key.'', 1;
    ';

    ---------------------------------------------------------------------------
    -- 5. BACKFILL AUDIT ENTITY_KEY
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 5: Backfill Audit entity_key...';

    EXEC sp_executesql N'
    -- Convert audit.audit_events
    UPDATE audit.audit_events
    SET entity_key = CAST(entity_id AS VARCHAR(64));

    -- Convert audit.audit_snapshots
    UPDATE audit.audit_snapshots
    SET entity_key = CAST(entity_id AS VARCHAR(64));

    -- Validate every row received exact canonical conversion
    IF EXISTS (
        SELECT 1 FROM audit.audit_events
        WHERE entity_key IS NULL OR entity_key = '''' OR entity_key <> CAST(entity_id AS VARCHAR(64))
    )
        THROW 52015, ''Backfill validation failed: Conversion mismatch in audit.audit_events.entity_key.'', 1;

    IF EXISTS (
        SELECT 1 FROM audit.audit_snapshots
        WHERE entity_key IS NULL OR entity_key = '''' OR entity_key <> CAST(entity_id AS VARCHAR(64))
    )
        THROW 52016, ''Backfill validation failed: Conversion mismatch in audit.audit_snapshots.entity_key.'', 1;
    ';

    ---------------------------------------------------------------------------
    -- 6. RESOLVE AUDIT CLIENT_ID (DETERMINISTIC HIERARCHY)
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 6: Resolve Audit client_id...';

    -- Step 6.1: Evidence Hierarchy Level 1 - Embedded JSON snapshot_data.client_id
    PRINT '  -> Resolving Level 1: Embedded JSON snapshot_data.client_id...';
    
    EXEC sp_executesql N'
    -- Populate snapshots where snapshot_data contains a valid client_id
    UPDATE s
    SET s.client_id = CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT)
    FROM audit.audit_snapshots s
    WHERE s.client_id IS NULL
      AND ISJSON(s.snapshot_data) = 1
      AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
      AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
      AND EXISTS (
          SELECT 1 FROM config.clients c 
          WHERE c.id = CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT)
             OR c.tenant_id = CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT)
      );

    -- Sync audit_events from linked audit_snapshots resolved at Level 1
    UPDATE ae
    SET ae.client_id = s.client_id
    FROM audit.audit_events ae
    JOIN audit.audit_snapshots s ON ae.event_id = s.event_id
    WHERE ae.client_id IS NULL AND s.client_id IS NOT NULL;
    ';

    -- Step 6.2: Evidence Hierarchy Level 2 - Domain Entity Ownership
    PRINT '  -> Resolving Level 2: Domain Entity Joins...';

    EXEC sp_executesql N'
    -- 6.2.0 Conflict Gate: Detect contradictory tenant evidence between Snapshot JSON and Domain Entity
    IF EXISTS (
        SELECT 1
        FROM audit.audit_snapshots s
        JOIN request.requests r ON s.entity_id = r.request_id
        WHERE s.entity_type IN (''request'', ''REQUEST_CREATED'', ''REQUEST_APPROVED'', ''REQUEST_HOTLISTED'', ''REQUEST_LINK_ACCOUNT'')
          AND ISJSON(s.snapshot_data) = 1
          AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
          AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
          AND CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT) <> r.client_id
    )
    OR EXISTS (
        SELECT 1
        FROM audit.audit_snapshots s
        JOIN config.card_programmes cp ON s.entity_id = cp.id
        WHERE s.entity_type IN (''CARD_PROGRAMME'', ''CARD_PROGRAMME_CREATED'', ''CARD_PROGRAMME_UPDATED'', ''CARD_PROGRAMME_ACTIVATED'', ''CARD_PROGRAMME_DEACTIVATED'')
          AND ISJSON(s.snapshot_data) = 1
          AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
          AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
          AND CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT) <> cp.client_id
    )
    OR EXISTS (
        SELECT 1
        FROM audit.audit_snapshots s
        JOIN config.card_segments cs ON s.entity_id = cs.id
        WHERE s.entity_type IN (''CARD_SEGMENT'', ''CARD_SEGMENT_CREATED'', ''CARD_SEGMENT_UPDATED'', ''CARD_SEGMENT_ACTIVATED'', ''CARD_SEGMENT_DEACTIVATED'')
          AND ISJSON(s.snapshot_data) = 1
          AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
          AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
          AND CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT) <> cs.client_id
    )
    OR EXISTS (
        SELECT 1
        FROM audit.audit_snapshots s
        JOIN config.card_charges_headers cch ON s.entity_id = cch.id
        WHERE s.entity_type IN (''CARD_CHARGES_HEADER'', ''CARD_CHARGES_HEADER_CREATED'', ''CARD_CHARGES_HEADER_UPDATED'')
          AND ISJSON(s.snapshot_data) = 1
          AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
          AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
          AND CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT) <> cch.client_id
    )
    OR EXISTS (
        SELECT 1
        FROM audit.audit_snapshots s
        JOIN config.card_segment_programme_charges cspc ON s.entity_id = cspc.id
        WHERE s.entity_type IN (''CARD_SEG_PROG_CHG_CREATED'', ''CARD_SEG_PROG_CHG_UPDATED'', ''CARD_SEGMENT_PROGRAMME_CHARGE'')
          AND ISJSON(s.snapshot_data) = 1
          AND JSON_VALUE(s.snapshot_data, ''$.client_id'') IS NOT NULL
          AND ISNUMERIC(JSON_VALUE(s.snapshot_data, ''$.client_id'')) = 1
          AND CAST(JSON_VALUE(s.snapshot_data, ''$.client_id'') AS INT) <> cspc.client_id
    )
        THROW 52051, ''Tenant resolution conflict: Snapshot JSON client_id contradicts domain entity client_id.'', 1;

    -- 6.2.a Requests (request.requests)
    UPDATE ae
    SET ae.client_id = r.client_id
    FROM audit.audit_events ae
    JOIN request.requests r ON ae.entity_id = r.request_id
    WHERE ae.client_id IS NULL
      AND ae.entity_type IN (''request'', ''REQUEST_CREATED'', ''REQUEST_APPROVED'', ''REQUEST_HOTLISTED'', ''REQUEST_LINK_ACCOUNT'');

    UPDATE s
    SET s.client_id = r.client_id
    FROM audit.audit_snapshots s
    JOIN request.requests r ON s.entity_id = r.request_id
    WHERE s.client_id IS NULL
      AND s.entity_type IN (''request'', ''REQUEST_CREATED'', ''REQUEST_APPROVED'', ''REQUEST_HOTLISTED'', ''REQUEST_LINK_ACCOUNT'');

    -- 6.2.b Card Programmes (config.card_programmes)
    UPDATE ae
    SET ae.client_id = cp.client_id
    FROM audit.audit_events ae
    JOIN config.card_programmes cp ON ae.entity_id = cp.id
    WHERE ae.client_id IS NULL
      AND ae.entity_type IN (''CARD_PROGRAMME'', ''CARD_PROGRAMME_CREATED'', ''CARD_PROGRAMME_UPDATED'', ''CARD_PROGRAMME_ACTIVATED'', ''CARD_PROGRAMME_DEACTIVATED'');

    UPDATE s
    SET s.client_id = cp.client_id
    FROM audit.audit_snapshots s
    JOIN config.card_programmes cp ON s.entity_id = cp.id
    WHERE s.client_id IS NULL
      AND s.entity_type IN (''CARD_PROGRAMME'', ''CARD_PROGRAMME_CREATED'', ''CARD_PROGRAMME_UPDATED'', ''CARD_PROGRAMME_ACTIVATED'', ''CARD_PROGRAMME_DEACTIVATED'');

    -- 6.2.c Card Segments (config.card_segments)
    UPDATE ae
    SET ae.client_id = cs.client_id
    FROM audit.audit_events ae
    JOIN config.card_segments cs ON ae.entity_id = cs.id
    WHERE ae.client_id IS NULL
      AND ae.entity_type IN (''CARD_SEGMENT'', ''CARD_SEGMENT_CREATED'', ''CARD_SEGMENT_UPDATED'', ''CARD_SEGMENT_ACTIVATED'', ''CARD_SEGMENT_DEACTIVATED'');

    UPDATE s
    SET s.client_id = cs.client_id
    FROM audit.audit_snapshots s
    JOIN config.card_segments cs ON s.entity_id = cs.id
    WHERE s.client_id IS NULL
      AND s.entity_type IN (''CARD_SEGMENT'', ''CARD_SEGMENT_CREATED'', ''CARD_SEGMENT_UPDATED'', ''CARD_SEGMENT_ACTIVATED'', ''CARD_SEGMENT_DEACTIVATED'');

    -- 6.2.d Card Charges Headers (config.card_charges_headers)
    UPDATE ae
    SET ae.client_id = cch.client_id
    FROM audit.audit_events ae
    JOIN config.card_charges_headers cch ON ae.entity_id = cch.id
    WHERE ae.client_id IS NULL
      AND ae.entity_type IN (''CARD_CHARGES_HEADER'', ''CARD_CHARGES_HEADER_CREATED'', ''CARD_CHARGES_HEADER_UPDATED'');

    UPDATE s
    SET s.client_id = cch.client_id
    FROM audit.audit_snapshots s
    JOIN config.card_charges_headers cch ON s.entity_id = cch.id
    WHERE s.client_id IS NULL
      AND s.entity_type IN (''CARD_CHARGES_HEADER'', ''CARD_CHARGES_HEADER_CREATED'', ''CARD_CHARGES_HEADER_UPDATED'');

    -- 6.2.e Card Segment Programme Charges (config.card_segment_programme_charges)
    UPDATE ae
    SET ae.client_id = cspc.client_id
    FROM audit.audit_events ae
    JOIN config.card_segment_programme_charges cspc ON ae.entity_id = cspc.id
    WHERE ae.client_id IS NULL
      AND ae.entity_type IN (''CARD_SEG_PROG_CHG_CREATED'', ''CARD_SEG_PROG_CHG_UPDATED'', ''CARD_SEGMENT_PROGRAMME_CHARGE'');

    UPDATE s
    SET s.client_id = cspc.client_id
    FROM audit.audit_snapshots s
    JOIN config.card_segment_programme_charges cspc ON s.entity_id = cspc.id
    WHERE s.client_id IS NULL
      AND s.entity_type IN (''CARD_SEG_PROG_CHG_CREATED'', ''CARD_SEG_PROG_CHG_UPDATED'', ''CARD_SEGMENT_PROGRAMME_CHARGE'');

    -- Sync mutually between events and snapshots where one side resolved
    UPDATE s
    SET s.client_id = ae.client_id
    FROM audit.audit_snapshots s
    JOIN audit.audit_events ae ON s.event_id = ae.event_id
    WHERE s.client_id IS NULL AND ae.client_id IS NOT NULL;

    UPDATE ae
    SET ae.client_id = s.client_id
    FROM audit.audit_events ae
    JOIN audit.audit_snapshots s ON ae.event_id = s.event_id
    WHERE ae.client_id IS NULL AND s.client_id IS NOT NULL;

    -- 6.2.f Conflict Gate: Detect contradictory tenant evidence between linked events and snapshots
    IF EXISTS (
        SELECT 1
        FROM audit.audit_events ae
        JOIN audit.audit_snapshots s ON ae.event_id = s.event_id
        WHERE ae.client_id IS NOT NULL 
          AND s.client_id IS NOT NULL 
          AND ae.client_id <> s.client_id
    )
        THROW 52052, ''Tenant resolution conflict: Linked audit event and snapshot resolved to different client_ids.'', 1;
    ';

    -- Step 6.3: Evidence Hierarchy Level 3 - One-Time Migration User Attribution Fallback
    PRINT '  -> Resolving Level 3: One-Time Historical Recovery via Unique User Attribution...';

    EXEC sp_executesql N'
    -- 6.3.a Candidate Precondition: Detect if any candidate unresolved record maps ambiguously to multiple clients in iam.users
    IF EXISTS (
        SELECT ae.performed_by
        FROM audit.audit_events ae
        JOIN iam.users u ON ae.performed_by = u.username
        WHERE ae.client_id IS NULL
          AND u.client_id IS NOT NULL
        GROUP BY ae.performed_by
        HAVING COUNT(DISTINCT u.client_id) > 1
    )
    OR EXISTS (
        SELECT ae.performed_by
        FROM audit.audit_snapshots s
        JOIN audit.audit_events ae ON s.event_id = ae.event_id
        JOIN iam.users u ON ae.performed_by = u.username
        WHERE s.client_id IS NULL
          AND u.client_id IS NOT NULL
        GROUP BY ae.performed_by
        HAVING COUNT(DISTINCT u.client_id) > 1
    )
        THROW 52043, ''Level 3 resolution failed: Unresolved historical audit record performer maps ambiguously to multiple tenants.'', 1;

    ;WITH UniqueUserMap AS (
        SELECT username, MIN(client_id) AS client_id
        FROM iam.users
        WHERE client_id IS NOT NULL
        GROUP BY username
        HAVING COUNT(DISTINCT client_id) = 1
    )
    UPDATE ae
    SET ae.client_id = u.client_id
    FROM audit.audit_events ae
    JOIN UniqueUserMap u ON ae.performed_by = u.username
    WHERE ae.client_id IS NULL;

    ;WITH UniqueUserMap AS (
        SELECT username, MIN(client_id) AS client_id
        FROM iam.users
        WHERE client_id IS NOT NULL
        GROUP BY username
        HAVING COUNT(DISTINCT client_id) = 1
    )
    UPDATE s
    SET s.client_id = u.client_id
    FROM audit.audit_snapshots s
    JOIN audit.audit_events ae ON s.event_id = ae.event_id
    JOIN UniqueUserMap u ON ae.performed_by = u.username
    WHERE s.client_id IS NULL;

    -- Re-verify event vs snapshot alignment after Level 3
    IF EXISTS (
        SELECT 1
        FROM audit.audit_events ae
        JOIN audit.audit_snapshots s ON ae.event_id = s.event_id
        WHERE ae.client_id IS NOT NULL 
          AND s.client_id IS NOT NULL 
          AND ae.client_id <> s.client_id
    )
        THROW 52052, ''Tenant resolution conflict: Linked audit event and snapshot resolved to different client_ids.'', 1;
    ';

    ---------------------------------------------------------------------------
    -- 7. VALIDATION GATE
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 7: Tenant & Entity Key Validation Gates...';

    EXEC sp_executesql N'
    -- Gate 7.1: Zero unresolved audit_events client_id
    DECLARE @UnresolvedAE INT;
    SELECT @UnresolvedAE = COUNT(*) FROM audit.audit_events WHERE client_id IS NULL;
    IF @UnresolvedAE > 0
    BEGIN
        DECLARE @ErrMsgAE NVARCHAR(400);
        SET @ErrMsgAE = N''Validation Gate failed: '' + CAST(@UnresolvedAE AS NVARCHAR(10)) + N'' records in audit.audit_events have unresolved client_id.'';
        THROW 52017, @ErrMsgAE, 1;
    END

    -- Gate 7.2: Zero unresolved audit_snapshots client_id
    DECLARE @UnresolvedAS INT;
    SELECT @UnresolvedAS = COUNT(*) FROM audit.audit_snapshots WHERE client_id IS NULL;
    IF @UnresolvedAS > 0
    BEGIN
        DECLARE @ErrMsgAS NVARCHAR(400);
        SET @ErrMsgAS = N''Validation Gate failed: '' + CAST(@UnresolvedAS AS NVARCHAR(10)) + N'' records in audit.audit_snapshots have unresolved client_id.'';
        THROW 52018, @ErrMsgAS, 1;
    END

    -- Gate 7.3: All client_id values must reference valid clients
    IF EXISTS (
        SELECT 1 FROM audit.audit_events ae
        WHERE NOT EXISTS (
            SELECT 1 FROM config.clients c 
            WHERE c.id = ae.client_id OR c.tenant_id = ae.client_id
        )
    )
        THROW 52019, ''Validation Gate failed: audit.audit_events contains client_id referencing non-existent client.'', 1;

    IF EXISTS (
        SELECT 1 FROM audit.audit_snapshots s
        WHERE NOT EXISTS (
            SELECT 1 FROM config.clients c 
            WHERE c.id = s.client_id OR c.tenant_id = s.client_id
        )
    )
        THROW 52020, ''Validation Gate failed: audit.audit_snapshots contains client_id referencing non-existent client.'', 1;

    -- Gate 7.4: Zero null or empty entity_key values in audit
    IF EXISTS (SELECT 1 FROM audit.audit_events WHERE entity_key IS NULL OR entity_key = '''')
        THROW 52021, ''Validation Gate failed: NULL or empty entity_key found in audit.audit_events.'', 1;

    IF EXISTS (SELECT 1 FROM audit.audit_snapshots WHERE entity_key IS NULL OR entity_key = '''')
        THROW 52022, ''Validation Gate failed: NULL or empty entity_key found in audit.audit_snapshots.'', 1;
    ';

    PRINT 'Section 7 passed: 100% of audit records deterministically resolved and validated.';

    ---------------------------------------------------------------------------
    -- 8. ENFORCE FINAL NULLABILITY
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 8: Enforce Final Nullability...';

    EXEC sp_executesql N'
    SET QUOTED_IDENTIFIER ON;
    SET ANSI_NULLS ON;
    SET ANSI_PADDING ON;
    SET ANSI_WARNINGS ON;
    SET ARITHABORT ON;
    SET CONCAT_NULL_YIELDS_NULL ON;
    SET NUMERIC_ROUNDABORT OFF;

    -- Drop legacy indexes on audit tables first so they do not block column alterations
    IF EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = ''IX_audit_events_tenant_entity'' AND object_id = OBJECT_ID(''audit.audit_events'')
    )
    BEGIN
        DROP INDEX IX_audit_events_tenant_entity ON audit.audit_events;
    END

    IF EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = ''IX_audit_snapshots_tenant_entity'' AND object_id = OBJECT_ID(''audit.audit_snapshots'')
    )
    BEGIN
        DROP INDEX IX_audit_snapshots_tenant_entity ON audit.audit_snapshots;
    END

    -- audit.audit_events
    ALTER TABLE audit.audit_events
    ALTER COLUMN client_id INT NOT NULL;

    ALTER TABLE audit.audit_events
    ALTER COLUMN entity_key VARCHAR(64) NOT NULL;

    -- audit.audit_snapshots
    ALTER TABLE audit.audit_snapshots
    ALTER COLUMN client_id INT NOT NULL;

    ALTER TABLE audit.audit_snapshots
    ALTER COLUMN entity_key VARCHAR(64) NOT NULL;
    ';

    -- Note: maker_checker.work_items.entity_key intentionally remains NULLABLE
    -- to support uncreated CREATE proposals per ADR-008.

    ---------------------------------------------------------------------------
    -- 9. REPLACE CONSTRAINTS / INDEXES
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 9: Replace Constraints and Rebuild Indexes...';

    EXEC sp_executesql N'
    SET QUOTED_IDENTIFIER ON;
    SET ANSI_NULLS ON;
    SET ANSI_PADDING ON;
    SET ANSI_WARNINGS ON;
    SET ARITHABORT ON;
    SET CONCAT_NULL_YIELDS_NULL ON;
    SET NUMERIC_ROUNDABORT OFF;

    -- 9.1 Drop legacy indexes on maker_checker.work_items
    IF EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = ''IX_mc_work_items_entity'' AND object_id = OBJECT_ID(''maker_checker.work_items'')
    )
    BEGIN
        DROP INDEX IX_mc_work_items_entity ON maker_checker.work_items;
    END

    IF EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = ''UIX_mc_work_items_unique_pending_entity'' AND object_id = OBJECT_ID(''maker_checker.work_items'')
    )
    BEGIN
        DROP INDEX UIX_mc_work_items_unique_pending_entity ON maker_checker.work_items;
    END

    -- 9.2 Create modern replacement indexes on maker_checker.work_items
    -- Composite tenant entity lookup index
    CREATE NONCLUSTERED INDEX IX_mc_work_items_entity
    ON maker_checker.work_items (client_id, entity_type_code, entity_key);

    -- Unique filtered index for pending work on existing entities (entity_key IS NOT NULL)
    CREATE UNIQUE NONCLUSTERED INDEX UIX_mc_work_items_unique_pending_entity
    ON maker_checker.work_items (client_id, entity_type_code, entity_key)
    WHERE status_code = ''PENDING'' AND entity_key IS NOT NULL;

    -- 9.3 Create tenant-qualified composite lookup indexes on audit tables
    CREATE NONCLUSTERED INDEX IX_audit_events_tenant_entity
    ON audit.audit_events (client_id, entity_type, entity_key, event_time DESC);

    CREATE NONCLUSTERED INDEX IX_audit_snapshots_tenant_entity
    ON audit.audit_snapshots (client_id, entity_type, entity_key, snapshot_time DESC);
    ';

    ---------------------------------------------------------------------------
    -- 10. REMOVE LEGACY ENTITY_ID COLUMNS
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 10: Remove Legacy entity_id Columns...';

    EXEC sp_executesql N'
    ALTER TABLE maker_checker.work_items
    DROP COLUMN entity_id;

    ALTER TABLE audit.audit_events
    DROP COLUMN entity_id;

    ALTER TABLE audit.audit_snapshots
    DROP COLUMN entity_id;
    ';

    ---------------------------------------------------------------------------
    -- 11. FINAL POST-MIGRATION VALIDATION
    ---------------------------------------------------------------------------
    PRINT 'Executing Section 11: Final Post-Migration Verification...';

    -- 11.1 Verify exact row count preservation
    DECLARE @Post_MC_Count INT;
    DECLARE @Post_AE_Count INT;
    DECLARE @Post_AS_Count INT;

    SELECT @Post_MC_Count = COUNT(*) FROM maker_checker.work_items;
    SELECT @Post_AE_Count = COUNT(*) FROM audit.audit_events;
    SELECT @Post_AS_Count = COUNT(*) FROM audit.audit_snapshots;

    IF @Post_MC_Count <> @Baseline_MC_Count
        THROW 52023, 'Post-validation failed: Row count mismatch in maker_checker.work_items.', 1;

    IF @Post_AE_Count <> @Baseline_AE_Count
        THROW 52024, 'Post-validation failed: Row count mismatch in audit.audit_events.', 1;

    IF @Post_AS_Count <> @Baseline_AS_Count
        THROW 52025, 'Post-validation failed: Row count mismatch in audit.audit_snapshots.', 1;

    -- 11.2 Verify legacy entity_id columns are completely dropped
    IF EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE name = 'entity_id' 
          AND object_id IN (
              OBJECT_ID('maker_checker.work_items'),
              OBJECT_ID('audit.audit_events'),
              OBJECT_ID('audit.audit_snapshots')
          )
    )
        THROW 52026, 'Post-validation failed: Legacy column entity_id still present in schema.', 1;

    -- 11.3 Verify target columns exist with expected nullability
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('maker_checker.work_items') AND name = 'entity_key' AND is_nullable = 1
    )
        THROW 52027, 'Post-validation failed: maker_checker.work_items.entity_key column definition invalid.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_events') AND name = 'entity_key' AND is_nullable = 0
    )
        THROW 52028, 'Post-validation failed: audit.audit_events.entity_key is not NOT NULL.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_events') AND name = 'client_id' AND is_nullable = 0
    )
        THROW 52029, 'Post-validation failed: audit.audit_events.client_id is not NOT NULL.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_snapshots') AND name = 'entity_key' AND is_nullable = 0
    )
        THROW 52030, 'Post-validation failed: audit.audit_snapshots.entity_key is not NOT NULL.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('audit.audit_snapshots') AND name = 'client_id' AND is_nullable = 0
    )
        THROW 52031, 'Post-validation failed: audit.audit_snapshots.client_id is not NOT NULL.', 1;

    -- 11.4 Verify replacement indexes exist
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_mc_work_items_entity' AND object_id = OBJECT_ID('maker_checker.work_items'))
        THROW 52032, 'Post-validation failed: Index IX_mc_work_items_entity missing.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UIX_mc_work_items_unique_pending_entity' AND object_id = OBJECT_ID('maker_checker.work_items'))
        THROW 52033, 'Post-validation failed: Index UIX_mc_work_items_unique_pending_entity missing.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_events_tenant_entity' AND object_id = OBJECT_ID('audit.audit_events'))
        THROW 52034, 'Post-validation failed: Index IX_audit_events_tenant_entity missing.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_snapshots_tenant_entity' AND object_id = OBJECT_ID('audit.audit_snapshots'))
        THROW 52035, 'Post-validation failed: Index IX_audit_snapshots_tenant_entity missing.', 1;

    ---------------------------------------------------------------------------
    -- 12. COMMIT / ERROR HANDLING
    ---------------------------------------------------------------------------
    COMMIT TRANSACTION;
    PRINT '===================================================================';
    PRINT 'Migration 022 executed and committed successfully.';
    PRINT 'All row counts preserved, tenant attribution validated, and schema aligned with ADR-008.';
    PRINT '===================================================================';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    PRINT '*******************************************************************';
    PRINT 'MIGRATION 022 FAILED AND ROLLED BACK.';
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT '*******************************************************************';

    THROW;
END CATCH;
GO
