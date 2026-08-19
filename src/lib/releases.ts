export type ChangeKind = "feature" | "fix" | "improvement" | "security";

export interface ReleaseChange {
  kind: ChangeKind;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  name: string;
  summary: string;
  changes: ReleaseChange[];
}

export const releases: Release[] = [
  {
    version: "1.0.0",
    date: "2026-08-15",
    name: "Public Launch",
    summary:
      "YoGas is live for everyone. It installs like a real app, guards depots against queue abuse, and cleans out the last traces of the old backend.",
    changes: [
      {
        kind: "feature",
        text: "Installable progressive web app with app icons and service worker",
      },
      {
        kind: "security",
        text: "Public depot protections against hoarding and duplicate bookings",
      },
      { kind: "improvement", text: "Polished mobile home, depot, and waitlist screens" },
      { kind: "improvement", text: "Redesigned profile page" },
      { kind: "fix", text: "Removed leftover legacy Supabase code after the Convex migration" },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-08-14",
    name: "Native Mobile Experience",
    summary:
      "YoGas started to feel like a real app: swipeable request cards, native-style sheets, richer request details, and hardened session security.",
    changes: [
      { kind: "feature", text: "Swipeable request cards and bottom-sheet interactions" },
      { kind: "feature", text: "QR quick actions and detailed request views" },
      { kind: "security", text: "Robust session management with Convex auth" },
      { kind: "improvement", text: "Reworked dealer scan, stock, and waitlist flows" },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-08-13",
    name: "The Convex Migration",
    summary:
      "Replaced the Supabase backend with Convex for realtime data, and gave the project its name: YoGas.",
    changes: [
      { kind: "feature", text: "Realtime backend migration from Supabase to Convex" },
      { kind: "improvement", text: "Renamed the project to YoGas" },
      { kind: "fix", text: "Improved error handling across the app" },
      { kind: "improvement", text: "More reliable QR scanning experience" },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-08-12",
    name: "First Light",
    summary:
      "The very first foundation: the project scaffold, a full authentication system, and citizenship-aware forms.",
    changes: [
      { kind: "feature", text: "Project scaffold on TanStack Start" },
      { kind: "feature", text: "Complete authentication system" },
      { kind: "feature", text: "Citizenship and district fields on forms" },
      { kind: "improvement", text: "Project documentation and README" },
    ],
  },
];
