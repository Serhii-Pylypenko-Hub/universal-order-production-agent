import { getStore } from "./store.js";

export function getRows(sheetName) {
  return getStore().getRows(sheetName);
}

export function appendRow(sheetName, row) {
  return getStore().appendRow(sheetName, row);
}

export function updateRow(sheetName, idField, idValue, patch) {
  return getStore().updateRow(sheetName, idField, idValue, patch);
}

export function findRows(sheetName, predicate) {
  return getStore().findRows(sheetName, predicate);
}

export function findOne(sheetName, predicate) {
  return getStore().findOne(sheetName, predicate);
}
