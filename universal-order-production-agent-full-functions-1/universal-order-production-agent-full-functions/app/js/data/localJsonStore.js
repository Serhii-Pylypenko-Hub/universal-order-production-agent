import fs from "fs";
import path from "path";

export class LocalJsonStore {
  constructor(filePath = "./data/local_workspace.json") {
    this.filePath = filePath;
    this.data = {};
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    }
    return this.data;
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getSheetNames() {
    return Object.keys(this.data);
  }

  ensureSheet(name, columns = []) {
    if (!this.data[name]) {
      this.data[name] = { columns, rows: [] };
    }
    for (const col of columns) {
      if (!this.data[name].columns.includes(col)) {
        this.data[name].columns.push(col);
      }
    }
    this.save();
  }

  getRows(sheetName) {
    this.ensureSheet(sheetName, []);
    return this.data[sheetName].rows;
  }

  appendRow(sheetName, row) {
    this.ensureSheet(sheetName, Object.keys(row));
    this.data[sheetName].rows.push(row);
    this.save();
    return row;
  }

  updateRow(sheetName, idField, idValue, patch) {
    const rows = this.getRows(sheetName);
    const row = rows.find(r => r[idField] === idValue);
    if (!row) return null;
    Object.assign(row, patch);
    this.save();
    return row;
  }

  findRows(sheetName, predicate) {
    return this.getRows(sheetName).filter(predicate);
  }

  findOne(sheetName, predicate) {
    return this.getRows(sheetName).find(predicate) || null;
  }
}
