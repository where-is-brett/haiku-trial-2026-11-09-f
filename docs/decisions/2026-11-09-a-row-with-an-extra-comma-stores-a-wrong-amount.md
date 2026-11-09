<!-- docs/decisions/2026-11-09-a-row-with-an-extra-comma-stores-a-wrong-amount.md -->
# A row with an extra comma stores a wrong amount

- **Date:** 9 November 2026
- **Piece:** statement-import
- **Options:** A. Refuse any row that does not have exactly three fields (recommended) (a one-line check and a test; a statement with a comma in an unquoted amount is refused whole; Can be undone) · B. Ship as is and note it in the report (none now; a wrong amount is stored silently for such rows; Can be undone)
- **Recommended:** fix
- **Chosen:** fix
- **The director's words:** none
