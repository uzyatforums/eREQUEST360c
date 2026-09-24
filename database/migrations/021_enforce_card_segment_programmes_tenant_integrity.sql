/******************************************************************************
Migration: 021_enforce_card_segment_programmes_tenant_integrity.sql
Database:  erequest360c
Author:    eREQUEST360 Architecture Team
Purpose:   Transition config.card_segment_programmes to composite tenant-enforcing
           foreign keys (client_id, segment_id) and (client_id, card_programme_id),
           remediate cross-tenant mappings (CSP 30/31), insert authoritative
           Tenant-2 Card Programmes, and resolve legacy priority collisions.
******************************************************************************/

USE [erequest360c];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

-------------------------------------------------------------------------------
-- 1. APPLIED-STATE / PARTIAL-STATE EVALUATION (Schema + Data End-State)
-------------------------------------------------------------------------------
DECLARE @Schema_UQ_Segments BIT = 0;
DECLARE @Schema_UQ_Programmes BIT = 0;
DECLARE @Schema_FK_Segments BIT = 0;
DECLARE @Schema_FK_Programmes BIT = 0;

-- 1.1 Check unique constraint / index on config.card_segments(client_id, id)
IF EXISTS (
    SELECT 1 
    FROM sys.indexes i
    JOIN sys.index_columns ic1 ON i.object_id = ic1.object_id AND i.index_id = ic1.index_id AND ic1.key_ordinal = 1
    JOIN sys.index_columns ic2 ON i.object_id = ic2.object_id AND i.index_id = ic2.index_id AND ic2.key_ordinal = 2
    WHERE i.object_id = OBJECT_ID('config.card_segments')
      AND i.is_unique = 1
      AND COL_NAME(ic1.object_id, ic1.column_id) = 'client_id'
      AND COL_NAME(ic2.object_id, ic2.column_id) = 'id'
      AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0) = 2
) SET @Schema_UQ_Segments = 1;

-- 1.2 Check unique constraint / index on config.card_programmes(client_id, id)
IF EXISTS (
    SELECT 1 
    FROM sys.indexes i
    JOIN sys.index_columns ic1 ON i.object_id = ic1.object_id AND i.index_id = ic1.index_id AND ic1.key_ordinal = 1
    JOIN sys.index_columns ic2 ON i.object_id = ic2.object_id AND i.index_id = ic2.index_id AND ic2.key_ordinal = 2
    WHERE i.object_id = OBJECT_ID('config.card_programmes')
      AND i.is_unique = 1
      AND COL_NAME(ic1.object_id, ic1.column_id) = 'client_id'
      AND COL_NAME(ic2.object_id, ic2.column_id) = 'id'
      AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0) = 2
) SET @Schema_UQ_Programmes = 1;

-- 1.3 Check composite FK on config.card_segment_programmes(client_id, segment_id) -> config.card_segments(client_id, id)
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc1 ON fk.object_id = fkc1.constraint_object_id AND fkc1.constraint_column_id = 1
    JOIN sys.foreign_key_columns fkc2 ON fk.object_id = fkc2.constraint_object_id AND fkc2.constraint_column_id = 2
    WHERE fk.parent_object_id = OBJECT_ID('config.card_segment_programmes')
      AND fk.referenced_object_id = OBJECT_ID('config.card_segments')
      AND COL_NAME(fkc1.parent_object_id, fkc1.parent_column_id) = 'client_id'
      AND COL_NAME(fkc1.referenced_object_id, fkc1.referenced_column_id) = 'client_id'
      AND COL_NAME(fkc2.parent_object_id, fkc2.parent_column_id) = 'segment_id'
      AND COL_NAME(fkc2.referenced_object_id, fkc2.referenced_column_id) = 'id'
      AND (SELECT COUNT(*) FROM sys.foreign_key_columns fkc WHERE fkc.constraint_object_id = fk.object_id) = 2
) SET @Schema_FK_Segments = 1;

-- 1.4 Check composite FK on config.card_segment_programmes(client_id, card_programme_id) -> config.card_programmes(client_id, id)
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc1 ON fk.object_id = fkc1.constraint_object_id AND fkc1.constraint_column_id = 1
    JOIN sys.foreign_key_columns fkc2 ON fk.object_id = fkc2.constraint_object_id AND fkc2.constraint_column_id = 2
    WHERE fk.parent_object_id = OBJECT_ID('config.card_segment_programmes')
      AND fk.referenced_object_id = OBJECT_ID('config.card_programmes')
      AND COL_NAME(fkc1.parent_object_id, fkc1.parent_column_id) = 'client_id'
      AND COL_NAME(fkc1.referenced_object_id, fkc1.referenced_column_id) = 'client_id'
      AND COL_NAME(fkc2.parent_object_id, fkc2.parent_column_id) = 'card_programme_id'
      AND COL_NAME(fkc2.referenced_object_id, fkc2.referenced_column_id) = 'id'
      AND (SELECT COUNT(*) FROM sys.foreign_key_columns fkc WHERE fkc.constraint_object_id = fk.object_id) = 2
) SET @Schema_FK_Programmes = 1;

DECLARE @AllSchemaApplied BIT = CASE WHEN @Schema_UQ_Segments = 1 AND @Schema_UQ_Programmes = 1 AND @Schema_FK_Segments = 1 AND @Schema_FK_Programmes = 1 THEN 1 ELSE 0 END;
DECLARE @AnySchemaApplied BIT = CASE WHEN @Schema_UQ_Segments = 1 OR @Schema_UQ_Programmes = 1 OR @Schema_FK_Segments = 1 OR @Schema_FK_Programmes = 1 THEN 1 ELSE 0 END;

-- 1.5 Check Data End-State Requirements
DECLARE @DataEndStatePassed BIT = 0;
IF EXISTS (SELECT 1 FROM config.card_programmes WHERE client_id = 2 AND card_programme_code = 'APEX_VERVE_CLASSIC' AND active = 1)
   AND EXISTS (SELECT 1 FROM config.card_programmes WHERE client_id = 2 AND card_programme_code = 'APEX_VISA_GOLD' AND active = 1)
   AND EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
       WHERE csp.id = 30 AND csp.client_id = 2 AND cp.client_id = 2 AND cp.card_programme_code = 'APEX_VERVE_CLASSIC'
   )
   AND EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
       WHERE csp.id = 31 AND csp.client_id = 2 AND cp.client_id = 2 AND cp.card_programme_code = 'APEX_VISA_GOLD'
   )
   AND EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 1 AND client_id = 1)
   AND EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 2 AND client_id = 1)
   AND NOT EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       JOIN config.card_segments cs ON csp.segment_id = cs.id
       JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
       WHERE csp.client_id != cs.client_id OR csp.client_id != cp.client_id
   )
   AND NOT EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       LEFT JOIN config.card_segments cs ON csp.segment_id = cs.id
       WHERE cs.id IS NULL
   )
   AND NOT EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       LEFT JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
       WHERE cp.id IS NULL
   )
   AND NOT EXISTS (
       SELECT 1 FROM config.card_segment_programmes csp
       JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
       GROUP BY csp.client_id, csp.segment_id, cp.card_type, csp.priority
       HAVING COUNT(*) > 1
   )
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 14) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 15) = 3
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 17) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 18) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 19) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 20) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 21) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 22) = 2
   AND (SELECT priority FROM config.card_segment_programmes WHERE id = 29) = 3
BEGIN
    SET @DataEndStatePassed = 1;
END;

-- State A: Complete Migration 021 State -> clean RETURN
IF @AllSchemaApplied = 1 AND @DataEndStatePassed = 1
BEGIN
    PRINT 'Migration 021 is already fully applied (schema and data verified). Exiting cleanly.';
    RETURN;
END;

-- State C: Partial or Invalid State -> THROW
IF @AnySchemaApplied = 1 OR @DataEndStatePassed = 1 OR
   EXISTS (SELECT 1 FROM config.card_programmes WHERE client_id = 2 AND card_programme_code IN ('APEX_VERVE_CLASSIC', 'APEX_VISA_GOLD'))
BEGIN
    THROW 50000, 'Partial or invalid Migration 021 state detected. Manual intervention required.', 1;
END;

-------------------------------------------------------------------------------
-- 2. ATOMIC EXECUTION TRANSACTION
-------------------------------------------------------------------------------
BEGIN TRANSACTION;

BEGIN TRY

    ---------------------------------------------------------------------------
    -- 2.1 MANDATORY PRECONDITIONS (Defensive validation against baseline)
    ---------------------------------------------------------------------------
    
    -- Assert core tables exist
    IF OBJECT_ID('config.card_segments', 'U') IS NULL OR
       OBJECT_ID('config.card_programmes', 'U') IS NULL OR
       OBJECT_ID('config.card_segment_programmes', 'U') IS NULL OR
       OBJECT_ID('config.clients', 'U') IS NULL
        THROW 50001, 'Precondition failed: Required tables are missing.', 1;

    -- Assert Tenant 2 exists
    IF NOT EXISTS (SELECT 1 FROM config.clients WHERE tenant_id = 2)
        THROW 50002, 'Precondition failed: Tenant 2 (Apex MFB) does not exist.', 1;

    -- Assert Segments 9 & 10 belong to Tenant 2
    IF NOT EXISTS (SELECT 1 FROM config.card_segments WHERE id = 9 AND client_id = 2) OR
       NOT EXISTS (SELECT 1 FROM config.card_segments WHERE id = 10 AND client_id = 2)
        THROW 50003, 'Precondition failed: Segments 9 and 10 do not belong to Tenant 2.', 1;

    -- Assert Programmes 1 & 2 belong to Tenant 1
    IF NOT EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 1 AND client_id = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 2 AND client_id = 1)
        THROW 50004, 'Precondition failed: Programmes 1 and 2 do not belong to Tenant 1.', 1;

    -- Assert CSP 30 & 31 have exact expected pre-migration values
    IF NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 30 AND client_id = 2 AND segment_id = 9 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 31 AND client_id = 2 AND segment_id = 10 AND card_programme_id = 2 AND priority = 1 AND active = 1)
        THROW 50005, 'Precondition failed: CSP 30/31 do not match expected cross-tenant baseline.', 1;

    -- Assert exactly 2 cross-tenant CSP rows exist (IDs 30 & 31)
    DECLARE @PreCrossTenantCount INT;
    SELECT @PreCrossTenantCount = COUNT(*)
    FROM config.card_segment_programmes csp
    JOIN config.card_segments cs ON csp.segment_id = cs.id
    JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
    WHERE csp.client_id != cs.client_id OR csp.client_id != cp.client_id;

    IF @PreCrossTenantCount != 2
        THROW 50006, 'Precondition failed: Unexpected number of cross-tenant CSP rows detected.', 1;

    -- Assert zero orphan segment or programme references
    IF EXISTS (
        SELECT 1 FROM config.card_segment_programmes csp
        LEFT JOIN config.card_segments cs ON csp.segment_id = cs.id
        WHERE cs.id IS NULL
    ) OR EXISTS (
        SELECT 1 FROM config.card_segment_programmes csp
        LEFT JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        WHERE cp.id IS NULL
    )
        THROW 50007, 'Precondition failed: Orphan references detected in card_segment_programmes.', 1;

    -- Assert Tenant-2 programme codes do not already exist in conflicting form
    IF EXISTS (
        SELECT 1 FROM config.card_programmes 
        WHERE client_id = 2 AND card_programme_code IN ('APEX_VERVE_CLASSIC', 'APEX_VISA_GOLD')
    )
        THROW 50008, 'Precondition failed: Tenant 2 programme records already exist.', 1;

    -- Assert all 16 priority-collision baseline rows exist with expected initial values
    IF NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 1  AND client_id = 1 AND segment_id = 1 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 17 AND client_id = 1 AND segment_id = 1 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 2  AND client_id = 1 AND segment_id = 2 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 18 AND client_id = 1 AND segment_id = 2 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 3  AND client_id = 1 AND segment_id = 3 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 19 AND client_id = 1 AND segment_id = 3 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 4  AND client_id = 1 AND segment_id = 4 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 20 AND client_id = 1 AND segment_id = 4 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 5  AND client_id = 1 AND segment_id = 5 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 21 AND client_id = 1 AND segment_id = 5 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 13 AND client_id = 1 AND segment_id = 6 AND card_programme_id = 3 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 14 AND client_id = 1 AND segment_id = 6 AND card_programme_id = 4 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 15 AND client_id = 1 AND segment_id = 6 AND card_programme_id = 5 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 6  AND client_id = 1 AND segment_id = 6 AND card_programme_id = 1 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 22 AND client_id = 1 AND segment_id = 6 AND card_programme_id = 6 AND priority = 1 AND active = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_segment_programmes WHERE id = 29 AND client_id = 1 AND segment_id = 6 AND card_programme_id = 8 AND priority = 1 AND active = 1)
        THROW 50009, 'Precondition failed: The 16 in-scope priority baseline rows do not match expected state.', 1;

    -- Assert exactly 7 duplicate priority groups exist in the entire database
    DECLARE @PrePriorityGroupCount INT;
    SELECT @PrePriorityGroupCount = COUNT(*)
    FROM (
        SELECT csp.client_id, csp.segment_id, cp.card_type, csp.priority
        FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        GROUP BY csp.client_id, csp.segment_id, cp.card_type, csp.priority
        HAVING COUNT(*) > 1
    ) grp;

    IF @PrePriorityGroupCount != 7
        THROW 50010, 'Precondition failed: Expected exactly 7 duplicate priority groups across database.', 1;

    ---------------------------------------------------------------------------
    -- 2.2 INSERT AUTHORITATIVE TENANT-2 PROGRAMME RECORDS
    ---------------------------------------------------------------------------
    INSERT INTO config.card_programmes (
        client_id,
        card_programme_code,
        card_programme_name,
        card_type,
        currency_code,
        bin,
        platform_indicator,
        pan_length,
        default_validity_years,
        active,
        created_by
    )
    VALUES 
    (
        2,
        'APEX_VERVE_CLASSIC',
        'Apex Verve Classic',
        'VERVE',
        'NGN',
        '506118',
        'POSTILION_V2',
        16,
        5,
        1,
        'system'
    ),
    (
        2,
        'APEX_VISA_GOLD',
        'Apex Visa Gold',
        'VISA',
        'NGN',
        '412345',
        'POSTILION_V2',
        16,
        5,
        1,
        'system'
    );

    ---------------------------------------------------------------------------
    -- 2.3 REMAP CSP 30 & 31 DYNAMICALLY
    ---------------------------------------------------------------------------
    DECLARE @T2_Verve_ID INT;
    DECLARE @T2_Visa_ID INT;

    SELECT @T2_Verve_ID = id FROM config.card_programmes 
    WHERE client_id = 2 AND card_programme_code = 'APEX_VERVE_CLASSIC';

    SELECT @T2_Visa_ID = id FROM config.card_programmes 
    WHERE client_id = 2 AND card_programme_code = 'APEX_VISA_GOLD';

    IF @T2_Verve_ID IS NULL OR @T2_Visa_ID IS NULL
        THROW 50011, 'Failed to retrieve generated Tenant 2 Card Programme IDs.', 1;

    UPDATE config.card_segment_programmes
    SET card_programme_id = @T2_Verve_ID,
        last_modified_by = 'migration_021',
        last_modified_date = GETDATE()
    WHERE id = 30 AND client_id = 2 AND segment_id = 9;

    UPDATE config.card_segment_programmes
    SET card_programme_id = @T2_Visa_ID,
        last_modified_by = 'migration_021',
        last_modified_date = GETDATE()
    WHERE id = 31 AND client_id = 2 AND segment_id = 10;

    ---------------------------------------------------------------------------
    -- 2.4 EXACT 9-ROW PRIORITY REMEDIATION
    ---------------------------------------------------------------------------
    
    -- Pre-Update Exact Result Set Assertion
    DECLARE @ExpectedPriorityChanges TABLE (id INT PRIMARY KEY, expected_priority INT);
    INSERT INTO @ExpectedPriorityChanges (id, expected_priority) VALUES
    (14, 2), (15, 3), (17, 2), (18, 2), (19, 2), (20, 2), (21, 2), (22, 2), (29, 3);

    DECLARE @ComputedPriorityChanges TABLE (id INT PRIMARY KEY, computed_priority INT);
    
    WITH ComputedResequence AS (
        SELECT csp.id, csp.priority AS current_priority,
               ROW_NUMBER() OVER (
                   PARTITION BY csp.client_id, csp.segment_id, cp.card_type 
                   ORDER BY csp.priority ASC, csp.id ASC
               ) AS new_priority
        FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        WHERE csp.client_id = 1 
          AND (
            (csp.segment_id IN (1, 2, 3, 4, 5) AND cp.card_type = 'VERVE') 
            OR (csp.segment_id = 6 AND cp.card_type IN ('VERVE', 'MCARD'))
          )
    )
    INSERT INTO @ComputedPriorityChanges (id, computed_priority)
    SELECT id, new_priority FROM ComputedResequence WHERE current_priority != new_priority;

    -- Assert exactly 9 rows computed and full bidirectional match with expected changes
    IF (SELECT COUNT(*) FROM @ComputedPriorityChanges) != 9 OR
       EXISTS (
           SELECT id, expected_priority FROM @ExpectedPriorityChanges
           EXCEPT
           SELECT id, computed_priority FROM @ComputedPriorityChanges
       ) OR
       EXISTS (
           SELECT id, computed_priority FROM @ComputedPriorityChanges
           EXCEPT
           SELECT id, expected_priority FROM @ExpectedPriorityChanges
       )
        THROW 50012, 'Pre-update priority calculation failed: Computed changes do not match exact 9-row specification.', 1;

    -- Execute Deterministic Update
    WITH SequencedCSP AS (
        SELECT csp.id, 
               ROW_NUMBER() OVER (
                   PARTITION BY csp.client_id, csp.segment_id, cp.card_type 
                   ORDER BY csp.priority ASC, csp.id ASC
               ) AS new_priority
        FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        WHERE csp.client_id = 1 
          AND (
            (csp.segment_id IN (1, 2, 3, 4, 5) AND cp.card_type = 'VERVE') 
            OR (csp.segment_id = 6 AND cp.card_type IN ('VERVE', 'MCARD'))
          )
    )
    UPDATE csp 
    SET csp.priority = s.new_priority, 
        csp.last_modified_by = 'migration_021', 
        csp.last_modified_date = GETDATE()
    FROM config.card_segment_programmes csp 
    JOIN SequencedCSP s ON csp.id = s.id 
    WHERE csp.priority != s.new_priority;

    DECLARE @UpdatedPriorityRowCount INT = @@ROWCOUNT;
    IF @UpdatedPriorityRowCount != 9
        THROW 50013, 'Priority remediation failed: Expected exactly 9 rows updated.', 1;

    ---------------------------------------------------------------------------
    -- 2.5 SUPPORTING PARENT UNIQUE CONSTRAINTS (Key-Ordinal Validation & Creation)
    ---------------------------------------------------------------------------
    
    -- config.card_segments UNIQUE (client_id, id)
    IF EXISTS (
        SELECT 1 FROM sys.key_constraints kc
        JOIN sys.index_columns ic1 ON kc.parent_object_id = ic1.object_id AND kc.unique_index_id = ic1.index_id AND ic1.key_ordinal = 1
        JOIN sys.index_columns ic2 ON kc.parent_object_id = ic2.object_id AND kc.unique_index_id = ic2.index_id AND ic2.key_ordinal = 2
        WHERE kc.parent_object_id = OBJECT_ID('config.card_segments')
          AND COL_NAME(ic1.object_id, ic1.column_id) = 'client_id'
          AND COL_NAME(ic2.object_id, ic2.column_id) = 'id'
    )
    BEGIN
        PRINT 'Valid unique constraint on config.card_segments(client_id, id) already exists.';
    END
    ELSE IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_card_segments_client_id' AND parent_object_id = OBJECT_ID('config.card_segments'))
    BEGIN
        THROW 50014, 'Constraint UQ_card_segments_client_id exists with an invalid key definition.', 1;
    END
    ELSE
    BEGIN
        ALTER TABLE config.card_segments
        ADD CONSTRAINT UQ_card_segments_client_id UNIQUE (client_id, id);
    END;

    -- config.card_programmes UNIQUE (client_id, id)
    IF EXISTS (
        SELECT 1 FROM sys.key_constraints kc
        JOIN sys.index_columns ic1 ON kc.parent_object_id = ic1.object_id AND kc.unique_index_id = ic1.index_id AND ic1.key_ordinal = 1
        JOIN sys.index_columns ic2 ON kc.parent_object_id = ic2.object_id AND kc.unique_index_id = ic2.index_id AND ic2.key_ordinal = 2
        WHERE kc.parent_object_id = OBJECT_ID('config.card_programmes')
          AND COL_NAME(ic1.object_id, ic1.column_id) = 'client_id'
          AND COL_NAME(ic2.object_id, ic2.column_id) = 'id'
    )
    BEGIN
        PRINT 'Valid unique constraint on config.card_programmes(client_id, id) already exists.';
    END
    ELSE IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_card_programmes_client_id' AND parent_object_id = OBJECT_ID('config.card_programmes'))
    BEGIN
        THROW 50015, 'Constraint UQ_card_programmes_client_id exists with an invalid key definition.', 1;
    END
    ELSE
    BEGIN
        ALTER TABLE config.card_programmes
        ADD CONSTRAINT UQ_card_programmes_client_id UNIQUE (client_id, id);
    END;

    ---------------------------------------------------------------------------
    -- 2.6 COMPOSITE FOREIGN KEY HARDENING
    ---------------------------------------------------------------------------
    
    -- Drop legacy single-column FKs
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_card_segment_programmes_segments' AND parent_object_id = OBJECT_ID('config.card_segment_programmes'))
        ALTER TABLE config.card_segment_programmes DROP CONSTRAINT FK_card_segment_programmes_segments;

    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_card_segment_programmes_programmes' AND parent_object_id = OBJECT_ID('config.card_segment_programmes'))
        ALTER TABLE config.card_segment_programmes DROP CONSTRAINT FK_card_segment_programmes_programmes;

    -- Create composite tenant-enforcing FKs
    ALTER TABLE config.card_segment_programmes
    ADD CONSTRAINT FK_card_segment_programmes_segments
    FOREIGN KEY (client_id, segment_id) 
    REFERENCES config.card_segments (client_id, id);

    ALTER TABLE config.card_segment_programmes
    ADD CONSTRAINT FK_card_segment_programmes_programmes
    FOREIGN KEY (client_id, card_programme_id) 
    REFERENCES config.card_programmes (client_id, id);

    ---------------------------------------------------------------------------
    -- 2.7 POST-CONSTRAINT INTEGRITY VALIDATION
    ---------------------------------------------------------------------------
    
    -- Assert zero cross-tenant CSP rows
    DECLARE @PostMismatchCount INT;
    SELECT @PostMismatchCount = COUNT(*)
    FROM config.card_segment_programmes csp
    JOIN config.card_segments cs ON csp.segment_id = cs.id
    JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
    WHERE csp.client_id != cs.client_id OR csp.client_id != cp.client_id;

    IF @PostMismatchCount > 0
        THROW 50016, 'Post-validation failed: Cross-tenant CSP rows still exist.', 1;

    -- Assert CSP 30 and 31 point to Tenant 2 programmes
    IF NOT EXISTS (
        SELECT 1 FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        WHERE csp.id = 30 AND csp.client_id = 2 AND cp.client_id = 2
    ) OR NOT EXISTS (
        SELECT 1 FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        WHERE csp.id = 31 AND csp.client_id = 2 AND cp.client_id = 2
    )
        THROW 50017, 'Post-validation failed: CSP 30/31 do not map to Tenant 2 programmes.', 1;

    -- Assert Tenant 1 Programmes 1 & 2 ownership is unchanged
    IF NOT EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 1 AND client_id = 1) OR
       NOT EXISTS (SELECT 1 FROM config.card_programmes WHERE id = 2 AND client_id = 1)
        THROW 50018, 'Post-validation failed: Programme 1/2 ownership was mutated.', 1;

    -- Assert zero priority collisions exist
    IF EXISTS (
        SELECT 1
        FROM config.card_segment_programmes csp
        JOIN config.card_programmes cp ON csp.card_programme_id = cp.id
        GROUP BY csp.client_id, csp.segment_id, cp.card_type, csp.priority
        HAVING COUNT(*) > 1
    )
        THROW 50019, 'Post-validation failed: Duplicate priority collisions still exist.', 1;

    COMMIT TRANSACTION;
    PRINT 'Migration 021 executed and committed successfully.';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
