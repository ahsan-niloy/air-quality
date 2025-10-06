import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { geocodeCity } from "@/lib/geocode";
import { db } from "@/src/Firebase/firebase.init";
import { AuthContext } from "@/src/Provider/AuthProvider";

import {
  loadPlacesDB,
  updatePlaceDB,
  deletePlaceDB,
  addPlaceDB,
} from "@/lib/placesStore";

/** Pass the signed-in user down or get from your auth context */
export default function ManageLocationsPage() {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]); // [{id?, name, subtitle, lat, lon}]
  const [initial, setInitial] = useState([]); // snapshot for comparison if needed
  const [searchIdx, setSearchIdx] = useState(null); // active row index for geocoding
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const debounce = useRef();

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      const data = await loadPlacesDB(db, user.uid);
      setPlaces(data);
      setInitial(data);
    })();
  }, [user?.uid]);

  // Debounced NA-only geocoding for the active row
  useEffect(() => {
    clearTimeout(debounce.current);
    if (searchIdx == null || !query.trim()) {
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
  }, [query, searchIdx]);

  const updateField = (i, key, val) => {
    setPlaces((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: val };
      return copy;
    });
  };

  const startSearch = (i) => {
    setSearchIdx(i);
    setQuery("");
    setResults([]);
  };

  const pickForRow = (i, r) => {
    setPlaces((prev) => {
      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        name: r.name,
        subtitle: r.subtitle,
        lat: r.lat,
        lon: r.lon,
      };
      return copy;
    });
    setSearchIdx(null);
    setQuery("");
    setResults([]);
  };

  const removeRow = async (i) => {
    const p = places[i];
    setPlaces((prev) => prev.filter((_, idx) => idx !== i));
    if (p.id) await deletePlaceDB(db, user.uid, p.id);
  };

  const saveAll = async () => {
    if (!user?.uid) {
      alert("Please sign in to save locations.");
      return;
    }
    // Validate coords
    const invalid = places.some(
      (p) =>
        typeof p.lat !== "number" ||
        typeof p.lon !== "number" ||
        Number.isNaN(p.lat) ||
        Number.isNaN(p.lon)
    );
    if (invalid) {
      alert("Please select a valid city for all edited rows.");
      return;
    }

    // Persist: upsert existing, add new
    const tasks = [];
    for (const p of places) {
      if (p.id) tasks.push(updatePlaceDB(db, user.uid, p));
      else tasks.push(addPlaceDB(db, user.uid, p));
    }
    await Promise.all(tasks);
    navigate("/"); // back to home
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Manage locations</CardTitle>
          <Button onClick={() => navigate("/locations/new")}>Add new</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {places.length === 0 && (
            <div className="text-sm text-gray-500">No saved locations yet.</div>
          )}

          {places.map((p, i) => (
            <div
              key={p.id || `${p.name}-${i}`}
              className="rounded-xl border p-3 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input
                    value={p.subtitle ?? ""}
                    onChange={(e) => updateField(i, "subtitle", e.target.value)}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Coordinates:{" "}
                <span className="font-mono">
                  {p.lat}, {p.lon}
                </span>
              </div>

              {/* Change city picker */}
              {searchIdx === i ? (
                <div className="space-y-2">
                  <Label>Search city</Label>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Start typing a city…"
                    autoFocus
                  />
                  {results.length > 0 && (
                    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                      {results.map((r, idx) => (
                        <button
                          type="button"
                          key={`${r.name}-${r.lat}-${r.lon}-${idx}`}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50"
                          onClick={() => pickForRow(i, r)}
                        >
                          <div className="text-sm font-medium">{r.name}</div>
                          <div className="text-xs text-gray-500">
                            {r.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {busy && (
                    <div className="text-xs text-gray-500">Searching…</div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setSearchIdx(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => startSearch(i)}>
                    Change city
                  </Button>
                  <Button variant="destructive" onClick={() => removeRow(i)}>
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={saveAll}>Save changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
