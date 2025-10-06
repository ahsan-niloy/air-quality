// src/components/HomeContent.jsx
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddLocationImageButton from "@/src/components/AddLocationImageButton";
import EditLocationsImageButton from "@/src/components/EditLocationsImageButton";
import { db } from "@/src/Firebase/firebase.init";
import { loadPlacesDB } from "@/lib/placesStore";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/src/Provider/AuthProvider";
import HeatMap from "@/src/pages/HeatMap";

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
// AQI → face PNG (optional)
const aqiFace = (a) => {
  if (a == null) return null;
  if (a <= 50) return "aqi_less_than_50.png";
  if (a <= 100) return "aqi_less_than_100.png";
  if (a <= 150) return "aqi_less_than_150.png";
  return null;
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

/* ----------------- FIRMS helpers (soft-fail) ----------------- */
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
}) {
  const face = aqiFace(currentAQI);
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 mb-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 grid grid-cols-3 gap-2">
          {cols.map((c) => (
            <DayColumn key={c.label} {...c} />
          ))}
        </div>

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
            <span className="px-2 py-1 rounded-lg text-lg font-semibold">
              {fmtAQI(currentAQI)}{" "}
            </span>
            <span className="text-[10px] text-sm opacity-80">US AQI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- user places ----------------- */
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

/* ----------------- main component ----------------- */
export default function HomeContent() {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [cards, setCards] = useState([]);
  const [dataLoading, setDataLoading] = useState(true); // <-- separate from auth loading
  const [err, setErr] = useState(null);

  // compute a stable key for fetch dependency (prevents loops)
  const fetchKey = useMemo(
    () =>
      places
        .map((p) => `${Number(p.lat).toFixed(3)},${Number(p.lon).toFixed(3)}`)
        .join("|"),
    [places]
  );
  const lastFetchKey = useRef(null);

  // Load places from Firestore when user changes; fall back to defaults if none
  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) return;

    (async () => {
      if (!user?.uid) {
        setPlaces(DEFAULT_PLACES);
        return;
      }
      try {
        const fromDB = await loadPlacesDB(db, user.uid); // [{id,name,subtitle,lat,lon}]
        setPlaces(fromDB.length ? fromDB : DEFAULT_PLACES);
      } catch (e) {
        console.error("loadPlacesDB failed:", e);
        setPlaces(DEFAULT_PLACES);
      }
    })();
  }, [user?.uid, authLoading]);

  // If using defaults, replace first slot with GPS once
  const gpsReplaced = useRef(false);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const usingDefaults = places.every((p) => !("id" in p));
    if (!usingDefaults || gpsReplaced.current) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        gpsReplaced.current = true;
        setPlaces((prev) => {
          const copy = [...prev];
          copy[0] = {
            name: "Your Location",
            subtitle: "Using device GPS",
            lat: coords.latitude,
            lon: coords.longitude,
          };
          return copy;
        });
      },
      () => {
        gpsReplaced.current = true;
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [places]);

  // Fetch data for all places (guarded, soft-fail FIRMS)
  useEffect(() => {
    // prevent duplicate fetches (StrictMode + re-renders)
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    let cancelled = false;

    (async () => {
      setDataLoading(true);
      setErr(null);
      try {
        // FIRMS: soft-fail
        let fires = [];
        try {
          fires = await fetchFirmsNorthAmerica();
        } catch (_e) {
          // ignore FIRMS failure
        }

        const data = await Promise.all(
          places.map(async (p) => {
            const [w, a] = await Promise.all([
              fetchWeather(p.lat, p.lon, 3),
              fetchAQI(p.lat, p.lon, 3),
            ]);

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

            // If you want fires count in UI later:
            // const nearbyFires = Array.isArray(fires) ? countNearbyFires(fires, p.lat, p.lon, 500) : 0;

            return {
              title: p.name,
              subtitle: p.subtitle,
              cols,
              currentTemp: w.current?.temperature_2m ?? null,
              currentAQI: a.current?.us_aqi ?? null,
              currentIcon: pickCurrentIcon(w),
            };
          })
        );

        if (!cancelled) setCards(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const body = useMemo(() => {
    if (authLoading)
      return <div className="text-sm text-gray-500">Initializing…</div>;
    if (dataLoading)
      return <div className="text-sm text-gray-500">Loading data…</div>;
    if (err) return <div className="text-sm text-red-600">Error: {err}.</div>;
    return cards.map((c, i) => <CityCard key={i} {...c} />);
  }, [cards, authLoading, dataLoading, err]);

  return (
    <div className="p-3 mb-10 max-w-xl mx-auto">
      <div className="mb-4">
        <HeatMap heightClass="h-40" showStatus={false} />
      </div>
      {/* Top action: show Add/Edit if signed in, otherwise a Sign in button */}
      <div className="flex justify-end items-center gap-3 mb-3">
        {user?.uid ? (
          <>
            <AddLocationImageButton />
            <EditLocationsImageButton />
          </>
        ) : (
          <div>
            <span>To add your favorite locations: </span>
            <Button
              onClick={() => navigate("/signin")}
              className="rounded-full"
            >
              Sign in
            </Button>
          </div>
        )}
      </div>

      {body}
    </div>
  );
}
