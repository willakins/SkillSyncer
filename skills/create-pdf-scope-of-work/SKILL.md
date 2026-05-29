---
name: create-pdf-scope-of-work
description: Create phase-based scope-of-work or remaining-work PDFs that read like polished implementation outlines rather than generic exports. Use when Codex needs to present validated issues, workstreams, priorities, recommended order, or definition-of-done in a styled PDF, especially for scope-of-work documents, project plans, implementation outlines, remaining-work summaries, or phase breakdowns.
---

# Create PDF Scope Of Work

## Overview

Use this skill for scope-of-work PDFs that need strong hierarchy, a professional business-document layout, and explicit separation between confirmed issues, decisions, and follow-on work. Apply the section order and layout rules below instead of improvising a generic report.

## Layout Contract

1. Open with a hero banner.
   - Use a dark banner with a centered title and short subtitle.
   - Keep the title on one line if possible.
2. Follow with an executive summary table.
   - Include concise rows such as goal, validation basis, and current baseline.
   - Use a narrow bold label column and a wider body column.
3. Add an "At a glance" block and the Phase 1 bar on page 1.
4. Use numbered sections for the core workstreams.
   - Give each section a bold heading, short framing paragraph, and flat bullets.
   - Separate confirmed bugs from product or data-model decisions.
5. Start Phase 2 with its own section bar.
6. Close with a bordered summary matrix.
   - Include recommended implementation order.
   - Include a definition of done.
   - Keep any short provenance note above the footer, never on its own page.

## Writing Contract

- Lead with validated current-state issues, not speculative future-state behavior.
- Name the failure mode when possible: wrong-scope leak, wrong-context fallback, runtime error, or count-versus-click-through mismatch.
- Group items by workstream, not by code file.
- Keep follow-on work clearly separated from immediate blockers.
- End with an implementation order and a clear completion bar.

## Style Contract

- Default to letter page size unless the source artifact clearly uses another size.
- Use Helvetica and Helvetica-Bold unless the existing PDF clearly uses another family.
- Use a dark navy hero block, pale blue section bars, light gray borders, muted blue-gray body text, and a thin footer line with title left and page number right.
- Preserve generous whitespace and stable margins.

## References

- Read the [scope-of-work layout guide](references/scope-of-work-layout.md) for the section sequence and palette.

## Assets

- Start from `assets/scope_of_work_reportlab_template.py`.
- Use `$create-pdf` as the broader fallback when the PDF is not specifically a scope-of-work document.
