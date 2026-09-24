-- Migration: 019_align_card_programmes_schema.sql
-- Description: Align config.card_programmes with eREQUEST360 standards:
--              1. Backfill NULL currency_code rows to 'NGN' and alter to VARCHAR(3) NOT NULL with 'NGN' default
--              2. Drop priority column, drop associated default constraint and drop/recreate IX_card_programmes_lookup
--              3. Update default_validity_years default to 5

BEGIN TRANSACTION;

-- 1. Handle currency_code: backfill NULLs and set NOT NULL with default 'NGN'
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'currency_code')
BEGIN
    -- Backfill existing NULL rows to 'NGN'
    UPDATE config.card_programmes
    SET currency_code = 'NGN'
    WHERE currency_code IS NULL;

    -- Alter column to VARCHAR(3) NOT NULL
    ALTER TABLE config.card_programmes
    ALTER COLUMN currency_code VARCHAR(3) NOT NULL;

    -- Add default constraint for currency_code if not present
    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints dc
        JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        JOIN sys.tables t ON dc.parent_object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = 'config' AND t.name = 'card_programmes' AND c.name = 'currency_code'
    )
    BEGIN
        ALTER TABLE config.card_programmes
        ADD CONSTRAINT DF_config_card_programmes_currency_code DEFAULT ('NGN') FOR currency_code;
    END
END

-- 2. Drop priority column, its default constraint, and adjust composite index
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'priority')
BEGIN
    -- Drop composite index if it references priority
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_card_programmes_lookup' AND object_id = OBJECT_ID('config.card_programmes'))
    BEGIN
        DROP INDEX IX_card_programmes_lookup ON config.card_programmes;
    END

    -- Drop default constraint on priority
    DECLARE @PriorityConstraintName NVARCHAR(128);
    SELECT @PriorityConstraintName = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    JOIN sys.tables t ON dc.parent_object_id = t.object_id
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'config' AND t.name = 'card_programmes' AND c.name = 'priority';

    IF @PriorityConstraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE config.card_programmes DROP CONSTRAINT [' + @PriorityConstraintName + '];');
    END

    -- Drop priority column
    ALTER TABLE config.card_programmes DROP COLUMN priority;

    -- Recreate lookup index without priority
    CREATE NONCLUSTERED INDEX IX_card_programmes_lookup
    ON config.card_programmes (client_id, active, card_type);
END

-- 3. Update default_validity_years default to 5
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'default_validity_years')
BEGIN
    -- Drop existing default constraint on default_validity_years
    DECLARE @ValidityConstraintName NVARCHAR(128);
    SELECT @ValidityConstraintName = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    JOIN sys.tables t ON dc.parent_object_id = t.object_id
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'config' AND t.name = 'card_programmes' AND c.name = 'default_validity_years';

    IF @ValidityConstraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE config.card_programmes DROP CONSTRAINT [' + @ValidityConstraintName + '];');
    END

    -- Add updated default constraint with value 5
    ALTER TABLE config.card_programmes
    ADD CONSTRAINT DF_config_card_programmes_default_validity_years DEFAULT (5) FOR default_validity_years;
END

COMMIT TRANSACTION;
