# Admin User Guide

## Management Dashboard — Anonymous Suggestion Box

This guide explains how to use the management dashboard: how to
log in, how to read the summary, how to filter and search
suggestions, how to read a single suggestion, how to move it
through the workflow, how to add internal notes, and how to
download attachments.

The system is built to keep the nurse's identity private. The
dashboard never shows who submitted a suggestion, and it never
stores nurse names, emails, phone numbers, staff IDs, wards, or
shifts. Your job on the dashboard is to act on the *content* of
the suggestions, not to identify the people who wrote them.

---

## 1. Quick start

### URL

Open the dashboard at the URL your IT team has deployed.
By default the API runs on `http://localhost:3001` and the web
app on `http://localhost:5173`. In production, both are
configured by your deployment (e.g. Vercel).

### Default credentials (development only)

| Setting            | Value                                |
|--------------------|--------------------------------------|
| Admin email        | `admin@example.com`                  |
| Admin password     | `LocalAdmin!2026Secure`              |
| JWT secret         | `dev-only-secret-replace-in-production-9f8e7d6c5b4a3210` |

> **Production:** change all three. The values above are for
> local development only and are already in the `.env.example`
> as placeholders. Do not deploy with the default credentials.

### Test data in the database (after seeding)

When the system was first run against the development database, a
small set of test suggestions was created so the dashboard had
something to show. The reference codes are below.

| Reference    | Category  | Priority | Status     | Notes                                            |
|--------------|-----------|----------|------------|--------------------------------------------------|
| `SB-B9FKMU`  | Staffing  | High     | New        | The earliest seeded entry                        |
| `SB-KBWNYS`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-5SHZY8`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-LG4CJC`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-QQP49L`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-PD864Z`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-2C5V8L`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-YF6SG6`  | Other     | Normal   | New        | Seeded batch                                     |
| `SB-2ZT8H5`  | Equipment | High     | New        | Original Sprint 1 entry, no attachment           |
| `SB-8D6J4Q`  | Equipment | High     | New        | Sprint 2 entry with PDF attachment               |
| `SB-Z9WPUF`  | Staffing  | Normal   | New        | Sprint 2 entry with PDF attachment               |
| `SB-DJ7RZF`  | Equipment | High     | New        | Management-API checkpoint test                   |
| `SB-YSBSA7`  | Other     | Normal   | New        | Cross-suggestion isolation test                  |
| `SB-N4V5NC`  | Equipment | High     | New        | Status-lookup test (no attachment)               |
| `SB-ASJPEB`  | Equipment | High     | New        | Status-lookup test (no attachment)               |
| `SB-RMLQWZ`  | Equipment | High     | Closed     | Walked through the full workflow during QA      |

The exact counts visible on the dashboard depend on how many
suggestions you have created since seeding. Use any of the
reference codes above for a quick visual check.

If the database is empty (e.g. a fresh Neon instance), run the
seed script to recreate the admin, then use the public
submission page to create a few test suggestions. See
`technical-overview.md` for commands.

---

## 2. Logging in

1. Open the dashboard URL.
2. You will see the **Management Login** screen.
3. Enter the admin email and password from your `.env` file
   (or your Vercel environment variables in production).
4. Tap **"Sign in"**.

If the credentials are wrong, you will see "Invalid email or
password." The login is rate-limited to 5 attempts per IP per
15 minutes.

If you are already logged in and your session has expired, the
dashboard will automatically bounce you back to the login screen.

### Signing out

Tap the **"Sign out"** button at the top right of the dashboard.
The session cookie is cleared immediately and you are taken back
to the login page.

---

## 3. The dashboard layout

The dashboard has four areas:

```
┌──────────────────────────────────────────────────┐
│ HEADER: brand, your email, sign out               │
├──────────────────────────────────────────────────┤
│ SUMMARY CARDS: total + 5 status counts            │
├──────────────────────────────────────────────────┤
│ FILTERS: search, status, category, priority      │
├──────────────────────────────────────────────────┤
│ SUGGESTIONS LIST: cards you can tap               │
└──────────────────────────────────────────────────┘
```

Below the suggestion cards, the **detail sheet** slides up when
you tap a card.

---

## 4. Summary cards

The top of the dashboard shows six numbers:

| Card           | What it counts                                            |
|----------------|-----------------------------------------------------------|
| Total          | Every suggestion in the system                            |
| New            | Suggestions that have not been looked at yet             |
| Under Review   | Suggestions currently being investigated                 |
| Pending        | Suggestions waiting on something (e.g. another team)     |
| Actioned       | Suggestions where action has been taken                   |
| Closed         | Suggestions that are finished                             |

These numbers update automatically when you change a
suggestion's status.

---

## 5. Filters and search

The filter bar has:

- **Search** — finds text inside the reference code OR the
  suggestion message. Case-insensitive. Press Enter to apply.
- **Status** — `All statuses` (default), `New`, `Under Review`,
  `Pending`, `Actioned`, `Closed`.
- **Category** — `All categories` (default), `Patient Care`,
  `Staffing`, `Equipment`, `Workplace Safety`, `Staff Welfare`,
  `Management`, `Communication`, `Other`.
- **Priority** — `All priorities` (default), `Low`, `Normal`,
  `Important`, `Urgent`.
- **Clear filters** — appears only when at least one filter is
  active. Resets every filter at once.

Filters apply automatically when you change them. The
suggestion list below re-fetches and the result count updates.

If the result list is empty after you apply a filter, the
dashboard shows:

```
No suggestions found

Try changing your filters or search term.
[ Clear filters ]
```

---

## 6. The suggestion list

Each suggestion appears as a card:

```
┌────────────────────────────────────────────┐
│ SB-B9FKMU                        [ New ]   │
│                                            │
│ 2 Sep 2026                                 │
│                                            │
│ [ Staffing ]  [ High ]                     │
│                                            │
│ 📎 0 attachment(s)   💬 0 note(s)          │
└────────────────────────────────────────────┘
```

- The reference code is in the top-left, in a monospaced font so
  you can read it clearly.
- The status badge is in the top-right, color-coded.
- Below the date, two small badges show the category and the
  priority.
- The bottom row shows how many attachments and how many internal
  notes this suggestion has.

Tap a card to open the detail sheet.

---

## 7. The detail sheet

The detail sheet slides up from the bottom on a phone, and
appears as a centered dialog on a tablet or desktop. The sheet
has six sections, in this order:

### 7.1 Header

A back button, the reference code (centered), and an invisible
spacer so the layout stays balanced.

### 7.2 Status and category

A row of small badges (category, priority, current status)
followed by the date the suggestion was submitted.

### 7.3 The suggestion

The full text of what the nurse wrote, displayed in a soft-grey
panel. The message cannot be edited once submitted; if you need
to add information, use the internal notes section.

### 7.4 Attachments

If the suggestion has attachments, they are listed here with:

- Original file name
- MIME type
- File size (B / KB / MB)
- A **Download** button

Tap **Download** to fetch the file. The browser will save it
using the original name. The download is authenticated: only
admins who are currently signed in can pull attachments.

If there are no attachments, the section reads "No attachments."

### 7.5 Internal notes

A list of every internal note, newest first, with the timestamp.
Below the list, a textarea lets you add a new note. Notes are
1–5000 characters and are **only visible to admins** — nurses
cannot see them on the public status page.

### 7.6 Status

A row of "Move to ..." buttons, one for each legal next state.
The buttons reflect the workflow rules:

```
NEW
 ↓
UNDER_REVIEW
 ├──→ PENDING
 │     └──→ UNDER_REVIEW
 │           └──→ ACTIONED
 │
 └──→ ACTIONED
        ↓
      CLOSED
```

If the suggestion is `CLOSED`, this section reads "This
suggestion is closed. No further transitions available." because
`CLOSED` is a terminal state.

The backend is the final authority on which transitions are
allowed. The UI only shows the buttons that should work, but if
something goes wrong the API will respond with
`409 INVALID_STATUS_TRANSITION` and the dashboard will show the
error message.

---

## 8. Workflow in detail

The status workflow has five states. They are designed to mirror
how a real hospital team would handle a suggestion.

| From          | Allowed next steps                | When to use it                                    |
|---------------|-----------------------------------|---------------------------------------------------|
| New           | Under Review                      | The first thing a reviewer does                   |
| Under Review  | Pending, Actioned                 | "Need more time" or "ready to act"                |
| Pending       | Under Review, Actioned            | Waiting resumed, or the action has been taken     |
| Actioned      | Closed                            | The work is complete                               |
| Closed        | (none)                            | Terminal state                                     |

When you change a status, three things happen in the dashboard:

1. The status badge updates immediately.
2. The summary cards re-fetch and reflect the new counts.
3. The list updates if you have a filter that depends on the
   status.

---

## 9. Internal notes

Internal notes are short, free-form messages attached to a
suggestion that only admins can see. They are not part of the
suggestion itself, and they are not shown to the nurse on the
public status page.

Common uses:

- "Forwarded to procurement on 4 Sep."
- "Spoke with night-shift lead; action agreed."
- "Awaiting confirmation from HR."

To add a note:

1. Open the suggestion's detail sheet.
2. Scroll to **Internal notes**.
3. Type your note in the textarea.
4. Tap **"Add note"**.

The note is saved, the list updates, and the textarea clears so
you can write another.

Notes are append-only. There is no "edit" or "delete" in the MVP.
If you need to amend something, add a new note explaining the
correction.

---

## 10. Attachments

The nurse can attach up to 5 files per suggestion. Allowed
types:

- JPG, JPEG
- PNG
- WebP
- PDF
- DOCX

Each file is up to 10 MB. Total per submission is up to 25 MB.
On the server, the file is stored under a UUID-based name; the
nurse-supplied filename is kept only as metadata. This means an
attacker cannot use a path-traversal filename to read or
overwrite arbitrary files.

To download an attachment:

1. Open the suggestion's detail sheet.
2. Scroll to **Attachments**.
3. Tap **Download** next to the file you want.

The download is authenticated with the same HttpOnly cookie you
used to sign in. There is no public URL for the file.

---

## 11. Reference: API routes for admins

If you are testing the API directly (e.g. with `curl` or
Postman) or writing a small integration script, the routes are:

| Method | Path                                                                | Auth      | Purpose                                          |
|--------|---------------------------------------------------------------------|-----------|--------------------------------------------------|
| POST   | `/api/v1/admin/login`                                              | none      | Returns a JWT in an HttpOnly cookie              |
| POST   | `/api/v1/admin/logout`                                             | none      | Clears the cookie                                |
| GET    | `/api/v1/admin/me`                                                 | cookie    | Returns the current admin                        |
| GET    | `/api/v1/admin/dashboard/summary`                                  | cookie    | Counts by status + total                         |
| GET    | `/api/v1/admin/suggestions`                                        | cookie    | List (filters: status, category, priority, search; pagination: page, limit) |
| GET    | `/api/v1/admin/suggestions/:id`                                    | cookie    | Full detail with attachments[] and notes[]      |
| PATCH  | `/api/v1/admin/suggestions/:id`                                    | cookie    | Status transition (enforces allowedTransitions) |
| POST   | `/api/v1/admin/suggestions/:id/notes`                              | cookie    | Add internal note                                |
| GET    | `/api/v1/admin/suggestions/:id/attachments/:attachmentId`          | cookie    | Authenticated attachment download (streams file)|

All admin routes are gated by `requireAdmin`. Any unauthenticated
request returns `401 UNAUTHORIZED`.

### Example: log in and pull the summary with curl

```bash
# Save the session cookie to a file
curl -c cookies.txt -X POST http://localhost:3001/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"LocalAdmin!2026Secure"}'

# Read the summary
curl -b cookies.txt http://localhost:3001/api/v1/admin/dashboard/summary

# List suggestions, newest first, page 1
curl -b cookies.txt "http://localhost:3001/api/v1/admin/suggestions?page=1&limit=20"

# Filter by status
curl -b cookies.txt "http://localhost:3001/api/v1/admin/suggestions?status=NEW"

# Search for a substring in the message
curl -b cookies.txt "http://localhost:3001/api/v1/admin/suggestions?search=BP"

# Move a suggestion to Under Review
curl -b cookies.txt -X PATCH http://localhost:3001/api/v1/admin/suggestions/SUGGESTION_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"UNDER_REVIEW"}'

# Add an internal note
curl -b cookies.txt -X POST http://localhost:3001/api/v1/admin/suggestions/SUGGESTION_ID/notes \
  -H "Content-Type: application/json" \
  -d '{"note":"Forwarded to procurement."}'

# Sign out
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/v1/admin/logout
```

---

## 12. Reference: public nurse routes

These are not for admins, but if you are testing end-to-end:

| Method | Path                                  | Auth | Purpose                              |
|--------|---------------------------------------|------|--------------------------------------|
| POST   | `/api/v1/suggestions`                 | none | Submit anonymously (multipart)       |
| GET    | `/api/v1/suggestions/:referenceCode`  | none | Public status lookup                 |

The POST returns only the reference code and status. The GET
returns only the reference code and status. Neither endpoint
ever returns the message, attachments, internal notes, or any
identity data — that information exists only on the admin side.

---

## 13. Error codes

When something goes wrong, the API returns a JSON body with a
machine-readable `code`:

| HTTP | Code                          | When                                            |
|------|-------------------------------|-------------------------------------------------|
| 400  | `VALIDATION_ERROR`            | Bad input, missing fields, bad id format        |
| 401  | `UNAUTHORIZED`                | No cookie or invalid token                      |
| 401  | `INVALID_CREDENTIALS`         | Wrong email or password on login                |
| 404  | `NOT_FOUND`                   | Suggestion or attachment not found               |
| 404  | `FILE_NOT_FOUND`              | Attachment metadata exists but file is gone      |
| 409  | `INVALID_STATUS_TRANSITION`   | Tried to skip a step in the workflow            |
| 429  | (rate limit headers)          | Too many login attempts or submissions          |
| 500  | (no code)                     | Server error (check logs)                        |

The dashboard reads the `code` and shows a friendly message in
the inline error alert at the bottom of the detail sheet.

---

## 14. Best practices

- **Act quickly on Urgent items.** Anyone who marks their
  suggestion as Urgent believes patient or staff safety may be
  at risk. Treat it like a priority page.
- **Move New items to Under Review within a day.** This signals
  to the nurse that someone has seen the suggestion, even if
  nothing else has happened.
- **Use internal notes, not status changes, to track progress.**
  A status change is a public commitment; a note is a private
  journal entry.
- **Do not include identifiable information in your notes**
  unless it is strictly necessary. Even within an admin
  interface, less identifying data is better.
- **Download attachments promptly.** Attachments are stored on
  the API server; if you need a permanent record, save the file
  somewhere the hospital controls.

---

*For deployment, environment variables, and architecture, see
`technical-overview.md`. For the end-user perspective, see
`nurse-user-guide.md`.*
