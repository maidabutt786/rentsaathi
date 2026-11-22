import test from "node:test";
import assert from "node:assert/strict";

import { buildAiPayload, buildMetadata, isValidHttpUrl, shouldAnalyze } from "../src/listing.js";

const baseListing = {
  images: ["https://storage.example.com/a.jpg"],
  title: "Room near university",
  description: "Quiet room",
  price: 15000,
  areaSqft: 350,
  roomType: "single",
  genderRule: "boys",
  facilities: ["wifi"],
  city: "Gujrat",
  location: { lat: 32.5, lng: 74.0 },
  status: "active",
};

test("ignores writes that only touch the ai map", () => {
  const before = { ...baseListing, ai: { fraudScore: 10 } };
  const after = { ...baseListing, ai: { fraudScore: 80 } };
  assert.equal(shouldAnalyze(before, after), false);
});

test("detects image and price changes", () => {
  assert.equal(shouldAnalyze(baseListing, { ...baseListing, images: ["https://x.test/b.jpg"] }), true);
  assert.equal(shouldAnalyze(baseListing, { ...baseListing, price: 16000 }), true);
  assert.equal(shouldAnalyze(null, baseListing), true);
  assert.equal(shouldAnalyze(baseListing, null), false);
});

test("metadata includes description and image counts", () => {
  const metadata = buildMetadata(baseListing, 4);
  assert.equal(metadata.imageCount, 1);
  assert.equal(metadata.descriptionLength, "Quiet room".length);
  assert.equal(metadata.ownerPostingFrequency, 4);
  assert.equal(metadata.price, 15000);
});

test("only absolute http(s) urls are accepted", () => {
  assert.equal(isValidHttpUrl("https://storage.example.com/a.jpg"), true);
  assert.equal(isValidHttpUrl("http://localhost:9199/a.jpg"), true);
  assert.equal(isValidHttpUrl("file:///etc/passwd"), false);
  assert.equal(isValidHttpUrl("javascript:alert(1)"), false);
  assert.equal(isValidHttpUrl(42), false);
});

test("ai payload trims reasons and defaults", () => {
  const payload = buildAiPayload({
    fraudScore: 72,
    fraudLabel: "high_risk",
    reasons: ["a", "b", "c", "d", "e", "f", "g"],
    mode: "bootstrap",
    modelVersion: "v1",
  });
  assert.equal(payload.reasons.length, 6);
  assert.equal(payload.duplicateOf, null);
  assert.equal(payload.duplicateSimilarity, 0);
  assert.equal(payload.fraudLabel, "high_risk");
});
