// src/pages/HeatMap.jsx
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Clamp to North America [west, south, east, north]
const NA_BOUNDS = [-170, 5, -30, 85];

// ---- FIRMS CONFIG ----
const FIRMS_SOURCES = [
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA21_NRT",
  "VIIRS_NOAA20_NRT",
  "MODIS_NRT",
];
const FIRMS_DAYS = 3; // last 3 days
const BBOX = "-170,5,-30,80"; // NA W,S,E,N

function firmsUrl(source) {
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${
    import.meta.env.VITE_FIRMS_API_KEY
  }/${source}/${BBOX}/${FIRMS_DAYS}`;
}

/* ============= style expressions ============= */
const INTENSITY_COLOR = [
  "interpolate",
  ["linear"],
  ["to-number", ["coalesce", ["get", "frp"], 0]],
  0,
  "#9ca3af",
  10,
  "#fb923c",
  30,
  "#f97316",
  60,
  "#ef4444",
  120,
  "#b91c1c",
];
const INTENSITY_STROKE = [
  "interpolate",
  ["linear"],
  ["to-number", ["coalesce", ["get", "frp"], 0]],
  0,
  "#d1d5db",
  30,
  "#fb923c",
  60,
  "#ef4444",
  120,
  "#7f1d1d",
];
const FRP_SAFE = ["to-number", ["coalesce", ["get", "frp"], 1]];
const SQRT_FRP = ["sqrt", ["max", 1, FRP_SAFE]];
const INTENSITY_RADIUS = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  ["+", 6, ["*", 0.8, SQRT_FRP]],
  4,
  ["+", 8, ["*", 1.1, SQRT_FRP]],
  6,
  ["+", 10, ["*", 1.5, SQRT_FRP]],
  8,
  ["+", 12, ["*", 2.0, SQRT_FRP]],
  10,
  ["+", 14, ["*", 2.8, SQRT_FRP]],
  12,
  ["+", 16, ["*", 3.6, SQRT_FRP]],
  14,
  ["+", 18, ["*", 4.6, SQRT_FRP]],
];
/* ============================================= */

export default function HeatMap({
  heightClass = "h-[78vh]",
  showStatus = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState({
    token: !!mapboxgl.accessToken,
    style: "waiting",
    firms: "waiting",
    points: 0,
    error: "",
  });

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-100, 45],
      zoom: 2,
      projection: "globe",
      antialias: true,
      attributionControl: false,
      renderWorldCopies: false,
      maxBounds: NA_BOUNDS,
      minZoom: 1.4,
      maxZoom: 14,
    });
    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      "top-right"
    );
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");
    map.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" })
    );

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showAccuracyCircle: true,
      showUserHeading: true,
    });
    map.addControl(geolocate, "top-right");

    map.on("style.load", () => {
      setStatus((s) => ({ ...s, style: "loaded" }));
      map.setFog({
        range: [0.5, 10],
        color: "rgb(186,210,235)",
        "horizon-blend": 0.2,
        "high-color": "rgb(36,92,223)",
        "space-color": "rgb(11,11,25)",
        "star-intensity": 0.15,
      });

      // tighter padding if compact height
      const pad = heightClass === "h-40" ? 8 : 40;
      map.fitBounds(NA_BOUNDS, { padding: pad, duration: 0 });

      addFireIcon(map);
      addUserPin(map, geolocate, NA_BOUNDS);
      loadFirms(map);
    });

    map.on("error", (e) => {
      console.error("Mapbox error:", e?.error || e);
      setStatus((s) => ({ ...s, error: "Mapbox error (see console)" }));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightClass]);

  async function loadFirms(map) {
    try {
      let combined = [];
      let anyOk = false;

      for (const src of FIRMS_SOURCES) {
        try {
          const url = firmsUrl(src);
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`[FIRMS] ${src} HTTP ${res.status}`);
            continue;
          }
          const text = await res.text();
          const geo = csvToGeoJSON(text);
          combined = combined.concat(geo.features);
          anyOk = true;
        } catch (e) {
          console.warn(`[FIRMS] ${src} error:`, e);
        }
      }

      // Deduplicate
      const seen = new Set();
      const features = [];
      for (const f of combined) {
        const p = f.properties || {};
        const k = `${f.geometry.coordinates.join(",")}|${p.acq_date}|${
          p.acq_time
        }|${p.satellite}`;
        if (!seen.has(k)) {
          seen.add(k);
          features.push(f);
        }
      }
      const geojson = { type: "FeatureCollection", features };

      setStatus((s) => ({
        ...s,
        firms: anyOk ? "ok" : "error",
        points: geojson.features.length,
      }));

      if (map.getSource("fires")) map.removeSource("fires");
      map.addSource("fires", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 7,
      });

      if (!map.getLayer("fires-clusters")) {
        map.addLayer({
          id: "fires-clusters",
          type: "circle",
          source: "fires",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#ffcc80",
              20,
              "#ffb74d",
              50,
              "#ff9800",
              100,
              "#f57c00",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              14,
              20,
              18,
              50,
              22,
              100,
              28,
            ],
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.9,
          },
        });
        map.addLayer({
          id: "fires-cluster-count",
          type: "symbol",
          source: "fires",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["to-string", ["get", "point_count_abbreviated"]],
            "text-size": 12,
          },
          paint: { "text-color": "#1f2937" },
        });
        map.addLayer({
          id: "fires-intensity",
          type: "circle",
          source: "fires",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": INTENSITY_COLOR,
            "circle-radius": INTENSITY_RADIUS,
            "circle-opacity": 0.45,
            "circle-stroke-color": INTENSITY_STROKE,
            "circle-stroke-width": 1,
          },
        });
        map.addLayer({
          id: "fires-unclustered",
          type: "symbol",
          source: "fires",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": "fire-icon",
            "icon-size": 0.55,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        map.on("click", "fires-clusters", (e) => {
          const f = map.queryRenderedFeatures(e.point, {
            layers: ["fires-clusters"],
          })[0];
          map
            .getSource("fires")
            .getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
              if (!err) map.easeTo({ center: f.geometry.coordinates, zoom });
            });
        });

        map.on("click", "fires-unclustered", (e) => {
          const f = e.features[0];
          const p = f.properties || {};
          const [lon, lat] = f.geometry.coordinates;
          new mapboxgl.Popup({ maxWidth: "300px" })
            .setLngLat([lon, lat])
            .setHTML(
              `<div style="font-size:12px">
                <div style="font-weight:600;margin-bottom:4px">🔥 Active Fire</div>
                <div><b>Date:</b> ${p.acq_date || "-"} ${formatTime(
                p.acq_time
              )}</div>
                <div><b>FRP (MW):</b> ${p.frp ?? "-"}</div>
                <div><b>Confidence:</b> ${p.confidence ?? "-"}</div>
                <div><b>Satellite:</b> ${p.satellite || "-"}</div>
                <div><b>Day/Night:</b> ${p.daynight || "-"}</div>
                <div><b>Coords:</b> ${lat?.toFixed?.(3)}, ${lon?.toFixed?.(
                3
              )}</div>
               </div>`
            )
            .addTo(map);
        });

        map.on(
          "mouseenter",
          "fires-unclustered",
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          "fires-unclustered",
          () => (map.getCanvas().style.cursor = "")
        );
      }
    } catch (err) {
      console.error("FIRMS load error:", err);
      setStatus((s) => ({
        ...s,
        firms: "error",
        error: "FIRMS load error (see console)",
      }));
    }
  }

  function addUserPin(map, geolocateControl, bounds = NA_BOUNDS) {
    let userMarker = null;
    function el() {
      const div = document.createElement("div");
      div.innerHTML =
        '<span class="block w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white shadow-lg"></span>';
      const node = div.firstChild;
      node.style.transform = "translate(-50%, -50%)";
      node.style.cursor = "default";
      return node;
    }
    const inside = ([lon, lat]) =>
      lon >= bounds[0] &&
      lon <= bounds[2] &&
      lat >= bounds[1] &&
      lat <= bounds[3];

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const pt = [coords.longitude, coords.latitude];
          if (!inside(pt)) return;
          if (!userMarker)
            userMarker = new mapboxgl.Marker({ element: el() })
              .setLngLat(pt)
              .addTo(map);
          else userMarker.setLngLat(pt);
          map.flyTo({ center: pt, zoom: 5, speed: 0.8, essential: true });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    map.on("geolocate", (e) => {
      const pt = [e.coords.longitude, e.coords.latitude];
      if (!inside(pt)) return;
      if (!userMarker)
        userMarker = new mapboxgl.Marker({ element: el() })
          .setLngLat(pt)
          .addTo(map);
      else userMarker.setLngLat(pt);
    });
    map.once("load", () => {
      try {
        geolocateControl.trigger();
      } catch {}
    });
  }

  function addFireIcon(map) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff176"/><stop offset="60%" stop-color="#ff9800"/>
        <stop offset="100%" stop-color="#e65100"/></radialGradient></defs>
      <path d="M34 6c2 6-2 10-6 14s-8 8-6 14c2 6 10 8 14 6 4-2 6-8 8-12 2-4 4-8 2-12-2-4-8-8-12-10z" fill="url(#g)"/>
      <path d="M28 26c1 3-1 5-3 7s-4 4-3 7 5 4 7 3c2-1 3-4 4-6 1-2 2-4 1-6-1-2-4-4-6-5z" fill="#fff3e0" opacity=".9"/>
      <circle cx="32" cy="46" r="10" fill="url(#g)"/>
    </svg>`;
    const img = new Image(64, 64);
    img.onload = () =>
      !map.hasImage("fire-icon") && map.addImage("fire-icon", img);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function formatTime(hhmm) {
    if (!hhmm) return "-";
    const s = String(hhmm).padStart(4, "0");
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  }
  function csvToGeoJSON(csv) {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length <= 1) return { type: "FeatureCollection", features: [] };
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k) => headers.indexOf(k);

    const features = [];
    for (let i = 1; i < lines.length; i++) {
      const row = safeSplitCSV(lines[i]);
      if (!row || row.length < headers.length) continue;
      const lat = parseFloat(row[idx("latitude")]);
      const lon = parseFloat(row[idx("longitude")]);
      if (!isFinite(lat) || !isFinite(lon)) continue;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          brightness: row[idx("brightness")],
          acq_date: row[idx("acq_date")],
          acq_time: row[idx("acq_time")],
          satellite: row[idx("satellite")],
          instrument: row[idx("instrument")],
          confidence: row[idx("confidence")],
          version: row[idx("version")],
          bright_t31: row[idx("bright_t31")],
          frp: row[idx("frp")],
          daynight: row[idx("daynight")],
        },
      });
    }
    return { type: "FeatureCollection", features };
  }
  function safeSplitCSV(line) {
    const out = [];
    let cur = "",
      q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = !q;
      else if (c === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  return (
    <div className={`p-2 space-y-4 w-full`}>
      <div
        className={`relative max-w-md ${heightClass} mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow`}
      >
        <div ref={containerRef} className="w-full h-full" />
        {showStatus && (
          <div className="absolute top-2 left-2 text-xs bg-white/85 backdrop-blur rounded-md px-2 py-1 shadow">
            <span className="mr-2">
              <b>Token:</b> {String(status.token)}
            </span>
            <span className="mr-2">
              <b>Style:</b> {status.style}
            </span>
            <span className="mr-2">
              <b>FIRMS:</b> {status.firms}
            </span>
            <span>
              <b>Points:</b> {status.points}
            </span>
            {status.error && (
              <span className="ml-2 text-red-600">{status.error}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
