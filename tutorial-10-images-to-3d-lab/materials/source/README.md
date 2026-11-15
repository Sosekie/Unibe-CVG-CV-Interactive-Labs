# Handout source

The website and the two LaTeX handouts use the same question bank in `dist/questions.json`.
Edit that file to change a question, then run `python3 materials/source/build.py` from the lab directory with `pdflatex` available.
Generated LaTeX sources are in `tex/`.
The PDFs are written both to `materials/tutorial_10*.pdf` and to `dist/materials/` for the local preview.
Each solution repeats the question it answers.
The optional affine SfM and shortcut learning questions are included.
