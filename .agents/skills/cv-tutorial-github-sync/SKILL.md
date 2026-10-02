---
name: cv-tutorial-github-sync
description: Synchronize the CV_Tutorial course repository and Unibe-CVG-CV-Interactive-Labs public website repository together. Use for this project's GitHub sync, push, release-package sync, or missing files on another computer.
---

# CV tutorial GitHub synchronization

## Required scope

The course maintainer explicitly set this rule on 2026-09-28:

**Every GitHub synchronization must include CV_Tutorial. In this project, “sync to GitHub” means checking and synchronizing both repositories:**

- `https://github.com/Sosekie/CV_Tutorial.git` — maintained course materials, editable sources and canonical website source.
- `https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs.git` — public website source, released course PDFs and public authoring handoff.

This applies even when work starts in the website repository or the user mentions a PDF/website copy. The current request authorizes both repositories within the agreed material scope; do not ask again just because the second repository also needs a push. Follow a newer explicit instruction if the user narrows the scope for a particular task.

Read this skill from either repository's root `AGENTS.md`. Locate checkouts by their `origin` URLs, using existing sibling checkouts when available. Keep the rule and skill consistent in both repositories.

## File ownership and mapping

Maintain source first in `CV_Tutorial`. Local `sites/` folders are deployment copies. Map approved website files to the public repository's existing tutorial folders:

| CV_Tutorial canonical source | Public repository folder |
| --- | --- |
| `2026/tutorials/tutorial_01/pinhole-camera-lab-production/` | `tutorial-01-pinhole-camera-lab/` |
| `2026/tutorials/tutorial_02/cv-tutorial02-optics-filters-edges-lab/` | `tutorial-02-optics-filters-edges-lab/` |
| `2026/tutorials/tutorial_03/cv-tutorial03-interest-points-fitting-registration-lab/` | `tutorial-03-interest-points-fitting-registration-lab/` |
| `2026/tutorials/tutorial_04/cv-tutorial04-shading-photometric-stereo-lab/` | `tutorial-04-shading-photometric-stereo-lab/` |

Preserve intentional public-copy differences such as local runtime/database setup and environment-based teacher configuration. Shared authoring prompts and checklists should agree; adapt repository-specific links in guides.

For a released tutorial PDF, synchronize the required main-repository copies (including `release_after_discussion/` or `upload_before_class/`, as applicable) and the public lab's `materials/` copy. Include the editable source and its dependencies in CV_Tutorial when they belong to the approved release. Refresh affected packaged copies, upload ZIPs and README links. Keep the current course release plan: a GitHub sync request does not independently release previously withheld material. Existing explicit release authorization persists.

## Synchronization procedure

1. Inspect both checkouts' branch, origin, status (including untracked files) and remote state. Preserve unrelated work. Bring in compatible remote changes before editing; resolve ordinary conflicts without discarding work.
2. Identify the intended files in both repositories. Check the actual requested directories, not just the website source. An untracked release folder is not on GitHub. Stage only relevant approved files; keep private notes, credentials, runtime databases, dependencies and caches out.
3. Verify the applicable source/package links and copied content. Released PDF copies should have identical checksums. Check builds or mathematics only when code/content changed and the relevant risk warrants them.
4. Commit and push the required changes in both repositories to the agreed branches, normally `main`. If one repository needs no changes, still verify its remote and required artifacts; no empty commit is necessary.
5. Independently check each remote branch ref after pushing. Verify that the requested files are present in the remote commit/tree; compare critical PDF/file blobs with the intended local files. A successful push of one repository does not complete the two-repository task.

## Completion and reporting

Report completion only after **both** repository checks pass. State each repository's branch/commit and whether it was pushed or verified unchanged. For missing-file complaints, identify the requested file's actual repository path and provide the appropriate pull/download location.

If a required push, checkout or verification fails, report which repository/files remain unsynchronized and the actual reason; do not call the overall synchronization complete. GitHub source synchronization and live-site deployment have separate outcomes—report the actual actions performed.
