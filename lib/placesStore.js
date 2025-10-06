import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

/** Load all places for a user -> [{id, name, subtitle, lat, lon}] */
export async function loadPlacesDB(db, uid) {
  const col = collection(db, `users/${uid}/places`);
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Add a single place -> returns new doc id */
export async function addPlaceDB(db, uid, place) {
  const col = collection(db, `users/${uid}/places`);
  const ref = await addDoc(col, {
    name: place.name,
    subtitle: place.subtitle || "",
    lat: place.lat,
    lon: place.lon,
  });
  return ref.id;
}

/** Upsert/update a place by id */
export async function updatePlaceDB(db, uid, place) {
  if (!place.id) throw new Error("updatePlaceDB: missing place.id");
  const ref = doc(db, `users/${uid}/places/${place.id}`);
  await setDoc(
    ref,
    {
      name: place.name,
      subtitle: place.subtitle || "",
      lat: place.lat,
      lon: place.lon,
    },
    { merge: true }
  );
}

/** Delete a place by id */
export async function deletePlaceDB(db, uid, id) {
  const ref = doc(db, `users/${uid}/places/${id}`);
  await deleteDoc(ref);
}

/** Save many: add new (no id), update existing (has id), delete removed */
export async function saveManyPlacesDB(db, uid, nextPlaces, prevPlaces) {
  const nextById = new Map(
    nextPlaces.filter((p) => p.id).map((p) => [p.id, p])
  );
  const prevById = new Map(
    (prevPlaces || []).filter((p) => p.id).map((p) => [p.id, p])
  );

  // updates
  const updates = [];
  nextById.forEach((p) => updates.push(updatePlaceDB(db, uid, p)));

  // adds (no id)
  const adds = nextPlaces
    .filter((p) => !p.id)
    .map((p) => addPlaceDB(db, uid, p));

  // deletes (present before, missing now)
  const deletes = [];
  prevById.forEach((_, id) => {
    if (!nextById.has(id)) deletes.push(deletePlaceDB(db, uid, id));
  });

  await Promise.all([...updates, ...adds, ...deletes]);
}
