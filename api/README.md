# Course API

The labs on the course website are static pages. This small server keeps what they share: the votes and which answers are released. It runs as the Cloudflare Worker `cv-labs-api` with the D1 database `cv-labs`. The [Deploy course API](../.github/workflows/api.yml) workflow tests and deploys it on every push to `main` that changes `api/` or a lab's `lib/question-bank.ts`.

| Request | Purpose |
| --- | --- |
| `GET /v1/tutorials/<tutorial>/state?voter=<id>` | Vote totals, this browser's votes and released answers |
| `POST /v1/tutorials/<tutorial>/votes` | One vote per browser and question: `{ "questionId", "voterId" }` |
| `GET /v1/tutorials/<tutorial>/teacher` | Instructor view (needs a sign-in token) |
| `PUT /v1/tutorials/<tutorial>/teacher` | Publish or hide answers: `{ "questionId" }` or `{ "scope": "all" }`, plus `"published"` |
| `GET /auth/signin?return_to=<page>` | Instructor sign-in with GitHub; returns to the page with a 12-hour token |

Only the course site (`ALLOWED_ORIGINS` and `SITE_PATH` in `wrangler.json`) and local previews on `localhost` may call it from a browser.

## Instructors

Instructors are the GitHub accounts in `TEACHERS` in [`wrangler.json`](wrangler.json), separated by commas. Edit that line and push to add or remove one. The change applies to existing sign-ins at once.

## Adding a tutorial

Add the tutorial id (`tutorial-NN`) and its question ids to [`src/tutorials.ts`](src/tutorials.ts). They must match the lab's `lib/question-bank.ts`; `npm test` checks this.

## One-time setup

1. A Cloudflare account with an API token (template **Edit Cloudflare Workers** plus **Account → D1 → Edit**). Store it and the account id as the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. A GitHub OAuth App whose callback URL is `https://cv-labs-api.<workers.dev subdomain>.workers.dev/auth/callback`. Store its client id and secret as `GH_OAUTH_CLIENT_ID` and `GH_OAUTH_CLIENT_SECRET`.

The workflow creates the database on its first run and applies the files in `migrations/`. `0002_import_chatgpt_sites.sql` copies the released answers and vote totals of Tutorials 01–04 from their former ChatGPT Sites.

## Local development

```sh
npm ci
npm test
npm run dev
```

`npm run dev` serves the API at `http://127.0.0.1:8787` with a local database. To try the instructor page without GitHub, create an untracked `.dev.vars` with `DEV_TEACHER_LOGIN=<your GitHub login>` and `SESSION_SECRET=<any text>`; this shortcut works only on `localhost`. Start a lab with `LABS_API_URL=http://127.0.0.1:8787 npm run dev` to use it.
