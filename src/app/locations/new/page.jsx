// src/app/locations/new/page.jsx  (or wherever your NewLocationPage lives)
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { geocodeCity } from "@/lib/geocode";
import { addPlaceDB } from "@/lib/placesStore";
import { db } from "@/src/Firebase/firebase.init";
import { AuthContext } from "@/src/Provider/AuthProvider";

export default function NewLocationPage() {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

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

    // If auth still initializing, do nothing yet
    if (authLoading) return;

    // If not signed in, send them to signin and preserve return URL
    if (!user?.uid) {
      navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }

    await addPlaceDB(db, user.uid, selected);
    navigate("/locations/manage");
  };

  const canSave = !!selected && !authLoading && !!user?.uid;

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a North America location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {/* If not signed in, nudge them */}
            {!authLoading && !user?.uid && (
              <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 text-sm mb-2">
                You’re not signed in. You can search, but you’ll need to sign in
                to save.
              </div>
            )}

            <div>
              <Label className="mb-2">City</Label>
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
              <Button type="submit" disabled={!canSave}>
                {user?.uid ? "Save" : "Sign in to save"}
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
