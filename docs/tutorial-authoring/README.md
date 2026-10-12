# Creating Computer Vision tutorials with AI

Handoff for Zahra, Luca and future tutorial authors · 28 September 2026

This is the public handoff package. Website examples below link to source in this repository. The course team maintains the teaching materials and original sources in [CV_Tutorial](https://github.com/Sosekie/CV_Tutorial); access to that repository and unreleased course files may require permission. The prompts, brief and checklist can be used directly from this public copy.

The workflow used for Tutorials 01–03 combines the lecture slides, the current worksheet and worked solutions, the existing website source, and repeated mathematical and visual checks. The prompts below make that workflow reusable. A first generated page still needs review: correct numbers alone do not establish that an experiment teaches its intended concept.

## Start here

1. Fill in the [tutorial brief](TUTORIAL_BRIEF.md) with your tutorial number, scope, files and release plan.
2. Give the AI the brief and relevant files. Use [Prompt 1](PROMPTS.md#1-read-the-material-and-check-the-content) to check the worksheet and solutions against the slides.
3. Use [Prompt 2](PROMPTS.md#2-build-or-revise-the-interactive-lab) to build the lab, using Tutorial 02 as the main layout and worked-answer reference.
4. Run [Prompt 3](PROMPTS.md#3-audit-every-experiment-and-answer) and complete the [release checklist](CHECKLIST.md). Check the actual plots at contrasting settings, including on a phone-sized screen.
5. Use [Prompt 4](PROMPTS.md#4-prepare-the-release-and-handoff) to package the PDFs, publish the approved site and synchronize its source.

The prompts are written in English for reuse in ChatGPT, Claude or a coding assistant. Attach the actual files to an attachment-based chat. With a repository-capable assistant, give it the paths and require it to open the files. A URL or filename alone does not supply the document's contents. If the assistant cannot run, render or publish the project, retain those steps for someone with the required tools and credentials.

## What to provide

| Input | Purpose | Repository reference |
| --- | --- | --- |
| Current course program | This year's topic, tutorial date and assignment/solution release timing | Obtain the current program from the course team; the course repository uses `2026/Program CV 2026.xlsx` |
| Relevant lecture PDFs | Definitions, notation, assumptions and derivations | Obtain the current slides from the course team or ILIAS |
| Current exercise and solution sources, PDFs and figures | The actual questions and complete reference answers | Your tutorial directory; see availability note below |
| Tutorial 02 source and PDFs | Established header, visual style, teacher controls and worked-answer layout | [Tutorial 02 source](../../tutorial-02-optics-filters-edges-lab/), [exercise PDF](../../tutorial-02-optics-filters-edges-lab/materials/tutorial_02.pdf), [solution PDF](../../tutorial-02-optics-filters-edges-lab/materials/tutorial_02_solution.pdf) |
| Tutorial 01 source | Shared course identity and navigation reference | [Tutorial 01](../../tutorial-01-pinhole-camera-lab/) |
| Tutorial 03 source | Further examples: linked mathematical graphics, controls and numerical checks | [Tutorial 03](../../tutorial-03-interest-points-fitting-registration-lab/) |
| Images/notebooks/data | Reproducible experiments and runnable exercises | Attach only the files needed for your topic |
| Completed brief | Intended outcomes, author, release plan and proposed controls | [Blank brief](TUTORIAL_BRIEF.md) |

**Availability:** this public repository includes website source and the released Tutorial 01–04 exercise and solution PDFs, not the full course archive. See the [course PDF links](../../README.md#course-pdfs), including the [Tutorial 03 solution](../../tutorial-03-interest-points-fitting-registration-lab/materials/tutorial_03_solution.pdf) and the [Tutorial 04 solution](../../tutorial-04-shading-photometric-stereo-lab/materials/tutorial_04_solution.pdf). Current slides, the program, editable LaTeX, instructor notes and unreleased solutions must be supplied separately as needed. Request them through the course team's approved channel; do not substitute an old year's answer or publish withheld files as part of a source sync. The PDF link convention is described below.

Use the current program and instructor decisions for scope and timing, and the relevant slides for the mathematical conventions. Historical worksheets are a pool of exercises, not the current syllabus. If the current worksheet conflicts with a slide, record the exact question, slide page and proposed correction for review.

## Examples to open

| Example | Student site | Maintained source |
| --- | --- | --- |
| Tutorial 01 | [Pinhole camera lab](https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-01/) | [tutorial-01-pinhole-camera-lab](../../tutorial-01-pinhole-camera-lab/) |
| Tutorial 02 | [Optics, filters and events lab](https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-02/) | [tutorial-02-optics-filters-edges-lab](../../tutorial-02-optics-filters-edges-lab/) |
| Tutorial 03 | [Interest points, fitting and registration lab](https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-03/) | [tutorial-03-interest-points-fitting-registration-lab](../../tutorial-03-interest-points-fitting-registration-lab/) |

The [course hub](https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/) is the common student entry point; [Course hub](#course-hub) explains how to add a tutorial. Each lab has an instructor page at `teacher/` below its address, for example `…/tutorial-02/teacher/`. Instructors sign in with GitHub.

### Where to look in the source

Within the Tutorial 02 website directory:

- `components/lab-home.tsx`, `app/layout.tsx`, `app/globals.css`, `components/site-header.tsx`: page structure, shared navigation and visual design. `app/page.tsx` only wraps the page for the static export.
- `lib/question-bank.ts`, `components/questions-section.tsx`, `components/interactive-answer.tsx`: questions, voting state, interactive worked answers.
- `components/teacher-app.tsx`, `components/teacher-dashboard.tsx`, `app/teacher/page.tsx`: instructor sign-in, layout and answer publication controls.
- `lib/labs-api.ts`: the client for the course API (votes, releases, sign-in). It is the same file in every lab.
- [`api/`](../../api/): the course API, a Cloudflare Worker with a D1 database. `api/src/tutorials.ts` lists the question ids of each tutorial, and `TEACHERS` in `api/wrangler.json` lists the instructors' GitHub accounts.

Within Tutorial 03, also inspect `components/harris-visualization.tsx`, `components/prewitt-plane-diagram.tsx`, `lib/question-bank.ts` and `tests/tutorial03.test.ts` for visualizations, question identifiers and numerical checks. Reuse the design and patterns; replace the topic-specific mathematics, data and identifiers.

## Local preview and hosting

The labs need Node.js **22.13.0 or later**. From a lab directory:

```sh
npm ci
npm run dev
```

Open the local address printed by the development server. The verification commands are:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Check each lab's own `package.json` before reusing these commands; Tutorial 01 uses ESLint and builds before its tests. The labs use React, TypeScript and Vinext and are exported as static pages, which GitHub Pages serves. `npm run build` writes the site to `out/`; the environment variable `LABS_BASE_PATH` sets the folder it is served from, for example `/Unibe-CVG-CV-Interactive-Labs/tutorial-05`.

Votes and answer releases are kept by the course API in [`api/`](../../api/), a Cloudflare Worker with a D1 database; every lab reaches it through `lib/labs-api.ts`. A local preview uses the live course API, so do not test voting or publishing there. For tests, run the API with its own local database: create an untracked `api/.dev.vars` with `DEV_TEACHER_LOGIN=<your GitHub login>` and `SESSION_SECRET=<any text>`, run `npm --prefix api run dev` (port 8787) and start the lab with `LABS_API_URL=http://127.0.0.1:8787`. `DEV_TEACHER_LOGIN` signs you in as an instructor without GitHub and works only on localhost.

To add a tutorial lab:

1. Copy a lab folder and replace the topic-specific mathematics, data and text. In Unibe-CVG-CV-Interactive-Labs, name it `tutorial-NN-<topic>-lab/`. Keep `lib/labs-api.ts`, `components/teacher-app.tsx`, `scripts/export-site.mjs`, `next.config.ts` and `vite.config.ts`.
2. Give the questions new, stable ids in `lib/question-bank.ts` and set `tutorialSlug` to `tutorial-NN`.
3. Register the same ids under `tutorial-NN` in `api/src/tutorials.ts`; `api/test/registry.test.ts` checks that the lists agree.
4. Push to `main`. The **Publish course site** workflow tests and builds every `tutorial-*` folder and serves it at `https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-NN/`; **Deploy course API** redeploys the API.
5. Add a card to the [course hub](#course-hub).

Instructors are the GitHub accounts listed in `TEACHERS` in `api/wrangler.json`. A tutor can also host a lab elsewhere, for example on their own `chatgpt.site` address as for Tutorial 05, and add only a hub card. Tutorials 01–04 were first published as ChatGPT Sites; those copies are no longer updated.

## Course hub

The [course hub](https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/) is a single static page, [`site/index.html`](../../site/index.html) in this repository. It only links to the labs, so a lab can be hosted anywhere, including on another tutor's `chatgpt.site` address. Every push to `main` that changes `site/` or a lab folder publishes the site through [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml), which tests and builds every lab. The run appears under **Actions**, and the site updates a few minutes after the push. This needs the one-time repository setting **Settings → Pages → Source: GitHub Actions**.

To add a tutorial:

1. Open `site/index.html` on GitHub and choose **Edit**. Committing to `main` needs write access; ask the repository owner to add you as a collaborator. Without write access, GitHub offers to fork the repository, and you can submit the change as a pull request.
2. Copy the last `<article class="lab-card">` block and paste it after that block. Change the tutorial number (it appears twice), the title, the one-sentence description, the topics and the lab URL; a lab in this repository is served at `https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-NN/`. Write `&` as `&amp;`.
3. Commit to `main`, wait until the **Publish course site** run has finished, then open the hub and test the new link.

The box "Looking for the exercise sheets?" names the tutorials whose source can run locally (currently 01–04). Update it only when you add a lab's source to this repository.

## Repository and release convention

Maintain one website source directory inside `2026/tutorials/tutorial_NN/` in **CV_Tutorial**. Its copy in Unibe-CVG-CV-Interactive-Labs is identical, and GitHub Pages builds the lab from that copy. Local `sites/` checkouts are left from the earlier ChatGPT Sites publications; do not turn them into maintained versions. Student experiments and questions share one page, with the separate instructor page.

Suggested course package, following Tutorials 01–02:

```text
2026/tutorials/tutorial_NN/
  README.md
  ILIAS_description.txt
  tutorial_NN.tex
  tutorial_NN_solution.tex
  figures/
  python/                         # only if needed
  <maintained-website-source>/
  upload_before_class/
  release_after_discussion/
  instructor/                     # review local/private policy before committing
  upload_before_class.zip
```

Use Tutorial 01's `sources/` arrangement where appropriate; the diagram is a package pattern, not a requirement to move existing files. Compile and inspect the PDFs. Under **Interactive lab**, include a clickable [interactive-labs GitHub link](https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs) in exercise and solution PDFs. Refresh packaged PDF copies and rebuild the ZIP from the final upload folder.

The release plan determines which solutions go into which folder. For example, Assignment 01's starter and reference solution were intentionally included together in Tutorial 03's pre-class package; do not impose delayed release on every assignment. Assignment text should describe a practical exercise; add report/submission requirements only when the current course instructions require them.

After review, maintain the approved source in [CV_Tutorial](https://github.com/Sosekie/CV_Tutorial) and synchronize the finished website into [Unibe-CVG-CV-Interactive-Labs](https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs); the push to `main` publishes it. Preserve unrelated local work, historical question IDs and votes. Add the new tutorial to the [course hub](#course-hub) and provide ILIAS with the stable student URL.

**GitHub synchronization rule:** every request to sync to GitHub covers both CV_Tutorial and Unibe-CVG-CV-Interactive-Labs within the approved release scope, and CV_Tutorial is synchronized every time. Follow the [project synchronization skill](../../.agents/skills/cv-tutorial-github-sync/SKILL.md) and verify both remote states and the requested files before reporting completion.

Answer publication controls when the student page shows an answer. The static pages and the public source contain every worked answer, so publication does **not** keep answers secret. Keep genuinely unreleased material out of public commits and pages; agree the course's source/release policy before synchronization.
