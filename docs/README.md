# Anonymous Suggestion Box — Documentation

This directory contains the documentation for the Anonymous
Suggestion Box MVP.

## Documents

- **`nurse-user-guide.md`** — End-user guide for the nurse-facing
  experience. How to submit a suggestion, how to read the
  reference number, how to check status, what to do and what
  not to do, the privacy promise, and a FAQ.
- **`admin-user-guide.md`** — End-user guide for the management
  dashboard. How to log in, the summary cards, filters, the
  detail sheet, internal notes, attachments, the workflow
  diagram, default credentials, and a reference to every API
  route.
- **`technical-overview.md`** — Architecture, stack, security
  model, database schema, environment variables, local
  development, deployment to Vercel with Neon Postgres, and a
  list of future work.

## Converting to PDF

The documents are written in plain Markdown. To turn them into
PDFs for sharing with non-technical readers:

```bash
# Requires pandoc and a TeX engine
pnpm docs:pdf
```

The PDFs are written to `docs/pdf/`.
