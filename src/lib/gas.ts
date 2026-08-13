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
  if (stock <= 0) return { label: "Out of stock", tone: "destructive" as const };
  if (stock < 15) return { label: "Low stock", tone: "warning" as const };
  return { label: "In stock", tone: "success" as const };
}

export function timeAgo(value: string | number | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: string | number | Date) {
  return new Date(value).toLocaleString(undefined, {
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

const FRIENDLY_ERRORS: Record<string, string> = {
  "Not signed in": "Please sign in and try again.",
  "Depot is not accepting requests": "This depot isn't accepting requests right now.",
  "Depot not found": "We couldn't find that depot.",
  "Only 1 cylinder can be requested at a time": "Only one cylinder can be requested at a time.",
  "You can request gas again after your cooling period ends":
    "You're still in your cooling period after your last collection.",
  "You already have gas allotted. Collect it before requesting again.":
    "You already have gas allotted - collect it before requesting another.",
  "You are already in this depot queue.": "You're already in this depot's queue.",
  "Not your depot": "That depot isn't yours to manage.",
  "Consumer not found": "We couldn't find that consumer.",
  "This account is not a consumer": "That account isn't a consumer profile.",
  "Consumer profile is not complete": "That customer hasn't finished their profile yet.",
  "This customer is still in their cooldown period": "That customer is still cooling down.",
  "This customer already has gas allotted elsewhere":
    "That customer already has gas allotted at another depot.",
  "This customer is already in your queue": "That customer is already in your queue.",
  "Entry not found": "That request no longer exists.",
  "Entry is not waiting": "That request isn't waiting anymore.",
  "Not enough stock": "There's not enough cylinder stock to allot that request.",
  "Cylinder is not allotted yet": "That cylinder hasn't been allotted yet.",
  "This is not your request": "That isn't your request.",
  "Not allowed": "You're not allowed to do that.",
  "Cannot cancel this request": "That request can't be cancelled right now.",
  "Please add a reason for cancelling": "Please write a reason before cancelling.",
  "That citizenship number is already in use": "That citizenship number is already registered.",
  "Missing profile details": "Please complete your profile details first.",
  "An account with that email already exists": "An account with that email already exists.",
  "Use at least 8 characters": "Use at least 8 characters for your password.",
  "Unable to sign in": "We couldn't sign you in. Check your email and password and try again.",
};

export function friendlyError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.replace(/^Uncaught ConvexError:\s*/i, "") : "";
  return FRIENDLY_ERRORS[raw] ?? fallback;
}
