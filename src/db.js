const DB_NAME = "niou-live-memory-archive";
const DB_VERSION = 1;

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("concerts")) {
        const concerts = db.createObjectStore("concerts", { keyPath: "id" });
        concerts.createIndex("date", "date");
        concerts.createIndex("project", "project");
      }
      if (!db.objectStoreNames.contains("media")) {
        const media = db.createObjectStore("media", { keyPath: "id" });
        media.createIndex("concertId", "concertId");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(name, mode, fn) {
  const db = await openDb();
  const tx = db.transaction(name, mode);
  const store = tx.objectStore(name);
  const completion = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const result = await fn(store, tx);
  await completion;
  return result;
}

export async function getAllConcerts() {
  return withStore("concerts", "readonly", async (store) => {
    const rows = await requestToPromise(store.getAll());
    return rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  });
}

export async function getConcert(id) {
  return withStore("concerts", "readonly", (store) => requestToPromise(store.get(id)));
}

export async function saveConcert(concert) {
  const now = new Date().toISOString();
  const row = {
    ...concert,
    id: concert.id || crypto.randomUUID(),
    updatedAt: now,
    createdAt: concert.createdAt || now,
  };
  await withStore("concerts", "readwrite", (store) => requestToPromise(store.put(row)));
  return row;
}

export async function deleteConcert(id) {
  const media = await getMediaByConcert(id);
  await withStore("media", "readwrite", async (store) => {
    await Promise.all(media.map((item) => requestToPromise(store.delete(item.id))));
  });
  await withStore("concerts", "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function getMediaByConcert(concertId) {
  return withStore("media", "readonly", (store) => {
    const index = store.index("concertId");
    return requestToPromise(index.getAll(concertId));
  });
}

export async function getAllMedia() {
  return withStore("media", "readonly", (store) => requestToPromise(store.getAll()));
}

export async function getMedia(id) {
  if (!id) return undefined;
  return withStore("media", "readonly", (store) => requestToPromise(store.get(id)));
}

export async function saveMedia(media) {
  const now = new Date().toISOString();
  const row = {
    ...media,
    id: media.id || crypto.randomUUID(),
    createdAt: media.createdAt || now,
    updatedAt: now,
  };
  await withStore("media", "readwrite", (store) => requestToPromise(store.put(row)));
  return row;
}

export async function deleteMedia(id) {
  await withStore("media", "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function getSetting(key, fallback) {
  const row = await withStore("settings", "readonly", (store) => requestToPromise(store.get(key)));
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await withStore("settings", "readwrite", (store) => requestToPromise(store.put({ key, value })));
}

export async function clearAllData() {
  const db = await openDb();
  const tx = db.transaction(["concerts", "media"], "readwrite");
  tx.objectStore("concerts").clear();
  tx.objectStore("media").clear();
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function importBackup(payload, mode = "merge") {
  if (mode === "replace") {
    await clearAllData();
  }

  const concerts = Array.isArray(payload.concerts) ? payload.concerts : [];
  const media = Array.isArray(payload.media) ? payload.media : [];

  await withStore("concerts", "readwrite", (store) => {
    for (const concert of concerts) {
      store.put(concert);
    }
  });

  const normalizedMedia = await Promise.all(
    media.map(async (item) => {
      let blob = item.blob;
      if (!blob && item.dataUrl) {
        blob = await dataUrlToBlob(item.dataUrl);
      }
      return { ...item, blob };
    }),
  );

  await withStore("media", "readwrite", (store) => {
    normalizedMedia.forEach((item) => store.put(item));
  });
}

export async function exportBackup(includeMedia = false) {
  const concerts = await getAllConcerts();
  const media = await getAllMedia();
  const backup = {
    app: "niou-live-memory-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    includesMedia: includeMedia,
    concerts,
    media: [],
  };

  if (includeMedia) {
    backup.media = await Promise.all(
      media.map(async (item) => {
        const dataUrl = item.blob ? await blobToDataUrl(item.blob) : item.dataUrl || "";
        const { blob, ...rest } = item;
        return { ...rest, dataUrl };
      }),
    );
  } else {
    backup.media = media.map(({ blob, ...rest }) => rest);
  }

  return backup;
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}
