#!/usr/bin/env python3

import argparse

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import BaseDocTemplate, Frame, HRFlowable, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle


TITLE = "Scope Of Work Title"
SUBTITLE = "Replace with a short subtitle that explains the document's objective."
FOOTER_TITLE = "Scope Of Work Title"
FINAL_NOTE = "Prepared from current-state evidence rather than speculative future-state assumptions."

SUMMARY_ROWS = [
    ("Goal", "State the outcome this scope of work is meant to deliver."),
    ("Validation basis", "Explain the evidence behind the document: code review, testing, user reports, or analysis."),
    ("Current baseline", "Summarize the current system state that anchors the remaining work."),
]

PHASE_ONE_SECTIONS = [
    (
        "1. First immediate blocker",
        "Use a short framing paragraph that explains why this workstream belongs in Phase 1.",
        [
            "State the confirmed issue or gap.",
            "State the required change or decision.",
            "State the validation or coverage expected after the fix.",
        ],
    ),
    (
        "2. Second immediate blocker",
        "Repeat the same structure for the next workstream.",
        [
            "Keep bullets flat and implementation-oriented.",
            "Separate bug fixes from product decisions.",
        ],
    ),
]

PHASE_TWO_SECTIONS = [
    (
        "3. Follow-on workstream",
        "Use this section for valuable but lower-priority work that depends on Phase 1 stability.",
        [
            "Describe the follow-on change.",
            "Describe the downstream flows it affects.",
            "Describe the coverage needed when it eventually ships.",
        ],
    )
]

ORDER_ROWS = [
    (
        "Recommended<br/>Phase 1 order",
        "1. Replace with the first implementation slice.<br/>"
        "2. Replace with the second slice.<br/>"
        "3. Replace with the third slice.",
    ),
    (
        "Definition of done",
        "Replace with the conditions that must be true for the scope of work to be considered complete.",
    ),
]

NAVY = colors.HexColor("#223C5A")
SECTION_BLUE = colors.HexColor("#E4EEF7")
BORDER = colors.HexColor("#D4DEE9")
TEXT = colors.HexColor("#3B4D68")
FOOTER = colors.HexColor("#6A7C9C")


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "BodyCopy",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            textColor=TEXT,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            "HeroTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=27,
            alignment=TA_CENTER,
            textColor=colors.white,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            "HeroSubtitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.white,
        )
    )
    styles.add(
        ParagraphStyle(
            "Label",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=TEXT,
        )
    )
    styles.add(
        ParagraphStyle(
            "SectionBar",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=17,
            textColor=NAVY,
        )
    )
    styles.add(
        ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=TEXT,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            "BulletCopy",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            textColor=TEXT,
            leftIndent=24,
            firstLineIndent=-16,
            spaceAfter=6,
        )
    )
    return styles


def draw_footer(canvas, doc):
    canvas.saveState()
    if canvas.getPageNumber() == 4:
        canvas.setFillColor(FOOTER)
        canvas.setFont("Helvetica", 9)
        canvas.drawString(doc.leftMargin, 56, FINAL_NOTE)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(1)
    y = 38
    canvas.line(doc.leftMargin, y, letter[0] - doc.rightMargin, y)
    canvas.setFillColor(FOOTER)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(doc.leftMargin, 20, FOOTER_TITLE)
    canvas.drawRightString(letter[0] - doc.rightMargin, 20, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def p(text, style_name, styles):
    return Paragraph(text, styles[style_name])


def bullet(text, styles):
    return Paragraph(f"&bull;&nbsp;&nbsp;{text}", styles["BulletCopy"])


def hero(styles, width):
    table = Table([[p(TITLE, "HeroTitle", styles)], [p(SUBTITLE, "HeroSubtitle", styles)]], colWidths=[width])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 22),
                ("RIGHTPADDING", (0, 0), (-1, -1), 22),
                ("TOPPADDING", (0, 0), (-1, 0), 28),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 1), (-1, 1), 6),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 22),
            ]
        )
    )
    return table


def summary_table(styles, width):
    rows = [[p(label, "Label", styles), p(copy, "BodyCopy", styles)] for label, copy in SUMMARY_ROWS]
    table = Table(rows, colWidths=[118, width - 118])
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 1, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def section_bar(title, styles, width):
    table = Table([[p(title, "SectionBar", styles)]], colWidths=[width])
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, BORDER),
                ("BACKGROUND", (0, 0), (-1, -1), SECTION_BLUE),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return table


def numbered_section(section, styles):
    title, intro, bullets = section
    flow = [p(title, "SectionHeading", styles), p(intro, "BodyCopy", styles)]
    for item in bullets:
        flow.append(bullet(item, styles))
    return flow


def order_matrix(styles, width):
    table = Table(
        [[p(label, "Label", styles), p(copy, "BodyCopy", styles)] for label, copy in ORDER_ROWS],
        colWidths=[126, width - 126],
    )
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 1, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def build_story(styles, width):
    story = [
        Spacer(1, 10),
        hero(styles, width),
        Spacer(1, 18),
        summary_table(styles, width),
        Spacer(1, 18),
        section_bar("At a glance", styles, width),
        Spacer(1, 14),
        p("Replace this paragraph with the top-level readout for the scope of work.", "BodyCopy", styles),
        Spacer(1, 16),
        section_bar("Phase 1 | Immediate blockers", styles, width),
        PageBreak(),
    ]

    for section in PHASE_ONE_SECTIONS:
        story.extend(numbered_section(section, styles))

    story.extend([PageBreak(), section_bar("Phase 2 | Nice-to-have follow-on work", styles, width), Spacer(1, 12)])

    for section in PHASE_TWO_SECTIONS:
        story.extend(numbered_section(section, styles))

    story.extend([Spacer(1, 2), HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=0, spaceAfter=10), order_matrix(styles, width)])
    return story


def parse_args():
    parser = argparse.ArgumentParser(description="Render a scope-of-work PDF starter document.")
    parser.add_argument("--output", default="scope-of-work.pdf", help="Output PDF path")
    return parser.parse_args()


def main():
    args = parse_args()
    styles = build_styles()
    doc = BaseDocTemplate(
        args.output,
        pagesize=letter,
        leftMargin=58,
        rightMargin=58,
        topMargin=40,
        bottomMargin=56,
        title=TITLE,
        author="OpenAI Codex",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=draw_footer))
    doc.build(build_story(styles, doc.width))


if __name__ == "__main__":
    main()
