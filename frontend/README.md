# Ziba frontend

React, Vite, and Tailwind frontend for the Ziba marketplace. The app connects to the Express API using `VITE_API_URL`.

Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_CLIENT_ID` to the Web OAuth client ID configured in Google Cloud Console (the same ID as the backend's `GOOGLE_CLIENT_ID`), start the API and MongoDB from the repository root, then run `npm run dev` in this directory (or `npm run dev` at the repository root). Configure the frontend URL as an authorized JavaScript origin in that Google OAuth client.
