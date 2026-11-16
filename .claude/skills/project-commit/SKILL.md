---
name: project-commit
description: "Commit the current changes with a message in this repo's commit style (type: summary, optional [what]/[why]/[how]/[todo] body). Confirms the branch and the staged file list first, never pushes."
---

# project-commit

Generate a commit message for the current staged/unstaged changes that matches this repo's style, then commit (NEVER push).

## Repo commit style

Before writing the message, derive the style to follow:

1. Get the local git identity: `git config user.email`.
2. Look at that person's own commit history in this repo: `git log --author="<email>" --pretty=format:"===%H===%n%B"` (exclude the initial commit and merge commits).
3. If that history has a reasonable sample (roughly 5+ non-trivial commits), base the subject-line type list, and body-section conventions on what that author actually does — don't assume another contributor's conventions (e.g. a type or format only ever used by someone else) apply to this author.
4. If the sample is too small to tell, fall back to the general convention below instead.

### Repo commit style general convention

**Subject line:** `<type>: <lowercase summary>`

- Types: `feat`, `fix`, `refactor`, `chore`, `docs`...etc.
- Keep it concise and imperative-ish.

**Body (optional):** use bracketed sections, only the ones that apply:

- `[what]` — what changed. If the commit touches several distinct features/areas, use a numbered or bulleted list (one item per feature/area) instead of a one-liner.
- `[why]` — motivation / root cause. Cite doc or issue URLs when relevant.
- `[how]` — implementation detail, code snippet, or the enum/config line touched.
- `[todo]` — known follow-ups or unresolved issues.

Trivial changes (one-liners, config bumps) touching a single feature may use a plain 1–2 line body with no sections.

## Steps

### 0. Confirm the branch

Before doing anything else, run `git branch --show-current`, tell the user which branch they're on, and ask for permission to proceed with committing on it. Do not continue to the next step until they confirm.

### 1. Inspect changes

```bash
git status
git diff
git diff --cached
```

Also list untracked files and skim their content so they are described accurately.

### 2. Determine the commit scope (staged-driven)

- **The commit message is summarized from the STAGED files only.** Inspect both staged (`git diff --cached`) and unstaged (`git diff`, untracked) so you understand the full picture, but base the message on what is staged.
- If nothing is staged yet, stage the relevant related changes with `git add` (group logically — one coherent change per commit). Never stage secrets, large binaries, or unrelated generated artifacts.
- Leave anything that doesn't belong in this commit unstaged.

### 3. Write the message

- Pick the `<type>` from the dominant nature of the **staged** diff.
- Summarize the actual code, not just file names.
- Follow the style section above.
- **Do not wrap body lines at a fixed column width.** Each sentence or list item should be one continuous line, no mid-sentence line breaks for cosmetic column alignment.

### 4. Confirm the file list

Before committing, run `git diff --cached --name-status` and list exactly which staged files will be committed. Stop and wait for the user's confirmation before proceeding — do not run step 5 until they approve.

### 5. Commit (no push)

Use a heredoc so the multi-line body is preserved:

```bash
git commit -F - <<'EOF'
<type>: <summary>

[what]
...
EOF
```

After committing, **list the files that were committed** so the user can confirm what landed:

```bash
git show --stat --oneline HEAD          # subject + per-file change stats
git diff-tree --no-commit-id --name-status -r HEAD   # plain list of committed paths
```

Then **report the files that were NOT committed** (remaining unstaged / untracked, via `git status --short`) so the user knows what is left out of this commit.

**Do not run `git push`.**

## Arguments

- `$ARGUMENTS` — optional extra context (e.g. a type override like `fix`, or a hint about intent). Fold it into the message; do not ignore it.
