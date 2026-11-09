<!-- docs/decisions/2026-11-09-upload-with-an-uppercase-content-type-is-sent-back-2.md -->
# Upload with an uppercase content type is sent back to the form

- **Date:** 9 November 2026
- **Piece:** statement-import
- **Options:** A. Fix it: compare the content type without case, and add a test (recommended) (a small change and one test; it can be checked before merge; Can be undone) · B. Ship as is and note it in the report (none now; a client that sends an uppercase type loses its uploads silently; Can be undone)
- **Recommended:** fix
- **Chosen:** fix
- **The director's words:** none
