# Dropzone

Dropzone is a private, local-first inbox for saving files, links, and notes in one clean place.

It is made for the random-but-important stuff you do not want to lose: screenshots, project files, useful links, quick notes, ideas, references, and anything you want to keep close.

## ✨ What Makes It Exciting

- 📦 Drag and drop files directly into your personal inbox
- 🔗 Save useful links and quick notes beside your files
- 🏷️ Organize everything with tags, search, filters, and favorites
- 🔒 Private by design: your saved data stays in your browser
- ⚡ Fast, simple, and works without an account or database
- 🌍 Deployable for free on Cloudflare Workers

## 🧠 How It Works

Dropzone is hosted like a normal website, but your saved items are stored locally in your browser.

That means Cloudflare serves the app, but it does not store your personal files. Files are saved in IndexedDB, while notes, links, tags, and favorites are saved in LocalStorage.

Your data stays after refreshing the page, but it is tied to the browser, device, and website address you used.

## 🛠️ Built With

- React 19
- TypeScript
- Next.js 16
- Vinext
- Vite
- Cloudflare Workers
- Wrangler
- LocalStorage
- IndexedDB

## 🚀 Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal.

## ✅ Test

```bash
npm test
```

## ☁️ Deploy

Login to Cloudflare once:

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```

You can also connect the GitHub repo to Cloudflare so every push to `main` automatically builds and deploys the newest version.

## 🔐 Privacy Note

Dropzone does not upload your saved files to the cloud. If you clear your browser data, use private browsing, switch browsers, switch devices, or open a different domain, your local Dropzone library may not appear there.
