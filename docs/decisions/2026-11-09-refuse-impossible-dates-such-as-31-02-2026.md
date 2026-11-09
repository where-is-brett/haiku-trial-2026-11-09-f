<!-- docs/decisions/2026-11-09-refuse-impossible-dates-such-as-31-02-2026.md -->
# Refuse impossible dates such as 31/02/2026?

- **Date:** 9 November 2026
- **Piece:** statement-import
- **Options:** A. Keep the spec's range check only (chosen for now) (none; a day that is not in the month is stored; Can be undone) · B. Also refuse dates that do not exist in the calendar, so the whole upload is refused (a small extra check; a statement with one bad date is refused whole; Can be undone)
- **Recommended:** calendar
- **Chosen:** calendar
- **The director's words:** none
