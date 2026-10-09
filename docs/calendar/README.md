# YES private social calendar

The calendar is **available only to signed-in people on the whitelist**. Google Sheets is still the event CMS. By default a private `Access` tab in the same Sheet holds the whitelist, so **Airtable is not required**. An Airtable-backed whitelist is also supported using the website's existing integration.

The frontend retains the custom agenda, month grid, filters, featured events, and event details. Authentication adds one dependency, `jose`, for signed sessions and Google ID-token verification. Serving this calendar now requires the existing Next.js server; copying it to a static host would not provide authentication.

## Architecture and access rules

1. A visitor opens `/calendar/index.html`. The server checks their signed, eight-hour session cookie and looks up their email in the whitelist. Without access, it returns the sign-in page instead of calendar HTML.
2. Google sign-in verifies the user's account. The server verifies the Google token signature, audience, issuer, expiry, nonce, and verified email, with state and PKCE protecting the authorization-code exchange.
3. The server issues a secure, HTTP-only, SameSite=Lax session **only after** checking the whitelist.
4. `/api/calendar/events` repeats the session and whitelist checks on **every request**. Removing/disabling an email blocks its next request, even with a still-valid session.
5. Only the server calls Apps Script, using a separate secret in a POST body. Direct GET requests to Apps Script return `unauthorized`. Neither the secret nor the upstream URL is shipped to the browser.
6. Apps Script returns only Published events with Public, YES, or Common Room visibility. Board Only rows, all other statuses, owner, notes, and spreadsheet metadata stay private. The website repeats the field allowlist and publication check before returning JSON.

The whitelist gates the **entire** calendar. A row marked `Public` is still only visible to approved signed-in members. YES/Common Room labels do not yet define separate member groups. The full internal planning dataset is still not exposed to members.

No access lookup is cached. A failed lookup denies access; a failed refresh clears displayed event data. The page refreshes every five minutes while visible and when returning to the tab. Removing a member cannot retract information they have already seen or copied; it prevents further authorized requests. An idle visible page can show previously loaded content until its next refresh. Protected responses use `private, no-store` and are excluded from search indexing.

## Files

```text
content/calendar/index.html          Calendar HTML, outside public static files
public/calendar/styles.css          Shared calendar/sign-in styles
public/calendar/script.js           Authenticated browser UI
public/calendar/data.js             Date handling and API loading
app/calendar/index.html/route.ts    Server-gated HTML
app/calendar/sign-in/route.ts       Sign-in/setup/denial screen
app/api/calendar/events/route.ts    Session + whitelist gated event API
app/api/calendar/auth/              Google start/callback and logout handlers
lib/calendar/                      Configuration, tokens, access, backend calls

docs/calendar/Code.gs               Secret-protected Apps Script backend
docs/calendar/sample-events.csv     Eight fictional event rows and all headers
docs/calendar/sample-events.json    Test fixture only; not publicly served
docs/calendar/README.md             This guide
```

## 1. Prepare the private Google Sheet

Create a board-owned Google Sheet. Share edit permissions only with maintainers. Do not publish it to the web.

Create an **Events** tab with these exact, unique column names (order is flexible):

```text
id	event_name	event_type	start_date	start_time	end_date	end_time	location	status	visibility	owner	description	rsvp_url	image_url	featured	notes
```

You can import `sample-events.csv` as a template. Delete its fictional events or change them to Idea before launch. Set **File → Settings → Time zone** to Eastern Time / New York.

- `event_name` and a valid `start_date` are required for publication. Blank names are skipped.
- Types: Builder Night, Social, Dinner, Speaker, Workshop, Trip, Common Room, Partner Event, Office Hours, Other. Filters follow the actual dataset.
- Statuses: Idea, Planning, Tentative, Confirmed, Published, Completed, Cancelled. Only exact **Published** is shown to members.
- Visibility: Board Only, YES, Common Room, Public. Board Only and blank/unknown values are always excluded.
- `owner` and `notes` are internal. Descriptions and locations are visible to all approved members.
- `featured`: TRUE or a checked checkbox. `id`: a stable unique event ID is recommended.
- `rsvp_url`: paste the full HTTPS Luma event URL (`https://lu.ma/...` or `https://luma.com/...`). The event dialog shows a **Luma** button beside Add to Calendar and the invite icon. Links to other registration providers retain an **RSVP** label. Leave blank to hide the button. Links open in a new tab; Sheet edits appear on refresh without redeployment.
- `image_url`: optional direct HTTPS image URL. Images are fetched from their host; use member-safe images. Image and Luma URLs have their own access rules and are not made private by this website's whitelist.

For the default whitelist, create an **Access** tab:

| email | enabled |
| --- | --- |
| approved.member@yale.edu | TRUE |

Use one row per approved email and checkboxes in `enabled`. Only TRUE/checked grants access. Email matching is case-insensitive and trims whitespace, but does not equate aliases, Gmail dots, or `+` addresses. Add the actual email Google returns for that person. Avoid duplicate emails; any enabled duplicate grants access. To revoke, disable every matching row or delete it. The whitelist itself is never returned to visitors.

## 2. Install the private Apps Script backend

1. In the Sheet open **Extensions → Apps Script**, and replace `Code.gs` with this folder's version. Save.
2. In **Project Settings → Script properties**, set:
   - `SPREADSHEET_ID`: the portion between `/d/` and `/edit` in the Sheet URL.
   - `CALENDAR_BACKEND_SECRET`: a newly generated random secret, at least 32 characters. Generate it locally with `openssl rand -hex 32`. The same value belongs in the website's server environment, never frontend code.
3. Set the script timezone to America/New_York. The spreadsheet timezone is authoritative.
4. Optionally run `configureEventSheet` once to add event dropdowns, checkbox validation, date/time formatting, and frozen headers. It does not clear existing rows.
5. **Deploy → New deployment → Web app**. Execute as **Me** (the board-owned maintainer), access **Anyone**. This lets the website server reach the endpoint; the application-level secret in `doPost` controls access to its data. A direct unauthenticated GET must return `{"error":"unauthorized"}`, not events.
6. Authorize your own script and copy the Web app URL ending `/exec`. Put it in the website's `CALENDAR_APPS_SCRIPT_URL` environment variable. Do not use the editor-only `/dev` URL.

If an earlier public deployment exists, update or archive **every old public deployment** so no previous `/exec` URL still exposes events. Updating files in this repository does not revoke an already-deployed Google web app. For updates: **Deploy → Manage deployments → Edit → New version → Deploy**. Sheet row edits do not require redeployment.

Some Workspace policies prohibit anonymous web app reachability. If that option is unavailable, the deployment needs an administrator-approved account or an alternative server-to-Google integration. Do not publish the Sheet itself as a workaround.

## 3. Configure Google sign-in

In a board-owned [Google Cloud project](https://console.cloud.google.com/), configure **Google Auth Platform** branding and audience, then create an OAuth client of type **Web application**. Request only the `openid` and `email` scopes.

Add this exact authorized redirect URI:

```text
https://yesyale.org/api/calendar/auth/callback
```

For local development, also add:

```text
http://localhost:3000/api/calendar/auth/callback
```

Store the client ID and secret in the server environment. If the OAuth app is in Testing, add the people testing it to Google's test-user list too; the Google test list and YES whitelist are independent. Configure the appropriate audience/publishing status before launch. An Internal Google app permits only its Workspace organization even if the YES whitelist includes outsiders.

Sign-in currently accepts **Gmail and Google Workspace-managed addresses** (including a Yale account if managed in Google Workspace). Google must assert `email_verified` and either a Gmail address or the Workspace `hd` claim. Third-party email addresses merely attached to a consumer Google account are rejected because Google is not authoritative for their current ownership. Supporting those addresses requires email-link authentication or another verified identity provider. No wildcard `@yale.edu` grant exists: every email must be individually approved.

Sources: [Google's OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect), [Google email-authority guidance](https://developers.google.com/identity/sign-in/web/backend-auth), [Apps Script web apps](https://developers.google.com/apps-script/guides/web).

## 4. Set the website environment

Copy the entries from `.env.example` into local or hosting-provider environment settings:

```text
CALENDAR_ORIGIN=https://yesyale.org
CALENDAR_GOOGLE_CLIENT_ID=your-client-id
CALENDAR_GOOGLE_CLIENT_SECRET=your-client-secret
CALENDAR_SESSION_SECRET=a-separate-random-secret-of-at-least-32-characters
CALENDAR_BACKEND_SECRET=the-same-secret-as-in-apps-script-properties
CALENDAR_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
CALENDAR_WHITELIST_PROVIDER=sheet
```

Generate **two different** secrets with `openssl rand -hex 32`: one for sessions, one for the backend. No value should use a `NEXT_PUBLIC_` prefix. Rotate the session secret to invalidate every session. Use HTTPS in production; `http://localhost:3000` is permitted with `npm run dev` and matching `CALENDAR_ORIGIN`.

The browser now always calls `/api/calendar/events`. There is no demo mode, browser API-key configuration, or public sample endpoint. Missing configuration keeps access closed and shows a setup message. A serverless deployment includes the private HTML through `outputFileTracingIncludes` in `next.config.ts`.

## Optional: use Airtable for the whitelist

The Google Sheet can remain the event CMS while Airtable stores access. Create a table called **Calendar Access** in your existing base with:

- **Email**: email or single-line text field.
- **Enabled**: checkbox.

Set:

```text
CALENDAR_WHITELIST_PROVIDER=airtable
CALENDAR_AIRTABLE_ACCESS_TABLE=Calendar Access
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_TOKEN=your-server-only-personal-access-token
```

Grant the Airtable token `data.records:read` access to that base. The calendar does not need schema-write or record-write permissions. Existing intake features may separately need write access. With this provider, the Access Sheet tab is not consulted. The lookup requests only the matching email and checkbox, checks the result again, and fails closed on errors/rate limits. [Airtable formula filtering](https://support.airtable.com/docs/airtable-web-api-using-filterbyformula-or-sort-parameters)

## Day-to-day board usage

**Events:** add/edit a row, set status to Published and an allowed visibility, and let Google Sheets save automatically. Keep early plans as Idea, Planning, Tentative, or Confirmed. Changes appear on the next page load or refresh without code changes.

**Access:** add a person's actual sign-in email and enable it in the configured whitelist. Disable or delete that email to revoke further access. No website deployment is needed for these edits.

## Date behavior

Use native Sheet dates/times or date text `YYYY-MM-DD` and time text `HH:mm` in 24-hour format. Empty start/end times mean all day. End time without start time is invalid. A blank end date normally means the start date; an earlier end time with no end date means the following morning. Enter an explicit end date for longer events.

All-day end dates are inclusive. Timed events ending exactly at midnight do not occupy the ending day in month view. Events without an end time remain upcoming through their final day. Month view retains historical Published events. Invalid named rows are skipped with their row number in Apps Script execution logs.

The API uses ISO-style local date/time values plus the authoritative timezone; they are not UTC timestamps. Civil-date formatting avoids shifting Yale event dates for visitors abroad. Repeated-hour ambiguity at a fall DST transition has no first/second-hour representation in this MVP.

## Embed on the existing website

Deploy with the existing Next.js application and link to `/calendar`, or embed **on the same origin**:

```html
<iframe
  src="/calendar/index.html"
  title="YES member events calendar"
  style="display:block;width:100%;height:1100px;border:0"
  loading="lazy"
></iframe>
```

Signed-out visitors see a sign-in screen; its Google button opens the sign-in flow at the top level. Same-origin embedding shares the session. Cross-origin embedding is intentionally blocked by `frame-ancestors 'self'` and SameSite cookies. Use a normal link from another domain. Never upload the private HTML or sample JSON as a public alternative.

Query parameters still work after sign-in: `?type=Social` and `?view=month&month=2026-11`. The login flow returns to the default agenda rather than preserving incoming filters.

## Verification

```sh
npm run dev
npm test
node --test tests/calendar/*-check.mjs
npm run check
```

Before launch, test the real Google/Sheet deployment with an approved account and a nonapproved account. Check direct `/calendar/index.html`, `/api/calendar/events`, and the Apps Script URL while signed out. Disable an approved email while signed in and verify the next API request is denied. Check browser back after logout. Automated tests cover signed-token tampering/expiry, OAuth validation, revocation, no-cache responses, private-field exclusion, and database failure behavior; real credentials are still required for end-to-end Google consent and hosted deployment verification.


## Add to calendar and event plus-ones

Every event detail panel has a compact **Add to Calendar** icon button that opens Google Calendar and Apple Calendar options. A separate invite icon opens the plus-one panel. Both popovers dismiss on outside click or Escape. Escape returns keyboard focus to the trigger. Google opens an event draft; Apple downloads an `.ics` file for import. No calendar-write OAuth permissions are requested and nothing is added until the user saves/imports it. Exports contain the visible event fields and RSVP URL, never invitation tokens or internal Sheet columns. All-day dates use an exclusive end date in the export. Timed events convert the Sheet timezone to UTC, including daylight saving changes. Missing end times default to one hour after the listed start time on the final day, with a note to adjust the duration. Imported events are snapshots; later Sheet edits do not sync automatically. iCalendar format: [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545).

Plus-ones use **Google sign-in** and grant access **only to the invited event**. They do not add the guest to the main `Access` whitelist. Only enabled members in the Sheet's `Access` tab can create invitations; guests cannot create invitations. This feature currently uses the Sheet whitelist, not the optional Airtable whitelist.

1. Assign every invitable event a permanent, unique `id` (200 characters or fewer). Blank or duplicated IDs cannot issue invitations. Do not reuse IDs for different events.
2. Replace the deployed Apps Script `Code.gs` with this version, then **Deploy → Manage deployments → Edit → New version → Deploy**. Keep its existing script properties. The website additions require this updated backend.
3. The backend creates a private **Invitations** tab on the first valid invitation request, with these headers:

   `id,event_id,inviter_email,guest_email,created_at,claimed_at,enabled`

4. A member opens the invite icon, clicks **Create invitation**, then uses **Email**, **Messages**, **Copy link**, or the native **Share** menu. These open the user's own sharing/composer UI; the website does not send mail or messages automatically. Messages depends on a compatible messaging app; Copy link works as a fallback. Localhost links work only on the same computer. Use the deployed HTTPS website origin to invite people on other devices.
5. The first verified Google account to accept claims the invitation. It becomes bound to that email. The same guest may use the link again; a second account cannot claim it. Creating again returns the member's existing invitation for that event, including after it is claimed. The inviter cannot claim their own invitation.
6. Guests sign in through the same Google OAuth client and must satisfy its audience/test-user settings. Gmail or Workspace-authoritative email verification is required, just as for members. The guest receives a normal identity session, but every page/API request rechecks the live invitation grants and filters the events response accordingly.
7. To revoke, set the invitation's `enabled` cell to FALSE. Disabling the inviter, removing/restricting/unpublishing the event, or passing its end time also removes guest access on the next check. With no end time, access lasts through its final date. Guests may independently receive invitations to multiple events and see only those active grants.

Do not delete invitation rows to revoke them: the retained row enforces the one-person slot. Do not edit claimed guest emails or invitation IDs unless intentionally overriding that limit as a board administrator. Do not publish or share the Invitations tab with guests. A script-wide lock serializes creation and claiming so concurrent requests cannot allocate two guests. The Sheet stores random invitation IDs; only the server can construct their signed sharing links. Rotating `CALENDAR_BACKEND_SECRET` invalidates outstanding sharing links; disabling an invitation revokes already-claimed access. [Apps Script locks](https://developers.google.com/apps-script/reference/lock/).

During rollout an older backend keeps existing member access working, but cannot create invitations. The website shows a retryable invitation error until the Apps Script deployment is updated. The unauthenticated invitation landing page reveals no event details.

### Additional verification

The Node checks cover single-guest claiming, idempotent retries, private/expired events, revoked grants/inviters, export timezones and DST, all-day dates, Unicode folding and calendar injection. The website tests cover guest event filtering, forged links, same-origin invitation creation, guest invitation denial, and invitation OAuth state binding. After deployment, test one enabled member and two distinct guest accounts: the first guest should see only the invited event; the second should be denied when using the same link.
