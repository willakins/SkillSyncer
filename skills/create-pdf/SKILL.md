---
name: create-pdf
description: Create or revise polished PDF deliverables with intentional layout, typography, and deterministic source files. Use when Codex needs to build a PDF from scratch or update an existing styled PDF, especially for business documents such as project outlines, proposals, reports, summaries, implementation plans, or other static documents where preserving page size, hierarchy, tables, banners, footers, and pagination matters.
---

# Create PDF

## Overview

Build PDFs from editable source files, not one-off office exports. Prefer a scriptable renderer and verify the final artifact against the requested or existing visual system before finishing.

## Workflow

1. Resolve the document mode.
   - Preserve an existing PDF style.
   - Create a new visual system from the user request.
2. Inspect the target artifact before writing code when an existing PDF is involved.
   - Run `pdfinfo` for page size and page count.
   - Run `pdffonts` for font-family clues.
   - Render pages to images with `pdftoppm -png` or an equivalent tool to capture banner blocks, section bars, table borders, footer treatment, spacing, and pagination.
3. Choose the rendering stack deliberately.
   - Prefer ReportLab for static business documents with controlled layout, repeated bars, tables, and footers.
   - Use HTML/CSS only when the document is flow-heavy and the toolchain is already available.
   - Keep the editable source next to the generated PDF so later revisions do not start from the binary.
4. Build the visual system first.
   - Define page size, margins, palette, body color, type scale, and footer behavior before filling in copy.
   - Create reusable helpers for hero banners, section bars, bordered tables, and closing summary blocks.
5. Render, inspect, and tighten.
   - Compare `pdfinfo` and `pdffonts` against the target.
   - Render pages back to PNG and visually compare spacing, hierarchy, and page breaks.
   - Fix orphaned headers, note-only spill pages, and mismatched footer placement before calling the PDF done.
6. Prefer the narrower scope skill when appropriate.
   - If the PDF is a scope-of-work, remaining-work outline, phase plan, implementation plan, or recommendation memo, use `$create-pdf-scope-of-work`.

## Working Rules

- Keep content in source control as editable source plus the final `.pdf`.
- Treat pagination as part of the design, not a post-process nuisance.
- Match the existing artifact exactly when the user asks for an update instead of a redesign.
- Prefer restrained business-document styling unless the source artifact clearly uses something else.
- Put fixed footer notes or page-specific provenance in page chrome, not normal flow content, when a spill would create a blank extra page.

## References

- Read [ReportLab workflow](references/reportlab-workflow.md) when using ReportLab.
- Read the [PDF verification checklist](references/pdf-verification-checklist.md) before finalizing any styled PDF.

## Assets

- Start from `assets/reportlab_styled_pdf_template.py` when building a new static PDF.
