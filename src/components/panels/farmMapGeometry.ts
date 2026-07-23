// Per-site floor geometry for the fleet map (FLEET_ONLINE_HANDOFF.md §5.5).
//
// FarmMapSection.vue used to hardcode ONE floor plan; the geometry that was on
// this branch is the SF building (owner clarification 2026-07-22). The old
// building (`pantheonfleet`) plan — a scanned floor-plan image behind a 20×12
// grid — is recovered from this repo's git history (pre-97ca3c6a Farm.vue).
import floorPlanPantheon from '@/components/ui/NewBuilding cropped.png'

export interface FarmMapRoom {
    name: string
    gx: number
    gy: number
    wc: number
    hc: number
    side: 'left' | 'top' | 'bottom'
}

export interface FarmMapGeometry {
    gridCols: number
    gridRows: number
    /** Columns after which a thick vertical divider is drawn (farm map). */
    farmDividerCols: number[]
    /** Rotated label on the left margin of the farm map ('' = none). */
    farmLeftLabel: string
    /** Centered label on the bottom margin of the farm map ('' = none). */
    farmBottomLabel: string
    /** Aisle labels along the top: count + first column + width in columns. */
    aisles: { count: number; firstCol: number; widthCols: number } | null
    /** Bay door segment on the right border (rows inclusive), or null. */
    bayDoor: { startRow: number; endRow: number } | null
    /** Ground-floor schematic rooms (empty = single-map site). */
    groundRooms: FarmMapRoom[]
    /** Whether the site has a Ground Floor map section at all. */
    hasGround: boolean
    /** Floor-plan image stretched behind the farm grid (old building), or null. */
    floorPlanImage: string | null
}

const SF: FarmMapGeometry = {
    gridCols: 25,
    gridRows: 12,
    farmDividerCols: [1, 5, 9, 13, 17, 21],
    farmLeftLabel: 'Post Processing',
    farmBottomLabel: 'Farm Room',
    aisles: { count: 6, firstCol: 2, widthCols: 4 },
    bayDoor: { startRow: 5, endRow: 9 },
    groundRooms: [
        { name: 'Production', gx: 1, gy: 1, wc: 3, hc: 12, side: 'left' },
        { name: 'R&D', gx: 4, gy: 1, wc: 22, hc: 9, side: 'top' },
        { name: 'Fulfilment', gx: 4, gy: 10, wc: 22, hc: 3, side: 'bottom' },
    ],
    hasGround: true,
    floorPlanImage: null,
}

const PANTHEONFLEET: FarmMapGeometry = {
    gridCols: 20,
    gridRows: 12,
    farmDividerCols: [],
    farmLeftLabel: '',
    farmBottomLabel: '',
    aisles: null,
    bayDoor: null,
    groundRooms: [],
    hasGround: false,
    floorPlanImage: floorPlanPantheon,
}

const GEOMETRY_BY_SITE: Record<string, FarmMapGeometry> = {
    sf: SF,
    pantheonfleet: PANTHEONFLEET,
}

/** Geometry for a site id; unknown/empty sites fall back to the geometry this
 *  branch always rendered (SF) so local mode is unchanged. */
export function geometryForSite(site: string): FarmMapGeometry {
    return GEOMETRY_BY_SITE[site] ?? SF
}

/** Site id of a LOCAL (non-cloud) install — this branch's geometry is the SF
 *  building; override with VUE_APP_FLEET_SITE=pantheonfleet at the old site. */
export function localSiteId(): string {
    return String(import.meta.env.VUE_APP_FLEET_SITE ?? '') || 'sf'
}
