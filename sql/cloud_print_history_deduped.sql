-- OPTIONAL: view form of the dedup logic (fleet_daemon MULTISITE_HANDOFF §6.8).
-- The /api adapter inlines this exact logic as a CTE (api/_lib.ts HIST_CTE), so
-- creating the view is not required for the cloud app to work. It exists for
-- ad-hoc querying convenience.
CREATE OR REPLACE VIEW cloud_print_history_deduped AS
WITH current_site AS (
    SELECT DISTINCT ON (printer_hostname) printer_hostname, site
    FROM cloud_fleet_status
    ORDER BY printer_hostname, updated_at DESC
),
dedup_base AS (
    SELECT DISTINCT ON (printer_hostname, moonraker_job_id) *
    FROM cloud_print_history
    WHERE qr_code IS NULL
    ORDER BY printer_hostname, moonraker_job_id, collected_at ASC
),
merged AS (
    SELECT * FROM dedup_base
    UNION ALL
    SELECT * FROM cloud_print_history WHERE qr_code IS NOT NULL
)
SELECT m.*, COALESCE(cs.site, m.site) AS display_site
FROM merged m
LEFT JOIN current_site cs ON cs.printer_hostname = m.printer_hostname;
