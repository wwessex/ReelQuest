// storage.js — IndexedDB-backed storage with localStorage fallback (ES module)

const DB_NAME = "cinesafari-db";
const DB_VERSION = 1;
const STORE = "kv";

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    } catch (e) {
      reject(e);
    }
  });

  return _dbPromise;
}

export async function getItem(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try { return localStorage.getItem(key); } catch { return null; }
  }
}

export async function setItem(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch {
    try { localStorage.setItem(key, String(value)); return true; } catch { return false; }
  }
}

export async function removeItem(key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }
}

export async function getJSON(key) {
  const raw = await getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setJSON(key, obj) {
  return await setItem(key, JSON.stringify(obj));
}

export async function migrateFromLocalStorage(key) {
  try {
    const ls = localStorage.getItem(key);
    if (!ls) return false;
    const existing = await getItem(key);
    if (existing) return false;
    await setItem(key, ls);
    return true;
  } catch {
    return false;
  }
}
