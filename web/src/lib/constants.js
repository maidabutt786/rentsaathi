export const PAGE_SIZE = 9;

export const UNIVERSITIES = [
  { id: "ug-gujrat", name: "University of Gujrat", city: "Gujrat", lat: 32.6416, lng: 74.3002 },
  { id: "pu-lahore", name: "University of the Punjab", city: "Lahore", lat: 31.4984, lng: 74.2944 },
  { id: "qau-islamabad", name: "Quaid-i-Azam University", city: "Islamabad", lat: 33.7472, lng: 73.1389 },
];

export const CITIES = ["Gujrat", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"];

export const ROOM_TYPES = [
  { value: "single", label: "Single room" },
  { value: "shared", label: "Shared room" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "hostel", label: "Hostel" },
];

export const GENDER_RULES = [
  { value: "boys", label: "Boys only" },
  { value: "girls", label: "Girls only" },
  { value: "any", label: "Any student" },
];

export const FACILITIES = [
  "Wi-Fi",
  "Electricity backup",
  "Water supply",
  "Attached bathroom",
  "Furnished",
  "Kitchen",
  "Laundry",
  "Security guard",
  "CCTV",
  "Parking",
  "Air conditioning",
  "Study desk",
];

export const VERIFICATION_STATUS = {
  pending: { label: "Pending review", tone: "suspicious" },
  approved: { label: "Verified landlord", tone: "verified" },
  rejected: { label: "Verification rejected", tone: "highrisk" },
};

export const AI_LABELS = {
  verified: {
    label: "Verified",
    short: "AI verified",
    description: "No reused photos or unusual details were found in our checks.",
    tone: "verified",
  },
  suspicious: {
    label: "Suspicious",
    short: "Needs review",
    description: "Some signals look unusual. Please confirm details before paying.",
    tone: "suspicious",
  },
  high_risk: {
    label: "High risk",
    short: "High risk",
    description: "Strong signs of a reused photo or a misleading listing.",
    tone: "highrisk",
  },
  analyzing: {
    label: "Analyzing",
    short: "Analyzing photos",
    description: "Our AI is checking the photos and listing details.",
    tone: "info",
  },
};

export const VISIT_STATUS = {
  pending: { label: "Pending", tone: "suspicious" },
  accepted: { label: "Accepted", tone: "verified" },
  declined: { label: "Declined", tone: "highrisk" },
  completed: { label: "Completed", tone: "info" },
};

export const DEMO_CREDENTIALS = [
  { role: "Admin", label: "Admin", email: "admin@rentsaathi.pk", password: "RentSaathi123!" },
  { role: "Landlord", label: "Landlord 1", email: "landlord1@rentsaathi.pk", password: "RentSaathi123!" },
  { role: "Landlord", label: "Landlord 2", email: "landlord2@rentsaathi.pk", password: "RentSaathi123!" },
  { role: "Student", label: "Student 1", email: "student1@rentsaathi.pk", password: "RentSaathi123!" },
  { role: "Student", label: "Student 2", email: "student2@rentsaathi.pk", password: "RentSaathi123!" },
];

export const ROLE_HOME = {
  student: "/student",
  landlord: "/landlord",
  admin: "/admin",
};
