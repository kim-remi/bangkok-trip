# Bangkok Trip

A mobile-first trip planner: itinerary, bookings, Explore, shared albums and split expenses.
It installs to the home screen, works offline, and syncs through Firebase.

## Files
- `src/planner.html`: the planner itself (edit this).
- `build.py`: makes `index.html` from the planner. Run `python3 build.py` after any change.
- `standalone.js`: sign-in, the access list and the Firebase data connection.
- `sw.js`: offline support. **Bump `VERSION` on every release.**
- `firebase-config.js`: the Firebase project settings (safe to publish).
- `firestore.rules`: security rules to paste into Firebase (replace `OWNER_EMAIL`).

## Releasing a change
1. Edit `src/planner.html` (or `standalone.js`).
2. `python3 build.py`
3. Bump `VERSION` in `sw.js`.
4. Commit and push to `main`. GitHub Pages redeploys in about a minute, and open apps show “A new version is ready”.
