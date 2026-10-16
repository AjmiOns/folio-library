# Folio — API Bibliothèque (NestJS · TypeORM · PostgreSQL)

API REST sécurisée + frontend Bootstrap (servi par Nest depuis `/public`).

## Démarrage

```bash
cp .env.example .env          # puis changez JWT_SECRET
docker compose up -d          # PostgreSQL 16 (ou utilisez votre propre instance)
npm install
npm run start:dev
```

| URL | Contenu |
|---|---|
| http://localhost:3000 | Application (frontend) |
| http://localhost:3000/api | Swagger |

**Premier compte créé sur une base vide = administrateur.** Les suivants sont `user`.

## Endpoints

| Méthode | Route | Accès |
|---|---|---|
| POST | `/auth/signup`, `/auth/signin` | Public |
| GET | `/books/all` (`?trashed=true` : admin), `/books/all/:id`, `/books/stats` | Authentifié |
| POST | `/books/upload` (champ `file`) · GET `/books/images/:filename` | Authentifié |
| POST/PUT | `/books/add` · `/books/edit/:id` | Admin |
| DELETE | `/books/delete/:id` (définitif) · `/books/softdelete/:id` | Admin |
| PATCH | `/books/recover/:id` | Admin |
| GET | `/authors/all`, `/authors/all/:id` | Authentifié |
| POST/DELETE | `/authors/add` · `/authors/delete/:id` | Admin |
| GET | `/categories/all` | Authentifié |
| POST/DELETE | `/categories/add` · `/categories/delete/:id` | Admin |
| GET | `/favorite/all` | Authentifié |
| POST | `/favorite/add/:bookId` | Authentifié |
| DELETE | `/favorite/delete/:bookId` et `/favorite/add/:bookId` | Authentifié |

`signin` accepte `{ "login": "<email ou username>", "password": "…" }` et renvoie `{ accessToken, user }`.

## Données de démonstration

```bash
npx ts-node src/seed.ts               # 100 livres, 9 catégories, couvertures Open Library
npx ts-node src/seed.ts --no-covers   # sans couvertures (hors-ligne)
```
Le script est idempotent : relancé, il complète la catégorie et la couverture des livres qui n'en ont pas, sans doublon.

## Choix techniques à connaître

- **Catégories** : un livre appartient à une catégorie (facultative). Supprimer une catégorie met ses livres en « Sans catégorie ».
- **Couvertures** : `image` accepte un fichier uploadé ou une URL. Sans image, une couverture est générée à partir du titre.

- **PostgreSQL** via `pg` (au lieu de MySQL). La table `user` s'appelle `users` (mot réservé).
- **helmet** et **morgan** sont branchés directement dans `main.ts` : les wrappers `@nest-middlewares/*` sont dépréciés et incompatibles avec helmet 8.
- **Versions** : NestJS `^11` (dernière majeure que j'ai pu valider) — passez les `@nestjs/*` en `^12` si votre environnement l'impose.
- `password` et `salt` sont en `select: false` : ils ne sortent jamais d'une requête, même via une relation.
- Le rôle est relu en base à chaque requête (JwtStrategy) : un changement de rôle est immédiat.
- **Suppression d'auteur** : refusée (409) s'il reste des livres rattachés, corbeille comprise.
- **Images** : protégées par JWT ; le frontend les charge en `blob`. Suppression définitive d'un livre = suppression du fichier.
- **Cron** (`@nestjs/schedule`) : chaque nuit à 3 h, purge des livres en corbeille depuis plus de 30 jours.
- `DB_SYNC=true` est réservé au développement : en production, passez par des migrations TypeORM.
- Bootstrap, icônes et polices sont chargés via CDN (jsDelivr / Google Fonts), autorisés dans la CSP helmet.

## Structure

```
src/
  auth/ user/ author/ book/ favorite/ tasks/ common/
public/            index.html · css/style.css · js/app.js
```
