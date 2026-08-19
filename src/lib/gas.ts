import i18n, { formatDate } from "./i18n";

export type EntryStatus = "waiting" | "allotted" | "collected" | "cancelled";

export type WaitlistEntry = {
  id: string;
  dealer_id: string;
  consumer_id: string;
  cylinder_size: string;
  quantity: number;
  note: string | null;
  status: EntryStatus;
  created_at: string;
  allotted_at: string | null;
  collected_at: string | null;
};

/** Only one cylinder type is distributed at the moment. */
export const CYLINDER_SIZE = "14.2kg";
export const CYLINDER_LABEL = "14.2 kg cylinder";

export const DEMO_ACCOUNTS = {
  consumer: { email: "demo.consumer@YoGas.app", password: "demo1234" },
  dealer: { email: "demo.dealer@YoGas.app", password: "demo1234" },
  admin: { email: "admin@YoGas.app", password: "admin1234" },
} as const;

export const NEPAL_DISTRICTS = [
  "Achham",
  "Arghakhanchi",
  "Baglung",
  "Baitadi",
  "Bajhang",
  "Bajura",
  "Banke",
  "Bara",
  "Bardiya",
  "Bhaktapur",
  "Bhojpur",
  "Chitwan",
  "Dadeldhura",
  "Dailekh",
  "Dang",
  "Darchula",
  "Dhading",
  "Dhankuta",
  "Dhanusha",
  "Dolakha",
  "Dolpa",
  "Doti",
  "Eastern Rukum",
  "Gorkha",
  "Gulmi",
  "Humla",
  "Ilam",
  "Jajarkot",
  "Jhapa",
  "Jumla",
  "Kailali",
  "Kalikot",
  "Kanchanpur",
  "Kapilvastu",
  "Kaski",
  "Kathmandu",
  "Kavrepalanchok",
  "Khotang",
  "Lalitpur",
  "Lamjung",
  "Mahottari",
  "Makwanpur",
  "Manang",
  "Morang",
  "Mugu",
  "Mustang",
  "Myagdi",
  "Nawalpur",
  "Nuwakot",
  "Okhaldhunga",
  "Palpa",
  "Panchthar",
  "Parasi",
  "Parbat",
  "Parsa",
  "Pyuthan",
  "Ramechhap",
  "Rasuwa",
  "Rautahat",
  "Rolpa",
  "Rupandehi",
  "Salyan",
  "Sankhuwasabha",
  "Saptari",
  "Sarlahi",
  "Sindhuli",
  "Sindhupalchok",
  "Siraha",
  "Solukhumbu",
  "Sunsari",
  "Surkhet",
  "Syangja",
  "Tanahun",
  "Taplejung",
  "Terhathum",
  "Udayapur",
  "Western Rukum",
  "Other",
];

export const STATUS_LABEL: Record<EntryStatus, string> = {
  waiting: "Waiting",
  allotted: "Allotted",
  collected: "Collected",
  cancelled: "Cancelled",
};

export function maskCitizenship(value: string | null | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return "•".repeat(Math.max(2, trimmed.length - 4)) + trimmed.slice(-4);
}

export function stockLabel(stock: number) {
  if (stock <= 0) return { key: "common:stockOut" as const, tone: "destructive" as const };
  if (stock < 15) return { key: "common:stockLow" as const, tone: "warning" as const };
  return { key: "common:stockIn" as const, tone: "success" as const };
}

export function timeAgo(value: string | number | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t("common:timeJustNow");
  if (mins < 60) return i18n.t("common:timeMinuteAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return i18n.t("common:timeHourAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return i18n.t("common:timeDayAgo", { count: days });
  return formatDate(value, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | number | Date) {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extracts a depot code or consumer id from a scanned QR payload. */
export function parseScanPayload(raw: string) {
  const text = raw.trim();
  if (/^GQ-C:/i.test(text)) return { kind: "consumer" as const, value: text.slice(5).trim() };
  if (/^GQ-D:/i.test(text))
    return { kind: "depot" as const, value: text.slice(5).trim().toUpperCase() };
  try {
    const url = new URL(text);
    const depot = url.searchParams.get("depot");
    if (depot) return { kind: "depot" as const, value: depot.toUpperCase() };
    const consumer = url.searchParams.get("consumer");
    if (consumer) return { kind: "consumer" as const, value: consumer };
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return { kind: "unknown" as const, value: last };
  } catch {
    /* not a url */
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text)) return { kind: "consumer" as const, value: text };
  return { kind: "unknown" as const, value: text.toUpperCase() };
}

export const consumerQrValue = (userId: string) => `GQ-C:${userId}`;
export const depotQrValue = (code: string) => `GQ-D:${code}`;

const ERROR_KEYS: Record<string, string> = {
  "Not signed in": "common:errorsNotSignedIn",
  "Depot is not accepting requests": "common:errorsDepotNotAccepting",
  "Depot not found": "common:errorsDepotNotFound",
  "Only 1 cylinder can be requested at a time": "common:errorsOneCylinderOnly",
  "You can request gas again after your cooling period ends": "common:errorsCoolingPeriod",
  "You already have gas allotted. Collect it before requesting again.":
    "common:errorsAlreadyAllotted",
  "You are already in this depot queue.": "common:errorsAlreadyInQueue",
  "Not your depot": "common:errorsNotYourDepot",
  "Consumer not found": "common:errorsConsumerNotFound",
  "This account is not a consumer": "common:errorsNotConsumer",
  "Consumer profile is not complete": "common:errorsProfileIncomplete",
  "This customer is still in their cooldown period": "common:errorsConsumerCooling",
  "This customer already has gas allotted elsewhere": "common:errorsAllottedElsewhere",
  "This customer is already in your queue": "common:errorsAlreadyInYourQueue",
  "Entry not found": "common:errorsEntryNotFound",
  "Entry is not waiting": "common:errorsEntryNotWaiting",
  "Not enough stock": "common:errorsNotEnoughStock",
  "Cylinder is not allotted yet": "common:errorsNotAllottedYet",
  "This is not your request": "common:errorsNotYourRequest",
  "Not allowed": "common:errorsNotAllowed",
  "Cannot cancel this request": "common:errorsCannotCancel",
  "Please add a reason for cancelling": "common:errorsReasonRequired",
  "That citizenship number is already in use": "common:errorsCitizenshipTaken",
  "Missing profile details": "common:errorsMissingProfile",
  "An account with that email already exists": "common:errorsEmailExists",
  "Use at least 8 characters": "common:errorsPasswordShort",
  "Unable to sign in": "common:errorsSignInFailed",
};

export function friendlyError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.replace(/^Uncaught ConvexError:\s*/i, "") : "";
  const key = ERROR_KEYS[raw];
  return key ? i18n.t(key) : fallback;
}
