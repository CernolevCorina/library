# Listele mele

Aplicație React pentru liste de orice: cărți, jocuri, energizante, filme etc. Fiecare listă are un tip care dă denumirile
(„Autor” / „Brand” / „Studio”, „Citite” / „Jucate” / „Încercate”…). Elementele au titlu, creator, bifă, rating 1–5 stele și comentariu,
plus căutare, filtrare și ordonare.

Fiecare utilizator își creează un cont (înregistrare / logare) și are propriile liste.
Datele se păstrează pe server (Upstash Redis prin Vercel), nu în browser, deci vezi aceeași listă pe orice dispozitiv pe care te loghezi.

## Structură

- `src/` – interfața React (Vite)
- `api/auth/[action].js` – `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`
- `api/lists/` – `GET/POST /api/lists`, `PATCH/DELETE /api/lists/:listId`
- `api/lists/[listId]/items/` – `GET/POST /api/lists/:listId/items`, `PATCH/DELETE /api/lists/:listId/items/:id`

La prima deschidere după actualizare, cărțile vechi sunt mutate automat în lista „Cărți” (nimic nu se pierde).

Parolele sunt salvate ca hash scrypt cu salt. Sesiunea e un cookie `HttpOnly` (valabil 180 de zile) cu un token aleator păstrat în Redis.
După 10 încercări greșite de logare, contul e blocat 15 minute.

## Deploy pe Vercel

1. Urcă proiectul pe GitHub și importă-l în [vercel.com/new](https://vercel.com/new) (framework: **Vite**, setările implicite sunt bune).
2. În proiectul Vercel: **Storage → Create Database → Upstash (Redis)** → planul gratuit → **Connect** la proiect.
   Vercel adaugă automat variabilele `KV_REST_API_URL` și `KV_REST_API_TOKEN`.
3. **Deployments → Redeploy** ca să preia variabilele noi.
4. Deschide linkul, creează-ți un cont, apoi loghează-te cu același cont pe telefon („Add to Home Screen” pentru a-l avea ca aplicație).

## Rulare locală (opțional)

```bash
npm install
npm i -g vercel
vercel link        # leagă folderul de proiectul Vercel
vercel env pull .env.development.local   # descarcă variabilele bazei de date
npm run dev:full   # pornește UI + API pe http://localhost:3000 (prin vercel dev)
```

`npm run dev` pornește doar interfața (Vite), fără API.
```
