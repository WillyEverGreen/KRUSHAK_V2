<div align="center">
  <img src="./docs/logo.png" alt="Krushak Logo" width="130" />

  <h1>Krushak — AI Farm Assistant</h1>

  <p>
    <strong>A mobile-first Progressive Web App for Indian farmers.</strong><br/>
    Crop diagnosis · Market prices · Farm management · Agri news · AI chat
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white&style=flat-square" />
    <img src="https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white&style=flat-square" />
  </p>
</div>

---

## 📖 What is Krushak?

**Krushak** (कृषक — Sanskrit for *Farmer*) is a full-stack MERN Progressive Web App built for Indian farmers. It provides AI-powered crop disease diagnosis using Google Gemini, real-time mandi market prices, agri news, livestock & reminder management — all in a mobile-first UI designed to work even on low-end Android browsers.

> This project demonstrates a Complex Engineering Problem (CEP) spanning multi-stakeholder API integration, JWT auth, real-time data pipelines, and offline-capable PWA architecture.

---

## ✨ Features

| Module | Description |
|---|---|
| 🏠 **Home Dashboard** | Personalized weather summary, crop health stats, quick action cards |
| 🔬 **AI Crop Diagnose** | Upload a plant photo → Gemini AI returns disease name, severity & treatment plan |
| 🌾 **My Farm** | Add/track crops by growth stage, manage livestock with health scores, schedule reminders |
| 📈 **Market Prices** | Live mandi prices via data.gov.in API with commodity search |
| 📰 **Agri News** | Dual-source (GNews + NewsData.io) agriculture news with deduplication |
| 💬 **AI Chat** | Gemini-powered farming assistant for advisory queries |
| 📋 **Care Guides** | Season-aware crop care tips |
| 👤 **Profile & Auth** | JWT register/login, profile strength, multi-language support (8 Indian languages) |
| 📡 **PWA** | Installable, offline API cache via Workbox, service worker auto-update |

---

## 🛠️ Tech Stack

### Frontend (`/client`)
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework & build tool |
| React Router v6 | Client-side routing |
| TanStack React Query v5 | Server state, caching, background refetch |
| Zustand | Global client state (auth session, language) |
| vite-plugin-pwa + Workbox | PWA manifest, service worker, offline cache |
| React Icons | Icon library (Material Design icons) |
| Axios | HTTP client |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | NoSQL database + ODM |
| JSON Web Tokens (JWT) | Stateless authentication |
| bcryptjs | Password hashing |
| Zod | Environment & request schema validation |
| Helmet + express-rate-limit | Security hardening |
| Google Gemini API | AI crop diagnosis & chat |
| GNews + NewsData.io | Dual agriculture news sources |
| Open-Meteo | Free weather API |
| data.gov.in | Mandi commodity market prices |

---

## 📁 Project Structure

```
KRUSHAK MAIN/                    ← Root (monorepo)
├── client/                      ← React PWA frontend
│   ├── public/
│   │   ├── logo.png             ← App logo
│   │   └── icons/               ← PWA icons (192, 512)
│   └── src/
│       ├── app/                 ← Zustand store, React Query client
│       ├── components/          ← Shared UI (DataState, FreshnessTag, Nav)
│       ├── screens/             ← Full-page screen components
│       │   ├── HomeScreen.jsx
│       │   ├── DiagnoseScreen.jsx
│       │   ├── MyFarmScreen.jsx
│       │   ├── MarketScreen.jsx
│       │   ├── NewsScreen.jsx
│       │   ├── ChatScreen.jsx
│       │   ├── ProfileScreen.jsx
│       │   └── AuthScreen.jsx
│       ├── services/            ← Axios API calls
│       ├── styles/              ← Global CSS design system (theme.css)
│       └── utils/
├── server/                      ← Express + MongoDB backend
│   └── src/
│       ├── config/              ← env.js (Zod-validated), db.js
│       ├── controllers/         ← Business logic per domain
│       ├── middleware/          ← auth.js, error.js
│       ├── models/              ← Mongoose schemas
│       ├── routes/              ← authRoutes.js, appRoutes.js
│       └── services/            ← External API adapters
├── docs/                        ← Architecture notes, logo
├── render.yaml                  ← Render.com Blueprint (backend + frontend)
└── package.json                 ← Root monorepo scripts
```

---

## 🔌 API Reference

All endpoints are prefixed with `/api`.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login, returns JWT |

### Home
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/home` | Optional | Personalized dashboard data |

### Diagnose
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/diagnose/analyze` | Optional | Gemini AI plant image analysis |
| `GET` | `/api/diagnose/catalog` | — | Disease catalog list |
| `GET` | `/api/diagnose/advisory` | — | Disease advisory tips |
| `GET` | `/api/diagnose/recent` | Optional | Recent scan history |
| `POST` | `/api/diagnose/records` | ✅ Required | Save a scan record |

### Farm
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farm` | Optional | Farm overview (reminders, livestock, weather) |
| `POST` | `/api/farm/reminders` | ✅ Required | Add reminder |
| `PATCH` | `/api/farm/reminders/:id/toggle` | ✅ Required | Mark done/undo |
| `DELETE` | `/api/farm/reminders/:id` | ✅ Required | Delete reminder |
| `GET` | `/api/farm/crops` | Optional | Get crops |
| `POST` | `/api/farm/crops` | ✅ Required | Add crop |
| `PATCH` | `/api/farm/crops/:id` | ✅ Required | Update crop |
| `DELETE` | `/api/farm/crops/:id` | ✅ Required | Delete crop |
| `GET` | `/api/farm/livestock` | ✅ Required | Get livestock |
| `POST` | `/api/farm/livestock` | ✅ Required | Add livestock |
| `PATCH` | `/api/farm/livestock/:id` | ✅ Required | Update livestock health |
| `DELETE` | `/api/farm/livestock/:id` | ✅ Required | Delete livestock |
| `POST` | `/api/farm/livestock/:id/feed-reminder` | ✅ Required | Add feed reminder |

### Market / News / Weather / Chat
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/market/prices` | Live mandi commodity prices |
| `GET` | `/api/news` | Aggregated agri news (dual API) |
| `GET` | `/api/weather` | Weather summary |
| `GET` | `/api/chat/suggestions` | Suggested farming questions |
| `POST` | `/api/chat/message` | Send message to AI assistant |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/summary` | ✅ Admin role | Platform summary stats |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key
- GNews API key (optional)
- NewsData.io API key (optional)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/krushak.git
cd krushak

# Install all workspaces (client + server + root)
npm install
```

### 2. Configure Environment

```bash
# Copy the example and fill in your values
cp server/.env.example server/.env
```

Open `server/.env` and set:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/krushak_pwa
JWT_SECRET=your_very_long_random_secret_here
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
GNEWS_API_KEY=your_gnews_key
NEWSDATA_API_KEY=your_newsdata_key
```

### 3. Start Development

```bash
npm run dev
```

| Service | URL |
|---|---|
| React PWA | http://localhost:5173 |
| Express API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start client + server together (concurrently) |
| `npm run dev:client` | Start React frontend only |
| `npm run dev:server` | Start Express backend only |
| `npm run build` | Build React PWA for production |
| `npm run start` | Run Express in production mode |

---

## 🚀 Deploying to Render

Krushak uses a `render.yaml` **Blueprint** that deploys both services from one repo:
- **`krushak-server`** → Render Web Service (Node.js, always-on)
- **`krushak-client`** → Render Static Site (React/Vite PWA)

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "chore: prepare for Render deployment"
git push origin main
```

### Step 2 — Create Blueprint on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
2. Connect your GitHub repository
3. Render auto-detects `render.yaml` and creates both services

### Step 3 — Set Secret Environment Variables

After the first deploy, open each service in the Render dashboard → **Environment** tab and add:

#### `krushak-server` — Backend

| Variable | Value |
|---|---|
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | Long random secret (32+ chars) |
| `CLIENT_ORIGIN` | `https://krushak-client.onrender.com` |
| `GEMINI_API_KEY` | Your Gemini key |
| `GNEWS_API_KEY` | Your GNews key |
| `NEWSDATA_API_KEY` | Your NewsData key |
| `MANDI_API_KEY` | Your data.gov.in key |

#### `krushak-client` — Frontend

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://krushak-server.onrender.com/api` |

> **MongoDB Atlas**: Whitelist `0.0.0.0/0` in Atlas **Network Access** so Render's IPs can connect.

### Step 4 — Trigger Redeploy

After setting env vars, click **Manual Deploy → Deploy latest commit** on both services.

Verify the backend is live:
```bash
curl https://krushak-server.onrender.com/health
# → {"status":"ok","service":"krushak-pwa-server"}
```

> **Free Tier Note**: Render free Web Services spin down after 15 min of inactivity. The first request after idle takes ~30 s. Upgrade to a paid plan for always-on performance. Static Sites are always free and never spin down.

---

## 🔐 Security

- Passwords hashed with **bcryptjs** (salt rounds: 10)
- Auth via **stateless JWT** (stored in Zustand + localStorage)
- Rate limiting: **400 req / 15 min** per IP
- Helmet sets secure HTTP headers (XSS, HSTS, noSniff, etc.)
- Environment secrets never committed — validated at boot by Zod schema
- CORS restricts origins to `CLIENT_ORIGIN` (comma-separated for multi-env)

---

## 🌐 Multi-Language Support

Krushak supports 8 Indian languages via the in-app language picker:

`English` · `हिंदी` · `मराठी` · `తెలుగు` · `தமிழ்` · `ಕನ್ನಡ` · `বাংলা` · `ਪੰਜਾਬੀ`

---

## 🗺️ CEP Mapping (Academic)

| Attribute | How Krushak satisfies it |
|---|---|
| **WP1** Depth of Knowledge | MERN stack, REST API design, JWT auth, Mongoose ODM, Zod schema validation |
| **WP2** Conflicting Requirements | Performance vs. security (rate limiting, helmet), scalability vs. cost (free tier APIs), real-time vs. offline (PWA Workbox) |
| **WP3** Depth of Analysis | NoSQL schema design trade-offs, dual-API deduplication strategy, Render always-on vs. serverless deployment models |
| **WP4** Familiarity of Issues | Gemini AI integration, mandi price scraping, Workbox offline caching, geolocation-based content |
| **WP5** Applicable Codes | REST conventions, JWT best practices, environment-based config, semantic HTML, PWA manifest spec |
| **WP6** Stakeholder Involvement | Farmers (primary users), admins (dashboard), external data providers (APIs), offline-first rural users |
| **WP7** Interdependence | Frontend ↔ Backend ↔ MongoDB ↔ Gemini API ↔ Weather/Market/News APIs ↔ Render CDN |

---

## 📄 License

MIT © 2025 Krushak Team

---

<div align="center">
  <img src="./docs/logo.png" width="48" alt="Krushak" />
  <br/>
  <sub>Built with ❤️ for Indian farmers</sub>
</div>
