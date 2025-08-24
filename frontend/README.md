# SagerSpace Frontend (React + Vite + Tailwind + Mapbox + Socket.IO)

Implements the Drone Tracing task frontend. Connects to the provided backend via Socket.IO polling and renders live drones on a Mapbox map, draws their paths since page load, colors by registration rule, shows hover popups (flight time + altitude), supports selection from list/map, and shows a bottom-right counter of **red** (not allowed) drones.

## Quick Start

1) **Install deps**
```bash
npm i
```

2) **Env vars** — create `.env` in the project root:
```
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_ACCESS_TOKEN
VITE_SOCKET_URL=http://localhost:9013
```

3) **Run**
```bash
npm run dev
```

> The backend from this repo must be running (default at `http://localhost:9013`).

## Notes

- **Performance**: Uses Mapbox GeoJSON **sources + layers** (not per-marker React components), which scales to thousands of drones.
- **Orientation**: Drone icon rotates by `yaw` using the symbol layer's `icon-rotate`.
- **Coloring**: Icon color green when allowed (registration substring *after the dash* starts with `B`), red otherwise. Example: `SG-BA` → allowed.
- **Trails**: LineString per drone, kept to the latest ~600 points for performance.
- **Selection**: Clicking a drone in the list flies map to it. Clicking a drone on the map highlights it in the list.
- **Counter**: Bottom-right badge shows count of **red** drones only.
- **Responsive**: Sidebar collapses to top on mobile (single-column), map occupies remaining space.

## Folder Structure

```
sager-frontend/
  public/
    drone.png
    icons/*.svg
  src/
    components/
      Header.jsx
      SidePanel.jsx
      MapView.jsx
      CounterBadge.jsx
    utils/
      format.js
    store.js
    socket.js
    App.jsx
    main.jsx
    index.css
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
```

## If you prefer Create React App (CRA)

This code is framework-agnostic. If you scaffold with CRA, place files similarly inside `src/` and ensure Tailwind is configured per CRA docs. Replace Vite envs (`import.meta.env`) with CRA's (`process.env.REACT_APP_*`).