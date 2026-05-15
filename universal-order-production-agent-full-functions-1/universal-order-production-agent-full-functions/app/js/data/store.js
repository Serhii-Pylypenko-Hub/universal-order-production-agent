import { LocalJsonStore } from "./localJsonStore.js";
import { GoogleSheetsStore, loadGoogleCredentials } from "./googleSheetsStore.js";

let store = null;

// Synchronous getter — requires initStore() to have been called first when using Google Sheets.
// For LocalJsonStore (no GOOGLE_SHEETS_ID), lazy-init still works.
export function getStore() {
  if (!store) {
    if (process.env.GOOGLE_SHEETS_ID) {
      throw new Error("Google Sheets store not initialized. Call await initStore() at application startup.");
    }
    store = new LocalJsonStore(process.env.LOCAL_DATA_PATH || "./data/local_workspace.json");
    store.load();
  }
  return store;
}

// Must be awaited at application startup when GOOGLE_SHEETS_ID is set.
export async function initStore() {
  if (store) return store;

  if (process.env.GOOGLE_SHEETS_ID) {
    const creds = loadGoogleCredentials();
    const gs = new GoogleSheetsStore(process.env.GOOGLE_SHEETS_ID, creds);
    await gs.init();
    store = gs;
  } else {
    store = new LocalJsonStore(process.env.LOCAL_DATA_PATH || "./data/local_workspace.json");
    store.load();
  }
  return store;
}

export function resetStore() {
  store = null;
}
