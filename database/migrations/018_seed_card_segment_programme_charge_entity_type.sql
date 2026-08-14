USE [erequest360c];
GO

/*==============================================================
Migration : 018_seed_card_segment_programme_charge_entity_type.sql
Purpose   : Idempotently register CARD_SEGMENT_PROGRAMME_CHARGE 
            in maker_checker.entity_types table
==============================================================*/

IF NOT EXISTS (
    SELECT 1 FROM maker_checker.entity_types
    WHERE entity_type_code = 'CARD_SEGMENT_PROGRAMME_CHARGE'
)
BEGIN
    INSERT INTO maker_checker.entity_types (entity_type_code, entity_type_name, active, created_by, created_date)
    VALUES ('CARD_SEGMENT_PROGRAMME_CHARGE', 'Card Segment Programme Charge', 1, 'system', GETDATE());
    PRINT 'Successfully seeded CARD_SEGMENT_PROGRAMME_CHARGE entity type.';
END
ELSE
BEGIN
    PRINT 'CARD_SEGMENT_PROGRAMME_CHARGE entity type already exists.';
END
GO
