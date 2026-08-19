import { common } from "./ns/common";
import { auth } from "./ns/auth";
import { landing } from "./ns/landing";
import { onboarding } from "./ns/onboarding";
import { dashboard } from "./ns/dashboard";
import { waitlist } from "./ns/waitlist";
import { dealers } from "./ns/dealers";
import { scan } from "./ns/scan";
import { profile } from "./ns/profile";
import { dealer } from "./ns/dealer";
import { notifications } from "./ns/notifications";
import { site } from "./ns/site";
import { about } from "./ns/about";
import { howItWorks } from "./ns/howItWorks";
import { howItWorksShort } from "./ns/howItWorksShort";
import { faq } from "./ns/faq";
import { contact } from "./ns/contact";
import { privacy } from "./ns/privacy";
import { terms } from "./ns/terms";
import { releases } from "./ns/releases";

export const resources = {
  en: {
    common: common.en,
    auth: auth.en,
    landing: landing.en,
    onboarding: onboarding.en,
    dashboard: dashboard.en,
    waitlist: waitlist.en,
    dealers: dealers.en,
    scan: scan.en,
    profile: profile.en,
    dealer: dealer.en,
    notifications: notifications.en,
    site: site.en,
    about: about.en,
    howItWorks: howItWorks.en,
    howItWorksShort: howItWorksShort.en,
    faq: faq.en,
    contact: contact.en,
    privacy: privacy.en,
    terms: terms.en,
    releases: releases.en,
  },
  ne: {
    common: common.ne,
    auth: auth.ne,
    landing: landing.ne,
    onboarding: onboarding.ne,
    dashboard: dashboard.ne,
    waitlist: waitlist.ne,
    dealers: dealers.ne,
    scan: scan.ne,
    profile: profile.ne,
    dealer: dealer.ne,
    notifications: notifications.ne,
    site: site.ne,
    about: about.ne,
    howItWorks: howItWorks.ne,
    howItWorksShort: howItWorksShort.ne,
    faq: faq.ne,
    contact: contact.ne,
    privacy: privacy.ne,
    terms: terms.ne,
    releases: releases.ne,
  },
} as const;
