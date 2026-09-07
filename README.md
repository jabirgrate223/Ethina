# Quick Capital

A production-ready, responsive frontend for **Quick Capital**, a business funding management platform. The current build is a fast static Vite application designed for manual deployment on Vercel, with a MySQL-ready schema for the next backend phase.

## Included

- Responsive dark-mode dashboard aesthetic with lime/bronze accents.
- Founder details configured for Israt Jahan Ethina.
- Funding calculator with amount and repayment-period controls.
- Five-step “How it works” interaction.
- Business owner, funding officer, and super admin portal views.
- Direct email and WhatsApp contact actions.
- MySQL schema covering companies, users, applications, and documents.

## Run locally

```bash
npm install
npm run dev
```

The development server will print a local URL, usually `http://localhost:5173`.

To test a production build:

```bash
npm run build
npm run start
```

## Branding and contact details

The current founder and contact details are in `src/main.js` near the top:

- Founder: `Israt Jahan Ethina`
- Email: `ij8283707@gmail.com`
- WhatsApp: `+8801779923680`

The provided logo is represented as a lightweight CSS mark in this initial build. To use the uploaded image instead, place it in `public/` and replace the `.brand-mark` elements in `src/main.js` with an image element. The application title, founder, email, and WhatsApp number can also be moved to environment variables using the keys in `.env.example`.

## Database preparation

`schema.sql` is written for MySQL 8+. Run it against a database when adding authentication, file storage, or API routes. The frontend currently uses realistic mock portal data so it remains deployable without a configured database.

## Deploy to Vercel

1. Push the repository to GitHub:

   ```bash
   git add .
   git commit -m "Build Quick Capital funding platform"
   git push origin main
   ```

2. Open [Vercel](https://vercel.com/new), choose **Import Git Repository**, and select `munim430-ai/Ethina`.
3. Vercel should detect the project automatically. Use `npm run build` as the build command and `dist` as the output directory if prompted.
4. Add variables from `.env.example` under **Project Settings → Environment Variables** if you want to override the default configuration.
5. Click **Deploy**. The included `vercel.json` keeps client-side routes working.

## Next backend steps

Connect the application form to a serverless API route, add passwordless or OAuth authentication, configure object storage for documents, and replace the portal mock data with queries against the schema. Keep the database credentials server-side and never commit a real `.env` file.
