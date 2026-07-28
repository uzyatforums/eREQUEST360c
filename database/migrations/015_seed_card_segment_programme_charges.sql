INSERT INTO config.card_segment_programme_charges
(
    client_id,
    card_segment_programme_id,
    processing_mode_code,
    charge_header_id,
    priority,
    active,
    created_by,
    created_date
)
SELECT
    1,
    csp.id,
    'NORMAL',
    ch.id,
    1,
    1,
    'MIGRATION',
    GETDATE()
FROM config.card_segment_programmes csp
JOIN config.card_programmes cp
    ON cp.id = csp.card_programme_id
JOIN config.card_segments cs
    ON cs.id = csp.segment_id
JOIN config.card_charges_headers ch
    ON ch.charge_name = 'CHG-MC-NGN'
WHERE NOT EXISTS
(
    SELECT 1
    FROM config.card_segment_programme_charges x
    WHERE x.client_id = 1
      AND x.card_segment_programme_id = csp.id
      AND x.processing_mode_code = 'NORMAL'
      AND x.charge_header_id = ch.id
)
