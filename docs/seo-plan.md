# Growlog public SEO plan

This document outlines search intent, URL strategy, and content work for [growlog.ai](https://growlog.ai). Technical foundations (canonical host, sitemap, metadata, JSON-LD) ship in code; **content pages below are not built yet**.

## Positioning

Growlog is a **grow log / farm journal** for cannabis and other cultivators: event timeline, Tuya (SmartLife) sensors, photos, SOPs, team invitations, and a **hydroponics nutrient calculator** with manufacturer catalogs. Product UI is **English and Russian** (plus other staff locales in-app).

## Target queries (priority)

| Intent | Example queries | Primary URL today | Future landing |
| --- | --- | --- | --- |
| Brand + category | grow log app, grow diary app, cannabis grow journal | `/` | Home (SSR) |
| Nutrient tooling | hydroponics nutrient calculator, fertilizer dose calculator, EC target calculator | `/nutrient/calculator` | Feature page + calculator |
| Hardware | Tuya grow sensors, SmartLife greenhouse sensors, grow room temperature logging | `/` (features) | `/features/sensors` |
| Journaling | grow journal template, daily grow log, cultivation timeline | `/` | `/features/timeline` |
| Team / compliance | farm grow log multi user, cultivation SOP checklist | `/help` | `/features/team-sops` |
| RU market | журнал гровера, дневник гровера, калькулятор питательного раствора | `/` + `?lang=ru` | Same paths with RU copy |

## Indexable surface (current)

- `/` — marketing home  
- `/help` — product help entry  
- `/nutrient/calculator`, `/nutrient/help`, `/nutrient/sources` — public calculator cluster  

Everything under `/auth`, `/api`, `/dashboard`, app shells, CMS, and onboarding stays **noindex** (see `app/robots.ts`).

## Suggested new pages (content backlog)

1. **Features hub** — `/features` linking to deep dives (timeline, AI advisor, sensors, photos, SOP, reports).  
2. **Integrations** — `/integrations/tuya` (setup, privacy, what data is stored).  
3. **Nutrient calculator** — `/nutrient` overview (non-tool marketing copy pointing to calculator).  
4. **Use cases** — `/for/indoor`, `/for/greenhouse`, `/for/craft-cannabis` (jurisdiction-aware disclaimers).  
5. **Pricing / access** — `/pricing` or `/start` when billing story is public (avoid fake prices in schema).  
6. **Blog / guides** — `/guides/grow-log-best-practices`, `/guides/vpd-and-sensors`, `/guides/feeding-records` (evergreen, link to in-app workflows).

## Content ideas (articles & on-page)

- **Grow diary vs chat AI**: why event-backed journals beat generic ChatGPT for compliance and traceability.  
- **Connecting Tuya devices**: farm-scoped sensor ingest, min/max aggregates on the timeline.  
- **Nutrient calculator**: how catalogs map to label data, EC caps, and feeding events on the cycle.  
- **Bilingual ops**: running EN/RU crews on one farm (invitations, locale cookie, hreflang).  
- **SOP + journal**: closing the loop between procedures, overdue tasks, and daily capture.  
- **Photo timelines**: vision-assisted comparisons without claiming medical diagnoses.

## On-page SEO hygiene (ongoing)

- Unique **title + meta description** per public URL (EN primary; RU via `?lang=ru` + hreflang).  
- One **H1** per page; feature sections use **H2/H3** (home already structured).  
- Internal links: home → calculator, help, sign-in; calculator cluster cross-links.  
- **Open Graph** image: `/og-logo.jpg` (replace with branded 1200×630 when available).  
- Monitor **Search Console** coverage after deploy (see runbook below).

## Measurement

- Google Search Console property on **apex** `https://growlog.ai` (www redirects 301 to apex).  
- Track impressions/clicks for calculator and “grow journal” clusters separately.  
- Optional: Plausible/Umami on marketing routes only (respect cookie/consent policy).

## GSC follow-ups after deploy

1. Verify `NEXT_PUBLIC_SITE_URL=https://growlog.ai` in Coolify and redeploy.  
2. Confirm `https://growlog.ai/robots.txt` and `https://growlog.ai/sitemap.xml` return **200**.  
3. Submit sitemap in GSC → Sitemaps → `https://growlog.ai/sitemap.xml`.  
4. **URL inspection** for `/` and `/nutrient/calculator` — request indexing once canonical and hreflang look correct.  
5. Add **domain property** or ensure www + apex both verified; expect www to consolidate to apex via 301.  
6. Review **Page indexing** report for accidental inclusion of `/auth/login` or `/dashboard` (should be excluded).  
7. Enhancements → **Unparsable structured data** (JSON-LD Organization + SoftwareApplication on home).

## Environment

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://growlog.ai` (no trailing slash) |

Local development may leave it empty (`http://localhost:3000` fallback).
