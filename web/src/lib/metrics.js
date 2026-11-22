import { aiServiceUrl } from "./firebase.js";

export async function fetchModelMetrics(timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${aiServiceUrl}/metrics`, { signal: controller.signal });
    if (!response.ok) {
      return { available: false, mode: "unknown", error: `AI service returned ${response.status}` };
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      available: false,
      mode: "bootstrap",
      error: error.name === "AbortError" ? "AI service timed out" : "AI service is not reachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
