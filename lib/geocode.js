const NA_COUNTRIES_DEFAULT = new Set(["US", "CA", "MX"]);
const NA_BBOX = { minLon: -170, minLat: 5, maxLon: -30, maxLat: 83 };
const inNABox = (lat, lon) =>
  lon >= NA_BBOX.minLon &&
  lon <= NA_BBOX.maxLon &&
  lat >= NA_BBOX.minLat &&
  lat <= NA_BBOX.maxLat;

export async function geocodeCity(
  query,
  { count = 5, language = "en", northAmericaOnly = true, countries } = {}
) {
  if (!query?.trim()) return [];
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?` +
    new URLSearchParams({
      name: query.trim(),
      count: String(count),
      language,
      format: "json",
    });

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const arr = Array.isArray(data?.results) ? data.results : [];
  const norm = arr.map((r) => ({
    name: r.name,
    subtitle: [r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
    country_code: r.country_code,
    timezone: r.timezone,
  }));
  if (!northAmericaOnly) return norm;

  const whitelist = new Set(
    Array.isArray(countries) && countries.length
      ? countries
      : [...NA_COUNTRIES_DEFAULT]
  );
  return norm.filter((r) =>
    r.country_code ? whitelist.has(r.country_code) : inNABox(r.lat, r.lon)
  );
}
