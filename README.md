# Folio — Library API (NestJS · TypeORM · PostgreSQL)

Secure REST API plus a Bootstrap + Chart.js frontend, served by Nest from `/public`.

## Getting started

```bash
cp .env.example .env          # then change JWT_SECRET   (PowerShell: copy .env.example .env)
docker compose up -d          # PostgreSQL 16 (or use your own instance)
npm install
npm run start:dev
```

| URL | Content |
|---|---|
| http://localhost:3000 | Application (frontend) |
| http://localhost:3000/api | Swagger |

**The first account created on an empty database becomes the administrator.** Everyone after that is a regular user.

## Sample data

```bash
npx ts-node src/seed.ts               # 100 books, 9 categories, covers from Open Library
npx ts-node src/seed.ts --no-covers   # offline: skip the covers
```
The script is idempotent: re-running it fills in missing categories and covers without creating duplicates.

## Features

- Catalog grouped by category, with search, author and category filters
- Favorites, trash with restore (admin), 30-day automatic purge
- Statistics dashboard (Chart.js)
- User profile: edit username / email, change password
- Admin: create, edit and delete books, authors and categories (all forms open in modals)

## Endpoints

| Method | Route | Access |
|---|---|---|
| POST | `/auth/signup`, `/auth/signin` | Public |
| GET | `/profile` | Authenticated |
| PATCH | `/profile`, `/profile/password` | Authenticated |
| GET | `/books/all` (`?trashed=true`: admin), `/books/all/:id`, `/books/stats` | Authenticated |
| POST | `/books/upload` (field `file`) · GET `/books/images/:filename` | Authenticated |
| POST / PUT | `/books/add` · `/books/edit/:id` | Admin |
| DELETE | `/books/delete/:id` (permanent) · `/books/softdelete/:id` | Admin |
| PATCH | `/books/recover/:id` | Admin |
| GET | `/authors/all`, `/authors/all/:id` | Authenticated |
| POST / PUT / DELETE | `/authors/add` · `/authors/edit/:id` · `/authors/delete/:id` | Admin |
| GET | `/categories/all` | Authenticated |
| POST / PUT / DELETE | `/categories/add` · `/categories/edit/:id` · `/categories/delete/:id` | Admin |
| GET | `/favorite/all` | Authenticated |
| POST | `/favorite/add/:bookId` | Authenticated |
| DELETE | `/favorite/delete/:bookId` and `/favorite/add/:bookId` | Authenticated |

`signin` takes `{ "login": "<email or username>", "password": "…" }` and returns `{ accessToken, user }`.

## Technical notes

- **PostgreSQL** through `pg`. The `user` table is called `users` (`user` is reserved).
- **helmet** and **morgan** are plugged in directly in `main.ts` (the `@nest-middlewares/*` wrappers are deprecated and incompatible with helmet 8).
- **NestJS `^11`**. Bump the `@nestjs/*` packages to `^12` if your environment requires it.
- `password` and `salt` are `select: false`: they never leave the database, even through relations.
- The role is re-read from the database on every request, so role changes are immediate.
- An author cannot be deleted while books (trash included) still reference them (409).
- Deleting a category leaves its books uncategorized.
- Uploaded images are protected by the JWT; the frontend loads them as blobs. A book `image` can also be an absolute URL.
- A nightly cron job (`@nestjs/schedule`, 3 am) permanently deletes books trashed for more than 30 days.
- `DB_SYNC=true` is for development only: use TypeORM migrations in production.
- Bootstrap, icons, Chart.js and fonts are loaded from CDNs (jsDelivr / Google Fonts), allowed by the helmet CSP.

## Structure

```
src/   auth/ user/ author/ category/ book/ favorite/ tasks/ common/   (+ seed.ts)
public/   index.html · css/style.css · js/app.js
```
