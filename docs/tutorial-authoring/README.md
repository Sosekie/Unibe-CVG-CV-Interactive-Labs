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

**Availability:** this public repository includes website source and the released Tutorial 01/02 PDFs, not the full course archive. Current slides, the program, editable LaTeX, instructor notes and unreleased solutions must be supplied separately as needed. Request them through the course team's approved channel; do not substitute an old year's answer or publish withheld files as part of a source sync. The PDF link convention is described below.

Use the current program and instructor decisions for scope and timing, and the relevant slides for the mathematical conventions. Historical worksheets are a pool of exercises, not the current syllabus. If the current worksheet conflicts with a slide, record the exact question, slide page and proposed correction for review.

## Examples to open

| Example | Student site | Maintained source |
| --- | --- | --- |
| Tutorial 01 | [Pinhole camera lab](https://pinhole-camera-lab.chenrui-fan.chatgpt.site/) | [tutorial-01-pinhole-camera-lab](../../tutorial-01-pinhole-camera-lab/) |
| Tutorial 02 | [Optics, filters and events lab](https://cv-tutorial-02-lab.chenrui-fan.chatgpt.site/) | [tutorial-02-optics-filters-edges-lab](../../tutorial-02-optics-filters-edges-lab/) |
| Tutorial 03 | [Interest points, fitting and registration lab](https://cv-tutorial-03-lab.chenrui-fan.chatgpt.site/) | [tutorial-03-interest-points-fitting-registration-lab](../../tutorial-03-interest-points-fitting-registration-lab/) |

The [course hub](https://cv-2026-interactive-labs.chenrui-fan.chatgpt.site/) is the common student entry point. Instructor dashboards use `/teacher`; access requires the configured teacher account.

### Where to look in the source

Within the Tutorial 02 website directory:

- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/site-header.tsx`: page structure, shared navigation and visual design.
- `components/questions-section.tsx`, `components/interactive-answer.tsx`: question tabs, voting state, interactive worked answers.
- `components/teacher-dashboard.tsx`, `app/teacher/page.tsx`: instructor layout and answer publication controls.
- `app/api/questions/route.ts`, `app/api/votes/route.ts`, `app/api/teacher/questions/route.ts`: student and teacher endpoints.
- `app/chatgpt-auth.ts`, `app/teacher/page.tsx`, `app/api/teacher/questions/route.ts`, `db/`, `drizzle/`: host-specific authentication, teacher authorization and persistent storage. The public Tutorial 02/03 copies read the teacher identity from `TEACHER_EMAIL`; configure it privately for the intended teacher when adapting the template.

Within Tutorial 03, also inspect `components/harris-visualization.tsx`, `components/prewitt-plane-diagram.tsx`, `lib/tutorial-questions.ts`, `lib/teacher.ts` and `tests/tutorial03.test.ts` for visualizations, question identifiers, teacher configuration and numerical checks. Reuse the design and patterns; replace the topic-specific mathematics, data and identifiers.

## Local preview and hosting

For the current Tutorial 03 source, `package.json` requires Node.js **22.13.0 or later**. From that website directory:

```sh
npm ci
npm run dev
```

Open the local address printed by the development server. The current verification commands are:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Check each template's own `package.json` before reusing these commands. The templates use React, TypeScript, Vinext and Cloudflare D1. This public copy configures a local development database; student visualizations and released answers do not require a ChatGPT account locally. Local votes are not synchronized with the classroom site. See the [repository README](../../README.md) for the setup and launch shortcuts. Math tests and a build do not establish that hosted authentication or the production question database works. Hosted voting and teacher publication need the appropriate `DB` binding and authentication configuration. Inspect the template's database initialization/migrations and hosting configuration with the deployment maintainer.

For a new tutorial, provision its own Site, database and authorized teacher configuration. Review copied `.openai` metadata, database bindings, question IDs, topic names, URLs and assets before deployment. Do not deploy with a previous tutorial's project identity or database. The authentication headers in `app/chatgpt-auth.ts` depend on the trusted hosting layer; they are not a standalone authentication system for arbitrary hosting. A browser-only prototype can demonstrate the mathematics, but cannot safely provide persistent shared votes or protected teacher actions without a backend.

For a `chatgpt.site` publication, use the available Sites publishing workflow with the course maintainer's access. An ordinary chat may generate the code without having publication access. Keep credentials and teacher account configuration outside public source, and report the actual deployment result and tested URL.

## Repository and release convention

Maintain one website source directory inside `2026/tutorials/tutorial_NN/` in **CV_Tutorial**. A local `sites/` checkout is a deployment copy; do not turn it into another maintained version. Student experiments and questions share one page, with the existing separate instructor route.

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

After review, publish the site and maintain the approved source in [CV_Tutorial](https://github.com/Sosekie/CV_Tutorial). Synchronize the finished website into [Unibe-CVG-CV-Interactive-Labs](https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs), following that repository's layout and public configuration policy. Preserve unrelated local work, historical question IDs and votes. Add the new tutorial to the hub and provide ILIAS with the stable student URL.

Answer publication controls govern the student interface. Source code committed to a public GitHub repository may contain worked answers, so interface gating does **not** promise answer secrecy. Keep genuinely unreleased material out of public commits and client bundles; agree the course's source/release policy before synchronization.
