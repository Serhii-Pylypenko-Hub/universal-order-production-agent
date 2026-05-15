import { appendRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export function addChangeLog({ version, author = "system", summary, details = "" }) {
  return appendRow("ChangeLog", {
    change_id: id("CHG"),
    version,
    date: nowIso(),
    author,
    summary,
    details
  });
}
