// src/pages/HeatMap.jsx
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function HeatMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-100, 40],      // North America
      zoom: 1.8,
      projection: "globe",     // 3D globe
      antialias: true,
    });
    mapInstance.current = map;

    map.on("style.load", () => {
      // subtle atmosphere
      map.setFog({
        color: "rgb(186, 210, 235)",
        "horizon-blend": 0.2,
        "high-color": "rgb(36, 92, 223)",
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.15,
      });

      // Country boundaries tileset from Mapbox
      map.addSource("countries", {
        type: "vector",
        url: "mapbox://mapbox.country-boundaries-v1",
      });

      // ISO alpha-3 for the region we want to HIGHLIGHT
      const NA_ISO3 = ["USA", "CAN", "MEX", "GRL", "BMU", "SPM"]; // core NA; add more if needed

      // Dim the rest of the world
      map.addLayer({
        id: "world-dim",
        type: "fill",
        source: "countries",
        "source-layer": "country_boundaries",
        filter: ["!", ["in", ["get", "iso_3166_1_alpha_3"], ["literal", NA_ISO3]]],
        paint: {
          "fill-color": "#0f172a",   // slate-ish
          "fill-opacity": 0.35,
        },
      });

      // Highlight North America
      map.addLayer({
        id: "na-fill",
        type: "fill",
        source: "countries",
        "source-layer": "country_boundaries",
        filter: ["in", ["get", "iso_3166_1_alpha_3"], ["literal", NA_ISO3]],
        paint: {
          "fill-color": "#6E56CF",   // purple
          "fill-opacity": 0.7,
        },
      });

      // A crisp outline for the highlight
      map.addLayer({
        id: "na-outline",
        type: "line",
        source: "countries",
        "source-layer": "country_boundaries",
        filter: ["in", ["get", "iso_3166_1_alpha_3"], ["literal", NA_ISO3]],
        paint: {
          "line-color": "#2B1E70",
          "line-width": 1.2,
        },
      });

      // Optional: glide the camera to a nice tilt
      map.easeTo({ bearing: 0, pitch: 45, duration: 2000 });
    });

    return () => map.remove();
  }, []);

  return (
    <div className="h-screen w-full">
      <h1></h1>
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}

export default HeatMap;
