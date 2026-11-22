/** Pure helpers shared by the triggers and the tests. */

export const ANALYSIS_FIELDS = [
  "images",
  "title",
  "description",
  "price",
  "areaSqft",
  "roomType",
  "genderRule",
  "facilities",
  "city",
  "location",
  "status",
];

export function shouldAnalyze(before, after) {
  if (!after) return false;
  if (!before) return true;
  return ANALYSIS_FIELDS.some((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildMetadata(listing, ownerPostingFrequency = 1) {
  return {
    price: Number(listing.price) || 0,
    areaSqft: Number(listing.areaSqft) || 0,
    imageCount: Array.isArray(listing.images) ? listing.images.length : 0,
    descriptionLength: typeof listing.description === "string" ? listing.description.length : 0,
    ownerPostingFrequency,
    roomType: listing.roomType || null,
    city: listing.city || null,
  };
}

export function buildAiPayload(result) {
  return {
    fraudScore: result.fraudScore,
    fraudLabel: result.fraudLabel,
    duplicateOf: result.duplicateOf ?? null,
    duplicateSimilarity: result.duplicateSimilarity ?? 0,
    reasons: Array.isArray(result.reasons) ? result.reasons.slice(0, 6) : [],
    mode: result.mode,
    modelVersion: result.modelVersion,
  };
}
