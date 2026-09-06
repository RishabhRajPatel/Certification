import base64
import io

import qrcode
from qrcode.constants import ERROR_CORRECT_H


def qr_png_bytes(data: str) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,  # ~30% recovery — scans reliably off print/smudged/creased certificates
        box_size=10,
        border=4,  # quiet zone — 4 modules is the QR spec's recommended minimum, 2 was below it
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def qr_data_uri(data: str) -> str:
    b64 = base64.b64encode(qr_png_bytes(data)).decode("ascii")
    return f"data:image/png;base64,{b64}"
