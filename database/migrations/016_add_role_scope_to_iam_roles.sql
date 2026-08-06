-- ============================================================================
-- Migration: 016_add_role_scope_to_iam_roles.sql
-- Description: Add role_scope column to iam.roles for Effective Branch Resolution
-- Target DB: SQL Server (erequest360c)
-- Idempotent: Safe to execute multiple times
-- ============================================================================

IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('iam.roles') AND name = 'role_scope'
)
BEGIN
    -- 1. Add role_scope column with default 'BRANCH'
    ALTER TABLE iam.roles 
    ADD role_scope VARCHAR(20) NOT NULL CONSTRAINT DF_iam_roles_role_scope DEFAULT 'BRANCH';
    
    PRINT 'Column iam.roles.role_scope added successfully.';
END
ELSE
BEGIN
    PRINT 'Column iam.roles.role_scope already exists.';
END
GO

-- 2. Populate Head Office roles
UPDATE iam.roles 
SET role_scope = 'HEAD_OFFICE' 
WHERE role_code IN ('super_admin', 'operations_admin_maker', 'operations_admin_checker', 'control', 'operations', 'admin');

-- 3. Ensure remaining roles default to 'BRANCH'
UPDATE iam.roles 
SET role_scope = 'BRANCH' 
WHERE role_scope IS NULL OR role_scope = '';

PRINT 'iam.roles role_scope data populated successfully.';
GO
