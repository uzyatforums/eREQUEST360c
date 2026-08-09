USE [erequest360c];
GO

/*==============================================================
Migration : 017_unique_pending_work_item_per_entity.sql
Purpose   : Enforce database-level unique constraint allowing at
            most one PENDING work item per (client_id, entity_type_code, entity_id)
==============================================================*/

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = N'UIX_mc_work_items_unique_pending_entity' 
      AND object_id = OBJECT_ID(N'maker_checker.work_items')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UIX_mc_work_items_unique_pending_entity
    ON maker_checker.work_items (client_id, entity_type_code, entity_id)
    WHERE status_code = 'PENDING' AND entity_id > 0;

    PRINT 'Successfully created UIX_mc_work_items_unique_pending_entity index.';
END
ELSE
BEGIN
    PRINT 'UIX_mc_work_items_unique_pending_entity index already exists.';
END
GO
