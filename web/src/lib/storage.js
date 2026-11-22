import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { demoMode, storage } from "./firebase.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

function validate(file, allowed, maxBytes, label) {
  if (!file) throw new Error(`Choose a ${label} first.`);
  if (!allowed.includes(file.type)) {
    throw new Error(`${file.name} is not a supported ${label} (use JPG, PNG, WebP${label === "document" ? " or PDF" : ""}).`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${file.name} is too large. Keep ${label}s under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

async function upload(file, path) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadListingImages(files, uid, onProgress) {
  const urls = [];
  const list = Array.from(files);
  for (let index = 0; index < list.length; index += 1) {
    const file = list[index];
    validate(file, IMAGE_TYPES, MAX_IMAGE_BYTES, "image");
    if (demoMode) {
      urls.push(await readAsDataUrl(file));
    } else {
      urls.push(await upload(file, `listings/${uid}/drafts/${Date.now()}-${safeName(file.name)}`));
    }
    onProgress?.(index + 1, list.length);
  }
  return urls;
}

export async function uploadVerificationDocuments(files, uid) {
  const urls = [];
  const list = Array.from(files);
  for (const file of list) {
    validate(file, DOC_TYPES, MAX_DOC_BYTES, "document");
    if (demoMode) {
      urls.push(await readAsDataUrl(file));
    } else {
      urls.push(await upload(file, `verification/${uid}/${Date.now()}-${safeName(file.name)}`));
    }
  }
  return urls;
}
