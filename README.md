# open-crm-app

> Employee PWA for open-crm — time tracking, absence requests and HR for field workers.

Part of the [open-crm](https://github.com/rankgnar/open-crm) ecosystem. A mobile-first Progressive Web App built for construction and service field workers to log hours, request time off and view their schedule.

**Website:** [open-crm.org](https://open-crm.org)  
**License:** [MIT](LICENSE)

---

## Features

- Clock in / clock out with project assignment
- Absence requests (vacation, sick leave, etc.)
- Personal schedule view
- Multi-language: Swedish, English, Spanish, Polish

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5 |
| Build | Vite 6, `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 |
| Data | Supabase (`@supabase/supabase-js`) |
| Hosting | Vercel |

---

## Getting started

```bash
git clone https://github.com/rankgnar/open-crm-app.git
cd open-crm-app
npm install
```

Copy `.env.example` to `.env`:

```
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```bash
npm run dev       # http://localhost:5173
npm run build
npm run typecheck
```

---

## Security model

The app uses the Supabase `anon_key`. Row-Level Security policies ensure each employee can only access their own data. The admin Electron desktop app ([open-crm](https://github.com/rankgnar/open-crm)) manages staff records and approvals.

---

## License

[MIT](LICENSE)
