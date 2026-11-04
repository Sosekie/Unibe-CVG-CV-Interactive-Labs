# Editable Tutorial 09 sources

Both PDFs use the same fourteen-question bank as the website. Edit question text in ../../dist/questions.js, guided experiments and LaTeX equations in content.py, document generation in build.py, and printable styling in print.css. KaTeX typesets the mathematics; Playwright/Chromium exports the PDF.

The handouts follow the Tutorial 02 PDF conventions: centred course/institution header, learning objectives, key concepts, numbered open-ended problems, separate solutions, page numbers, and clickable Interactive lab and Source code links. The course number is Tutorial 09; lecture-slide references remain pending.

## Rebuild

Requires Python 3 and Node.js 22.13 or newer. From this directory:

~~~sh
npm ci
npx playwright install chromium
python3 -m pip install -r requirements.txt
npm run build
~~~

Dependencies are pinned in package-lock.json. Only PDF authoring needs them; the interactive app has no dependencies. Output PDFs go into the parent materials/ directory. Temporary HTML goes into ignored .generated/ for inspection.

The exercise PDF uses open-ended problems rather than multiple-choice answers and omits answer keys and hints. The separate solution PDF contains the approved explanations and follow-up answers already available in the lab. The complete public source contains both, consistent with the repository’s released-material convention.

After editing, rebuild both PDFs, inspect all pages for overflow and missing glyphs, verify clickable links, and commit the sources and matching PDFs together. Lecture alignment remains pending until slides are provided.
