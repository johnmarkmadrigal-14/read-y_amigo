# Profile backend update

The app backend runs separately from this Expo repository. Copy these three files over the matching paths in your existing backendforcodex2 folder, preserving all other files, dependencies and .env values, then restart the backend. The same changes are included in the updated backendforcodex2s.zip.

- models/User.js
- routes/auth.js
- utils/profileValidation.js (new)

Adds authenticated POST/DELETE /api/auth/me/photo (JPG, PNG, WebP, maximum 5 MB), persistent GridFS profile images, and validated readingPreferences in PATCH /api/auth/me. Existing account IDs, credentials and classroom data remain intact. No new npm dependency or database migration is required.

Optional regression test: copy tests/profile.test.js into your backend tests folder, then run `node --test tests/profile.test.js`. The tests use the actual routes and schema with an in-memory database/storage double; they do not connect to your live MongoDB.
