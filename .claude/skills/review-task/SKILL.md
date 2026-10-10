---
name: review-task
description: Review a task's work against its task file, then tick the acceptance criteria that pass and the task's Milestone in SPEC.md.
disable-model-invocation: true
argument-hint: <task id, e.g. 02.3>
---

Runs step 5 of SPEC.md "Completing a task" (the review), then steps 2 and 6 (ticking), on _evidence_ only: a box is ticked when you observed it pass in this run, never because the code looks right.

## 1. Resolve the task

The argument is a task id (`00.1`, `S3`). Find `docs/tasks/<id>-*.md`; exactly one file must match, or stop and ask.

Fixed point: On `main` itself, use the parent of the oldest commit whose message starts with `<id>:` or mentions the task; if none or ambiguous, ask.

## 2. Review

Invoke the `code-review` skill with the fixed point and the task file as the spec. Let it run to its aggregated report and show that report to the user before continuing.

## 3. Verify each acceptance criterion

For every unticked `- [ ]` under `## Acceptance criteria` in the task file, gather evidence and give it one verdict:

- **pass**: you ran the command, query or check and saw it succeed. For the command-shaped ones (`pnpm test`, `pnpm compose`, a GraphQL query) run them yourself; a sub-agent's say-so is not evidence. When a criterion needs the running server, start it with the matching `package.json` script and stop it afterwards.
- **fail**: you ran it and it failed. Quote the failing output.
- **manual**: it rests on human judgement or an event outside the repo ("the review session happened", "you can explain…"). Leave these for the user.

A Spec finding from step 2 under "implemented but looks wrong" that bears on a criterion turns its verdict to **fail**, even if its command passed.

Also run the gate from SPEC.md step 3, the checks that exist at this point in the milestones. A red gate means no Milestone tick in step 4.

## 4. Tick

- Task file: change `- [ ]` to `- [x]` for each **pass** criterion only.
- SPEC.md Milestones: tick the task's line only when every criterion in the task file is now `[x]` and the gate is green. A remaining **manual** criterion holds the Milestone open; the user ticks it after confirming.

Edit only checkboxes

## 5. Report

A table of criteria → verdict → evidence (the command and the line of output that decided it), whether the Milestone was ticked and, if not, what still blocks it. Then list the SPEC.md completion steps still outstanding for this task (commit message format).
