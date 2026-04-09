# RawStock - Legal Review Notes

This file is a concise legal review summary for external counsel.
It is not legal advice.

Last updated: April 2026

## Service Overview

- Product: RawStock (music marketplace/community with video and live features)
- Delivery: Web + app (Expo / React Native)
- Payments and payouts: Stripe (including Connect)
- Contact: `info@rawstock.live`

## Key Legal File Locations

- Legal hub: `app/legal.tsx`
- Terms of Service: `app/terms.tsx`
- Privacy Policy: `app/privacy.tsx`
- Legal Notice: `app/legal-notice.tsx`
- Tokusho page: `app/tokusho.tsx`
- DMCA policy: `app/dmca.tsx`
- Community Guidelines: `app/community-guidelines.tsx`
- Payout settings UI: `app/payout-settings.tsx`
- **Counsel review checklist:** `docs/COUNSEL_REVIEW_CHECKLIST.md`
- **DMCA internal runbook:** `docs/DMCA_RUNBOOK.md`
- Policy version constants: `constants/legalVersions.ts`
- User consent columns: `migrations/0015_users_policy_acceptance.sql`
- Server routes/schema: `server/routes.ts`, `server/schema.ts`
- Migration: `migrations/0012_users_payout_terms_agreed_at.sql`

## Review Focus for Counsel

1. Governing law and jurisdiction for global consumers.
2. UK requirements (including Online Safety Act applicability).
3. DMCA policy text vs real operational workflow.
4. Privacy disclosures vs actual subprocessors/data flow.
5. Platform moderation/reporting policy sufficiency.
6. Creator payout/tax wording and regional enforceability.
7. Consistency across `legal-notice` and `tokusho`.

## Notes

- Keep policy text and runtime behavior aligned.
- If legal content changes, update both UI copy and API behavior where relevant.
- Keep all contact references unified as `info@rawstock.live`.

- **info@rawstock.live**

---

*End of document*
