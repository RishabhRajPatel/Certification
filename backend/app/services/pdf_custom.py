import json
from io import BytesIO
from typing import Optional

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.models import Template
from app.services.storage import template_file_path

_ALIGN_DRAW = {
    "left": "drawString",
    "right": "drawRightString",
    "center": "drawCentredString",
}


def _draw_fields(c: canvas.Canvas, W: float, H: float, layout: dict, field_values: dict, qr_bytes: Optional[bytes]) -> None:
    for key, spec in layout.items():
        if key == "qr":
            if qr_bytes:
                size = float(spec.get("size", 0.09)) * min(W, H)
                x = float(spec["x"]) * W - size / 2
                y = H - float(spec["y"]) * H - size / 2
                c.drawImage(ImageReader(BytesIO(qr_bytes)), x, y, size, size, mask="auto")
            continue

        value = field_values.get(key)
        if not value:
            continue

        x = float(spec["x"]) * W
        y = H - float(spec["y"]) * H
        font = "Helvetica-Bold" if spec.get("bold") else "Helvetica"
        c.setFont(font, float(spec.get("font_size", 11)))
        try:
            c.setFillColor(colors.HexColor(spec["color"]) if spec.get("color") else colors.HexColor("#0f172a"))
        except Exception:
            c.setFillColor(colors.HexColor("#0f172a"))
        draw_fn = getattr(c, _ALIGN_DRAW.get(spec.get("align", "center"), "drawCentredString"))
        draw_fn(x, y, str(value))


def render_custom_pdf(template: Template, field_values: dict, qr_bytes: Optional[bytes] = None) -> bytes:
    """Composite dynamic fields (and, for certificates, a QR code) onto an
    admin-uploaded template background, using normalized (0-1, top-left
    origin) positions stored in `template.layout_json`."""
    layout = json.loads(template.layout_json) if template.layout_json else {}
    W, H = float(template.bg_width_pt), float(template.bg_height_pt)
    ext = "pdf" if template.background_type == "PDF" else "png"
    bg_path = template_file_path(template.id, ext)

    if template.background_type == "IMAGE":
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=(W, H))
        c.drawImage(ImageReader(str(bg_path)), 0, 0, width=W, height=H, mask="auto")
        _draw_fields(c, W, H, layout, field_values, qr_bytes)
        c.showPage()
        c.save()
        return buf.getvalue()

    # PDF background: draw fields on a transparent overlay, then merge onto
    # the stored background page.
    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(W, H))
    _draw_fields(c, W, H, layout, field_values, qr_bytes)
    c.showPage()
    c.save()

    bg_reader = PdfReader(str(bg_path))
    overlay_reader = PdfReader(BytesIO(overlay_buf.getvalue()))
    first_page = bg_reader.pages[0]
    first_page.merge_page(overlay_reader.pages[0])

    writer = PdfWriter()
    writer.add_page(first_page)
    # Fields + QR only apply to page 1 — any further pages (e.g. a fixed
    # terms/annexure page) are carried through unchanged.
    for page in bg_reader.pages[1:]:
        writer.add_page(page)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()
