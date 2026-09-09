# usc-seat-watcher

Polls USC's Banner course search every 15 minutes for open seats in the sections I
needed, and files a GitHub issue when one opens. GitHub emails you about issues in
your own repos, so that's the notification channel. No SMTP, no Twilio, no API key.

Ran from 20 to 24 August 2026. Got the seat, turned it off.

## how it works

`check.mjs` hits Banner's `searchResults` JSON endpoint and diffs seat counts against
`state.json`, so it only fires on the 0 to open transition instead of every run.
Actions runs it, commits the new state back, and opens an issue when something frees up.

The annoying part was cookies. Banner stores your search criteria server side against
the session, so querying two courses in one session hands you the first course's
results twice. Each course gets its own cookie jar.

## using it

Put your CRNs in the `WATCH` list in `check.mjs`, set `TERM`, and re-enable the
schedule in `.github/workflows/watch.yml`. No secrets needed, the workflow runs on the
built-in `github.token`.

The schedule is off here because I don't need it anymore.
