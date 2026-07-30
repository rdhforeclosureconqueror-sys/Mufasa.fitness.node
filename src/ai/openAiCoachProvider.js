"use strict";
function createOpenAiCoachProvider({ config, fetchImpl = global.fetch }) {
  async function *stream({ prompt, signal }) {
    const response = await fetchImpl("https://api.openai.com/v1/responses", { method: "POST", signal, headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: config.model, input: prompt.map(({ role, content }) => ({ role, content })), stream: true, max_output_tokens: config.maxOutputTokens, temperature: config.temperature }) });
    if (!response.ok) { const error = new Error("AI provider request failed"); error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status); throw error; }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    try { while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() || ""; for (const event of events) for (const line of event.split("\n")) if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") { let data; try { data = JSON.parse(line.slice(6)); } catch { continue; } if (data.type === "response.output_text.delta" && data.delta) yield String(data.delta); if (data.type === "error") throw new Error("AI provider request failed"); } } }
    finally { reader.releaseLock(); }
  }
  return Object.freeze({ stream });
}
module.exports = { createOpenAiCoachProvider };
