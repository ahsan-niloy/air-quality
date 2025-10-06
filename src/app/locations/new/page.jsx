import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { geocodeCity } from "@/lib/geocode";
import { addPlaceDB } from "@/lib/placesStore";
import { db } from "@/src/Firebase/firebase.init";

/** Pass the signed-in user down or get from your auth context */
export default function NewLocationPage({ user }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounce = useRef();

  // Debounced NA-only geocoding
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        setBusy(true);
        const res = await geocodeCity(query, {
          count: 6,
          northAmericaOnly: true,
        });
        setResults(res);
      } catch (e) {
        console.error(e);
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const useGPS = () => {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelected({
          name: "Your Location",
          subtitle: "Using device GPS",
          lat: Number(coords.latitude.toFixed(6)),
          lon: Number(coords.longitude.toFixed(6)),
        });
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onPick = (r) => {
    setSelected(r);
    setQuery(`${r.name}, ${r.subtitle}`);
    setResults([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!user?.uid) {
      alert("Please sign in to save locations.");
      return;
    }
    await addPlaceDB(db, user.uid, selected);
    navigate("/locations/manage");
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>City</Label>
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Kamloops, Vancouver, Washington, Mexico City…"
                autoFocus
              />
              {results.length > 0 && (
                <div className="mt-2 rounded-xl border bg-white shadow-sm overflow-hidden">
                  {results.map((r, idx) => (
                    <button
                      key={`${r.name}-${r.lat}-${r.lon}-${idx}`}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50"
                      onClick={() => onPick(r)}
                    >
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
              {busy && (
                <div className="text-xs text-gray-500 mt-1">Searching…</div>
              )}
            </div>

            {selected && (
              <div className="text-xs text-gray-600">
                Selected: <span className="font-medium">{selected.name}</span>{" "}
                <span>({selected.subtitle})</span>{" "}
                <span className="opacity-80">
                  [{selected.lat}, {selected.lon}]
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={useGPS}
                disabled={busy}
              >
                {busy ? "Working…" : "Use current location"}
              </Button>
              <Button type="submit" disabled={!selected}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
