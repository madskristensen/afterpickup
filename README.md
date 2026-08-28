# After Pickup

What actually works between pickup and lights-out. Jekyll on GitHub Pages, served at
[afterpickup.com](https://afterpickup.com).

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

## Directories

- `_queue/` — approved, not live.
- `_posts/` — public. Only the publish workflow writes here.

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
