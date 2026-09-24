# Board

Un dashboard financier personnel : configurez vos revenus et dépenses récurrents une
seule fois, et votre budget se remplit automatiquement chaque mois. Board répond en un
coup d'œil à une question simple — *avec ce que je gagne, ce que je dois payer et ce que
je veux épargner, combien puis-je réellement dépenser ?*

## Fonctionnalités (V1)

- Revenus et dépenses récurrents (loyer, salaire, abonnements…) générés automatiquement
  chaque mois, avec possibilité de modifier ou ignorer une seule occurrence sans toucher
  à la règle.
- Transactions manuelles, mois par mois, avec statut prévu/effectuée/ignorée.
- Dashboard : solde actuel, argent réellement disponible ce mois-ci, comparaison au mois
  précédent, détail des prévisions.
- Budgets par catégorie avec barre de progression et seuil d'alerte.
- Objectifs d'épargne (montant, date cible, contribution mensuelle suggérée).
- Abonnements : vue dédiée avec coûts mensuel et annuel totaux.
- Statistiques : répartition par catégorie, évolution sur plusieurs mois, fixe vs
  variable, dépense moyenne par jour.
- Compte : export de vos données (JSON complet ou CSV des transactions), changement de
  mot de passe, suppression de compte.
- Thème clair/sombre (sombre par défaut, accent or).

## Stack technique

Next.js (App Router, React Server Components + Server Actions) · TypeScript · PostgreSQL
· Prisma 7 · Auth.js v5 (Credentials + bcrypt) · Tailwind CSS v4 · Recharts · Zod ·
Vitest.

## Démarrage

Prérequis : Node.js 20+, PostgreSQL 16+ (local ou distant).

```bash
git clone <url-du-repo> board
cd board
npm install
```

Copiez `.env.example` vers `.env` et renseignez-le :

```bash
cp .env.example .env
```

- `DATABASE_URL` — chaîne de connexion PostgreSQL. En local :
  ```bash
  sudo -u postgres psql -c "CREATE ROLE board WITH LOGIN PASSWORD 'board_dev_password' CREATEDB;"
  sudo -u postgres psql -c "CREATE DATABASE board OWNER board;"
  ```
  (`CREATEDB` est nécessaire : Prisma en a besoin pour sa base de données shadow lors des
  migrations.)
- `AUTH_SECRET` — générez-en un avec `openssl rand -base64 32`.
- `NEXTAUTH_URL` — `http://localhost:3000` en développement.

Puis :

```bash
npm run db:migrate   # applique le schéma
npm run db:seed      # crée les catégories par défaut (Nourriture, Logement, …)
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), créez un compte, et c'est parti —
la première visite du dashboard génère automatiquement les occurrences du mois en cours
pour toute règle récurrente que vous créez.

### Explorer avec des données de démo

Pour un compte pré-rempli avec les exemples de la spec (salaire, loyer, abonnements
Netflix/Spotify/Téléphone, un objectif d'épargne, un budget, et 3 mois d'historique) :

```bash
npm run db:seed:demo
```

Connectez-vous avec `demo@board.app` / `demodemo123`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` / `npm run start` | Build de production et lancement |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run test` / `npm run test:watch` | Tests (Vitest) |
| `npm run db:migrate` | Applique les migrations Prisma |
| `npm run db:seed` | Catégories par défaut |
| `npm run db:seed:demo` | Compte de démonstration complet |
| `npm run db:studio` | Prisma Studio |

## Structure du projet

```
src/
├── app/            # Routes (App Router) — (auth)/, (app)/ (shell authentifié), api/
├── components/      # UI partagée (ui/ = primitives type shadcn, layout/, ...)
├── server/
│   ├── actions/     # Server Actions — validation → auth → service → revalidate
│   ├── services/     # Toute la logique métier, pure et testable (recurrence/, forecast/, ...)
│   ├── auth/         # Auth.js, hash, sessions
│   ├── entitlements/  # Freemium : hasFeature / requireFeature / canUse
│   └── db/           # Client Prisma
├── lib/
│   ├── validation/    # Schémas Zod partagés formulaires ↔ Server Actions
│   └── utils/         # Dates (UTC), devise (centimes ↔ affichage)
prisma/
├── schema.prisma
├── seed.ts           # Catégories par défaut
└── seed-demo.ts       # Compte de démonstration
tests/unit/            # Moteur de récurrence, prévisions, entitlements
```

Le moteur de récurrence (`src/server/services/recurrence/`) et les calculs de prévision
(`src/server/services/forecast/`) sont le cœur du produit : tout y est calculé à la
lecture à partir des transactions, sans cache — jamais de donnée périmée.

## Notes de conception

- **Argent = entiers en centimes** partout en base ; seul `lib/utils/currency.ts`
  convertit pour l'affichage.
- **Un modèle `Transaction` unifié** : une occurrence générée par une règle récurrente et
  une transaction manuelle sont la même table (`recurringRuleId` nul ou non). Éditer une
  seule occurrence (ex. un salaire exceptionnel un mois donné) est une simple mise à jour
  de ligne, sans jamais toucher à la règle ni à l'historique.
- **V1 est mono-compte** (`userId` directement en clé étrangère sur les tables d'argent,
  pas de modèle `Account` financier séparé) — un futur multi-compte reste une migration
  additive.
- **Import CSV/Excel, insights automatiques et facturation réelle** ne sont pas construits
  en V1, mais le modèle de données ne les empêche pas : le `Plan` enum et
  `src/server/entitlements/` sont déjà le point d'attache pour une vraie facturation, et
  rien dans le schéma n'empêche d'ajouter un service d'import ou d'insights plus tard.
