-- =============================================================================
-- Migration: 013_extend_card_programmes.sql
-- Description: Extend config.card_programmes table with specification parameters
--              (fees, currency, validity, service code, bindings, etc.)
-- Compatibility: Microsoft SQL Server / Azure SQL
-- Safety: Idempotent script (safe to execute multiple times)
-- =============================================================================

USE eREQUEST360;
GO

IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'config')
BEGIN
    -- 1. Add description parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'description')
    BEGIN
        ALTER TABLE config.card_programmes ADD description NVARCHAR(255) NULL;
        EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Detailed card programme specification summary', @level0type=N'SCHEMA',@level0name=N'config', @level1type=N'TABLE',@level1name=N'card_programmes', @level2type=N'COLUMN',@level2name=N'description';
    END

    -- 2. Add service_code parameter (ISO 7813 service code)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'service_code')
    BEGIN
        ALTER TABLE config.card_programmes ADD service_code NVARCHAR(10) NULL DEFAULT '201';
    END

    -- 3. Add default_validity_years parameter (card expiry duration)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'default_validity_years')
    BEGIN
        ALTER TABLE config.card_programmes ADD default_validity_years INT NULL DEFAULT 3;
    END

    -- 4. Add currency ISO 4217 code parameter (multi-currency standard)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'currency')
    BEGIN
        ALTER TABLE config.card_programmes ADD currency NVARCHAR(3) NULL DEFAULT 'NGN';
    END

    -- 5. Add issuance_fee parameter (numeric fee amount without embedded currency symbol)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'issuance_fee')
    BEGIN
        ALTER TABLE config.card_programmes ADD issuance_fee DECIMAL(18, 2) NULL DEFAULT 1000.00;
    END

    -- 6. Add maintenance_fee parameter (annual card maintenance fee)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'maintenance_fee')
    BEGIN
        ALTER TABLE config.card_programmes ADD maintenance_fee DECIMAL(18, 2) NULL DEFAULT 250.00;
    END

    -- 7. Add account_type_binding parameter (e.g. SAVINGS_CURRENT, CURRENT_ONLY)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'account_type_binding')
    BEGIN
        ALTER TABLE config.card_programmes ADD account_type_binding NVARCHAR(50) NULL DEFAULT 'SAVINGS_CURRENT';
    END

    -- 8. Add sequence parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'sequence')
    BEGIN
        ALTER TABLE config.card_programmes ADD sequence INT NULL;
    END

    -- 9. Add table_prefix parameter for CMS database table generation
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'table_prefix')
    BEGIN
        ALTER TABLE config.card_programmes ADD table_prefix NVARCHAR(35) NULL DEFAULT 'TBL_CP_';
    END

    -- 10. Add instant_card_type parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'instant_card_type')
    BEGIN
        ALTER TABLE config.card_programmes ADD instant_card_type NVARCHAR(50) NULL DEFAULT 'INSTANT_STANDARD';
    END

    -- 11. Add payment_ref_prefix parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'payment_ref_prefix')
    BEGIN
        ALTER TABLE config.card_programmes ADD payment_ref_prefix NVARCHAR(35) NULL DEFAULT 'PAY_REF_';
    END

    -- 12. Add assigned_segment_group parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'assigned_segment_group')
    BEGIN
        ALTER TABLE config.card_programmes ADD assigned_segment_group NVARCHAR(100) NULL DEFAULT 'Retail Segment (01)';
    END

    -- 13. Add pp_bin parameter (Pre-printed stock BIN)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'pp_bin')
    BEGIN
        ALTER TABLE config.card_programmes ADD pp_bin NVARCHAR(10) NULL DEFAULT '901234';
    END

    -- 14. Add segment_count parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'segment_count')
    BEGIN
        ALTER TABLE config.card_programmes ADD segment_count INT NULL DEFAULT 2;
    END

    -- 15. Add charge_header_count parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'charge_header_count')
    BEGIN
        ALTER TABLE config.card_programmes ADD charge_header_count INT NULL DEFAULT 1;
    END

    -- 16. Add charge_header_name parameter
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'charge_header_name')
    BEGIN
        ALTER TABLE config.card_programmes ADD charge_header_name NVARCHAR(100) NULL;
    END

    -- 17. Ensure platform_indicator width supports values up to 35 characters
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'card_programmes' AND COLUMN_NAME = 'platform_indicator' AND CHARACTER_MAXIMUM_LENGTH < 35)
    BEGIN
        ALTER TABLE config.card_programmes ALTER COLUMN platform_indicator NVARCHAR(35) NULL;
    END
END;
GO
