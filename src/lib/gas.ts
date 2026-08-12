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

export const CYLINDER_SIZES = ["14.2kg (Domestic)", "5kg (Small)", "47.5kg (Commercial)"];

export const NEPAL_DISTRICTS = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Kaski",
  "Rupandehi",
  "Morang",
  "Chitwan",
  "Sunsari",
  "Jhapa",
  "Banke",
  "Kailali",
  "Makwanpur",
  "Dhading",
  "Parsa",
  "Other",
];

export const STATUS_LABEL: Record<EntryStatus, string> = {
  waiting: "Waiting",
  allotted: "Allotted",
  collected: "Collected",
  cancelled: "Cancelled",
};

export function maskCitizenship(value: string | null | undefined) {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return "•".repeat(Math.max(2, trimmed.length - 4)) + trimmed.slice(-4);
}

export function stockLabel(stock: number) {
  if (stock <= 0) return { label: "Out of stock", tone: "destructive" as const };
  if (stock < 15) return { label: "Low stock", tone: "warning" as const };
  return { label: "In stock", tone: "success" as const };
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extracts a depot code or consumer id from a scanned QR payload. */
export function parseScanPayload(raw: string) {
  const text = raw.trim();
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
  if (/^GQ-C:/i.test(text)) return { kind: "consumer" as const, value: text.slice(5) };
  if (/^GQ-D:/i.test(text)) return { kind: "depot" as const, value: text.slice(5).toUpperCase() };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text)) return { kind: "consumer" as const, value: text };
  return { kind: "depot" as const, value: text.toUpperCase() };
}

export const consumerQrValue = (userId: string) => `GQ-C:${userId}`;
export const depotQrValue = (code: string) => `GQ-D:${code}`;
