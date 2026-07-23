import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HIST_CTE, handleError, intParam, num, query, requireAuth, requireGet, round, siteParam } from '../../_lib'

// Port of fleet_daemon GET /history/analytics/parts (main.py get_part_analytics)
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
            coverageRows,
            weeklyQcRows,
            failPrinterRows,
            failFilamentRows,
            failSpoolRows,
            inspectorRows,
            qcStatusRows,
            failNozzleRows,
            topFilesRows,
            monthlyQcRows,
            turnaroundRows,
        ] = await Promise.all([
            q(`
                SELECT
                    COUNT(*) FILTER (WHERE qc_status IS NOT NULL)                           AS total_inspected,
                    COUNT(*) FILTER (WHERE qc_status = 'pass')                              AS passed,
                    COUNT(*) FILTER (WHERE qc_status = 'fail')                              AS failed,
                    COUNT(*) FILTER (WHERE qc_status = 'pending')                           AS pending,
                    CASE WHEN COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'pass')::numeric
                              / COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) * 100, 1)
                    END AS pass_rate,
                    CASE WHEN COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric
                              / COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) * 100, 1)
                    END AS fail_rate,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (qc_date - end_time)) / 3600.0)
                        FILTER (WHERE qc_date IS NOT NULL AND end_time IS NOT NULL), 0) AS avg_turnaround_hours
                FROM hist
                WHERE qr_code IS NOT NULL AND ${cutoff} TRUE ${siteCond}`),
            q(`
                SELECT
                    COUNT(DISTINCT CASE WHEN p.qc_status IS NOT NULL THEN b.id END) AS jobs_with_qc,
                    COUNT(DISTINCT b.id) AS total_completed_jobs
                FROM hist b
                LEFT JOIN hist p
                    ON p.printer_hostname = b.printer_hostname
                    AND p.moonraker_job_id = b.moonraker_job_id
                    AND p.qr_code IS NOT NULL
                    AND p.qc_status IS NOT NULL
                WHERE b.qr_code IS NULL
                    AND b.status = 'completed'
                    AND ${cutoff.replaceAll('start_time', 'b.start_time')} TRUE ${siteCond.replace('display_site', 'b.display_site')}`),
            q(`
                SELECT
                    to_char(date_trunc('week', start_time), 'YYYY-MM-DD') AS week,
                    COUNT(*)                                               AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'pass')            AS passed,
                    COUNT(*) FILTER (WHERE qc_status = 'fail')            AS failed,
                    CASE WHEN COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'pass')::numeric
                              / COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) * 100, 1)
                    END AS pass_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND ${cutoff} TRUE AND start_time IS NOT NULL ${siteCond}
                GROUP BY date_trunc('week', start_time)
                ORDER BY date_trunc('week', start_time)`),
            q(`
                SELECT
                    printer_hostname,
                    COUNT(*)                                    AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric / COUNT(*) * 100, 1)
                    END AS fail_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_status IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY printer_hostname
                ORDER BY fail_rate DESC`),
            q(`
                SELECT
                    COALESCE(filament_type, 'Unknown') AS filament_type,
                    COUNT(*)                                    AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric / COUNT(*) * 100, 1)
                    END AS fail_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_status IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY filament_type
                ORDER BY fail_rate DESC`),
            q(`
                SELECT
                    spool_qr_code,
                    COUNT(*)                                    AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric / COUNT(*) * 100, 1)
                    END AS fail_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_status IS NOT NULL
                    AND spool_qr_code IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY spool_qr_code
                ORDER BY fail_rate DESC
                LIMIT 20`),
            q(`
                SELECT
                    qc_inspector AS inspector,
                    COUNT(*)                                    AS inspected,
                    COUNT(*) FILTER (WHERE qc_status = 'pass') AS passed,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'pass')::numeric / COUNT(*) * 100, 1)
                    END AS pass_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_inspector IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY qc_inspector
                ORDER BY inspected DESC`),
            q(`
                SELECT
                    COALESCE(qc_status, 'unreviewed') AS status,
                    COUNT(*)                           AS count
                FROM hist
                WHERE qr_code IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY qc_status
                ORDER BY count DESC`),
            q(`
                SELECT
                    gcode_nozzle_size AS nozzle_size,
                    COUNT(*)                                    AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric / COUNT(*) * 100, 1)
                    END AS fail_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_status IS NOT NULL
                    AND gcode_nozzle_size IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY gcode_nozzle_size
                ORDER BY fail_rate DESC`),
            q(`
                SELECT
                    filename,
                    COUNT(*)                                    AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'fail') AS failed,
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'fail')::numeric / COUNT(*) * 100, 1)
                    END AS fail_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND qc_status IS NOT NULL
                    AND filename IS NOT NULL AND ${cutoff} TRUE ${siteCond}
                GROUP BY filename
                HAVING COUNT(*) >= 3
                ORDER BY fail_rate DESC
                LIMIT 15`),
            q(`
                SELECT
                    to_char(date_trunc('month', start_time), 'YYYY-MM') AS year_month,
                    COUNT(*)                                             AS total,
                    COUNT(*) FILTER (WHERE qc_status = 'pass')          AS passed,
                    COUNT(*) FILTER (WHERE qc_status = 'fail')          AS failed,
                    CASE WHEN COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE qc_status = 'pass')::numeric
                              / COUNT(*) FILTER (WHERE qc_status IN ('pass','fail')) * 100, 1)
                    END AS pass_rate
                FROM hist
                WHERE qr_code IS NOT NULL AND ${cutoff} TRUE AND start_time IS NOT NULL ${siteCond}
                GROUP BY date_trunc('month', start_time)
                ORDER BY date_trunc('month', start_time)`),
            q(`
                SELECT
                    to_char(date_trunc('week', qc_date), 'YYYY-MM-DD') AS week,
                    ROUND(AVG(EXTRACT(EPOCH FROM (qc_date - end_time)) / 3600.0)::numeric, 1) AS avg_hours
                FROM hist
                WHERE qr_code IS NOT NULL
                    AND qc_date IS NOT NULL AND end_time IS NOT NULL
                    AND ${cutoff} TRUE ${siteCond}
                GROUP BY date_trunc('week', qc_date)
                ORDER BY date_trunc('week', qc_date)`),
        ])

        const kpi = kpiRows[0] ?? {}
        const coverage = coverageRows[0] ?? {}
        const totalCompleted = num(coverage.total_completed_jobs)
        const coveragePct = totalCompleted > 0 ? round((num(coverage.jobs_with_qc) / totalCompleted) * 100, 1) : 0

        res.status(200).json({
            kpis: {
                total_inspected: num(kpi.total_inspected),
                passed: num(kpi.passed),
                failed: num(kpi.failed),
                pending: num(kpi.pending),
                pass_rate: num(kpi.pass_rate),
                fail_rate: num(kpi.fail_rate),
                coverage_pct: coveragePct,
                avg_turnaround_hours: round(kpi.avg_turnaround_hours, 1),
            },
            weekly_qc_trend: weeklyQcRows.map((r) => ({
                week: r.week,
                total: num(r.total),
                passed: num(r.passed),
                failed: num(r.failed),
                pass_rate: num(r.pass_rate),
            })),
            fail_rate_by_printer: failPrinterRows.map((r) => ({
                printer_hostname: r.printer_hostname,
                total: num(r.total),
                failed: num(r.failed),
                fail_rate: num(r.fail_rate),
            })),
            fail_rate_by_filament: failFilamentRows.map((r) => ({
                filament_type: r.filament_type,
                total: num(r.total),
                failed: num(r.failed),
                fail_rate: num(r.fail_rate),
            })),
            fail_rate_by_spool: failSpoolRows.map((r) => ({
                spool_qr_code: r.spool_qr_code,
                total: num(r.total),
                failed: num(r.failed),
                fail_rate: num(r.fail_rate),
            })),
            inspector_activity: inspectorRows.map((r) => ({
                inspector: r.inspector,
                inspected: num(r.inspected),
                passed: num(r.passed),
                failed: num(r.failed),
                pass_rate: num(r.pass_rate),
            })),
            qc_status_summary: qcStatusRows.map((r) => ({
                status: r.status,
                count: num(r.count),
            })),
            fail_rate_by_nozzle: failNozzleRows.map((r) => ({
                nozzle_size: num(r.nozzle_size),
                total: num(r.total),
                failed: num(r.failed),
                fail_rate: num(r.fail_rate),
            })),
            top_failing_files: topFilesRows.map((r) => ({
                filename: r.filename,
                total: num(r.total),
                failed: num(r.failed),
                fail_rate: num(r.fail_rate),
            })),
            monthly_qc_summary: monthlyQcRows.map((r) => ({
                year_month: r.year_month,
                total: num(r.total),
                passed: num(r.passed),
                failed: num(r.failed),
                pass_rate: num(r.pass_rate),
            })),
            qc_turnaround: turnaroundRows.map((r) => ({
                week: r.week,
                avg_hours: num(r.avg_hours),
            })),
        })
    } catch (e) {
        handleError(res, e)
    }
}
