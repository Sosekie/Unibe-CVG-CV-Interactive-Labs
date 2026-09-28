# Review and release checklist

Complete for each tutorial. Record evidence alongside checkmarks; separate local checks from production checks. Instructor review is needed for scope, unresolved mathematics and release timing.

## Content and PDFs

- [ ] Scope/date/release plan checked against the current course program and instructor instructions.
- [ ] Each exercise and answer mapped to slide filename and PDF page; optional extensions marked.
- [ ] Derivations, numeric answers, units and sign/coordinate/boundary conventions checked independently.
- [ ] Assignment wording describes the intended practical exercise and only includes required submission obligations.
- [ ] Exercise and solution use current Tutorial 01/02 PDF styling.
- [ ] All PDF pages rendered and inspected for overflow, missing figures, broken equations and readability.
- [ ] Interactive lab and GitHub links are clickable; GitHub appears directly below Interactive lab.
- [ ] Source, packaged PDFs and upload ZIP agree with the approved release plan.

## Visible teaching effects

- [ ] Every control in experiments and worked answers has been exercised; default and contrasting views captured.
- [ ] Controls produce a meaningful graphic change, or a correct explanation/plot of why a classification stays the same.
- [ ] Default datasets look plausible and distinguish the methods being compared.
- [ ] Axes, units, signs and normalization are labeled; geometric plots use equal scales where needed.
- [ ] Comparison scales support the stated conclusion; clipping is indicated; rounded readouts do not contradict status.
- [ ] Invalid inputs and degenerate cases do not produce fake finite solutions or misleading lines/grids.
- [ ] Reset, presets and dataset switches restore the intended state; captions update with input.
- [ ] Answers contain a visualization, derivation, current result and takeaway consistent with the solution.

### Control evidence table

Add one row for **every** slider, editable value, draggable handle, toggle and preset, including those inside answers.

| Experiment / question | Control | Settings tested | Expected effect | Independent result | Screenshot / observation | Result / action |
| --- | --- | --- | --- | --- | --- | --- |
| [name] | [control] | [default, contrast, extreme] | [visible mathematical effect] | [calculation] | [evidence] | [pass / fix / untested] |

### Lessons from Tutorial 03

| Example | Check to reuse in another topic |
| --- | --- |
| Gaussian edge response | Increasing smoothing lowers and widens the derivative; distinguish peak width from the interval above a fixed threshold. Avoid silently clipped peaks or per-view height normalization. |
| Harris response | Intensity colors and response plots should show scaling. A parameter may change the response without changing its sign; show the response/boundary rather than inventing a label change. |
| LS versus TLS | Use equal plot scales and sufficiently contrasting but plausible data. Check vertical-line singularity, perpendicular TLS residuals and rotation behavior. |
| Prewitt plane fit | Show the fitted plane or gradient vector when pixels change; specify correlation versus convolution and the image y direction. |
| Affine versus homography | Use a visibly perspective-distorted target; check non-collinearity and finite warps. State whether the implementation solves a fixed-scale four-pair system or uses lecture DLT/SVD. |

These are examples of checks, not mandatory topics for later tutorials.

## Interaction, access and storage

- [ ] Desktop and 375px-wide layouts checked; no unintended horizontal overflow or hidden controls.
- [ ] Touch hit areas, screen-to-plot conversion, pointer capture/cancel and touch-action checked.
- [ ] Controls usable with keyboard; shared zoom and Shift-wheel navigation checked on student/teacher routes.
- [ ] Correct teacher account configuration and server authorization checked with an isolated test setup.
- [ ] Unauthorized direct teacher requests denied; unpublished answer fields absent from student API.
- [ ] Publish all, Hide all, per-question release and answer previews work in the test database.
- [ ] Vote persistence and duplicate-vote behavior checked locally; no production votes/release changes made for QA.
- [ ] New tutorial has separate project/database bindings and unique question IDs; historical votes preserved.
- [ ] Public source/answer release policy reviewed; no credentials, personal configuration or withheld materials staged.
- [ ] Applicable math tests, lint, type checks and build pass; console findings assessed with evidence.

## Release record

- [ ] Maintained source updated in CV_Tutorial; deployment copy matches approved source.
- [ ] Correct Site published and actual URL checked, or explicitly recorded as pending.
- [ ] Both CV_Tutorial and the dedicated website repository synchronized within the approved scope; both remote commit IDs and requested files verified. A repository without changes is explicitly verified unchanged.
- [ ] Hub entry and ILIAS description/link prepared or updated as authorized.
- [ ] Final summary identifies checks performed, untested items and remaining limitations.

```text
Tutorial / author / review date:
Reviewed slide files and pages:
Maintained source path:
Exercise / solution package paths and release timing:
Local checks and results:
Browser checks and screenshots:
Site URL / publication status:
CV_Tutorial commit:
Interactive-labs repository commit:
Instructor decisions / unresolved items:
```
