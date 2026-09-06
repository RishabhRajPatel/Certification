"""Converts an uploaded .docx template to PDF via headless LibreOffice, so it
can flow through the same background-PDF pipeline as a native PDF upload
(see api/v1/templates.py, services/pdf_custom.py)."""
import shutil
import subprocess
import tempfile
from pathlib import Path

# Common install locations — LibreOffice isn't always on PATH, especially on
# Windows. Docker/Linux images that apt-install libreoffice put it on PATH.
_CANDIDATE_PATHS = [
    "soffice",
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
]


class DocxConversionError(Exception):
    pass


def _find_soffice() -> str:
    for candidate in _CANDIDATE_PATHS:
        if shutil.which(candidate) or Path(candidate).exists():
            return candidate
    raise DocxConversionError(
        "LibreOffice is not installed on the server, so .docx templates can't be "
        "converted. Install it (e.g. `choco install libreoffice-fresh` on Windows, "
        "`apt-get install libreoffice` in Docker) or upload a PDF instead."
    )


def convert_docx_to_pdf(data: bytes, timeout: int = 60) -> bytes:
    soffice = _find_soffice()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        src = tmp_path / "template.docx"
        src.write_bytes(data)
        # Isolated profile dir — concurrent `soffice --headless` invocations
        # sharing the default user profile can deadlock on its lock file.
        profile_dir = tmp_path / "profile"

        try:
            result = subprocess.run(
                [
                    soffice,
                    "--headless",
                    "--norestore",
                    f"-env:UserInstallation=file:///{profile_dir.as_posix()}",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(tmp_path),
                    str(src),
                ],
                capture_output=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired as e:
            raise DocxConversionError("Document conversion timed out.") from e
        except FileNotFoundError as e:
            raise DocxConversionError("LibreOffice (soffice) could not be launched.") from e

        out = tmp_path / "template.pdf"
        if result.returncode != 0 or not out.exists():
            detail = (result.stderr or result.stdout or b"").decode(errors="ignore")[:300]
            raise DocxConversionError(f"Could not convert the Word document to PDF. {detail}".strip())
        return out.read_bytes()
