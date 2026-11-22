import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, demoMode, functions } from "./firebase.js";
import { UNIVERSITIES, PAGE_SIZE } from "./constants.js";
import {
  demoChats,
  demoFavorites,
  demoListings,
  demoMessages,
  demoReviews,
  demoUsers,
  demoVisitRequests,
} from "../data/demoListings.js";
import {
  addDemoItem,
  demoId,
  getDemoCollection,
  removeDemoItem,
  setDemoCollection,
  updateDemoItem,
} from "./demoStore.js";

const LISTINGS = "listings";
const USERS = "users";
const FAVORITES = "favorites";
const VISITS = "visitRequests";
const CHATS = "chats";
const REVIEWS = "reviews";
const FLAGS = "flaggedQueue";

const toDate = (value) => {
  if (!value) return new Date(0);
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

function normalizeListing(id, data) {
  return { id, ...data };
}

export function getDemoListings() {
  const custom = getDemoCollection("listings", []);
  const deleted = new Set(getDemoCollection("deletedListings", []));
  const updates = getDemoCollection("listingUpdates", {});
  return [...demoListings, ...custom]
    .filter((listing) => !deleted.has(listing.id))
    .map((listing) => ({ ...listing, ...(updates[listing.id] || {}) }));
}

function getDemoUsers() {
  const updates = getDemoCollection("userUpdates", {});
  return demoUsers.map((user) => ({ ...user, ...(updates[user.uid] || {}) }));
}

function setDemoUserUpdate(uid, changes) {
  const updates = getDemoCollection("userUpdates", {});
  setDemoCollection("userUpdates", { ...updates, [uid]: { ...(updates[uid] || {}), ...changes } });
}

export function getDemoListing(id) {
  return getDemoListings().find((listing) => listing.id === id) || null;
}

function matchesKeyword(listing, keyword) {
  if (!keyword) return true;
  const haystack = [
    listing.title,
    listing.description,
    listing.address,
    listing.city,
    listing.ownerName,
    UNIVERSITIES.find((university) => university.id === listing.universityId)?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function filterListings(items, filters = {}) {
  const {
    keyword = "",
    minPrice,
    maxPrice,
    roomType,
    genderRule,
    universityId,
    maxDistance,
  } = filters;
  return items.filter((listing) => {
    if (!matchesKeyword(listing, keyword)) return false;
    if (minPrice !== undefined && minPrice !== "" && Number(listing.price) < Number(minPrice)) return false;
    if (maxPrice !== undefined && maxPrice !== "" && Number(listing.price) > Number(maxPrice)) return false;
    if (roomType && listing.roomType !== roomType) return false;
    if (genderRule && listing.genderRule !== genderRule) return false;
    if (universityId && listing.universityId !== universityId) return false;
    if (maxDistance !== undefined && maxDistance !== "" && Number(listing.distanceToUniversityKm) > Number(maxDistance)) {
      return false;
    }
    return true;
  });
}

export function sortListings(items, sort = "newest") {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case "price_desc":
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case "distance":
      return copy.sort((a, b) => Number(a.distanceToUniversityKm) - Number(b.distanceToUniversityKm));
    case "popular":
      return copy.sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0));
    case "oldest":
      return copy.sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));
    default:
      return copy.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
  }
}

export async function fetchListings({ filters = {}, sort = "newest", page = 1, pageSize = PAGE_SIZE, includeAll = false } = {}) {
  let items;
  if (demoMode) {
    items = getDemoListings();
    if (!includeAll) items = items.filter((listing) => listing.status === "active");
  } else {
    const constraints = [];
    if (!includeAll) constraints.push(where("status", "==", "active"));
    constraints.push(firestoreLimit(500));
    const snapshot = await getDocs(query(collection(db, LISTINGS), ...constraints));
    items = snapshot.docs.map((entry) => normalizeListing(entry.id, entry.data()));
  }
  const filtered = sortListings(filterListings(items, filters), sort);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages };
}

export async function fetchFeaturedListings(count = 6) {
  const { items } = await fetchListings({ pageSize: 200, sort: "newest" });
  const verified = items.filter((listing) => listing.ai?.fraudLabel === "verified");
  const pool = verified.length >= count ? verified : [...verified, ...items.filter((l) => l.ai?.fraudLabel !== "verified")];
  return pool.slice(0, count);
}

export async function fetchListing(id) {
  if (!id) return null;
  if (demoMode) return getDemoListing(id);
  const snapshot = await getDoc(doc(db, LISTINGS, id));
  return snapshot.exists() ? normalizeListing(snapshot.id, snapshot.data()) : null;
}

export async function fetchListingsByIds(ids = []) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  if (demoMode) {
    const all = getDemoListings();
    return unique.map((id) => all.find((listing) => listing.id === id)).filter(Boolean);
  }
  const results = [];
  for (let index = 0; index < unique.length; index += 10) {
    const chunk = unique.slice(index, index + 10);
    const snapshot = await getDocs(query(collection(db, LISTINGS), where(documentId(), "in", chunk)));
    results.push(...snapshot.docs.map((entry) => normalizeListing(entry.id, entry.data())));
  }
  return results;
}

export async function incrementView(listingId) {
  if (demoMode) {
    const current = getDemoListing(listingId);
    if (!current) return;
    const updates = getDemoCollection("listingUpdates", {});
    setDemoCollection("listingUpdates", {
      ...updates,
      [listingId]: { ...(updates[listingId] || {}), viewCount: Number(current.viewCount || 0) + 1 },
    });
    return;
  }
  try {
    const callable = httpsCallable(functions, "incrementListingView");
    await callable({ listingId });
  } catch (error) {
    console.warn("[rentsaathi] view count update failed", error);
  }
}

export async function createListing(uid, values) {
  const payload = {
    ...values,
    ownerId: uid,
    status: values.status || "active",
    viewCount: 0,
    enquiryCount: 0,
    ai: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (demoMode) {
    const id = demoId("listing");
    addDemoItem("listings", [], { id, ...payload });
    return { id, ...payload };
  }
  const reference = await addDoc(collection(db, LISTINGS), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: reference.id, ...payload };
}

export async function updateListing(listingId, values) {
  const payload = { ...values, updatedAt: new Date().toISOString() };
  if (demoMode) {
    const updates = getDemoCollection("listingUpdates", {});
    setDemoCollection("listingUpdates", { ...updates, [listingId]: { ...(updates[listingId] || {}), ...payload } });
    return { ...getDemoListing(listingId), ...payload };
  }
  await updateDoc(doc(db, LISTINGS, listingId), { ...values, updatedAt: serverTimestamp() });
  return { id: listingId, ...values };
}

export async function setListingStatus(listingId, status) {
  return updateListing(listingId, { status });
}

export async function deleteListing(listingId) {
  if (demoMode) {
    const deleted = getDemoCollection("deletedListings", []);
    setDemoCollection("deletedListings", [...deleted, listingId]);
    removeDemoItem("listings", [], (item) => item.id === listingId);
    return;
  }
  await deleteDoc(doc(db, LISTINGS, listingId));
}

export async function fetchOwnerListings(uid, { activeOnly = false } = {}) {
  if (demoMode) {
    return getDemoListings().filter(
      (listing) => listing.ownerId === uid && (!activeOnly || listing.status === "active"),
    );
  }
  const constraints = [where("ownerId", "==", uid)];
  if (activeOnly) constraints.push(where("status", "==", "active"));
  const snapshot = await getDocs(query(collection(db, LISTINGS), ...constraints));
  return snapshot.docs.map((entry) => normalizeListing(entry.id, entry.data()));
}

export function subscribeOwnerListings(uid, callback) {
  if (!uid) return () => {};
  if (demoMode) {
    callback(getDemoListings().filter((listing) => listing.ownerId === uid));
    return () => {};
  }
  return onSnapshot(
    query(collection(db, LISTINGS), where("ownerId", "==", uid)),
    (snapshot) => {
      callback(snapshot.docs.map((entry) => normalizeListing(entry.id, entry.data())));
    },
    (error) => console.warn("[rentsaathi] owner listings subscription failed", error),
  );
}

export async function fetchFavorites(uid) {
  if (!uid) return [];
  if (demoMode) {
    const favorites = getDemoCollection(FAVORITES, demoFavorites).filter((favorite) => favorite.studentId === uid);
    const listings = await fetchListingsByIds(favorites.map((favorite) => favorite.listingId));
    return favorites
      .map((favorite) => ({ ...favorite, listing: listings.find((listing) => listing.id === favorite.listingId) }))
      .filter((favorite) => favorite.listing);
  }
  const snapshot = await getDocs(query(collection(db, FAVORITES), where("studentId", "==", uid)));
  const favorites = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const listings = await fetchListingsByIds(favorites.map((favorite) => favorite.listingId));
  return favorites
    .map((favorite) => ({ ...favorite, listing: listings.find((listing) => listing.id === favorite.listingId) }))
    .filter((favorite) => favorite.listing);
}

export async function isFavorite(uid, listingId) {
  if (!uid || !listingId) return false;
  if (demoMode) {
    return getDemoCollection(FAVORITES, demoFavorites).some(
      (favorite) => favorite.studentId === uid && favorite.listingId === listingId,
    );
  }
  const snapshot = await getDocs(
    query(collection(db, FAVORITES), where("studentId", "==", uid), where("listingId", "==", listingId)),
  );
  return !snapshot.empty;
}

export async function setFavorite(uid, listingId, shouldFavorite) {
  if (demoMode) {
    const favorites = getDemoCollection(FAVORITES, demoFavorites);
    if (shouldFavorite) {
      if (!favorites.some((favorite) => favorite.studentId === uid && favorite.listingId === listingId)) {
        addDemoItem(FAVORITES, demoFavorites, {
          id: demoId("fav"),
          studentId: uid,
          listingId,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      removeDemoItem(FAVORITES, demoFavorites, (favorite) => favorite.studentId === uid && favorite.listingId === listingId);
    }
    return;
  }
  if (shouldFavorite) {
    await addDoc(collection(db, FAVORITES), {
      studentId: uid,
      listingId,
      createdAt: serverTimestamp(),
    });
  } else {
    const snapshot = await getDocs(
      query(collection(db, FAVORITES), where("studentId", "==", uid), where("listingId", "==", listingId)),
    );
    await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)));
  }
}

export async function getSavedSearches(uid) {
  if (!uid) return [];
  if (demoMode) {
    const stored = getDemoCollection("savedSearches", {});
    if (stored[uid]) return stored[uid];
    return demoUsers.find((user) => user.uid === uid)?.savedSearches || [];
  }
  const snapshot = await getDoc(doc(db, USERS, uid));
  return snapshot.data()?.savedSearches || [];
}

export async function saveSearch(uid, search) {
  if (demoMode) {
    const key = "savedSearches";
    const existing = getDemoCollection(key, {});
    const list = existing[uid] || demoUsers.find((user) => user.uid === uid)?.savedSearches || [];
    if (!list.some((item) => item.query === search.query)) {
      const next = { ...existing, [uid]: [...list, { ...search, id: demoId("ss") }] };
      setDemoCollection(key, next);
    }
    return;
  }
  await updateDoc(doc(db, USERS, uid), { savedSearches: arrayUnion(search) });
}

export async function removeSavedSearch(uid, search) {
  if (demoMode) {
    const existing = getDemoCollection("savedSearches", {});
    const list = existing[uid] || demoUsers.find((user) => user.uid === uid)?.savedSearches || [];
    setDemoCollection("savedSearches", { ...existing, [uid]: list.filter((item) => item.id !== search.id) });
    return;
  }
  await updateDoc(doc(db, USERS, uid), { savedSearches: arrayRemove(search) });
}

export async function createVisitRequest(values) {
  const payload = { ...values, status: "pending", createdAt: new Date().toISOString() };
  if (demoMode) {
    const request = { id: demoId("visit"), ...payload };
    addDemoItem(VISITS, demoVisitRequests, request);
    return request;
  }
  const reference = await addDoc(collection(db, VISITS), { ...values, status: "pending", createdAt: serverTimestamp() });
  return { id: reference.id, ...payload };
}

export async function fetchVisitRequests({ uid, role }) {
  if (!uid) return [];
  if (demoMode) {
    const all = getDemoCollection(VISITS, demoVisitRequests);
    const filtered = role === "landlord" ? all.filter((request) => request.landlordId === uid) : all.filter((request) => request.studentId === uid);
    return filtered.map((request) => ({ ...request, listing: getDemoListing(request.listingId) }));
  }
  const field = role === "landlord" ? "landlordId" : "studentId";
  const snapshot = await getDocs(query(collection(db, VISITS), where(field, "==", uid)));
  const requests = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const listings = await fetchListingsByIds(requests.map((request) => request.listingId));
  return requests.map((request) => ({
    ...request,
    listing: listings.find((listing) => listing.id === request.listingId),
  }));
}

export async function updateVisitRequest(requestId, status) {
  if (demoMode) {
    updateDemoItem(VISITS, demoVisitRequests, requestId, { status });
    return;
  }
  await updateDoc(doc(db, VISITS, requestId), { status });
}

function demoChatList(uid) {
  return getDemoCollection(CHATS, demoChats)
    .filter((chat) => chat.participants.includes(uid))
    .map((chat) => ({
      ...chat,
      messages: getDemoCollection(`messages.${chat.id}`, demoMessages[chat.id] || []),
    }));
}

export async function getOrCreateChat({ listingId, studentId, landlordId, studentName, landlordName }) {
  if (demoMode) {
    const existing = demoChatList(studentId).find((chat) => chat.listingId === listingId);
    if (existing) return existing;
    const chat = {
      id: demoId("chat"),
      listingId,
      participants: [studentId, landlordId],
      names: { [studentId]: studentName, [landlordId]: landlordName },
      updatedAt: new Date().toISOString(),
      lastMessage: "",
    };
    addDemoItem(CHATS, demoChats, chat);
    return chat;
  }
  const snapshot = await getDocs(
    query(collection(db, CHATS), where("participants", "array-contains", studentId)),
  );
  const existing = snapshot.docs.find((entry) => entry.data().listingId === listingId);
  if (existing) {
    return { id: existing.id, ...existing.data() };
  }
  const reference = await addDoc(collection(db, CHATS), {
    listingId,
    participants: [studentId, landlordId],
    names: { [studentId]: studentName, [landlordId]: landlordName },
    lastMessage: "",
    updatedAt: serverTimestamp(),
  });
  return { id: reference.id, listingId, participants: [studentId, landlordId] };
}

export function subscribeChats(uid, callback) {
  if (!uid) return () => {};
  if (demoMode) {
    callback(demoChatList(uid).sort((a, b) => toDate(b.updatedAt) - toDate(a.updatedAt)));
    return () => {};
  }
  const chatQuery = query(collection(db, CHATS), where("participants", "array-contains", uid));
  return onSnapshot(
    chatQuery,
    (snapshot) => {
      const chats = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => toDate(b.updatedAt) - toDate(a.updatedAt));
      callback(chats);
    },
    (error) => console.warn("[rentsaathi] chat subscription failed", error),
  );
}

export function subscribeMessages(chatId, callback) {
  if (!chatId) return () => {};
  if (demoMode) {
    callback(getDemoCollection(`messages.${chatId}`, demoMessages[chatId] || []));
    return () => {};
  }
  return onSnapshot(
    query(collection(db, CHATS, chatId, "messages")),
    (snapshot) => {
      const messages = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));
      callback(messages);
    },
    (error) => console.warn("[rentsaathi] message subscription failed", error),
  );
}

export async function sendMessage(chatId, senderId, text) {
  if (demoMode) {
    const key = `messages.${chatId}`;
    const messages = getDemoCollection(key, demoMessages[chatId] || []);
    addDemoItem(key, demoMessages[chatId] || [], {
      id: demoId("msg"),
      senderId,
      text,
      createdAt: new Date().toISOString(),
    });
    const chats = getDemoCollection(CHATS, demoChats);
    setDemoCollection(
      CHATS,
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, lastMessage: text, updatedAt: new Date().toISOString() } : chat,
      ),
    );
    return;
  }
  await addDoc(collection(db, CHATS, chatId, "messages"), {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, CHATS, chatId), { lastMessage: text, updatedAt: serverTimestamp() });
}

export async function getChat(chatId) {
  if (!chatId) return null;
  if (demoMode) {
    return getDemoCollection(CHATS, demoChats).find((chat) => chat.id === chatId) || null;
  }
  const snapshot = await getDoc(doc(db, CHATS, chatId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function fetchReviews(listingId) {
  if (demoMode) {
    return demoReviews
      .filter((review) => review.listingId === listingId)
      .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
  }
  const snapshot = await getDocs(query(collection(db, REVIEWS), where("listingId", "==", listingId)));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
}

export async function addReview({ listingId, studentId, studentName, rating, text }) {
  const payload = {
    listingId,
    studentId,
    studentName,
    rating: Number(rating),
    text: text.trim(),
    ai: null,
    createdAt: new Date().toISOString(),
  };
  if (demoMode) {
    addDemoItem(REVIEWS, demoReviews, { id: demoId("review"), ...payload });
    return payload;
  }
  const reference = await addDoc(collection(db, REVIEWS), { ...payload, createdAt: serverTimestamp() });
  return { id: reference.id, ...payload };
}

export async function fetchUser(uid) {
  if (!uid) return null;
  if (demoMode) return getDemoUsers().find((user) => user.uid === uid) || null;
  const snapshot = await getDoc(doc(db, USERS, uid));
  return snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null;
}

export async function fetchAllUsers() {
  if (demoMode) {
    return getDemoUsers();
  }
  const snapshot = await getDocs(collection(db, USERS));
  return snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
}

export async function setUserVerification(uid, verificationStatus) {
  if (demoMode) {
    setDemoUserUpdate(uid, { verificationStatus });
  } else {
    await updateDoc(doc(db, USERS, uid), { verificationStatus });
  }
  // Listings keep a denormalised badge so public pages do not need to read the private user doc.
  const listings = await fetchOwnerListings(uid).catch(() => []);
  await Promise.all(
    listings.map((listing) =>
      updateListing(listing.id, { ownerVerificationStatus: verificationStatus }).catch(() => {}),
    ),
  );
}

export async function setUserSuspended(uid, suspended) {
  if (demoMode) return setDemoUserUpdate(uid, { suspended });
  await updateDoc(doc(db, USERS, uid), { suspended });
}

export async function suspendUser(uid, suspended) {
  await setUserSuspended(uid, suspended);
  if (!suspended) return;
  const listings = await fetchOwnerListings(uid).catch(() => []);
  await Promise.all(
    listings
      .filter((listing) => listing.status === "active")
      .map((listing) => setListingStatus(listing.id, "paused").catch(() => {})),
  );
}

export async function setUserRole(uid, role) {
  if (demoMode) return setDemoUserUpdate(uid, { role });
  await updateDoc(doc(db, USERS, uid), { role });
}

export async function fetchFlaggedQueue() {
  if (demoMode) {
    const resolved = new Set(getDemoCollection("resolvedFlags", []));
    return getDemoListings()
      .filter(
        (listing) =>
          listing.ai &&
          listing.ai.fraudLabel !== "verified" &&
          listing.status === "active" &&
          !resolved.has(listing.id),
      )
      .map((listing) => ({
        id: `flag_${listing.id}`,
        listingId: listing.id,
        ownerId: listing.ownerId,
        fraudScore: listing.ai.fraudScore,
        fraudLabel: listing.ai.fraudLabel,
        reasons: listing.ai.reasons,
        duplicateOf: listing.ai.duplicateOf,
        images: listing.images,
        title: listing.title,
        city: listing.city,
        status: "open",
        listing,
        duplicate: listing.ai.duplicateOf ? getDemoListing(listing.ai.duplicateOf) : null,
      }));
  }
  const snapshot = await getDocs(query(collection(db, FLAGS), where("status", "==", "open")));
  const flags = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const listings = await fetchListingsByIds(flags.map((flag) => flag.listingId));
  const duplicateIds = flags.map((flag) => flag.duplicateOf).filter(Boolean);
  const duplicates = await fetchListingsByIds(duplicateIds);
  return flags.map((flag) => ({
    ...flag,
    listing: listings.find((listing) => listing.id === flag.listingId) || null,
    duplicate: duplicates.find((listing) => listing.id === flag.duplicateOf) || null,
  }));
}

export async function resolveFlag(flag, action, adminUid) {
  if (action === "remove") {
    await setListingStatus(flag.listingId, "removed");
  }
  if (action === "suspend" && flag.ownerId) {
    await suspendUser(flag.ownerId, true);
  }
  if (demoMode) {
    if (action !== "remove") {
      const resolved = getDemoCollection("resolvedFlags", []);
      setDemoCollection("resolvedFlags", [...resolved, flag.listingId]);
    }
    return;
  }
  await updateDoc(doc(db, FLAGS, flag.id), {
    status: action === "approve" ? "approved" : "actioned",
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  });
}

export async function fetchAllListingsForAdmin() {
  if (demoMode) return getDemoListings();
  const snapshot = await getDocs(query(collection(db, LISTINGS), firestoreLimit(500)));
  return snapshot.docs.map((entry) => normalizeListing(entry.id, entry.data()));
}

export async function rerunAnalysis(listingId) {
  if (demoMode) {
    const listing = getDemoListing(listingId);
    return { listingId, ...(listing?.ai || {}), mode: "bootstrap", demo: true };
  }
  const callable = httpsCallable(functions, "rerunListingAnalysis");
  const response = await callable({ listingId });
  return response.data;
}

export function subscribeUserProfile(uid, callback) {
  if (!uid) return () => {};
  if (demoMode) {
    callback(demoUsers.find((user) => user.uid === uid) || null);
    return () => {};
  }
  return onSnapshot(doc(db, USERS, uid), (snapshot) => {
    callback(snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null);
  });
}
