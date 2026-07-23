// Shared spool row shaping for /api/spool/spools and /api/spool/lookup/[qr].
// Reproduces fleet_daemon's _SPOOL_SELECT joined row (s.* + filament/vendor
// aliases) from the cloud_spool/cloud_filament/cloud_vendor JSONB mirrors.

export const SPOOL_JOIN = `
    FROM cloud_spool s
    JOIN cloud_filament f ON f.site = s.site AND f.id = (s.data->>'filament_id')::int
    LEFT JOIN cloud_vendor v ON v.site = f.site AND v.id = (f.data->>'vendor_id')::int
`

export const SPOOL_SELECT = `
    SELECT s.site, s.data AS spool, f.data AS filament, v.data AS vendor ${SPOOL_JOIN}
`

/** Flatten a joined row exactly like the daemon's _SPOOL_SELECT aliases. */
export function flatSpoolRow(r: { site: string; spool: any; filament: any; vendor: any }): Record<string, any> {
    const f = r.filament ?? {}
    const v = r.vendor ?? {}
    return {
        ...r.spool,
        site: r.site,
        filament_name: f.name ?? null,
        material: f.material ?? null,
        density: f.density ?? null,
        diameter: f.diameter ?? null,
        color_hex: f.color_hex ?? null,
        filament_weight: f.weight ?? null,
        settings_extruder_temp: f.settings_extruder_temp ?? null,
        settings_bed_temp: f.settings_bed_temp ?? null,
        material_class: f.material_class ?? null,
        material_abbreviation: f.material_abbreviation ?? null,
        min_print_temp: f.min_print_temp ?? null,
        max_print_temp: f.max_print_temp ?? null,
        preheat_temp: f.preheat_temp ?? null,
        min_bed_temp: f.min_bed_temp ?? null,
        max_bed_temp: f.max_bed_temp ?? null,
        material_tags: f.material_tags ?? null,
        certifications: f.certifications ?? null,
        vendor_id: v.id ?? null,
        vendor_name: v.name ?? null,
    }
}

/** Nest a joined row like the daemon's GET /spool/lookup/{qr} response. */
export function nestedSpool(r: { site: string; spool: any; filament: any; vendor: any }): Record<string, any> {
    const s = r.spool ?? {}
    const f = r.filament ?? {}
    const v = r.vendor ?? {}
    return {
        id: s.id,
        qr_code: s.qr_code,
        initial_weight: s.initial_weight,
        used_weight: s.used_weight,
        remaining_weight: s.remaining_weight,
        spool_weight: s.spool_weight,
        location: s.location,
        lot_nr: s.lot_nr,
        comment: s.comment,
        archived: s.archived,
        first_used: s.first_used,
        last_used: s.last_used,
        last_printer: s.last_printer,
        loaded_on_printer: s.loaded_on_printer,
        registered: s.registered,
        instance_uuid: s.instance_uuid,
        nfc_tag_uid: s.nfc_tag_uid,
        package_uuid: s.package_uuid,
        gtin: s.gtin,
        nominal_full_length: s.nominal_full_length,
        actual_full_length: s.actual_full_length,
        manufactured_date: s.manufactured_date,
        expiration_date: s.expiration_date,
        container_dimensions: s.container_dimensions,
        workgroup: s.workgroup,
        write_protection: s.write_protection,
        site: r.site,
        filament: {
            id: f.id,
            name: f.name,
            material: f.material,
            density: f.density,
            diameter: f.diameter,
            weight: f.weight,
            color_hex: f.color_hex,
            settings_extruder_temp: f.settings_extruder_temp,
            settings_bed_temp: f.settings_bed_temp,
            material_class: f.material_class,
            material_abbreviation: f.material_abbreviation,
            min_print_temp: f.min_print_temp,
            max_print_temp: f.max_print_temp,
            preheat_temp: f.preheat_temp,
            min_bed_temp: f.min_bed_temp,
            max_bed_temp: f.max_bed_temp,
            material_tags: f.material_tags,
            certifications: f.certifications,
            vendor: v.id != null ? { id: v.id, name: v.name } : null,
        },
    }
}
