# PDF Verification Checklist

Run these checks before finalizing a styled PDF.

## Mechanical Checks

- `pdfinfo file.pdf`
  - Confirm page size.
  - Confirm page count.
- `pdffonts file.pdf`
  - Confirm the expected font family or a deliberate replacement.
- `pdftoppm -png file.pdf prefix`
  - Render every page for visual review.

## Visual Checks

- Confirm the title banner height, alignment, and line breaks.
- Confirm section bars use the intended fill, border, and spacing.
- Confirm summary tables use the correct label-column width and border treatment.
- Confirm footer line, left title, and right page number are aligned consistently.
- Confirm no header, note, or provenance line is stranded on its own page.
- Confirm the document preserves the intended whitespace instead of looking compressed or accidental.

## Final Checks

- Keep the editable source file.
- Keep the PDF at the requested output path.
- If this was a restyle of an existing PDF, compare the new page renders against the old artifact before finishing.
