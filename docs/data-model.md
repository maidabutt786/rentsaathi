# RentSaathi data model (Firestore + Storage)

This model is shared by the React website (Part 1) and the Flutter app (later). Field names are
**contracts** — do not rename them. All timestamps are Firestore `Timestamp` values.

## Collections

### `users/{uid}`
| Field | Type | Notes |
|---|---|---|
| `name` | string | display name |
| `email` | string | unique, lowercase |
| `phone` | string | optional, E.164 |
| `role` | `"student" \| "landlord" \| "admin"` | selected at signup; admin is assigned manually |
| `university` | string | optional, student's university name |
| `verificationStatus` | `"pending" \| "approved" \| "rejected"` | landlord document review state |
| `documents` | `{type, url, uploadedAt}[]` | Storage paths under `verification/{uid}/` |
| `createdAt` | timestamp | |
| `suspended` | boolean | admin can suspend abusive accounts |
| `photoURL` | string | optional |
| `savedSearches` | `{id, label, query}[]` | student saved filters |

### `listings/{listingId}`
| Field | Type | Notes |
|---|---|---|
| `ownerId` | string | uid of landlord |
| `title`, `description` | string | |
| `price` | number | PKR / month |
| `roomType` | `"single" \| "shared" \| "apartment" \| "hostel"` | |
| `genderRule` | `"boys" \| "girls" \| "any"` | |
| `areaSqft` | number | |
| `facilities` | string[] | e.g. wifi, ac, mess, laundry, security |
| `address`, `city` | string | |
| `location` | `{lat: number, lng: number}` | GeoPoint-compatible map |
| `distanceToUniversityKm` | number | landlord estimate; refined later |
| `universityId` | string | ref to `universities/{id}` |
| `images` | string[] | Storage download URLs |
| `status` | `"active" \| "paused" \| "removed"` | |
| `viewCount`, `enquiryCount` | number | incremented by functions/client |
| `createdAt`, `updatedAt` | timestamp | |
| `ai` | map | written by Cloud Function, see below |
| `aiFairPrice` | `{min, max, flag}` | reserved for Part 3 (price model) |
| `reviewStats` | `{count, average, fakeCount}` | reserved for Part 4 |

`ai` map:
```json
{
  "fraudScore": 0,
  "fraudLabel": "verified | suspicious | high_risk",
  "duplicateOf": "listingId|null",
  "duplicateSimilarity": 0.0,
  "reasons": ["..."],
  "mode": "bootstrap | trained",
  "modelVersion": "string",
  "analyzedAt": "Timestamp"
}
```

### `imageEmbeddings/{listingId}`
Written by the AI service via the Cloud Function (not directly by clients).
```json
{ "listingId": "...", "vectors": [[...]], "phashes": ["..."], "modelVersion": "...", "updatedAt": "Timestamp" }
```

### `reviews/{reviewId}`
`listingId`, `studentId`, `rating` (1–5), `text`, `createdAt`, and `ai: {authenticityScore, label}`
(reserved for Part 4).

### `chats/{chatId}/messages/{msgId}`
`chatId` = deterministic `[studentUid, landlordUid, listingId].sort().join("_")`.
Message fields: `senderId`, `text`, `createdAt`, `readBy: string[]`.

### `visitRequests/{id}`
`listingId`, `studentId`, `landlordId`, `preferredDate`, `message`, `status`
(`"pending" | "accepted" | "declined" | "completed"`), `createdAt`.

### `favorites/{uid_listingId}`
`studentId`, `listingId`, `createdAt`. Document id prevents duplicates.

### `flaggedQueue/{id}`
Created by `onListingWrite` when `ai.fraudLabel != "verified"`.
`listingId`, `ownerId`, `fraudScore`, `fraudLabel`, `reasons`, `duplicateOf`, `images`,
`status` (`"open" | "approved" | "removed"`), `createdAt`, `reviewedBy`, `reviewedAt`.

### `universities/{id}`
`name`, `city`, `lat`, `lng`.

## Storage layout
```
listings/{ownerUid}/{listingId}/{filename}  public read (images are served on the public portal)
verification/{uid}/{filename}            owner + admin read only
avatars/{uid}/{filename}                 public read
```

## Reserved fields for later parts
* `listings.aiFairPrice` — fair price range from the regression model (`POST /predict-price`).
* `listings.reviewStats` and `reviews.ai` — review authenticity (`POST /analyze-review`).
* `listings.recommendationTags` — optional cached tags from `POST /recommend`.
