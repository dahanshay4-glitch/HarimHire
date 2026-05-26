# Developer Notes

## Important UI Architecture Note

This project contains **standalone HTML files** AND **SPA-style embedded page sections**, especially inside `candidates.html`.

When applying global UI changes such as navbar, logo, fonts, page headers, dashboard cards, tables, filters, spacing, or branding, **apply them to all relevant embedded sections as well** — not only to `dashboard.html` or a single standalone file.

### Always verify changes visually on:
- `dashboard.html` (standalone)
- `candidates.html` (SPA — contains dashboard, candidates, and other embedded sections)
- `jobs.html`
- `clients.html`
- `job.html` (detail view)
- `candidate.html` (detail view)
- `new_job.html`
- `new_candidate.html`
- Any other HTML files that embed page sections via `<div class="page" id="page-...">`

### Why this matters
`candidates.html` is a single-page application: it embeds multiple pages (dashboard, candidates list, candidate detail panel, etc.) as hidden `<div>` sections. A change to `dashboard.html` does NOT automatically propagate to the `#page-dashboard` section inside `candidates.html` — both must be updated independently.