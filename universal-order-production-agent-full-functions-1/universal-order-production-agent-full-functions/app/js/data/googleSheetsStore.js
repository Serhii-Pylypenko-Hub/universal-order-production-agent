import crypto from "crypto";
import https from "https";
import fs from "fs";

// --- JWT / OAuth2 helpers ---

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function makeJwt(clientEmail, privateKey, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  })));
  const signing = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signing);
  const sig = sign.sign(privateKey, "base64url");
  return `${signing}.${sig}`;
}

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers }
    };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: "GET", headers };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on("error", reject);
    req.end();
  });
}

function httpsPut(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "PUT",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers }
    };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// --- Google Sheets Store ---

export class GoogleSheetsStore {
  constructor(spreadsheetId, credentials) {
    this.spreadsheetId = spreadsheetId;
    this.credentials = credentials; // { client_email, private_key }
    this.data = {};                  // in-memory cache (same shape as LocalJsonStore)
    this._accessToken = null;
    this._tokenExpiry = 0;
    this._writeQueue = Promise.resolve(); // sequential write queue
  }

  async _getToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry) return this._accessToken;
    const jwt = makeJwt(
      this.credentials.client_email,
      this.credentials.private_key,
      "https://www.googleapis.com/auth/spreadsheets"
    );
    const res = await httpsPost(
      "https://oauth2.googleapis.com/token",
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
      { "Content-Type": "application/x-www-form-urlencoded" }
    );
    this._accessToken = res.access_token;
    this._tokenExpiry = Date.now() + (res.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _authHeader() {
    return { Authorization: `Bearer ${await this._getToken()}` };
  }

  // Load all sheets from Google Sheets into in-memory cache
  async init() {
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}`;
    const auth = await this._authHeader();

    const meta = await httpsGet(`${base}?fields=sheets.properties`, auth);
    if (!meta.sheets) throw new Error(`GoogleSheets init failed: ${JSON.stringify(meta)}`);

    for (const { properties } of meta.sheets) {
      const name = properties.title;
      const values = await httpsGet(
        `${base}/values/${encodeURIComponent(name)}!A:ZZ`,
        auth
      );
      if (!values.values || values.values.length === 0) {
        this.data[name] = { columns: [], rows: [] };
        continue;
      }
      const [headers, ...dataRows] = values.values;
      this.data[name] = {
        columns: headers,
        rows: dataRows.map(r => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ""; });
          return obj;
        })
      };
    }
  }

  getSheetNames() {
    return Object.keys(this.data);
  }

  ensureSheet(name, columns = []) {
    if (!this.data[name]) {
      this.data[name] = { columns: [...columns], rows: [] };
      this._enqueueCreateSheet(name, columns);
    } else {
      const existing = this.data[name].columns;
      const newCols = columns.filter(c => !existing.includes(c));
      if (newCols.length) {
        this.data[name].columns.push(...newCols);
      }
    }
  }

  getRows(sheetName) {
    this.ensureSheet(sheetName, []);
    return this.data[sheetName].rows;
  }

  appendRow(sheetName, row) {
    this.ensureSheet(sheetName, Object.keys(row));
    this.data[sheetName].rows.push(row);
    this._enqueueAppend(sheetName, row);
    return row;
  }

  updateRow(sheetName, idField, idValue, patch) {
    const rows = this.getRows(sheetName);
    const rowIdx = rows.findIndex(r => r[idField] === idValue);
    if (rowIdx === -1) return null;
    Object.assign(rows[rowIdx], patch);
    this._enqueueUpdate(sheetName, rowIdx, rows[rowIdx]);
    return rows[rowIdx];
  }

  findRows(sheetName, predicate) {
    return this.getRows(sheetName).filter(predicate);
  }

  findOne(sheetName, predicate) {
    return this.getRows(sheetName).find(predicate) || null;
  }

  // Background write queue — failures are logged to FailedOperations via retryService
  _enqueueAppend(sheetName, row) {
    this._writeQueue = this._writeQueue.then(async () => {
      try {
        const auth = await this._authHeader();
        const cols = this.data[sheetName].columns;
        const values = [cols.map(c => row[c] !== undefined ? String(row[c]) : "")];
        await httpsPost(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          { values },
          auth
        );
      } catch (err) {
        await this._saveFailedWrite("append", sheetName, row, err.message);
      }
    });
  }

  _enqueueUpdate(sheetName, rowIdx, rowData) {
    this._writeQueue = this._writeQueue.then(async () => {
      try {
        const auth = await this._authHeader();
        const cols = this.data[sheetName].columns;
        const sheetRowNumber = rowIdx + 2; // +1 for header, +1 for 1-based index
        const lastCol = String.fromCharCode(65 + cols.length - 1);
        const range = `${sheetName}!A${sheetRowNumber}:${lastCol}${sheetRowNumber}`;
        const values = [cols.map(c => rowData[c] !== undefined ? String(rowData[c]) : "")];
        await httpsPut(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
          { values, range },
          auth
        );
      } catch (err) {
        await this._saveFailedWrite("update", sheetName, rowData, err.message);
      }
    });
  }

  _enqueueCreateSheet(name, columns) {
    this._writeQueue = this._writeQueue.then(async () => {
      try {
        const auth = await this._authHeader();
        await httpsPost(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`,
          { requests: [{ addSheet: { properties: { title: name } } }] },
          auth
        );
        if (columns.length) {
          const values = [columns.map(String)];
          await httpsPost(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(name)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            { values },
            auth
          );
        }
      } catch (err) {
        await this._saveFailedWrite("createSheet", name, { columns }, err.message);
      }
    });
  }

  async _saveFailedWrite(operation, sheetName, payload, errorMsg) {
    // Avoid circular import — write directly to cache only
    const key = "FailedOperations";
    if (!this.data[key]) this.data[key] = { columns: [], rows: [] };
    this.data[key].rows.push({
      failed_op_id: `FOP-${Date.now()}`,
      operation: `sheets.${operation}`,
      entity_type: sheetName,
      payload: JSON.stringify(payload),
      error_message: errorMsg,
      retry_count: 0,
      max_retries: 3,
      status: "Pending",
      failed_at: new Date().toISOString(),
      next_retry_at: new Date(Date.now() + 60000).toISOString()
    });
  }
}

// --- Credentials loader ---

export function loadGoogleCredentials() {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

  if (jsonEnv) {
    try {
      const raw = Buffer.from(jsonEnv, "base64").toString("utf-8");
      return JSON.parse(raw);
    } catch {
      return JSON.parse(jsonEnv);
    }
  }

  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  throw new Error("Google credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_FILE.");
}
