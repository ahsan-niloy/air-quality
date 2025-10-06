// src/components/HomeContent.jsx
import { useEffect, useMemo, useState } from "react";

// ---------- Helpers ----------
const km = (a, b) => {
  // haversine distance in km between [lat, lon] pairs
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

const fmtTemp = (t) => (t === undefined || t === null ? "—" : Math.round(t));
const fmtAQI = (n) => (n === undefined || n === null ? "—" : Math.round(n));
const aqiClass = (a) => {
  if (a === null || a === undefined) return "bg-gray-300 text-gray-800";
  if (a <= 50) return "bg-green-200 text-green-900";
  if (a <= 100) return "bg-yellow-200 text-yellow-900";
  if (a <= 150) return "bg-orange-200 text-orange-900";
  if (a <= 200) return "bg-red-200 text-red-900";
  if (a <= 300) return "bg-purple-200 text-purple-900";
  return "bg-rose-200 text-rose-900";
};

// ---------- API fetchers ----------
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

// Very lightweight CSV parser for FIRMS (no external deps)
function parseFirmsCSV(text) {
  // FIRMS VIIRS columns (abbrev): latitude,longitude,acq_date,acq_time,confidence,frp,...
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const latIdx = headers.indexOf("latitude");
  const lonIdx = headers.indexOf("longitude");
  const dateIdx = headers.indexOf("acq_date");
  const confIdx = headers.indexOf("confidence"); // may be number or string
  const frpIdx = headers.indexOf("frp");

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const lat = parseFloat(cols[latIdx]);
    const lon = parseFloat(cols[lonIdx]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    out.push({
      lat,
      lon,
      date: cols[dateIdx],
      confidence: cols[confIdx],
      frp: frpIdx >= 0 ? parseFloat(cols[frpIdx]) : null,
    });
  }
  return out;
}

async function fetchFirmsNorthAmerica() {
  const key = import.meta.env.VITE_FIRMS_API_KEY;
  if (!key) throw new Error("Missing VITE_FIRMS_API_KEY");
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/-170,5,-30,80/1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("FIRMS fetch failed");
  const txt = await r.text();
  return parseFirmsCSV(txt);
}

// Count hotspots within radiusKm of [lat, lon]
function countNearbyFires(fires, lat, lon, radiusKm = 100) {
  const here = [lat, lon];
  let n = 0;
  for (const f of fires) {
    if (km(here, [f.lat, f.lon]) <= radiusKm) n++;
  }
  return n;
}

// ---------- UI bits ----------
function DayChip({ label, hi, lo, aqi }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs w-10 font-medium text-gray-600">{label}</div>
      <div className="text-xs text-gray-700">H {fmtTemp(hi)}°</div>
      <div className="text-xs text-gray-500">L {fmtTemp(lo)}°</div>
      <div
        className={`text-xs px-2 py-0.5 rounded-full ml-2 ${aqiClass(aqi)}`}
        title="US AQI (daily hour max)"
      >
        {fmtAQI(aqi)}
      </div>
    </div>
  );
}

function CityCard({
  title,
  subtitle,
  currentTemp,
  currentAQI,
  days,
  nearbyFires,
}) {
  return (
    <div className="flex items-stretch gap-3 w-full rounded-2xl p-3 bg-white shadow-sm border border-gray-100 mb-3">
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <div className="text-xs text-gray-500 mb-3">{subtitle}</div>

        <div className="flex flex-col gap-1">
          {days.map((d) => (
            <DayChip key={d.label} {...d} />
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          🔥 Nearby hotspots (≤100 km):{" "}
          <span className="font-semibold">{nearbyFires}</span>
        </div>
      </div>

      <div className="w-28 rounded-xl p-3 flex flex-col items-center justify-center bg-gray-50 border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Now</div>
        <div className="text-3xl font-bold text-gray-800">
          {fmtTemp(currentTemp)}°
        </div>
        <div
          className={`mt-2 px-2 py-1 rounded-lg text-sm ${aqiClass(
            currentAQI
          )}`}
        >
          {fmtAQI(currentAQI)}{" "}
          <span className="text-[10px] opacity-80">US AQI</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
function HomeContent() {
  // You can expand this list; the first item will be replaced by user geolocation if granted.
  const [places, setPlaces] = useState([
    {
      name: "Downtown, Kamloops",
      subtitle: "British Columbia, Canada",
      lat: 50.6745,
      lon: -120.3273,
    },
    {
      name: "Washington, D.C.",
      subtitle: "United States",
      lat: 38.8951,
      lon: -77.0364,
    },
  ]);

  const [firms, setFirms] = useState(null);
  const [cards, setCards] = useState([]); // assembled data for UI
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Try to use browser geolocation to replace the first card location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPlaces((prev) => {
          const copy = [...prev];
          copy[0] = {
            name: "Your Location",
            subtitle: "Using device GPS",
            lat: latitude,
            lon: longitude,
          };
          return copy;
        });
      },
      () => {
        // ignore; keep defaults
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Fetch everything
  useEffect(() => {
    let cancelled = false;
    async function go() {
      setLoading(true);
      setErr(null);
      try {
        // 1) FIRMS once for the region
        const firmsData = await fetchFirmsNorthAmerica();
        if (cancelled) return;
        setFirms(firmsData);

        // 2) For each place, get weather + AQI
        const results = await Promise.all(
          places.map(async (p) => {
            const [w, a] = await Promise.all([
              fetchWeather(p.lat, p.lon, 3),
              fetchAQI(p.lat, p.lon, 3),
            ]);
            // Build 3 small day rows using daily temps and the day’s max hourly AQI
            const days = [];
            for (let i = 0; i < Math.min(3, w.daily.time.length); i++) {
              const dayLabel =
                i === 0
                  ? "Today"
                  : i === 1
                  ? "Mon Tue Wed Thu Fri Sat Sun".split(" ")[
                      new Date(w.daily.time[i]).getDay() - 1
                    ] ?? "Day"
                  : new Date(w.daily.time[i]).toLocaleDateString(undefined, {
                      weekday: "short",
                    });

              // slice hourly AQI for that date to get the max
              const dayISO = w.daily.time[i];
              const aqiIndices = a.hourly.time
                .map((t, idx) => ({ t, idx }))
                .filter((o) => o.t.startsWith(dayISO));
              const dayMaxAQI =
                aqiIndices.length > 0
                  ? Math.max(
                      ...aqiIndices.map((o) => a.hourly.us_aqi[o.idx] ?? 0)
                    )
                  : a.current?.us_aqi ?? null;

              days.push({
                label:
                  i === 0
                    ? "Today"
                    : new Date(dayISO).toLocaleDateString(undefined, {
                        weekday: "short",
                      }),
                hi: w.daily.temperature_2m_max[i],
                lo: w.daily.temperature_2m_min[i],
                aqi: dayMaxAQI,
              });
            }

            const nearby = firmsData
              ? countNearbyFires(firmsData, p.lat, p.lon, 100)
              : 0;

            return {
              title: p.name,
              subtitle: p.subtitle,
              currentTemp: w.current?.temperature_2m ?? null,
              currentAQI: a.current?.us_aqi ?? null,
              days,
              nearbyFires: nearby,
            };
          })
        );
        if (cancelled) return;
        setCards(results);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    go();
    return () => {
      cancelled = true;
    };
    // Re-run when place coordinates change
  }, [places]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="text-sm text-gray-500">
          Loading forecast, air quality and fire hotspots…
        </div>
      );
    }
    if (err) {
      return (
        <div className="text-sm text-red-600">
          Something went wrong: {err}. Make sure your{" "}
          <code>VITE_FIRMS_API_KEY</code> is set.
        </div>
      );
    }
    return cards.map((c, i) => (
      <CityCard
        key={i}
        title={c.title}
        subtitle={c.subtitle}
        currentTemp={c.currentTemp}
        currentAQI={c.currentAQI}
        days={c.days}
        nearbyFires={c.nearbyFires}
      />
    ));
  }, [cards, loading, err]);

  return (
    <div className="p-3">
      {/* Map placeholder – replace with your Mapbox/Globe component later */}
      <div className="mb-4 rounded-2xl h-40 bg-[#e8f3e8] border border-green-200 flex items-center justify-center text-sm text-green-700">
        Map / Globe goes here
      </div>

      {content}
    </div>
  );
}

export default HomeContent;
