import { defineString } from "firebase-functions/params";

const aiServiceUrl = defineString("AI_SERVICE_URL", { default: "http://127.0.0.1:8000" });
const aiApiKey = defineString("AI_API_KEY", { default: "dev-local-key" });
const aiEnabled = defineString("AI_ENABLED", { default: "true" });
const functionsRegion = defineString("FUNCTIONS_REGION", { default: "asia-south1" });

export function getConfig() {
  const enabled = String(aiEnabled.value()).toLowerCase() !== "false";
  const key = aiApiKey.value();
  if (enabled && (!key || key === "dev-local-key")) {
    console.warn("[rentsaathi] AI_API_KEY is still the development default. Set a real secret before production.");
  }
  return {
    aiServiceUrl: aiServiceUrl.value().replace(/\/$/, ""),
    aiApiKey: key,
    aiEnabled: enabled,
    region: functionsRegion.value(),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 15000),
    maxRetries: Number(process.env.AI_MAX_RETRIES || 3),
  };
}
