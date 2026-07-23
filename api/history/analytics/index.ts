import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HIST_CTE, handleError, intParam, num, query, requireAuth, requireGet, round, siteParam } from '../../_lib'

// Port of fleet_daemon GET /history/analytics (main.py get_history_analytics)
// against the deduped cloud history, plus a `site` filter (display_site).
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return

        const days = intParam(req, 'days', 0, 0, 3650)
        const cutoff = days > 0 ? `start_time >= now() - interval '${days} days' AND` : ''

        const site = siteParam(req)
        const siteCond = site ? 'AND display_site = $1' : ''
        const params = site ? [site] : []

        const q = (body: string) => query(`${HIST_CTE} ${body}`, params)

        const [
            kpiRows,
            monthlyRows,
            filamentRows,
            monthlyFilamentRows,
            healthRows,
            statusRows,
            weeklyRows,
            dailyRows,
            modelRows,
        ] = await Promise.all([
            q(`
                SELECT
                    COUNT(*)                                                        AS total_jobs,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)                   AS total_print_hours,
                    COALESCE(SUM(filament_used_mm) * 3.14159265 * (1.75/2.0)^2 * 1.1 / 1e6, 0) AS total_filament_kg,
                    COUNT(*) FILTER (WHERE start_time >= now() - interval '30 days') AS jobs_30d,
                    COALESCE(SUM(print_duration_secs) FILTER (WHERE start_time >= now() - interval '30 days')/3600.0, 0) AS print_hours_30d,
                    COALESCE(SUM(filament_used_mm) FILTER (WHERE start_time >= now() - interval '30 days') * 3.14159265 * (1.75/2.0)^2 * 1.1 / 1e6, 0) AS filament_kg_30d,
                    COUNT(DISTINCT printer_hostname) FILTER (WHERE start_time >= now() - interval '30 days') AS active_printers_30d,
                    CASE WHEN COUNT(*) FILTER (WHERE start_time >= now() - interval '30 days') = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE start_time >= now() - interval '30 days' AND status = 'completed')::numeric /
                              COUNT(*) FILTER (WHERE start_time >= now() - interval '30 days') * 100, 1)
                    END AS completion_rate_30d
                FROM hist
                WHERE ${cutoff} qr_code IS NULL ${siteCond}`),
            q(`
                SELECT
                    to_char(date_trunc('month', start_time), 'YYYY-MM') AS year_month,
                    COUNT(*)                                             AS jobs,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)        AS print_hours,
                    COUNT(DISTINCT printer_hostname)                     AS active_printers,
                    ROUND((COALESCE(SUM(print_duration_secs)/3600.0,0) / (COUNT(DISTINCT printer_hostname) * 24) * 100)::numeric, 2) AS utilization_pct
                FROM hist
                WHERE ${cutoff} start_time IS NOT NULL AND qr_code IS NULL ${siteCond}
                GROUP BY date_trunc('month', start_time)
                ORDER BY date_trunc('month', start_time)`),
            q(`
                SELECT
                    COALESCE(filament_type, 'Unknown')                  AS filament_type,
                    COUNT(*)                                             AS jobs,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)        AS print_hours,
                    COALESCE(SUM(filament_used_mm) * 3.14159265 * (1.75/2.0)^2 * 1.1 / 1e6, 0) AS mass_kg
                FROM hist
                WHERE ${cutoff} qr_code IS NULL ${siteCond}
                GROUP BY filament_type
                ORDER BY mass_kg DESC`),
            q(`
                SELECT
                    to_char(date_trunc('month', start_time), 'YYYY-MM') AS year_month,
                    COALESCE(filament_type, 'Unknown')                  AS filament_type,
                    COALESCE(SUM(filament_used_mm) * 3.14159265 * (1.75/2.0)^2 * 1.1 / 1e6, 0) AS mass_kg
                FROM hist
                WHERE ${cutoff} start_time IS NOT NULL AND qr_code IS NULL ${siteCond}
                GROUP BY date_trunc('month', start_time), filament_type
                ORDER BY date_trunc('month', start_time), mass_kg DESC`),
            q(`
                SELECT
                    printer_hostname,
                    COUNT(*)                                             AS total_jobs,
                    COUNT(*) FILTER (WHERE status IN ('klippy_shutdown','klippy_disconnect','error','server_exit')) AS failed_jobs,
                    CASE WHEN COUNT(*) = 0 THEN 100.0
                         ELSE ROUND((1.0 - COUNT(*) FILTER (WHERE status IN ('klippy_shutdown','klippy_disconnect','error','server_exit'))::numeric / COUNT(*)) * 100, 1)
                    END AS health_pct
                FROM hist
                WHERE ${cutoff} qr_code IS NULL ${siteCond}
                GROUP BY printer_hostname
                ORDER BY health_pct DESC`),
            q(`
                SELECT
                    COALESCE(status, 'unknown')                         AS status,
                    COUNT(*)                                             AS jobs,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)        AS print_hours
                FROM hist
                WHERE ${cutoff} qr_code IS NULL ${siteCond}
                GROUP BY status
                ORDER BY jobs DESC`),
            q(`
                SELECT
                    to_char(date_trunc('week', start_time), 'YYYY-MM-DD') AS week,
                    COUNT(*)                                               AS total_jobs,
                    COUNT(*) FILTER (WHERE status = 'completed')           AS completed_jobs,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 1)
                    END AS success_rate
                FROM hist
                WHERE start_time >= now() - interval '52 weeks' AND start_time IS NOT NULL AND qr_code IS NULL ${siteCond}
                GROUP BY date_trunc('week', start_time)
                ORDER BY date_trunc('week', start_time)`),
            q(`
                SELECT
                    printer_hostname,
                    COALESCE(printer_model, 'Unknown') AS printer_model,
                    to_char(date_trunc('day', start_time), 'YYYY-MM-DD') AS day,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)          AS print_hours,
                    ROUND((COALESCE(SUM(print_duration_secs)/3600.0, 0) / 24.0 * 100)::numeric, 2) AS utilization_pct
                FROM hist
                WHERE start_time >= now() - interval '56 days' AND start_time IS NOT NULL AND qr_code IS NULL ${siteCond}
                GROUP BY printer_hostname, printer_model, date_trunc('day', start_time)
                ORDER BY printer_hostname, date_trunc('day', start_time)`),
            q(`
                SELECT
                    COALESCE(printer_model, 'Unknown')                   AS printer_model,
                    COUNT(*)                                              AS total_jobs,
                    COUNT(*) FILTER (WHERE status = 'completed')          AS completed_jobs,
                    COUNT(*) FILTER (WHERE status IN ('klippy_shutdown','klippy_disconnect','error','server_exit')) AS failed_jobs,
                    COALESCE(SUM(print_duration_secs)/3600.0, 0)         AS print_hours,
                    COALESCE(SUM(filament_used_mm) * 3.14159265 * (1.75/2.0)^2 * 1.1 / 1e6, 0) AS filament_kg,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 1)
                    END AS completion_rate
                FROM hist
                WHERE ${cutoff} qr_code IS NULL ${siteCond}
                GROUP BY printer_model
                ORDER BY total_jobs DESC`),
        ])

        const kpi = kpiRows[0] ?? {}
        res.status(200).json({
            kpis: {
                total_jobs: num(kpi.total_jobs),
                total_print_hours: round(kpi.total_print_hours, 2),
                total_filament_kg: round(kpi.total_filament_kg, 3),
                jobs_30d: num(kpi.jobs_30d),
                print_hours_30d: round(kpi.print_hours_30d, 2),
                filament_kg_30d: round(kpi.filament_kg_30d, 3),
                active_printers_30d: num(kpi.active_printers_30d),
                completion_rate_30d: num(kpi.completion_rate_30d),
            },
            monthly_summary: monthlyRows.map((r) => ({
                year_month: r.year_month,
                jobs: num(r.jobs),
                print_hours: round(r.print_hours, 2),
                active_printers: num(r.active_printers),
                utilization_pct: num(r.utilization_pct),
            })),
            filament_summary: filamentRows.map((r) => ({
                filament_type: r.filament_type,
                jobs: num(r.jobs),
                print_hours: round(r.print_hours, 2),
                mass_kg: round(r.mass_kg, 3),
            })),
            monthly_filament: monthlyFilamentRows.map((r) => ({
                year_month: r.year_month,
                filament_type: r.filament_type,
                mass_kg: round(r.mass_kg, 3),
            })),
            printer_health: healthRows.map((r) => ({
                printer_hostname: r.printer_hostname,
                total_jobs: num(r.total_jobs),
                failed_jobs: num(r.failed_jobs),
                health_pct: num(r.health_pct),
            })),
            status_summary: statusRows.map((r) => ({
                status: r.status,
                jobs: num(r.jobs),
                print_hours: round(r.print_hours, 2),
            })),
            weekly_success_rate: weeklyRows.map((r) => ({
                week: r.week,
                total_jobs: num(r.total_jobs),
                completed_jobs: num(r.completed_jobs),
                success_rate: num(r.success_rate),
            })),
            daily_utilization: dailyRows.map((r) => ({
                printer_hostname: r.printer_hostname,
                printer_model: r.printer_model,
                day: r.day,
                print_hours: round(r.print_hours, 2),
                utilization_pct: num(r.utilization_pct),
            })),
            model_summary: modelRows.map((r) => ({
                printer_model: r.printer_model,
                total_jobs: num(r.total_jobs),
                completed_jobs: num(r.completed_jobs),
                failed_jobs: num(r.failed_jobs),
                print_hours: round(r.print_hours, 2),
                filament_kg: round(r.filament_kg, 3),
                completion_rate: num(r.completion_rate),
            })),
        })
    } catch (e) {
        handleError(res, e)
    }
}
