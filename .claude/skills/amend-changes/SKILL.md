---
name: amend-changes
description: Fold the current changes into an existing, non-HEAD commit (given as the argument) with git commit --fixup and an autosquash rebase.
---

# amend-changes

Fold the current staged/unstaged changes into an **existing, non-HEAD commit** (identified by `$ARGUMENTS`), instead of amending HEAD or creating a new commit. Uses `git commit --fixup` + `git rebase -i --autosquash` so intermediate commits are replayed automatically, non-interactively.

## Steps

### 1. Resolve and validate the target commit

```bash
git rev-parse --verify "$ARGUMENTS^{commit}"
```

- If `$ARGUMENTS` doesn't resolve, stop and ask the user for a valid commit-ish (short hash, full hash, `HEAD~N`, etc.).
- If it resolves to the current `HEAD`, tell the user a plain `git commit --amend` is simpler and ask whether to proceed that way instead.

### 2. Check how much history this will rewrite

```bash
git status
git log --oneline <target>..HEAD
git merge-base --is-ancestor <target> HEAD && echo "target is an ancestor of HEAD" || echo "target is NOT an ancestor of HEAD"
git log --oneline @{u}..HEAD 2>/dev/null   # commits not yet pushed, if a remote tracking branch exists
```

- Confirm `<target>` is an ancestor of `HEAD` (linear history back to it). If not, stop and explain — this workflow doesn't handle amending a commit on a different branch/line.
- Check whether `<target>` or any commit between `<target>` and `HEAD` has **already been pushed** (i.e. is NOT in the `@{u}..HEAD` list, or `origin/<branch>..HEAD` is empty/short). If any of those commits are already on the remote, this is a **history-rewrite of published commits** — per the git safety protocol, explicitly confirm with the user before proceeding (this is not a case to just plow through, even in auto mode).
- If a merge commit sits between `<target>` and `HEAD`, warn the user: autosquash rebase will linearize/replay through it, which can be surprising. Confirm before proceeding.

### 3. Stage the relevant changes

- If changes are already staged, use them as-is.
- Otherwise, stage the files that logically belong with `<target>`'s change (don't blindly `git add -A`; ask if it's ambiguous which unstaged changes belong here).

### 4. Create the fixup commit and autosquash

```bash
git commit --fixup=<target>
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash <target>~1
```

`GIT_SEQUENCE_EDITOR=true` accepts the default todo list (which already places the fixup right after `<target>` and marks it `fixup`) without opening an editor.

- If the rebase stops with conflicts, resolve them by inspecting `git status` / `git diff`, then `git add` the resolved files and `git rebase --continue`. Never use `git rebase --skip` or `git rebase --abort` without checking with the user first — `--abort` discards the fixup commit and restores the pre-rebase state, which may or may not be what they want.

### 5. Verify

```bash
git log --oneline -8
git status -sb
git show --stat <new-hash-of-target>
```

Confirm the diff landed in the right commit and that commits above it are otherwise unchanged in content (only hashes change, since rebase rewrites descendants).

## Arguments

- `$ARGUMENTS` — the commit-ish to amend into (short hash, full hash, or a ref like `HEAD~2`). Required — if omitted, ask the user which commit to target.
