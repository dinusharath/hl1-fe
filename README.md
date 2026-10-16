# Healthtech Ingestion — Operator UI

A small **operator UI** for the Healthtech ingestion API. It is a **separate project** from the
backend service — it talks to the API over HTTP (nothing is shared or bundled together).

- **Stack:** Vite + React + TypeScript.
- **Talks to:** the ingestion API's `POST /ingest`, `GET /forms`, `GET /forms/:id`.

## Run

```bash
npm install
cp .env.example .env     # set VITE_API_BASE if the API isn't on http://localhost:3000
npm run dev              # → http://localhost:5173
```

The API must be running separately (see the backend repo: `npm run dev`, on `:3000`). The API
enables CORS so this UI can call it from a different origin.

## What it does

- **Submit a form** → `POST /ingest`, shows the raw response.
- **Forms table** → polls `GET /forms` every 2s; filter by status; status pills.
- **Detail** → `GET /forms/:id`: status + plain message, idempotency key, attempts, duplicate
  count, delivery state, and soft flags. All **redacted** — the API never returns personal data.

## Config

| Var | Default | Meaning |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:3000` | Base URL of the ingestion API |

## Project layout

```
src/
  main.tsx              entry
  App.tsx               layout + polling
  api.ts                typed API client
  types.ts              API response types
  components/           SubmitForm · FormsTable · FormDetail
  styles.css
```

> This UI is a convenience/demo surface. The backend is the product; see its repo for the
> resilient-ingestion design, schema, and tests.
