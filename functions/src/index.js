import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentDeleted, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

import { AIClient } from "./aiClient.js";
import { getConfig } from "./config.js";
import { buildAiPayload, buildMetadata, isValidHttpUrl, shouldAnalyze } from "./listing.js";

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || "asia-south1",
  maxInstances: 10,
  memory: "256MiB",
  timeoutSeconds: 120,
});

function client() {
  const config = getConfig();
  return {
    config,
    ai: new AIClient({
      baseUrl: config.aiServiceUrl,
      apiKey: config.aiApiKey,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
      logger,
    }),
  };
}

async function ownerPostingFrequency(ownerId) {
  if (!ownerId) return 1;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snapshot = await db
      .collection("listings")
      .where("ownerId", "==", ownerId)
      .where("createdAt", ">=", since)
      .count()
      .get();
    return Math.max(1, snapshot.data().count);
  } catch (error) {
    logger.warn("[rentsaathi] Could not count owner listings; defaulting to 1", { error: error.message });
    return 1;
  }
}

function flagRef(listingId) {
  return db.collection("flaggedQueue").doc(`flag_${listingId}`);
}

async function updateFlaggedQueue(listingId, listing, result) {
  const ref = flagRef(listingId);
  if (result.fraudLabel === "verified") {
    await ref.delete().catch(() => {});
    return;
  }
  const snapshot = await ref.get();
  const payload = {
    listingId,
    ownerId: listing.ownerId || null,
    fraudScore: result.fraudScore,
    fraudLabel: result.fraudLabel,
    reasons: result.reasons || [],
    duplicateOf: result.duplicateOf || null,
    images: (listing.images || []).slice(0, 6),
    title: listing.title || "",
    city: listing.city || "",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (snapshot.exists) {
    payload.status = snapshot.data().status || "open";
  } else {
    payload.status = "open";
    payload.createdAt = FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
}

async function analyzeAndStore(listingId, listing) {
  const { config, ai } = client();
  if (!config.aiEnabled) {
    logger.info("[rentsaathi] AI_ENABLED=false, skipping analysis", { listingId });
    return null;
  }

  const imageUrls = (Array.isArray(listing.images) ? listing.images : []).filter(isValidHttpUrl).slice(0, 15);
  const frequency = await ownerPostingFrequency(listing.ownerId);
  const metadata = buildMetadata(listing, frequency);

  logger.info("[rentsaathi] Analyzing listing", { listingId, images: imageUrls.length });
  const result = await ai.analyzeListing({ listingId, imageUrls, metadata });

  await db.collection("listings").doc(listingId).update({
    ai: {
      ...buildAiPayload(result),
      analyzedAt: FieldValue.serverTimestamp(),
    },
  });

  await updateFlaggedQueue(listingId, listing, result);

  // Keep the duplicate index warm; failure here must not fail moderation.
  try {
    if (imageUrls.length > 0) {
      await ai.indexListing({ listingId, imageUrls });
    }
  } catch (error) {
    logger.warn("[rentsaathi] Could not index listing embeddings", { listingId, error: error.message });
  }

  logger.info("[rentsaathi] Analysis stored", {
    listingId,
    fraudScore: result.fraudScore,
    fraudLabel: result.fraudLabel,
    mode: result.mode,
  });
  return result;
}

export const onListingWrite = onDocumentWritten(
  { document: "listings/{listingId}", retry: true },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    if (!after) return;
    if (after.status === "removed") return;
    if (!shouldAnalyze(before, after)) return;

    try {
      await analyzeAndStore(event.params.listingId, after);
    } catch (error) {
      logger.error("[rentsaathi] Listing analysis failed", {
        listingId: event.params.listingId,
        error: error.message,
      });
      throw error;
    }
  },
);

export const onListingDelete = onDocumentDeleted(
  { document: "listings/{listingId}", retry: true },
  async (event) => {
    const listingId = event.params.listingId;
    const { config, ai } = client();
    const tasks = [
      db.collection("imageEmbeddings").doc(listingId).delete(),
      flagRef(listingId).delete(),
    ];
    if (config.aiEnabled) {
      tasks.push(ai.deleteIndex(listingId).catch((error) => {
        logger.warn("[rentsaathi] Could not delete AI index entry", { listingId, error: error.message });
      }));
    }
    await Promise.allSettled(tasks);
    logger.info("[rentsaathi] Listing cleanup done", { listingId });
  },
);

async function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  if (request.auth.token?.admin === true) return request.auth.uid;
  const user = await db.collection("users").doc(request.auth.uid).get();
  if (user.exists && user.data().role === "admin") return request.auth.uid;
  throw new HttpsError("permission-denied", "Admin access required.");
}

export const rerunListingAnalysis = onCall({ memory: "256MiB", timeoutSeconds: 120 }, async (request) => {
  await assertAdmin(request);
  const listingId = request.data?.listingId;
  if (typeof listingId !== "string" || listingId.length === 0) {
    throw new HttpsError("invalid-argument", "listingId is required.");
  }
  const snapshot = await db.collection("listings").doc(listingId).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Listing not found.");
  }
  const result = await analyzeAndStore(listingId, snapshot.data());
  if (!result) {
    throw new HttpsError("failed-precondition", "AI analysis is disabled (AI_ENABLED=false).");
  }
  return {
    listingId,
    fraudScore: result.fraudScore,
    fraudLabel: result.fraudLabel,
    duplicateOf: result.duplicateOf ?? null,
    duplicateSimilarity: result.duplicateSimilarity ?? 0,
    reasons: result.reasons,
    mode: result.mode,
    modelVersion: result.modelVersion,
  };
});
