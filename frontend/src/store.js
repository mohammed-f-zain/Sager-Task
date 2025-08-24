// src/store.js
import { create } from 'zustand'
import { isAllowed } from './utils/format'

// --- helpers ---
function haversineKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// How close (in km) a new point must be to be considered the same drone track.
// The backend generates drones with very similar coordinates (±11km), so we need a much smaller threshold
// to distinguish between different drones rather than treating them as the same drone moving.
const MATCH_MAX_KM = 5

export const useDroneStore = create((set, get) => ({
  // Synthetic tracks keyed by our own id (TRACK-###)
  drones: new Map(),  // trackId -> last known state
  trails: new Map(),  // trackId -> [[lng,lat], ...]
  selected: null,
  lastUpdate: 0,

  _trackCounter: 0,   // internal counter to issue new synthetic ids

  _newTrackId() {
    const c = (get()._trackCounter || 0) + 1
    set({ _trackCounter: c })
    return `TRACK-${String(c).padStart(3, '0')}`
  },

  _assignTrack([lng, lat]) {
    // Find nearest existing track by last trail point
    const { drones, trails } = get()
    let bestId = null
    let bestDist = Infinity

    drones.forEach((_drone, id) => {
      const coords = trails.get(id)
      if (!coords || coords.length === 0) return
      const last = coords[coords.length - 1]
      const d = haversineKm(last, [lng, lat])
      if (d < bestDist) {
        bestDist = d
        bestId = id
      }
    })

    if (bestId && bestDist <= MATCH_MAX_KM) return bestId
    return get()._newTrackId()
  },

  upsertFromFeatureCollection(fc) {
    const drones = new Map(get().drones)
    const trails = new Map(get().trails)
    const now = Date.now()

    for (const f of fc?.features || []) {
      if (!f?.geometry || f.geometry.type !== 'Point') continue
      const [lng, lat] = f.geometry.coordinates || []
      if (lng == null || lat == null) continue

      // Backend ids are random every tick → assign by proximity
      const trackId = get()._assignTrack([lng, lat])
      console.log(`New drone at [${lng.toFixed(4)}, ${lat.toFixed(4)}] assigned to track: ${trackId}`)
      const p = f.properties || {}

      const registration = p.registration || ''
      const yaw = Number(p.yaw || 0)
      const altitude = Number(p.altitude || 0)
      const name = p.Name || 'Drone'
      const pilot = p.pilot || ''
      const organization = p.organization || ''

      const prev = drones.get(trackId)
      const firstSeen = prev?.firstSeen ?? now

      const drone = {
        serial: trackId,               // synthetic, stable id for UI
        registration,
        yaw,
        altitude,
        name,
        pilot,
        organization,
        lng,
        lat,
        firstSeen,
        lastSeen: now,
        allowed: isAllowed(registration),
      }
      drones.set(trackId, drone)

      // Trails (append if position changed)
      const prevTrail = trails.get(trackId) || []
      const last = prevTrail[prevTrail.length - 1]
      if (!last || last[0] !== lng || last[1] !== lat) {
        prevTrail.push([lng, lat])
        // Cap for performance
        if (prevTrail.length > 800) prevTrail.splice(0, prevTrail.length - 800)
      }
      trails.set(trackId, prevTrail)
    }

    set({ drones, trails, lastUpdate: now })
    console.log(`Store updated: ${drones.size} drones, ${trails.size} trails`)
  },

  select(serial) {
    set({ selected: serial })
  },

  getDronesFC() {
    const features = []
    get().drones.forEach((d) => {
      // Add drone point
      features.push({
        type: 'Feature',
        properties: {
          serial: d.serial,
          registration: d.registration,
          altitude: d.altitude,
          yaw: d.yaw,
          name: d.name,
          pilot: d.pilot,
          organization: d.organization,
          allowed: d.allowed ? 1 : 0,
          firstSeen: d.firstSeen,
          lastSeen: d.lastSeen,
        },
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      })
    })
    return { type: 'FeatureCollection', features }
  },

  getArrowsFC() {
    const features = []
    get().drones.forEach((d) => {
      // Add arrow line extending from drone in yaw direction
      const arrowLength = 0.01 // About 1km in degrees
      const yawRad = (d.yaw * Math.PI) / 180
      const endLng = d.lng + arrowLength * Math.cos(yawRad)
      const endLat = d.lat + arrowLength * Math.sin(yawRad)

      features.push({
        type: 'Feature',
        properties: {
          serial: d.serial,
          allowed: d.allowed ? 1 : 0,
          isArrow: true
        },
        geometry: {
          type: 'LineString',
          coordinates: [[d.lng, d.lat], [endLng, endLat]]
        },
      })
    })
    return { type: 'FeatureCollection', features }
  },

  getTrailsFC() {
    const features = []
    const drones = get().drones
    get().trails.forEach((coords, id) => {
      if (coords.length < 2) return
      const d = drones.get(id)
      const allowed = d?.allowed ? 1 : 0
      features.push({
        type: 'Feature',
        properties: { serial: id, allowed },
        geometry: { type: 'LineString', coordinates: coords },
      })
    })
    return { type: 'FeatureCollection', features }
  },

  counts() {
    let green = 0, red = 0
    get().drones.forEach((d) => (d.allowed ? green++ : red++))
    return { green, red, total: green + red }
  },

  list() {
    return Array.from(get().drones.values()).sort((a, b) =>
      a.serial.localeCompare(b.serial)
    )
  },
}))
