# Editable Tutorial 09 sources

The exercise and solution PDFs are generated with LaTeX, using the same course-handout conventions as the earlier tutorials: a centred course header, unboxed numbered questions, mathematical derivations, page numbers, and links to the interactive lab and source code. Luca Scharr is credited in the header and PDF metadata.

Both PDFs use the fourteen-question bank in `../../dist/questions.js`. Edit the guided experiments and LaTeX display equations in `content.py` and the document layout and generator in `build.py`. The generated `.tex` files are maintained in `tex/`; intermediate LaTeX files go in the ignored `.generated/` directory. In LaTeX source, start each sentence on a new line and leave no trailing whitespace.

## Rebuild

Requires Python 3, Node.js, and a LaTeX distribution providing `pdflatex`, Latin Modern fonts, AMS math, `enumitem`, `needspace`, TikZ, `xurl`, and `hyperref`. From this directory:

```sh
python3 build.py
```

The completed PDFs are written to the parent `materials/` directory. The exercise PDF contains open-ended questions; the separate solution PDF repeats each question and gives worked explanations for both parts. After editing, inspect the pages and links and update the compatibility copies and checksums recorded in `../RELEASE.md`.
