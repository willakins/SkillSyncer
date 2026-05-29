#!/usr/bin/env python3

import argparse

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle


TITLE = "Styled PDF Title"
SUBTITLE = "Replace this subtitle with the purpose of the document."
FOOTER_TITLE = "Styled PDF Title"

SUMMARY_ROWS = [
    ("Goal", "Explain the outcome this PDF is driving."),
    ("Audience", "Name the audience and what they need from this document."),
    ("Status", "Summarize the current state in one or two sentences."),
]

SECTIONS = [
    (
        "1. First section heading",
        "Use a short framing paragraph before the bullets.",
        [
            "Make the first action concrete.",
            "Keep bullets flat and outcome-oriented.",
            "Reserve page breaks for major transitions.",
        ],
    ),
    (
        "2. Second section heading",
        "Use another short paragraph here to frame the next workstream.",
        [
            "Repeat the same hierarchy and spacing rules.",
            "Prefer deliberate tables and bars over ad-hoc spacing.",
        ],
    ),
]

FINAL_ROWS = [
    ("Recommended next step", "State the recommended implementation order or immediate next move."),
    ("Definition of done", "Explain what must be true for the document's work to be complete."),
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


def final_matrix(styles, width):
    rows = [[p(label, "Label", styles), p(copy, "BodyCopy", styles)] for label, copy in FINAL_ROWS]
    table = Table(rows, colWidths=[126, width - 126])
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
    story = [Spacer(1, 10), hero(styles, width), Spacer(1, 18), summary_table(styles, width), Spacer(1, 18)]
    story.append(section_bar("At a glance", styles, width))
    story.append(Spacer(1, 14))
    story.append(p("Replace this paragraph with a concise top-level readout before the main sections.", "BodyCopy", styles))
    story.append(Spacer(1, 14))
    story.append(section_bar("Main work", styles, width))
    story.append(PageBreak())

    for title, intro, bullets in SECTIONS:
        story.append(p(title, "SectionHeading", styles))
        story.append(p(intro, "BodyCopy", styles))
        for item in bullets:
            story.append(bullet(item, styles))

    story.extend([Spacer(1, 10), final_matrix(styles, width)])
    return story


def parse_args():
    parser = argparse.ArgumentParser(description="Render a styled PDF starter document.")
    parser.add_argument("--output", default="styled-document.pdf", help="Output PDF path")
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
