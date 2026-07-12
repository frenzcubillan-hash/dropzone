# Dropzone

A private, local-first inbox for files, links, and notes. Dropzone keeps your library inside your browser using LocalStorage and IndexedDB—there is no account, database, or cloud file upload.

## Features

- Drag-and-drop file storage on the current device
- Notes and bookmarked links
- Search, tags, filters, and favorites
- Responsive desktop and mobile interface
- Cloudflare Workers deployment through Vinext

## Requirements

- Node.js 22.13 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal. Changes update automatically while the development server is running.

## Validate

```bash
npm test
```

## Deploy to Cloudflare

Authenticate once:

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```

The deployment uses the free `workers.dev` address assigned to your Cloudflare account. Run the same command again whenever you want to publish an update.

## Data and privacy

Files are stored in IndexedDB. Notes, links, tags, favorites, and metadata are stored in LocalStorage. Data is separate for each browser and domain; clearing browser data removes the local library.

## Technology

React 19, TypeScript, Next.js 16, Vinext, Vite, and Cloudflare Workers.
