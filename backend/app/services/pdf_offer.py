import re
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape as _esc

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Intern, OfferLetter, Setting, Template
from app.services.email import render
from app.services.pdf_custom import render_custom_pdf

_COMPENSATION_TYPE_LABELS = {"UNPAID": "Unpaid", "FIXED": "Fixed Stipend", "PERFORMANCE": "Performance-Based"}


def _fmt(d: datetime) -> str:
    return d.strftime("%d %B %Y")


def _fmt_short(d: datetime) -> str:
    return d.strftime("%d %b %Y")


def compensation_label(offer: OfferLetter) -> str:
    """Short value for the details table."""
    if offer.compensation_type == "UNPAID":
        return "Unpaid"
    if offer.compensation_type == "PERFORMANCE":
        return "Performance-Based"
    return f"INR {offer.stipend:,} / month" if offer.stipend else "—"


def compensation_sentence(offer: OfferLetter) -> str:
    """Full clause for the offer letter body — wording intentionally avoids
    promising a guaranteed amount for performance-based compensation."""
    if offer.compensation_type == "UNPAID":
        return "This internship is unpaid and does not include a fixed monthly stipend."
    if offer.compensation_type == "PERFORMANCE":
        return (
            "Performance-Based Compensation: Any stipend, incentive, or compensation will be "
            "determined based on the intern's performance, assigned responsibilities, achievement "
            "of targets, and the Company's evaluation criteria."
        )
    amount = f"{offer.stipend:,}" if offer.stipend else "0"
    return f"You will receive a monthly stipend of ₹{amount}, subject to applicable company policies."


def offer_letter_paragraphs(offer: OfferLetter, intern: Intern, settings: Setting) -> list[str]:
    """Renders the master template (Setting.offer_letter_template) against this
    offer's data — see core.constants.OFFER_LETTER_VARIABLES for the full
    variable list. Blank lines in the template become separate PDF paragraphs;
    the detail table, terms list and signature block are drawn separately."""
    variables = {
        "candidate_name": intern.full_name,
        "position": offer.position,
        "department": offer.department or "",
        "company_name": settings.company_name,
        "joining_date": _fmt(offer.joining_date),
        "duration": offer.duration_label or "",
        "stipend": f"₹{offer.stipend:,}" if offer.stipend else "—",
        "compensation_type": _COMPENSATION_TYPE_LABELS.get(offer.compensation_type, offer.compensation_type),
        "compensation_details": compensation_sentence(offer),
        "authorized_by": offer.authorized_name,
        "designation": offer.authorized_designation,
        "offer_id": offer.number,
        "issue_date": _fmt(offer.issue_date),
    }
    rendered = render(settings.offer_letter_template, variables)
    # Blank line = new paragraph; a lone newline within a paragraph is just a
    # soft wrap in the source text, not a hard line break in the PDF. Split on
    # \r\n or \n blank lines — Textarea input may use either line ending.
    return [
        " ".join(block.split())
        for block in re.split(r"(?:\r?\n)\s*(?:\r?\n)", rendered)
        if block.strip()
    ]


def _offer_field_values(offer: OfferLetter, intern: Intern, settings: Setting) -> dict:
    return {
        "name": intern.full_name,
        "role": offer.position,
        "department": offer.department or "",
        "duration": offer.duration_label or "",
        "start_date": _fmt(offer.joining_date),
        "issue_date": _fmt(offer.issue_date),
        "compensation": compensation_label(offer),
        "signature_name": offer.authorized_name,
        "signature_designation": offer.authorized_designation,
    }


def build_offer_pdf(offer: OfferLetter, intern: Intern, settings: Setting, template: Template | None = None) -> bytes:
    if template and template.is_custom and template.background_type:
        return render_custom_pdf(template, _offer_field_values(offer, intern, settings))

    buf = BytesIO()
    try:
        accent = colors.HexColor(settings.brand_color or "#4F46E5")
    except Exception:
        accent = colors.HexColor("#4F46E5")

    ink = colors.HexColor("#1f2937")
    muted = colors.HexColor("#6b7280")
    line = colors.HexColor("#e5e7eb")
    minimal = offer.template_key == "minimal"

    def decorate(canvas, _doc):
        canvas.saveState()
        if not minimal:
            canvas.setFillColor(accent)
            canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, stroke=0, fill=1)
        # footer
        canvas.setStrokeColor(line)
        canvas.setLineWidth(0.6)
        canvas.line(20 * mm, 16 * mm, A4[0] - 20 * mm, 16 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(muted)
        canvas.drawString(20 * mm, 12 * mm, settings.company_name)
        canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, "This is a computer-generated document.")
        canvas.setFont("Helvetica", 7.5)
        canvas.drawCentredString(A4[0] / 2, 12 * mm, offer.number)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=26 * mm,
        bottomMargin=22 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title=f"Offer Letter {offer.number}",
        author=settings.company_name,
    )

    body = ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, leading=16, textColor=ink)
    justified = ParagraphStyle("just", parent=body, alignment=TA_JUSTIFY)
    small = ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=muted)
    company_name = ParagraphStyle("cn", fontName="Helvetica-Bold", fontSize=16, leading=20, spaceAfter=4, textColor=colors.HexColor("#0f172a"))
    right = ParagraphStyle("right", fontName="Helvetica", fontSize=9.5, leading=15, alignment=TA_RIGHT, textColor=ink)
    subject = ParagraphStyle("subj", fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=colors.HexColor("#0f172a"), spaceBefore=8, spaceAfter=10)
    bold = ParagraphStyle("bold", parent=body, fontName="Helvetica-Bold")

    # Paragraph() parses text as mini-XML markup, so any free-text field with
    # &, < or > (e.g. "Sales & Marketing") must be escaped or it raises.
    contacts = "  •  ".join(
        _esc(x) for x in [settings.company_email, settings.company_phone, settings.company_website] if x
    )
    company_block = [Paragraph(_esc(settings.company_name), company_name)]
    if settings.company_address:
        company_block.append(Paragraph(_esc(settings.company_address), small))
    if contacts:
        company_block.append(Paragraph(contacts, small))

    meta_block = Paragraph(
        f"<font size=8 color='#9ca3af'>REF NO.</font><br/><b>{offer.number}</b>"
        f"<br/><br/><font size=8 color='#9ca3af'>DATE</font><br/><b>{_fmt(offer.issue_date)}</b>",
        right,
    )

    header = Table([[company_block, meta_block]], colWidths=[110 * mm, 60 * mm])
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -1), 1.1, line),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )

    story: list = [header, Spacer(1, 14)]
    story.append(Paragraph("To,", body))
    story.append(Paragraph(_esc(intern.full_name), bold))
    story.append(Paragraph(_esc(intern.email), small))
    story.append(Paragraph(f"Subject: Internship Offer — {_esc(offer.position)}", subject))
    story.append(Spacer(1, 6))

    # Master template (Setting.offer_letter_template, admin-editable in
    # Settings) — see offer_letter_paragraphs(). Each blank-line-separated
    # block becomes its own paragraph; escaped as plain text (no <b> markup
    # support here, unlike the hardcoded sections elsewhere in this file).
    for para in offer_letter_paragraphs(offer, intern, settings):
        story.append(Paragraph(_esc(para), justified))
        story.append(Spacer(1, 8))

    rows = [
        ["Position", _esc(offer.position)],
        ["Department", _esc(offer.department) if offer.department else "—"],
        ["Joining date", _fmt(offer.joining_date)],
        ["Duration", _esc(offer.duration_label) if offer.duration_label else "—"],
        ["Compensation", _esc(compensation_label(offer))],
    ]
    detail = Table([[Paragraph(f"<font color='#6b7280'>{k}</font>", body), Paragraph(f"<b>{v}</b>", body)] for k, v in rows], colWidths=[45 * mm, 125 * mm])
    detail.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.8, line),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#eef2f7")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(detail)
    story.append(Spacer(1, 10))

    terms = [t.strip() for t in (offer.terms or "").split("\n") if t.strip()]
    if terms:
        story.append(Paragraph("Terms &amp; Conditions", bold))
        story.append(Spacer(1, 4))
        story.append(
            ListFlowable(
                [ListItem(Paragraph(_esc(t), body), leftIndent=6) for t in terms],
                bulletType="bullet",
                bulletColor=accent,
                start="•",
                leftIndent=12,
            )
        )
        story.append(Spacer(1, 10))

    story.append(
        Paragraph("Please sign a copy of this letter as a token of your acceptance.", justified)
    )
    story.append(Spacer(1, 30))

    sign = Table(
        [
            [Paragraph("_______________________", body)],
            [Paragraph(f"<b>{_esc(offer.authorized_name)}</b>", body)],
            [Paragraph(_esc(offer.authorized_designation), small)],
            [Paragraph(_esc(settings.company_name), small)],
        ],
        colWidths=[80 * mm],
    )
    sign.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    story.append(sign)

    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buf.getvalue()
