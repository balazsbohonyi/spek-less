---
name: spek-recall
description: Search prior spec decisions by natural-language query - grep-first, section-scoped reads of Context, Discussion, and Assumptions across all specs. Returns a brief synthesized answer followed by cited matches. Read-only. Use when you need to know how a cross-cutting concern was handled in a previous feature.
---

# spek-recall - Find prior decisions across your spec corpus

You are searching the accumulated spec corpus for decisions relevant to a natural-language query. This skill treats the `.specs/` directory as a knowledge base: it retrieves *why* decisions were made in prior features, not just what was built.

This skill is **strictly read-only**. It writes nothing, modifies nothing, spawns no sub-agents.

## Inputs

- **Required:** query string (e.g. `$spek-recall "how have we handled caching?"`). If the query is missing or empty, stop immediately and tell the user: "A query is required. Usage: `$spek-recall <your question>`."

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) - `specs_root`.
2. **`.specs/principles.md`** (if exists) - full file.
3. **`<specs_root>/*/spec.md`** - grep-first: extract key content terms from the query and grep them case-insensitively across all spec files. Only files with at least one match become candidates. For each candidate, read frontmatter (`id`, `title`, `status`) and section-scoped `## Context`, `## Discussion`, and `## Assumptions` only (use Grep `^## ` to locate boundaries, then Read with offsets).

## Behavior

### 1. Parse query terms

Extract meaningful content terms from the query - strip common stop words ("how", "have", "we", "the", "a", "an", "is", "are", "was", "did", "do", "does", "what", "which", "where", "when", "why", "been", "be", "in", "of", "to", "for", "with", "on", "at", "by", "from") and use what remains as grep patterns. If after stripping only stop words remain, use the full original query as a single pattern.

### 2. Grep across all specs

Run a case-insensitive Grep across `<specs_root>/*/spec.md` for each extracted term. Collect the file paths of all files with at least one match - these are the **candidates**.

If no candidates match, go directly to the no-results output.

### 3. Read candidate sections

For each candidate spec file:

1. Read frontmatter to extract `id`, `title`, `status` (the block between the first and second `---` delimiters).
2. Use Grep `^## ` to locate section boundaries.
3. Read **only** `## Context`, `## Discussion`, and `## Assumptions` - offset/limit Read per section. Skip Plan, Review, Verification, Retrospective.
4. Find the passage(s) containing one or more query terms. Extract up to 2-3 relevant sentences per matching section as an excerpt.

### 4. Synthesize and format output

After gathering the matching excerpts, write a 1-2 sentence synthesis that states the dominant answer to the query in plain language. Keep it strictly grounded in the retrieved passages. If the passages disagree or are too thin for a clean answer, say that explicitly rather than inventing certainty.

Then emit one result block per matching spec. Within each block, list every section that had a match:

```
**[<id> · <status>] <title>**
- Context: <excerpt - the relevant 1-3 sentences>
- Discussion: <excerpt>
  - [rejected alternative] <excerpt>  <- add this label when the passage is a ruled-out option
- Assumptions: <excerpt>
```

Only include section lines where a match was actually found. If Discussion matched but Context did not, omit the Context line.

### 5. No-results path

When grep returns no candidates:

> No results found for "**<query>**". Try different or broader terms.
> Note: vocabulary drift is a known limitation - a spec that uses "JWT session management" will not match a query about "token storage". This is expected behavior, not a defect.

## Writes

None. This skill is strictly read-only.

## Output to user

- The synthesis from step 4, followed by the cited result blocks (one per matching spec), or the no-results message.
- A trailing line: `*Found N matching spec(s). Results include specs at any status - a `done` spec's decisions are verified; a `discussing` spec's may still be in flux.*`

## Hard rules

- **Query is required.** If the query argument is absent or empty, stop with the usage message. Never guess a query.
- **Grep-first, no fallback.** Candidates are found via grep only. Never fall back to reading all Discussion sections when grep returns nothing. Zero results is a valid, informative outcome - not a signal to widen the search automatically.
- **No status filter.** Return results from specs at any status - `created`, `discussing`, `executing`, `done`, everything. Label each result with the spec's status so the caller can judge weight.
- **Sections: Context, Discussion, Assumptions only.** Never read Plan, Review, Verification, Retrospective, or execution.md. Those sections capture *what* was done tactically, not *why* decisions were made.
- **Synthesis is evidence-bound.** The opening summary must be supported by the retrieved passages. If results conflict or are sparse, say so plainly instead of smoothing the disagreement away.
- **Strictly read-only.** Never write to any file, tick checkboxes, or modify frontmatter.
- **No sub-agents.** Reads are bounded and sequential; sub-agents add overhead with no benefit.
- **Vocabulary drift is accepted, not papered over.** If query terms do not appear in spec content, results are empty. Do not attempt semantic expansion, synonym injection, or fallback strategies. The no-results message explains the limitation to the caller.
