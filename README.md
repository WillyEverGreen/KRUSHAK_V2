# Krushak MERN PWA (Base App)

Mobile-first Progressive Web App recreated from the existing Krushak project UI, using React + Node.js + Express + MongoDB.

## Stack

- Frontend: React (Vite), React Router, React Query, Zustand, PWA (vite-plugin-pwa)
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Zod validation

## Project Structure

- client: React PWA app with mobile tab navigation and subpages
- server: Express API with auth, farm, diagnose, market, news, chat, and admin endpoints
- docs: CEP mapping and architecture notes

## Setup

1. Install dependencies:
   - npm install
2. Configure env files:
   - Copy server/.env.example to server/.env and set values
   - Copy client/.env.example to client/.env if needed
3. Start development:
   - npm run dev

## Ports

- Client: http://localhost:5173
- API: http://localhost:5000

## Available Scripts

- npm run dev: run client and server together
- npm run dev:client
- npm run dev:server
- npm run build
- npm run start

## Base Features Implemented

- Mobile bottom navigation and key screens matching Flutter flow:
  - Home, Diagnose, My Farm, Market, Profile
  - News, Chat, Care Guides (subpages)
- PWA installability and offline-capable API cache behavior
- JWT-ready auth endpoints with role middleware
- Core data endpoints for UI workflows

## Important Note

Cloud LLM scanning and advanced real-time integrations are intentionally kept for the next phase. This base app provides architecture and UI parity foundations so those services can be integrated cleanly.
