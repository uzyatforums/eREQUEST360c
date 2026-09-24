-- Migration: 020_restore_global_card_types.sql
-- Description: Restore config.card_types to the authoritative GLOBAL shared-reference design (ADR-005):
--              1. Drop composite FK_card_programmes_card_types on config.card_programmes
--              2. Drop FK_card_types_clients on config.card_types
--              3. Drop composite UQ_card_types_client_card_type on config.card_types
--              4. Drop column client_id from config.card_types
--              5. Create replacement single-column FK_card_programmes_card_types:
--                 config.card_programmes(card_type) -> config.card_types(card_type)

BEGIN TRANSACTION;

-- 1. Drop composite FK on config.card_programmes referencing (client_id, card_type)
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_card_programmes_card_types' 
      AND parent_object_id = OBJECT_ID('config.card_programmes')
)
BEGIN
    ALTER TABLE config.card_programmes
    DROP CONSTRAINT FK_card_programmes_card_types;
END

-- 2. Drop foreign key on config.card_types referencing config.clients(id)
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_card_types_clients' 
      AND parent_object_id = OBJECT_ID('config.card_types')
)
BEGIN
    ALTER TABLE config.card_types
    DROP CONSTRAINT FK_card_types_clients;
END

-- 3. Drop composite unique constraint on config.card_types(client_id, card_type)
IF EXISTS (
    SELECT 1 FROM sys.key_constraints 
    WHERE name = 'UQ_card_types_client_card_type' 
      AND parent_object_id = OBJECT_ID('config.card_types')
)
BEGIN
    ALTER TABLE config.card_types
    DROP CONSTRAINT UQ_card_types_client_card_type;
END
ELSE IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'UQ_card_types_client_card_type' 
      AND object_id = OBJECT_ID('config.card_types')
)
BEGIN
    DROP INDEX UQ_card_types_client_card_type ON config.card_types;
END

-- 4. Drop column client_id from config.card_types
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'config' 
      AND TABLE_NAME = 'card_types' 
      AND COLUMN_NAME = 'client_id'
)
BEGIN
    ALTER TABLE config.card_types
    DROP COLUMN client_id;
END

-- 5. Create replacement single-column FK: config.card_programmes(card_type) -> config.card_types(card_type)
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_card_programmes_card_types' 
      AND parent_object_id = OBJECT_ID('config.card_programmes')
)
BEGIN
    ALTER TABLE config.card_programmes
    ADD CONSTRAINT FK_card_programmes_card_types
    FOREIGN KEY (card_type)
    REFERENCES config.card_types (card_type);
END

COMMIT TRANSACTION;
