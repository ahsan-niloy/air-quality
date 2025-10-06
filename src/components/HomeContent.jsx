// src/components/HomeContent.jsx
import { useEffect, useMemo, useState } from "react";

/* -------------- assets for the two buttons --------------
   Put your PNG/SVGs in /public/ui/ or change these paths.
----------------------------------------------------------*/
const ADD_BTN_SRC = "/ui/add_location_btn.svg";
const EDIT_BTN_SRC = "/ui/edit_location_btn.svg";

/* ----------------- utilities ----------------- */
const km = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const fmtTemp = (t) => (t == null ? "—" : Math.round(t));
const fmtAQI = (n) => (n == null ? "—" : Math.round(n));
const aqiPill = (a) => {
  if (a == null) return "bg-gray-300 text-gray-800";
  if (a <= 50) return "bg-green-500/80 text-green-950";
  if (a <= 100) return "bg-yellow-400/80 text-yellow-950";
  if (a <= 150) return "bg-orange-400/80 text-orange-950";
  if (a <= 200) return "bg-red-400/80 text-red-950";
  if (a <= 300) return "bg-purple-400/80 text-purple-950";
  return "bg-rose-400/80 text-rose-950";
};
// AQI → face PNG
const aqiFace = (a) => {
  if (a == null) return null;
  if (a <= 50) return "aqi_less_than_50.png";
  if (a <= 100) return "aqi_less_than_100.png";
  if (a <= 150) return "aqi_less_than_150.png";
  return null; // add more ranges if you add files
};

/* ----------------- API fetchers ----------------- */
async function fetchWeather(lat, lon, days = 3) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m" +
    "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum" +
    `&forecast_days=${days}&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Weather fetch failed");
  return r.json();
}
async function fetchAQI(lat, lon, days = 3) {
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${lat}&longitude=${lon}` +
    "&current=us_aqi" +
    "&hourly=us_aqi" +
    `&forecast_days=${days}&past_days=1&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("AQI fetch failed");
  return r.json();
}

/* ----------------- FIRMS helpers ----------------- */
function parseFirmsCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const latIdx = headers.indexOf("latitude");
  const lonIdx = headers.indexOf("longitude");
  const dateIdx = headers.indexOf("acq_date");
  const confIdx = headers.indexOf("confidence");
  const frpIdx = headers.indexOf("frp");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = parseFloat(c[latIdx]);
    const lon = parseFloat(c[lonIdx]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      out.push({
        lat,
        lon,
        date: c[dateIdx],
        confidence: c[confIdx],
        frp: frpIdx >= 0 ? parseFloat(c[frpIdx]) : null,
      });
    }
  }
  return out;
}
async function fetchFirmsNorthAmerica() {
  const key = import.meta.env.VITE_FIRMS_API_KEY;
  if (!key) throw new Error("Missing VITE_FIRMS_API_KEY");
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/-170,5,-30,80/1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("FIRMS fetch failed");
  return parseFirmsCSV(await r.text());
}
function countNearbyFires(fires, lat, lon, radiusKm = 500) {
  const here = [lat, lon];
  let n = 0;
  for (const f of fires) if (km(here, [f.lat, f.lon]) <= radiusKm) n++;
  return n;
}

/* ----------------- icon logic ----------------- */
function pickIconAtIndex(w, i) {
  const temp = w.hourly.temperature_2m?.[i] ?? null;
  const cloud = w.hourly.cloud_cover?.[i] ?? 0;
  const precip = w.hourly.precipitation?.[i] ?? 0;
  const wind = w.hourly.wind_speed_10m?.[i] ?? 0;
  const rh = w.hourly.relative_humidity_2m?.[i] ?? 0;
  const hr = new Date(w.hourly.time[i]).getHours();
  const isNight = hr < 6 || hr >= 20;

  if (rh >= 95 && wind < 10 && cloud >= 50) return "haze_fog_dust_smoke.svg";
  if (precip >= 0.3 && temp != null && temp <= 1)
    return "snow_with_cloudy_light.svg";
  if (precip >= 7) return "heavy_rain.svg";
  if (precip >= 0.3)
    return isNight ? "rain_with_cloudy_dark.svg" : "rain_with_cloudy_light.svg";
  if (wind >= 40) return "windy.svg";
  if (cloud >= 80) return "cloudy.svg";
  if (cloud >= 45)
    return isNight ? "partly_cloudy_night.svg" : "partly_cloudy_day.svg";
  return isNight ? "clear_night.svg" : "clear_day.svg";
}
function pickIconForDate(w, dateISO) {
  const indices = w.hourly.time
    .map((t, idx) => ({ t, idx }))
    .filter((o) => o.t.startsWith(dateISO));
  if (!indices.length) return "clear_day.svg";
  // pick hour closest to noon
  const targetHour = 12;
  let best = indices[0].idx;
  let bestDiff = Math.abs(new Date(indices[0].t).getHours() - targetHour);
  for (const it of indices) {
    const h = new Date(it.t).getHours();
    const d = Math.abs(h - targetHour);
    if (d < bestDiff) {
      best = it.idx;
      bestDiff = d;
    }
  }
  return pickIconAtIndex(w, best);
}
function pickCurrentIcon(w) {
  const now = Date.now();
  let best = 0;
  let diff = Infinity;
  for (let i = 0; i < w.hourly.time.length; i++) {
    const d = Math.abs(new Date(w.hourly.time[i]).getTime() - now);
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return pickIconAtIndex(w, best);
}

/* ----------------- small UI atoms ----------------- */
function DayColumn({ label, aqi, icon, hi, lo }) {
  return (
    <div className="flex flex-col items-center gap-2 px-2">
      <div className="text-base font-semibold text-gray-900">{label}</div>

      {/* AQI pill per your UI tweak */}
      <div
        className={`rounded-full px-2 py-1 text-lg font-semibold ${aqiPill(
          aqi
        )}`}
      >
        {fmtAQI(aqi)}
      </div>

      <img src={`/icons/${icon}`} alt="" className="w-9 h-9 mt-1" />

      <div className="flex flex-col items-center leading-tight">
        <div className="text-md font-semibold text-gray-900">
          {fmtTemp(hi)}°
        </div>
        <div className="text-sm text-gray-500">{fmtTemp(lo)}°</div>
      </div>
    </div>
  );
}

function CityCard({
  title,
  subtitle,
  cols,
  currentTemp,
  currentAQI,
  currentIcon,
  nearbyFires,
}) {
  const face = aqiFace(currentAQI);
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 mb-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* 3-day columns */}
        <div className="flex-1 grid grid-cols-3 gap-2">
          {cols.map((c) => (
            <DayColumn key={c.label} {...c} />
          ))}
        </div>

        {/* Now panel with AQI face PNG */}
        <div
          className={`w-32 rounded-xl p-3 flex flex-col gap-2 items-center justify-center bg-gray-50 border border-gray-100 ${aqiPill(
            currentAQI
          )}`}
        >
          <div className="flex flex-row justify-between items-center w-full">
            <img
              src={`/icons/${currentIcon}`}
              alt="now"
              className="w-6 h-6 mb-1"
            />
            <div className="text-xl font-bold text-gray-900">
              {fmtTemp(currentTemp)}°
            </div>
          </div>
          {face && (
            <img
              src={`/aqi/${face}`}
              alt="aqi-status"
              className="w-20 h-20 rounded-md object-cover"
              title={`AQI badge: ${face}`}
            />
          )}
          <div className="flex flex-col items-center">
            <span className={`px-2 py-1 rounded-lg text-lg font-semibold`}>
              {fmtAQI(currentAQI)}{" "}
            </span>
            <span className="text-[10px] text-sm opacity-80">US AQI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- user places helpers -----------------
   If the signed-in user has no saved places, we show defaults.
   This version uses localStorage. Swap for Firestore easily.
----------------------------------------------------------*/
const DEFAULT_PLACES = [
  {
    name: "Downtown, Kamloops",
    subtitle: "British Columbia, Canada",
    lat: 50.6745,
    lon: -120.3273,
  },
  {
    name: "Vancouver",
    subtitle: "British Columbia, Canada",
    lat: 49.2827,
    lon: -123.1207,
  },
  {
    name: "Washington, D.C.",
    subtitle: "United States",
    lat: 38.8951,
    lon: -77.0364,
  },
  { name: "Mexico City", subtitle: "Mexico", lat: 19.4326, lon: -99.1332 },
];

function loadSavedPlaces() {
  try {
    const raw = localStorage.getItem("foreseers_places");
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return null;
}

/* ----------------- main component ----------------- */
function HomeContent({ user }) {
  // When a user signs in: try to load their saved locations.
  // If none exist, we’ll use DEFAULT_PLACES.
  const [places, setPlaces] = useState(
    () => loadSavedPlaces() || DEFAULT_PLACES
  );

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // React to login changes: re-load saved places (or defaults)
  useEffect(() => {
    const saved = loadSavedPlaces();
    setPlaces(saved || DEFAULT_PLACES);
  }, [user?.uid]);

  // Try to replace the first slot (Kamloops) with current GPS
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPlaces((prev) => {
          // Only replace first slot if the user hasn’t explicitly saved custom places.
          const isDefault =
            prev === DEFAULT_PLACES || prev.length === DEFAULT_PLACES.length;
          const copy = [...prev];
          if (isDefault) {
            copy[0] = {
              name: "Your Location",
              subtitle: "Using device GPS",
              lat: latitude,
              lon: longitude,
            };
          }
          return copy;
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const fires = await fetchFirmsNorthAmerica();

        const data = await Promise.all(
          places.map(async (p) => {
            const [w, a] = await Promise.all([
              fetchWeather(p.lat, p.lon, 3),
              fetchAQI(p.lat, p.lon, 3),
            ]);

            // Build 3 vertical "columns": Today + next 2 days
            const cols = [];
            for (let i = 0; i < Math.min(3, w.daily.time.length); i++) {
              const dateISO = w.daily.time[i];
              const label =
                i === 0
                  ? "Today"
                  : new Date(dateISO).toLocaleDateString(undefined, {
                      weekday: "short",
                    });

              // AQI = max hourly AQI of that date
              const aqiIdxs = a.hourly.time
                .map((t, idx) => ({ t, idx }))
                .filter((o) => o.t.startsWith(dateISO));
              const dayMaxAQI = aqiIdxs.length
                ? Math.max(...aqiIdxs.map((o) => a.hourly.us_aqi[o.idx] ?? 0))
                : a.current?.us_aqi ?? null;

              cols.push({
                label,
                aqi: dayMaxAQI,
                icon: pickIconForDate(w, dateISO),
                hi: w.daily.temperature_2m_max[i],
                lo: w.daily.temperature_2m_min[i],
              });
            }

            return {
              title: p.name,
              subtitle: p.subtitle,
              cols,
              currentTemp: w.current?.temperature_2m ?? null,
              currentAQI: a.current?.us_aqi ?? null,
              currentIcon: pickCurrentIcon(w),
              nearbyFires: countNearbyFires(fires, p.lat, p.lon, 500),
            };
          })
        );

        if (!cancelled) setCards(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [places]);

  const body = useMemo(() => {
    if (loading)
      return <div className="text-sm text-gray-500">Loading data…</div>;
    if (err)
      return (
        <div className="text-sm text-red-600">
          Error: {err}. Check your <code>VITE_FIRMS_API_KEY</code>.
        </div>
      );
    return cards.map((c, i) => <CityCard key={i} {...c} />);
  }, [cards, loading, err]);

  return (
    <div className="p-3 mb-10 max-w-xl mx-auto">
      {/* Replace with Mapbox/Globe later */}
      <div className="mb-4 rounded-2xl h-40 bg-[#e8f3e8] border border-green-200 flex items-center justify-center text-sm text-green-700">
        Map / Globe goes here
      </div>

      {/* Top action buttons (they'll become components later) */}
      <div className="flex justify-end items-center gap-3 mb-3">
        <img
          src={ADD_BTN_SRC}
          alt="add location"
          className="h-9 w-auto cursor-pointer"
        />
        <img
          src={EDIT_BTN_SRC}
          alt="edit locations"
          className="h-9 w-auto cursor-pointer"
        />
      </div>

      {body}
    </div>
  );
}

export default HomeContent;
