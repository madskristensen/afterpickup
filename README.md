# After Pickup

Tips and tricks for home and family. Jekyll on GitHub Pages, served at
[www.afterpickup.com](https://www.afterpickup.com).

## Workflow

1. **Open a brief.** Use the *Post brief* issue template. One issue, one post.
2. **Label it `ready`.** The `assign-copilot-on-ready` workflow assigns the Copilot
   coding agent and comments on the issue.
3. **Copilot opens a draft PR** that adds a single `_queue/<slug>.md` file with an
   empty `date`. Nothing is live yet.
4. **Review and merge the draft PR.** Merging only means *approved*. The post sits in
   `_queue/`.
5. **Publish.** `publish-schedule` runs at 14:00 UTC on Mondays and Wednesdays (or on
   demand). It takes the oldest queued file, stamps today's date, sets `draft: false`,
   moves it to `_posts/YYYY-MM-DD-slug.md`, and pushes. One file per run. An empty
   queue is a no-op.
6. **Deploy and notify search engines.** The Pages workflow builds and deploys the
   site, publishes the IndexNow verification file, and submits recently changed
   sitemap URLs after the deployment succeeds.

## IndexNow setup

1. Generate an IndexNow key.
2. Add it as the `INDEXNOW_KEY` repository Actions secret.
3. In **Settings > Pages > Build and deployment**, set **Source** to **GitHub Actions**.

The key is written only to the deployed site artifact as `/<key>.txt`; it is not
stored in the repository. Until the secret is configured, deployment still succeeds
and the workflow logs a notice instead of submitting URLs.

## Directories

- `_queue/` — approved, not live.
- `_posts/` — public. Only the publish workflow writes here.

## Redmond weekly sources

Family first still means parks, events, food, library, and teens before council or budget. Coverage also includes a night out for parents: local venues, concerts, and theater, plus kids theater and concerts, plus big one-offs such as a circus or a touring family show. Do not invent a show. Add an item only when a public page lists a date inside that week's Monday to Sunday window.

When a week has both, use two headings: `For kids` and `Night out`. A single show can sit under one heading. One-offs (circus, touring family shows) go under `For kids` when they are aimed at families. Under each event headline, use one meta line: date · time · place. Add a photo only when a city, venue, or organizer picture is available, with a credit and a source link.

Check these every week, not only the city calendar:

- [City calendar](https://www.redmond.gov/Calendar.aspx), [NewsFlash](https://www.redmond.gov/m/NewsFlash/), and [Parks & Recreation](https://www.redmond.gov/165/Parks-Recreation)
- [Downtown Redmond Art Walk](https://www.redmond.gov/1967/Downtown-Redmond-Art-Walk) and [Arts in the Park](https://engage.oneredmond.org/events/arts-in-the-park)
- [KCLS Redmond](https://kcls.org/locations/redmond/)
- [SecondStory Repertory](https://www.secondstoryrep.org/), live theater at Redmond Town Center (night out)
- [Redmond Academy of Theatre Arts](https://www.redmondacademy.org/) (kids classes and shows)
- [Studio East](https://studio-east.org/) in Kirkland (not "Eastside Studio"). Check [season](https://studio-east.org/season) and [StoryBook Theater](https://studio-east.org/storybook-theater). No public audience show Sep 14–Oct 4, 2026. Young Frankenstein is listed for Oct 30–Nov 8.
- [Village Theatre](https://villagetheatre.org/) mainstage in Issaquah (night out) and [youth education](https://villagetheatre.org/youth-education/) (kids)
- [Lake Washington Symphony Orchestra](https://lwso.org/), concerts included, not only family or education programs
- [Kirkland Performance Center](https://www.kpcenter.org/get-tickets/), [Kirkland Arts Center fringe](https://kirklandartscenter.org/kirkland-fringe-festival/), and the [Meydenbauer theatre calendar](https://meydenbauer.com/theatre/attend-a-show/calendar-ticket-information/)
- Touring one-offs (circus, family shows) when a venue page lists a Redmond or Eastside date in that week.

## Labels

| Label | Meaning |
| --- | --- |
| `ready` | The brief is complete. Assigns the Copilot coding agent. |
| `draft` | A brief that is still being written by a human. |
| `queued` | The post is merged into `_queue/` and waiting for its slot. |
| `live` | The post has been published to `_posts/`. |

## Post front matter

```yaml
---
title: ""
description: ""
date:
image: ""
tags: []
---
```

## Local preview

```sh
bundle install
bundle exec jekyll serve
```
