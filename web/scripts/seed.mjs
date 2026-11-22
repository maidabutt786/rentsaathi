#!/usr/bin/env node
/**
 * Seed the Firebase Emulator Suite with RentSaathi demo data.
 *
 * Usage:
 *   firebase emulators:start            # terminal 1
 *   npm run seed                        # terminal 2 (from /web)
 *
 * Set SEED_TARGET=production with GOOGLE_APPLICATION_CREDENTIALS to seed a real
 * project. Never commit a service account JSON file.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import {
  demoChats,
  demoFavorites,
  demoListings,
  demoMessages,
  demoReviews,
  demoUniversities,
  demoUsers,
  demoVisitRequests,
} from "../src/data/demoListings.js";

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "rentsaathi-demo";
const PASSWORD = "RentSaathi123!";
const useEmulator = process.env.SEED_TARGET !== "production";

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
}

const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) : undefined;
const app = initializeApp({ projectId: PROJECT_ID, ...(credential ? { credential } : {}) });
const db = getFirestore(app);
const auth = getAuth(app);

const COLLECTIONS = [
  "users",
  "listings",
  "universities",
  "reviews",
  "favorites",
  "visitRequests",
  "chats",
  "flaggedQueue",
  "imageEmbeddings",
];

const ts = (value) => (value ? Timestamp.fromDate(new Date(value)) : null);

function listingDocument(item) {
  const { id, views, enquiries, aiData, createdAt, ...rest } = item;
  return {
    ...rest,
    viewCount: views || 0,
    enquiryCount: enquiries || 0,
    createdAt: ts(createdAt),
    updatedAt: ts(createdAt),
    ai: aiData
      ? {
          ...aiData,
          analyzedAt: ts(aiData.analyzedAt),
        }
      : null,
  };
}

async function clearAll() {
  for (const name of COLLECTIONS) {
    await db.recursiveDelete(db.collection(name));
    console.log(`  cleared ${name}`);
  }
  if (useEmulator) {
    const list = await auth.listUsers(1000);
    if (list.users.length) await auth.deleteUsers(list.users.map((user) => user.uid));
    console.log(`  cleared ${list.users.length} auth users`);
  }
}

async function seedAuth() {
  for (const user of demoUsers) {
    const payload = {
      uid: user.uid,
      email: user.email,
      password: PASSWORD,
      displayName: user.name,
      emailVerified: true,
      disabled: Boolean(user.suspended),
    };
    try {
      await auth.createUser(payload);
    } catch (error) {
      if (error.code === "auth/uid-already-exists" || error.code === "auth/email-already-exists") {
        await auth.updateUser(user.uid, {
          password: PASSWORD,
          displayName: user.name,
          emailVerified: true,
          disabled: Boolean(user.suspended),
        });
      } else {
        throw error;
      }
    }
  }
  const admin = demoUsers.find((user) => user.role === "admin");
  if (admin) {
    await auth.setCustomUserClaims(admin.uid, { admin: true });
  }
  console.log(`  ${demoUsers.length} auth accounts ready`);
}

async function seedFirestore() {
  const batch = db.batch();

  for (const university of demoUniversities) {
    batch.set(db.collection("universities").doc(university.id), {
      name: university.name,
      city: university.city,
      lat: university.lat,
      lng: university.lng,
    });
  }

  for (const user of demoUsers) {
    const { uid, createdAt, savedSearches, ...rest } = user;
    batch.set(db.collection("users").doc(uid), {
      ...rest,
      email: user.email,
      savedSearches: savedSearches || [],
      createdAt: ts(createdAt),
    });
  }

  for (const item of demoListings) {
    batch.set(db.collection("listings").doc(item.id), listingDocument(item));
  }

  for (const review of demoReviews) {
    const { id, createdAt, ...rest } = review;
    batch.set(db.collection("reviews").doc(id), { ...rest, createdAt: ts(createdAt) });
  }

  for (const favorite of demoFavorites) {
    const { id, createdAt, ...rest } = favorite;
    batch.set(db.collection("favorites").doc(id), { ...rest, createdAt: ts(createdAt) });
  }

  for (const visit of demoVisitRequests) {
    const { id, createdAt, ...rest } = visit;
    batch.set(db.collection("visitRequests").doc(id), { ...rest, createdAt: ts(createdAt) });
  }

  for (const chat of demoChats) {
    const { id, updatedAt, ...rest } = chat;
    batch.set(db.collection("chats").doc(id), { ...rest, updatedAt: ts(updatedAt) });
  }

  const flagged = demoListings.filter((item) => item.aiData && item.aiData.fraudLabel !== "verified");
  for (const item of flagged) {
    batch.set(db.collection("flaggedQueue").doc(`flag_${item.id}`), {
      listingId: item.id,
      ownerId: item.ownerId,
      title: item.title,
      city: item.city,
      images: item.images,
      fraudScore: item.aiData.fraudScore,
      fraudLabel: item.aiData.fraudLabel,
      duplicateOf: item.aiData.duplicateOf,
      duplicateSimilarity: item.aiData.duplicateSimilarity,
      reasons: item.aiData.reasons,
      status: "open",
      createdAt: ts(item.aiData.analyzedAt || item.createdAt),
    });
  }

  await batch.commit();

  const messageBatch = db.batch();
  for (const [chatId, messages] of Object.entries(demoMessages)) {
    for (const message of messages) {
      const { id, createdAt, ...rest } = message;
      messageBatch.set(db.collection("chats").doc(chatId).collection("messages").doc(id), {
        ...rest,
        createdAt: ts(createdAt),
      });
    }
  }
  await messageBatch.commit();

  console.log(`  ${demoUniversities.length} universities`);
  console.log(`  ${demoUsers.length} user profiles`);
  console.log(`  ${demoListings.length} listings`);
  console.log(`  ${demoReviews.length} reviews`);
  console.log(`  ${demoFavorites.length} favourites`);
  console.log(`  ${demoVisitRequests.length} visit requests`);
  console.log(`  ${demoChats.length} chats with ${Object.values(demoMessages).flat().length} messages`);
  console.log(`  ${flagged.length} items in the admin flag queue`);
}

async function main() {
  console.log(`\nRentSaathi seed → ${PROJECT_ID} (${useEmulator ? "emulators" : "PRODUCTION"})\n`);
  if (!useEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Refusing to seed production without GOOGLE_APPLICATION_CREDENTIALS.");
  }
  console.log("Clearing previous demo data…");
  await clearAll();
  console.log("Creating auth accounts…");
  await seedAuth();
  console.log("Writing Firestore documents…");
  await seedFirestore();
  console.log("\nDone. Demo accounts (password: RentSaathi123!):");
  for (const user of demoUsers) console.log(`  ${user.role.padEnd(9)} ${user.email}`);
  console.log("\nTip: the duplicate-detection demo uses listing-03 and listing-11 (same photo).\n");
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message);
  console.error("Is the Firestore emulator running on 127.0.0.1:8080?");
  process.exit(1);
});
