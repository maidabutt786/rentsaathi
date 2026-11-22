const PREFIX = "rentsaathi.demo.v1.";

const storageKey = (key) => `${PREFIX}${key}`;

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function read(key) {
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Storage can be full or disabled (private mode). The app keeps working in memory.
  }
}

/** Read a demo collection, seeding localStorage on first access. */
export function getDemoCollection(key, seed) {
  const stored = read(key);
  if (stored !== null) return stored;
  const initial = clone(seed);
  write(key, initial);
  return initial;
}

export function setDemoCollection(key, value) {
  write(key, value);
  return value;
}

export function addDemoItem(key, seed, item) {
  const items = getDemoCollection(key, seed);
  const list = Array.isArray(items) ? items : [];
  const next = [...list, clone(item)];
  setDemoCollection(key, next);
  return item;
}

function matches(candidate, target) {
  if (typeof target === "function") return target(candidate);
  return candidate?.id === target || candidate?.uid === target;
}

export function updateDemoItem(key, seed, target, changes) {
  const items = getDemoCollection(key, seed);
  if (Array.isArray(items)) {
    const next = items.map((item) => (matches(item, target) ? { ...item, ...clone(changes) } : item));
    setDemoCollection(key, next);
    return next.find((item) => matches(item, target)) || null;
  }
  if (items && typeof items === "object") {
    const next = { ...items, ...clone(changes) };
    setDemoCollection(key, next);
    return next;
  }
  return null;
}

export function removeDemoItem(key, seed, target) {
  const items = getDemoCollection(key, seed);
  if (!Array.isArray(items)) return;
  setDemoCollection(key, items.filter((item) => !matches(item, target)));
}

export function demoId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/** Clear every demo key. Useful from the browser console: clearDemoStore(). */
export function clearDemoStore() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
}
