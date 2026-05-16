import https from "https";
import { appendRow, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

function githubRequest(repo, token, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.github.com",
      path: `/repos/${repo}/issues`,
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "User-Agent": "production-crm-erp"
      }
    }, res => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw || "{}");
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed.message || `GitHub issue failed with ${res.statusCode}`));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function createDeveloperAlert({
  source = "system",
  severity = "CRITICAL",
  title,
  userMessage = "Сталася технічна помилка. Звіт уже передано розробнику. Спробуйте ще раз або зверніться до менеджера.",
  technicalDetails = {}
}) {
  const repo = process.env.GITHUB_REPO || "";
  const row = appendRow("DeveloperAlerts", {
    developer_alert_id: id("DEV"),
    source,
    severity,
    title: title || "System error",
    user_message: userMessage,
    technical_details: JSON.stringify(technicalDetails),
    github_repo: repo,
    github_issue_url: "",
    status: "Open",
    created_at: nowIso(),
    updated_at: nowIso(),
    resolved_at: ""
  });

  const token = process.env.GITHUB_TOKEN;
  if (token && repo && ["CRITICAL", "ERROR"].includes(severity)) {
    try {
      const issue = await githubRequest(repo, token, {
        title: `[${severity}] ${row.title}`,
        body: [
          `Source: ${source}`,
          `Developer alert: ${row.developer_alert_id}`,
          "",
          "User message:",
          userMessage,
          "",
          "Technical details:",
          "```json",
          JSON.stringify(technicalDetails, null, 2),
          "```"
        ].join("\n"),
        labels: ["bug", "developer-alert"]
      });
      updateRow("DeveloperAlerts", "developer_alert_id", row.developer_alert_id, {
        github_issue_url: issue.html_url || "",
        updated_at: nowIso()
      });
      row.github_issue_url = issue.html_url || "";
    } catch (error) {
      updateRow("DeveloperAlerts", "developer_alert_id", row.developer_alert_id, {
        status: "OpenGitHubFailed",
        technical_details: JSON.stringify({ ...technicalDetails, github_error: error.message }),
        updated_at: nowIso()
      });
    }
  }

  return row;
}
