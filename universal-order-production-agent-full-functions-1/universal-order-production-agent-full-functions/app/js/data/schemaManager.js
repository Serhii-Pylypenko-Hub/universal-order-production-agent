import fs from "fs";

export function loadSchema(path = "./schemas/sheets_schema.json") {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

export function ensureSchema(store, schema) {
  for (const [sheetName, columns] of Object.entries(schema.sheets)) {
    store.ensureSheet(sheetName, columns);
  }
}
