import https from "https";
import fs from "fs";
import path from "path";

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
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

function loadSystemPrompt() {
  try {
    return fs.readFileSync(
      path.resolve(process.cwd(), "prompts/order_agent_prompt.md"),
      "utf-8"
    );
  } catch {
    return "You are an order intake assistant. Parse the user's order request and return strict JSON.";
  }
}

export async function parseOrderMessage(userMessage, conversationHistory = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const systemPrompt = loadSystemPrompt();
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  const response = await httpsPost(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.AI_MODEL || "openai/gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1
    },
    {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/universal-order-agent",
      "X-Title": "Universal Order Agent"
    }
  );

  if (response.error) throw new Error(`AI API error: ${response.error.message}`);

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response.");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`AI returned invalid JSON: ${content}`);
  }
}

export async function generateClarificationText(context, missingFields) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return "Будь ласка, уточніть деталі замовлення.";

  const prompt = `You are a friendly order assistant. Ask the client for missing information in Ukrainian.
Missing fields: ${missingFields.join(", ")}.
Context: ${JSON.stringify(context)}
Return only the question text, no JSON.`;

  const response = await httpsPost(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.AI_MODEL || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    },
    {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/universal-order-agent"
    }
  );

  return response.choices?.[0]?.message?.content || "Будь ласка, уточніть деталі.";
}
