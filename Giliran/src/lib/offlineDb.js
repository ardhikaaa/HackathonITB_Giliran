// IndexedDB kecil untuk mode offline halaman /meja.
const DB_NAME = "giliran-offline";
const DB_VERSION = 1;
const STORE_SNAPSHOT = "snapshot";
const STORE_QUEUE = "queue";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Penyimpanan lokal tidak tersedia di peramban ini."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) db.createObjectStore(STORE_SNAPSHOT, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "client_event_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = run(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result?.__request ? result.__request.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveSnapshot(key, payload) {
  return withStore(STORE_SNAPSHOT, "readwrite", (store) =>
    store.put({ key, saved_at: new Date().toISOString(), ...payload }),
  );
}

export async function readSnapshot(key) {
  return withStore(STORE_SNAPSHOT, "readonly", (store) => {
    const request = store.get(key);
    return { __request: request };
  });
}

export async function clearSnapshot(key) {
  return withStore(STORE_SNAPSHOT, "readwrite", (store) => store.delete(key));
}

export async function addQueuedEvent(event) {
  return withStore(STORE_QUEUE, "readwrite", (store) => store.put(event));
}

export async function listQueuedEvents() {
  return withStore(STORE_QUEUE, "readonly", (store) => {
    const request = store.getAll();
    return { __request: request };
  });
}

export async function removeQueuedEvent(clientEventId) {
  return withStore(STORE_QUEUE, "readwrite", (store) => store.delete(clientEventId));
}

export async function clearQueue() {
  return withStore(STORE_QUEUE, "readwrite", (store) => store.clear());
}

export async function requestPersistentStorage() {
  try {
    if (navigator?.storage?.persist) return await navigator.storage.persist();
  } catch {
    return false;
  }
  return false;
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(String(token).trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}