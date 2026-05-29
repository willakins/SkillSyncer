# ReportLab Workflow

## When To Choose It

- Use ReportLab for static business PDFs with explicit page geometry.
- Prefer it when the document needs repeated section bars, bordered tables, hero banners, or fixed footer treatment.
- Avoid it when the layout is mostly flowing HTML content and a browser renderer is already available.

## Setup

If `reportlab` is not installed and network access is acceptable:

```bash
python3 -m venv .pdfgen-venv
.pdfgen-venv/bin/pip install reportlab
```

Run the generator with that interpreter so the PDF source and its dependency stay local to the task.

## Structure

- Use `BaseDocTemplate`, `Frame`, and `PageTemplate` for reliable pagination.
- Define palette constants and paragraph styles near the top of the file.
- Add an `onPage` callback for fixed footer lines, page numbers, or page-specific notes.
- Build small helpers for repeated layout blocks instead of repeating `TableStyle` fragments inline.

## Pagination Rules

- Use `PageBreak()` intentionally for major phase changes.
- Use `KeepTogether` only for blocks that truly must travel as one unit.
- Do not leave footer notes or provenance lines in normal flow if they can spill onto an extra page.
- Tighten font sizes, leading, padding, and spacer heights before resorting to drastic content cuts.

## Output Discipline

- Keep the source `.py` file beside the rendered `.pdf`.
- Re-render after every meaningful layout change.
- Inspect rendered page images before declaring the document complete.
