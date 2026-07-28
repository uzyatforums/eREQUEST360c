USE [erequest360c];
GO

/*==============================================================
Migration : 031_alter_maker_checker_work_item_actions_add_change_summary.sql
Purpose   : Store auto-generated summary of changes
==============================================================*/

IF COL_LENGTH('maker_checker.work_item_actions', 'change_summary') IS NULL
BEGIN

    ALTER TABLE maker_checker.work_item_actions
    ADD change_summary VARCHAR(1000) NULL;

END
GO