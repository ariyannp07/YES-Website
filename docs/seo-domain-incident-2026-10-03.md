# YES search/domain investigation — October 3, 2026

## Finding

The former domain `yesatyale.org` is a concrete source of the gambling association. Web retrievals during this investigation followed it to pages advertising SLOT88 / DRAGON222. Separate retrievals landed on `uclacampustourguides.com` and `1connectconsulting.com`; the destination varies. Local command-line requests to the former domain failed with connection resets, so this evidence comes from the web retrieval service, not a locally captured HTTP redirect trace.

The current `https://yesyale.org` site served legitimate YES content in the sampled browser and Googlebot-user-agent requests. No gambling payload or suspicious redirect was found in the inspected application source. This is not proof against all conditional cloaking: a Googlebot user-agent string is not an actual Google crawl.

The exact reported AI Overview was not reproduced. A current Google search for “Yale Entrepreneurial Society” returned the legitimate site first; its expanded AI Overview cited Wikipedia, Yale Ventures, and LinkedIn. Some of those sources still point to the former domain. This provides a plausible route for the incorrect association; it does not prove which citation the original reporter clicked. Obtain the original screenshot, exact query, cited URL, and date to complete that link.

## Domain and link inventory

| Domain or source | Observation | Follow-up |
| --- | --- | --- |
| `yesyale.org` | Current legitimate site; homepage, `/enter`, `/common-room`, sitemap and robots fetched successfully. Public Google DNS lookup returned A `216.198.79.1`. | Keep as the canonical domain. |
| `www.yesyale.org` | Served a duplicate of the current site before this fix. | Permanent redirect to the corresponding apex URL added. |
| `yesatyale.org` | Former YES domain, now retrieved as gambling content through redirects. | Determine who controls it. Do not link visitors to it. If YES still controls it, investigate that account/hosting and restore a legitimate redirect. |
| `www.yes.yale.edu` | Listed as an older website in Wikipedia, with an archived copy. Current service/control not verified. | Ask Yale's web administrator whether a redirect to the current domain is possible. |
| `yesaccelerator.netlify.app` | Historical accelerator link in Wikipedia. Current service/control not verified. | Inventory with former YES officers; keep or retire intentionally. |
| [Wikipedia](https://en.wikipedia.org/wiki/Yale_Entrepreneurial_Society#External_links) | Infobox links to the current domain, but External links labels `yesatyale.org` the official website. | Request correction of that external link to `https://yesyale.org/`; disclose YES affiliation when requesting an edit. |
| [Older LinkedIn page](https://www.linkedin.com/company/yale-entrepreneur-society) | Website field still lists `yesatyale.org` in the retrieved page. This differs from the newer `yale-entrepreneurial-society` profile. | Have an administrator update the older page's website field and check both profiles. |
| [Historical YES x HV page](https://yes-hv-pitch-competition.webflow.io/) | Contains the old-domain email address and historical YES links. | Have its owner update active links/contact information or clearly archive it. |

Registry WHOIS returned the following during the investigation:

- `yesyale.org`: Squarespace Domains LLC; created November 25, 2025; registry expiration November 25, 2028; updated August 12, 2026.
- `yesatyale.org`: GoDaddy.com LLC; created November 6, 2006; registry expiration November 6, 2026; updated August 12, 2026.

These records do **not** establish the registrant's identity, auto-renew settings, or whether the old domain was sold, previously expired, or compromised. Current public records alone cannot settle that history. The supplied Wayback assessment was not independently established here. In Squarespace, confirm the YES-controlled account, renewal setting, payment method, domain lock, and DNS records. Ask previous officers for the old domain's registrar/hosting records and renewal notices. Do not describe a sale, lapse, or hack as confirmed.

## Website fixes

- Homepage title now spells out “Yale Entrepreneurial Society (YES).”
- Every content page supplies its own canonical URL and matching social metadata. Previously, `/enter`, `/common-room`, and other pages inherited the homepage canonical.
- Organization structured data includes the current domain, public YES email, founding year, description, and the Yale Ventures directory identity.
- Sitemap includes all promoted pages, the application and people index, confirmed non-placeholder profiles, and approved internally hosted press entries. It contains no draft, placeholder, or external article URLs.
- `www` requests permanently redirect to the corresponding apex path, preserving query strings.
- The obsolete `/partners` search sitelink permanently redirects to the homepage, where the community firms appear.
- The intentionally unpromoted `/builders` route now uses `noindex` instead of a robots crawl block, allowing Google to read the exclusion. Draft press pages and placeholder profiles also use `noindex`.

Validation: 49 existing tests passed; TypeScript and type-scale checks passed; production build succeeded. The Airtable-dependent adjective check was skipped because its credentials are not configured locally. Inspected 29 rendered content pages for canonical/social URLs and checked all 27 sitemap entries. Local production-server tests verified the 308 redirects, query preservation, and a 200 response from the apex application page.

These changes improve the current site's identity and indexing. They cannot directly edit Google's AI Overview or repair third-party links.

## Search Console — owner steps

The signed-in Google account did not list a YES property, so Security Issues, Manual Actions, indexed HTML, and Google-selected canonicals for YES could not be inspected.

1. Open [Search Console](https://search.google.com/search-console). Use the account that owns the `yesyale.org` property, or ask that owner to grant access. If no property exists, add a Domain property for `yesyale.org` and complete Google's DNS TXT verification through the registrar/DNS administrator.
2. Check **Security & Manual Actions → Security issues** and **Manual actions**. Save any affected URLs. If issues exist, address those specific findings before requesting a review. [Security Issues documentation](https://support.google.com/webmasters/answer/9044101?hl=en).
3. Use **URL Inspection** on `https://yesyale.org/`, `/enter`, and `/common-room`. Compare the indexed result's user-declared and Google-selected canonical, and view the crawled page. Then **Test live URL → View tested page**, checking HTML, screenshot and loading details. After confirming the deployed fixes, use **Request indexing**. A live test alone does not establish the absence of security/manual-action issues. [URL Inspection documentation](https://support.google.com/webmasters/answer/9012289?hl=en).
4. Submit `https://yesyale.org/sitemap.xml` under **Sitemaps**. Check indexing reports after Google processes it; submission is not a guarantee of immediate recrawling or an AI Overview update.

## Reporting the AI Overview to Google

Use the search where the error actually appears, preferably the original reporter's query and screenshot.

1. Expand the AI Overview if necessary. At its bottom, select **thumbs down → Report a problem**, or use its three-dot feedback menu.
2. Choose the closest available category for inaccurate information or an incorrect link. Include the exact query, citation URL, redirect destination, observation date, and correct official URL. Add a screenshot if the interface offers it.
3. Submit the feedback. Google says the submission includes the most recent query and its results. [Official AI Overview feedback instructions](https://support.google.com/websearch/answer/14901683?hl=en).

Suggested text, after filling in the actual observation:

> For the query “[exact query]”, the AI Overview associates Yale Entrepreneurial Society (YES) with “[exact cited URL]”. That URL leads to unrelated slot-gambling content at “[observed destination]”, observed on [date]. YES's current official website is https://yesyale.org/ and its application page is https://yesyale.org/enter. The former domain yesatyale.org is still listed as an official link in some older third-party pages, including Wikipedia's External links section and an older LinkedIn profile. Please correct the organization/website association and review this citation. This report does not allege that the current yesyale.org site is hacked.

If the gambling URL itself appears in ordinary search results for YES, also use Google's **Report spam** link on its [search-quality reporting page](https://developers.google.com/search/help/report-quality-issues). Report the offending URL and misleading association, rather than requesting removal of the legitimate YES site. Leave personal names and email addresses out of the spam submission. A gambling page alone is not evidence of phishing or malware; use those separate forms only with evidence of those behaviors. Reports do not guarantee a particular action or turnaround.

## Remaining work outside the repository

Priority is correcting the stale Wikipedia and older LinkedIn website links, then completing Search Console verification/inspection and filing feedback on the reproduced bad result. Confirm current registrar access and auto-renew; investigate ownership/history of the former domain. No Google report, Wikipedia edit, LinkedIn edit, registrar change, or message to another person was submitted during this investigation.
