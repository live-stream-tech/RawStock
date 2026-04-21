# External counsel review checklist (RawStock)

This document supports the baseline review described in [LEGAL.md](./LEGAL.md). It is not legal advice.

**Operator contact (unified):** info@rawstock.live

## How to use

- Bring this file to the first counsel session with [LEGAL.md](./LEGAL.md).
- Record decisions and dates in the **Counsel notes** column (or attach memo).

| # | Topic | Questions for counsel | Counsel notes |
|---|--------|------------------------|---------------|
| 1 | Governing law & jurisdiction | Are Japan governing law + Tokyo courts appropriate for all user segments? When must local mandatory consumer protections override forum selection? | |
| 2 | UK / EU | Does the service trigger UK Online Safety Act duties, EU DSA, or GDPR-only obligations beyond current Privacy Policy articles? | |
| 3 | US / DMCA | Is the [DMCA policy](../app/dmca.tsx) text sufficient? Does operational handling match [DMCA_RUNBOOK.md](./DMCA_RUNBOOK.md)? Repeat infringer policy adequate? | |
| 4 | Privacy & subprocessors | Does disclosure match actual flows (Neon, Cloudflare, Google, Stripe, Upstash, Anthropic, on-device `franc` language detection)? Any gap for cross-border transfer mechanisms? | |
| 5 | Children | Terms state age 13+ with parental consent 13–17. Is self-certification enough for target markets? | |
| 6 | Platform / creator liability | For Stripe Connect, tickets, paid video, and live: who is merchant of record / seller for consumer law (Japan 特商法, EU, etc.)? | |
| 7 | Moderation & reports | Are reporting, takedown timelines, and appeals described consistently across Terms and Community Guidelines? | |
| 8 | Consent evidence | Are stored `terms_accepted_version` / `privacy_accepted_version` + timestamps adequate evidence for disputes and regulatory inquiries? | |
| 9 | tokusho / legal notice | Consistency between [tokusho](../app/tokusho.tsx) and [legal-notice](../app/legal-notice.tsx) for Japanese consumers. | |

## Related engineering artifacts

- Policy version constants: `constants/legalVersions.ts`
- User acceptance columns: `migrations/0015_users_policy_acceptance.sql`
- API: `POST /api/auth/accept-policies`, fields on `GET /api/auth/me`
- Video upload compliance flag: `POST /api/videos` requires `complianceAcknowledged: true`
