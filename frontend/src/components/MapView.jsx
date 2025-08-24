import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useDroneStore } from '../store'
import { formatDuration } from '../utils/format'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const MAP_ID = 'sager-map'
const DRONES_SOURCE = 'drones-src'
const DRONES_LAYER = 'drones-lyr'
const ARROWS_SOURCE = 'arrows-src'
const ARROWS_LAYER = 'arrows-lyr'
const TRAILS_SOURCE = 'trails-src'
const TRAILS_LAYER = 'trails-lyr'

export default function MapView() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const [ready, setReady] = useState(false)

  const selected = useDroneStore(s => s.selected)
  const select = useDroneStore(s => s.select)
  const dronesFC = useDroneStore(s => s.getDronesFC())
  const trailsFC = useDroneStore(s => s.getTrailsFC())
  const lastUpdate = useDroneStore(s => s.lastUpdate)

  // init map
  useEffect(() => {
    if (mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [35.93, 31.95], // This should match the backend base coordinates
      zoom: 11
    })

    console.log('Map initialized with center:', [35.93, 31.95])
    mapRef.current = map
    popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })

    map.on('load', async () => {
      // add monochrome (SDF) drone icon so we can color by allowed
      // The file is added via URL from public
      try {
        const img = await map.loadImage('/drone.png')
        console.log('Drone icon loaded successfully:', img)
        if (img && !map.hasImage('drone-sdf')) {
          map.addImage('drone-sdf', img.data, { sdf: true, pixelRatio: img.pixelRatio })
          console.log('Drone icon added to map')
        }
      } catch (error) {
        console.error('Failed to load drone icon:', error)
        // Fallback: create a simple circle symbol instead
        if (!map.hasImage('drone-sdf')) {
          console.log('Using fallback circle symbol for drones')
        }
      }

      // sources
      if (!map.getSource(DRONES_SOURCE)) {
        map.addSource(DRONES_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getSource(ARROWS_SOURCE)) {
        map.addSource(ARROWS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getSource(TRAILS_SOURCE)) {
        map.addSource(TRAILS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }

      // trails layer
      if (!map.getLayer(TRAILS_LAYER)) {
        map.addLayer({
          id: TRAILS_LAYER,
          source: TRAILS_SOURCE,
          type: 'line',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'allowed'], 1],
              '#22c55e',
              '#ef4444'
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              10, 1.5,
              13, 3,
              16, 5
            ],
            'line-opacity': 0.9,
            'line-blur': 0.2,
            'line-cap': 'round',
            'line-join': 'round'
          }
        })
      }

      // drones layer
      if (!map.getLayer(DRONES_LAYER)) {
        map.addLayer({
          id: DRONES_LAYER,
          source: DRONES_SOURCE,
          type: 'symbol',
          layout: {
            'icon-image': 'drone-sdf',
            'icon-size': 0.8,
            'icon-rotate': ['get', 'yaw'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          },
          paint: {
            'icon-color': [
              'case',
              ['==', ['get', 'allowed'], 1],
              '#22c55e', // green
              '#ef4444'  // red
            ]
          }
        })

        // Add a fallback circle layer in case the icon fails
        map.addLayer({
          id: 'drones-fallback',
          source: DRONES_SOURCE,
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'case',
              ['==', ['get', 'allowed'], 1],
              '#22c55e', // green
              '#ef4444'  // red
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })

        // Add small drone icon inside the circle
        map.addLayer({
          id: 'drone-inner',
          source: DRONES_SOURCE,
          type: 'symbol',
          layout: {
            'symbol-placement': 'point',
            'icon-image': 'drone-sdf',
            'icon-size': 0.3,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          },
          paint: {
            'icon-color': '#ffffff'
          }
        })

        // Add arrow layer to show drone orientation using custom line arrows
        map.addLayer({
          id: ARROWS_LAYER,
          source: ARROWS_SOURCE,
          type: 'line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'allowed'], 1],
              '#22c55e', // green
              '#ef4444'  // red
            ],
            'line-width': 3,
            'line-opacity': 0.9
          }
        })
      }

      // hover popup for drones
      map.on('mousemove', DRONES_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties || {}
        const coords = f.geometry?.coordinates || e.lngLat
        const firstSeen = Number(p.firstSeen || Date.now())
        const alt = Number(p.altitude || 0)
        const flight = formatDuration(Date.now() - firstSeen)
        const yaw = Number(p.yaw || 0)
        const html = `
          <div class="text-sm bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600">
            <div class="font-semibold mb-2 text-lg">${p.name || p.serial || 'Drone'}</div>
            <div class="mb-1">Altitude: <span class="font-medium text-blue-300">${alt} m</span></div>
            <div class="mb-1">Flight Time: <span class="font-medium text-green-300">${flight}</span></div>
            <div class="mb-1">Direction: <span class="font-medium text-yellow-300">${yaw}°</span></div>
            <div class="text-xs text-gray-400">${p.registration || ''}</div>
          </div>
        `
        popupRef.current.setLngLat(coords).setHTML(html).addTo(map)
      })

      // hover popup for arrows (same functionality)
      map.on('mousemove', ARROWS_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties || {}
        // For arrow lines, get the start point (drone position)
        const coords = f.geometry?.coordinates[0] || e.lngLat

        // Get full drone data from store
        const droneStore = useDroneStore.getState()
        const drone = droneStore.drones.get(p.serial)

        if (drone) {
          const firstSeen = Number(drone.firstSeen || Date.now())
          const alt = Number(drone.altitude || 0)
          const flight = formatDuration(Date.now() - firstSeen)
          const yaw = Number(drone.yaw || 0)
          const html = `
            <div class="text-sm bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600">
              <div class="font-semibold mb-2 text-lg">${drone.name || drone.serial || 'Drone'}</div>
              <div class="mb-1">Altitude: <span class="font-medium text-blue-300">${alt} m</span></div>
              <div class="mb-1">Flight Time: <span class="font-medium text-green-300">${flight}</span></div>
              <div class="mb-1">Direction: <span class="font-medium text-yellow-300">${yaw}°</span></div>
              <div class="text-xs text-gray-400">${drone.registration || ''}</div>
            </div>
          `
          popupRef.current.setLngLat(coords).setHTML(html).addTo(map)
        }
      })

      // hover popup for inner drone icon (same functionality)
      map.on('mousemove', 'drone-inner', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties || {}
        const coords = f.geometry?.coordinates || e.lngLat
        const firstSeen = Number(p.firstSeen || Date.now())
        const alt = Number(p.altitude || 0)
        const flight = formatDuration(Date.now() - firstSeen)
        const yaw = Number(p.yaw || 0)
        const html = `
          <div class="text-sm bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600">
            <div class="font-semibold mb-2 text-lg">${p.name || p.serial || 'Drone'}</div>
            <div class="mb-1">Altitude: <span class="font-medium text-blue-300">${alt} m</span></div>
            <div class="mb-1">Flight Time: <span class="font-medium text-green-300">${flight}</span></div>
            <div class="mb-1">Direction: <span class="font-medium text-yellow-300">${yaw}°</span></div>
            <div class="text-xs text-gray-400">${p.registration || ''}</div>
          </div>
        `
        popupRef.current.setLngLat(coords).setHTML(html).addTo(map)
      })

      map.on('mouseleave', DRONES_LAYER, () => {
        popupRef.current.remove()
      })

      map.on('mouseleave', ARROWS_LAYER, () => {
        popupRef.current.remove()
      })

      map.on('mouseleave', 'drone-inner', () => {
        popupRef.current.remove()
      })

      // select on click for drones
      map.on('click', DRONES_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const serial = f.properties?.serial
        if (serial) {
          select(serial)
          const coords = f.geometry?.coordinates || e.lngLat
          map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
        }
      })

      // select on click for arrows
      map.on('click', ARROWS_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const serial = f.properties?.serial
        if (serial) {
          select(serial)
          const coords = f.geometry?.coordinates || e.lngLat
          map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
        }
      })

      // select on click for inner drone icon
      map.on('click', 'drone-inner', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const serial = f.properties?.serial
        if (serial) {
          select(serial)
          const coords = f.geometry?.coordinates || e.lngLat
          map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
        }
      })

      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // update sources when store changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const dronesSrc = map.getSource(DRONES_SOURCE)
    const arrowsSrc = map.getSource(ARROWS_SOURCE)
    const trailsSrc = map.getSource(TRAILS_SOURCE)

    console.log('Updating map with drones:', dronesFC.features.length, 'drones')
    console.log('Drone data:', dronesFC.features)
    console.log('Yaw values:', dronesFC.features.map(f => f.properties.yaw))
    console.log('Sample drone yaw:', dronesFC.features[0]?.properties.yaw)

    if (dronesSrc) dronesSrc.setData(dronesFC)
    if (arrowsSrc) arrowsSrc.setData(useDroneStore.getState().getArrowsFC())
    if (trailsSrc) trailsSrc.setData(trailsFC)
  }, [lastUpdate, ready])

  // center map when selected from list
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected) return
    const feature = dronesFC.features.find(f => f.properties.serial === selected)
    if (feature) {
      map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
    }
  }, [selected])

  return <div ref={containerRef} id={MAP_ID} className="map-container" />
}