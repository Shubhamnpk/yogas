import { describe, expect, it } from "vitest";
import i18n, { appLocale } from "../src/lib/i18n";
import { resources } from "../src/lib/i18n/resources";

describe("i18n", () => {
  it("loads English by default in a non-browser environment", () => {
    expect(appLocale()).toBe("en");
    expect(i18n.t("nav.home")).toBe("Home");
    expect(i18n.t("profile")).toBe("Profile");
  });

  it("switches to Nepali and back", async () => {
    await i18n.changeLanguage("ne");
    expect(i18n.language).toBe("ne");
    expect(appLocale()).toBe("ne");
    expect(i18n.t("nav.home")).toBe("गृह");
    expect(i18n.t("nav.waitlist")).toBe("पर्खाइ सूची");
    expect(i18n.t("profile")).toBe("प्रोफाइल");
    expect(i18n.t("signOut")).toBe("साइन आउट");
    expect(i18n.t("scan")).toBe("स्क्यान");

    await i18n.changeLanguage("en");
    expect(i18n.language).toBe("en");
    expect(i18n.t("nav.home")).toBe("Home");
  });

  it("never returns a raw key for any translation entry", () => {
    for (const lang of ["en", "ne"] as const) {
      const walk = (nsName: string, obj: object, prefix = "") => {
        for (const [key, value] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "string") {
            const result = i18n.t(path, { lng: lang, ns: nsName });
            if (result === path) {
              // Skip values that are identical to their key (e.g. active = "active")
              expect(value, `${lang}:${nsName} ${path} is tautological`).toBe(key);
            } else {
              expect(result, `${lang}:${nsName} ${path}`).not.toBe(path);
            }
          } else {
            walk(nsName, value, path);
          }
        }
      };
      for (const [nsName, nsBundle] of Object.entries(resources[lang])) {
        walk(nsName, nsBundle);
      }
    }
  });
});
