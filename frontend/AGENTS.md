# Ziba frontend

React + Vite + Tailwind CSS v4 frontend. The Supabase backend configuration, migrations, and Edge Functions live in `../backend/supabase`.

## Development

Run `npm run dev` from the repository root, or run the frontend package scripts from this directory. The Vite server uses port 8443 by default and honors `PORT` when set.

## Project structure

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into `#root`
- `src/App.tsx` - Primary application component
- `src/index.css` - Global styles and Tailwind CSS v4 import
- `index.html` - Vite HTML shell
- `package.json` - Frontend dependencies and scripts
- `vite.config.ts` - Vite configuration
- `.mise.toml` - Node.js and pnpm toolchain versions

## Styling

This project uses Tailwind CSS v4 through `@tailwindcss/vite`. Use Tailwind utility classes in JSX and put global CSS or theme customization in `src/index.css`.

## Code quality

- Use double quotes for strings containing apostrophes, or escape apostrophes in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
