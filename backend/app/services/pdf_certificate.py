from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape as _esc

import httpx
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from app.core.constants import PERFORMANCE_RATING_LABELS, WORK_MODE_LABELS
from app.models import Certificate, Intern, Setting, Template
from app.services.pdf_custom import render_custom_pdf
from app.services.qr import qr_png_bytes


def _fmt(d: datetime) -> str:
    return d.strftime("%d %b %Y")


def _fetch_image(url: str | None, timeout: float = 5.0) -> ImageReader | None:
    """Best-effort fetch of an admin-supplied image URL (company stamp, etc.)
    for embedding in the PDF. Never raises — a slow/broken URL should degrade
    to the built-in placeholder, not fail certificate generation."""
    if not url:
        return None
    try:
        resp = httpx.get(url, timeout=timeout)
        resp.raise_for_status()
        return ImageReader(BytesIO(resp.content))
    except Exception:
        return None


def default_certificate_text(cert: Certificate, intern: Intern, settings: Setting) -> str:
    """Auto-generated body paragraph, used as the pre-filled default the admin
    can edit in the generate form — see cert_generate_form / CertCreate."""
    dept = f" in the {cert.department} department" if cert.department else ""
    mode = f" ({WORK_MODE_LABELS[cert.work_mode]})" if cert.work_mode in WORK_MODE_LABELS else ""
    dur = f" for a duration of {cert.duration_label}" if cert.duration_label else ""
    parts = [
        f"has successfully completed an internship as a {cert.role}{dept} at "
        f"{settings.company_name}{mode}{dur}."
    ]
    if cert.performance_rating:
        label = PERFORMANCE_RATING_LABELS.get(cert.performance_rating, "")
        parts.append(
            f"Their overall performance during the internship was rated {label} "
            f"({cert.performance_rating}/5)."
        )
    if cert.skills:
        parts.append(f"Key skills demonstrated include {cert.skills}.")
    if cert.remarks:
        parts.append(cert.remarks)
    return " ".join(parts)


def _cert_field_values(cert: Certificate, intern: Intern, settings: Setting) -> dict:
    return {
        "name": intern.full_name,
        "role": cert.role,
        "department": cert.department or "",
        "duration": cert.duration_label or "",
        "start_date": _fmt(cert.start_date),
        "end_date": _fmt(cert.end_date),
        "issue_date": _fmt(cert.issue_date),
        "signature_name": cert.authorized_name,
        "signature_designation": cert.authorized_designation,
    }


def build_certificate_pdf(
    cert: Certificate, intern: Intern, settings: Setting, verify_url: str, template: Template | None = None
) -> bytes:
    if template and template.is_custom and template.background_type:
        return render_custom_pdf(
            template, _cert_field_values(cert, intern, settings), qr_bytes=qr_png_bytes(verify_url)
        )

    buf = BytesIO()
    W, H = landscape(A4)

    premium = cert.template_key == "premium"
    try:
        accent = colors.HexColor("#B45309") if premium else colors.HexColor(settings.brand_color or "#4F46E5")
    except Exception:
        accent = colors.HexColor("#4F46E5")
    ink = colors.HexColor("#0f172a")
    muted = colors.HexColor("#6b7280")

    c = canvas.Canvas(buf, pagesize=(W, H))
    c.setTitle(f"Certificate {cert.number}")
    c.setAuthor(settings.company_name)
    cx = W / 2

    # ── Borders ──
    m = 12 * mm
    c.setStrokeColor(accent)
    c.setLineWidth(3)
    c.rect(m, m, W - 2 * m, H - 2 * m)
    im = m + 4 * mm
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(1)
    c.rect(im, im, W - 2 * im, H - 2 * im)

    # corner accents
    cl = 8 * mm
    c.setStrokeColor(accent)
    c.setLineWidth(2)
    for (x, y, dx, dy) in [
        (im + 2, im + 2, 1, 1),
        (W - im - 2, im + 2, -1, 1),
        (im + 2, H - im - 2, 1, -1),
        (W - im - 2, H - im - 2, -1, -1),
    ]:
        c.line(x, y, x + dx * cl, y)
        c.line(x, y, x, y + dy * cl)

    # ── Header ──
    c.setFillColor(ink)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(cx, H - 30 * mm, settings.company_name.upper())

    # ribbon
    ribbon = "CERTIFICATE OF ACHIEVEMENT"
    c.setFont("Helvetica-Bold", 9)
    rw = c.stringWidth(ribbon, "Helvetica-Bold", 9) + 16
    c.setFillColor(colors.HexColor("#FEF3C7") if premium else colors.HexColor("#EEF2FF"))
    c.roundRect(cx - rw / 2, H - 40 * mm, rw, 7 * mm, 3.5 * mm, stroke=0, fill=1)
    c.setFillColor(accent)
    c.drawCentredString(cx, H - 38 * mm, ribbon)

    # title
    c.setFillColor(ink)
    c.setFont("Times-Bold", 30)
    c.drawCentredString(cx, H - 56 * mm, cert.title)

    # subtitle
    c.setFont("Helvetica", 10.5)
    c.setFillColor(muted)
    c.drawCentredString(cx, H - 66 * mm, "This is to certify that")

    # name + underline
    c.setFont("Times-BoldItalic", 28)
    c.setFillColor(accent)
    c.drawCentredString(cx, H - 80 * mm, intern.full_name)
    nw = c.stringWidth(intern.full_name, "Times-BoldItalic", 28)
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(1)
    c.line(cx - nw / 2 - 20, H - 84 * mm, cx + nw / 2 + 20, H - 84 * mm)

    # body (wrapped, centered) — certificate_text is always populated at
    # creation time (auto-generated default, or the admin's edited version).
    # Paragraph() parses this as mini-XML markup, so it must be escaped —
    # any free-text value with &, < or > (e.g. a department called "R&D")
    # would otherwise raise.
    text = _esc(cert.certificate_text or default_certificate_text(cert, intern, settings))
    body_style = ParagraphStyle(
        "cbody", fontName="Helvetica", fontSize=11.5, leading=18,
        alignment=TA_CENTER, textColor=colors.HexColor("#374151"),
    )
    para = Paragraph(text, body_style)
    avail_w = 200 * mm
    _w, h = para.wrap(avail_w, 40 * mm)
    body_top = H - 92 * mm
    para.drawOn(c, cx - avail_w / 2, body_top - h)

    # meta row
    meta_y = body_top - h - 10 * mm
    gap = 55 * mm
    for i, (lab, val) in enumerate(
        [("FROM", _fmt(cert.start_date)), ("TO", _fmt(cert.end_date)), ("ISSUED", _fmt(cert.issue_date))]
    ):
        xx = cx - gap + i * gap
        c.setFont("Helvetica", 7.5)
        c.setFillColor(muted)
        c.drawCentredString(xx, meta_y, lab)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(ink)
        c.drawCentredString(xx, meta_y - 5 * mm, val)

    # ── Bottom row: QR · seal · signature ──
    base_y = im + 12 * mm

    # QR (left)
    qr_img = ImageReader(BytesIO(qr_png_bytes(verify_url)))
    qr_size = 24 * mm
    qx = im + 16 * mm
    c.drawImage(qr_img, qx, base_y, qr_size, qr_size, mask="auto")
    c.setFont("Helvetica", 6.5)
    c.setFillColor(muted)
    c.drawCentredString(qx + qr_size / 2, base_y - 4 * mm, "Scan to verify authenticity")
    c.drawCentredString(qx + qr_size / 2, base_y - 7 * mm, cert.number)

    # seal (center) — real stamp image if the admin has set one, else the
    # built-in placeholder circle.
    seal_y = base_y + 12 * mm
    seal_img = _fetch_image(settings.stamp_image_url)
    if seal_img:
        seal_size = 26 * mm
        c.drawImage(
            seal_img, cx - seal_size / 2, seal_y - seal_size / 2, seal_size, seal_size,
            mask="auto", preserveAspectRatio=True,
        )
    else:
        c.setStrokeColor(accent)
        c.setLineWidth(2)
        c.circle(cx, seal_y, 13 * mm)
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(cx, seal_y + 1 * mm, "OFFICIAL")
        c.drawCentredString(cx, seal_y - 4 * mm, "SEAL")

    # signature (right)
    sig_cx = W - im - 40 * mm
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(1)
    c.line(sig_cx - 30 * mm, base_y + 16 * mm, sig_cx + 30 * mm, base_y + 16 * mm)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(ink)
    c.drawCentredString(sig_cx, base_y + 11 * mm, cert.authorized_name)
    c.setFont("Helvetica", 8.5)
    c.setFillColor(muted)
    c.drawCentredString(sig_cx, base_y + 7 * mm, cert.authorized_designation)

    if cert.status == "REVOKED":
        c.saveState()
        c.setFont("Helvetica-Bold", 90)
        c.setFillColor(colors.Color(0.86, 0.15, 0.15, alpha=0.18))
        c.translate(cx, H / 2)
        c.rotate(30)
        c.drawCentredString(0, 0, "REVOKED")
        c.restoreState()

    c.showPage()
    c.save()
    return buf.getvalue()
