/******************************************************************************
011_reset_development_data.sql

Purpose:
    Clears development data only.
    Leaves lookup/master tables intact.

WARNING:
    DEVELOPMENT DATABASE ONLY
******************************************************************************/

SET NOCOUNT ON;

BEGIN TRANSACTION;

BEGIN TRY

    ----------------------------------------------------------
    -- IAM (children first)
    ----------------------------------------------------------
    DELETE FROM iam.service_account_roles;
    DELETE FROM iam.user_roles;
    DELETE FROM iam.user_branches;

    DELETE FROM iam.service_accounts;
    DELETE FROM iam.users;

    ----------------------------------------------------------
    -- REQUEST
    ----------------------------------------------------------
    DELETE FROM request.client_card_policies;
    DELETE FROM request.requests;

    ----------------------------------------------------------
    -- ELIGIBILITY
    ----------------------------------------------------------
    DELETE FROM eligibility.nocharge_programme_ids;
    DELETE FROM eligibility.nocharge_account_products;
    DELETE FROM eligibility.eligible_account_products;
    DELETE FROM eligibility.nocharge_policies;

    ----------------------------------------------------------
    -- CONFIGURATION (children first)
    ----------------------------------------------------------
    DELETE FROM config.card_segment_programme_charges;
    DELETE FROM config.card_segment_programmes;
    DELETE FROM config.card_segment_members;

    DELETE FROM config.card_programmes;
    DELETE FROM config.card_segments;

    DELETE FROM config.card_charges_headers;
    DELETE FROM config.card_types;

    ----------------------------------------------------------
    -- AUDIT
    ----------------------------------------------------------
    DELETE FROM audit.api_log_request_response;

    COMMIT;

END TRY

BEGIN CATCH

    ROLLBACK;

    THROW;

END CATCH;