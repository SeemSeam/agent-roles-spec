---
name: mobile-release-readiness
description: Review mobile app release readiness for App Store, Google Play, TestFlight, Play testing tracks, EAS, CI/CD, privacy permissions, metadata, screenshots, subscriptions, in-app purchases, account deletion, tracking consent, and store rejection risk.
---

# Mobile Release Readiness

Use this skill before beta distribution, app-store submission, release review,
or when store rejection/compliance risk is part of the request.

Read `references/mobile-quality-and-release.md` when App Store, Google Play,
privacy, metadata, or release gates matter.

## Workflow

1. Identify release target:
   - TestFlight;
   - App Store;
   - Play internal/closed/open testing;
   - production Play release;
   - Expo EAS build/update;
   - enterprise or side-loaded distribution.
2. Inventory release files and settings:
   - bundle id/application id;
   - version/build numbers;
   - app icons and launch screens;
   - permissions and purpose strings;
   - privacy manifests/disclosures;
   - app links/deep links;
   - signing configuration names, not secret values;
   - store metadata and screenshots.
3. Check high-risk areas:
   - hardcoded secrets;
   - private APIs;
   - tracking consent;
   - account deletion;
   - payments/IAP/subscriptions;
   - UGC moderation;
   - kids, health, finance, gambling, VPN, MDM, or location claims;
   - incomplete app flows or placeholder content.
4. Separate advice from authority:
   - cite platform guidance when available;
   - do not claim approval certainty;
   - mark items that need human/legal/product review.
5. Produce a release gate checklist.

## Output

Return:

- release target and assumptions
- blockers
- high-risk warnings
- metadata/privacy gaps
- test evidence needed
- recommended release sequence

Do not upload builds, submit apps, sign binaries, or store credentials.
