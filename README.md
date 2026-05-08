# IdeaFlow Frontend

React application for the IdeaFlow platform.

## Requirements

- Node.js 18+ or 20+
- npm
- Running IdeaFlow backend

## Environment

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required variables:

- `REACT_APP_API_URL` - public backend API URL.

Local value:

```env
REACT_APP_API_URL=http://localhost:3000
```

Production value example:

```env
REACT_APP_API_URL=https://your-backend-domain.com
```

Create React App reads `REACT_APP_*` variables during build. After changing production env variables, rebuild/redeploy the frontend.

## Install and run

```bash
npm install
npm start
```

The frontend starts on:

```text
http://localhost:3001
```

The backend must allow this origin in `FRONTEND_URLS`.

## Build

```bash
npm run build
```

The production build is created in:

```text
build
```

## Deployment notes

For Netlify:

- Base directory: `idea-flow-web`
- Build command: `npm run build`
- Publish directory: `build`
- Environment variable: `REACT_APP_API_URL=https://your-backend-domain.com`

If React Router routes return 404 after refresh, add `public/_redirects` with:

```text
/* /index.html 200
```
