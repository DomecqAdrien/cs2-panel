# CS2 Panel Frontend

Angular 22 standalone application for the CS2 control panel.

## Requirements

- Node.js `22.22.3` or newer in the Node 22 line, or a compatible Node 24/26 release.
- npm 10 or newer.

## Start the dev server

```powershell
npm install
npm start
```

The app is served at `http://localhost:4200`. In production, Docker builds the static Angular app and serves it with Nginx; Nginx forwards `/api` to the backend. See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for VPS deployment from Git.
