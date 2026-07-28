USE [erequest360c];
GO

/*==============================================================
Migration : 025_create_maker_checker_schema.sql
Purpose   : Create Maker/Checker schema
==============================================================*/

IF NOT EXISTS
(
    SELECT 1
    FROM sys.schemas
    WHERE name = 'maker_checker'
)
BEGIN
    EXEC ('CREATE SCHEMA maker_checker');
END
GO