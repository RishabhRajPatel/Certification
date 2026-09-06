import json
import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError
from sqlmodel import Session, select

from app.api.v1._serialize import template_read
from app.core.constants import DEFAULT_LAYOUT_CERT, DEFAULT_LAYOUT_OFFER, Audit
from app.core.deps import get_current_user
from app.db.session import get_session
from app.models import AdminUser, Template
from app.schemas.common import OkResponse
from app.schemas.system import SetDefaultTemplateRequest, TemplateLayoutUpdate, TemplateRead
from app.services.audit import log_audit
from app.services.docx_convert import DocxConversionError, convert_docx_to_pdf
from app.services.settings_service import get_settings_row
from app.services.storage import delete_template_file, template_file_path

router = APIRouter(prefix="/templates", tags=["templates"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

# A4 in points, used as the fixed canvas for image backgrounds (drawn full-bleed).
A4_PORTRAIT = (595.27, 841.89)
A4_LANDSCAPE = (841.89, 595.27)

BUILTIN_DEFAULT_KEY = {"OFFER": "corporate", "CERTIFICATE": "premium"}


def _ext(background_type: str) -> str:
    return "pdf" if background_type == "PDF" else "png"


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is too large (max 15 MB).")
    return data


def _process_background_file(data: bytes, filename: str, content_type: str, doc_type: str) -> tuple[str, float, float, bytes]:
    """Validates + normalizes an uploaded design file into a storable
    background. Returns (background_type, bg_width_pt, bg_height_pt, bytes).
    Shared by both "upload a new template" and "attach a design to an
    existing (including built-in) template"."""
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()
    is_docx = (
        content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or filename.endswith(".docx")
    )
    is_pdf = content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = content_type in ("image/png", "image/jpeg", "image/jpg")

    if is_docx:
        try:
            data = convert_docx_to_pdf(data)
        except DocxConversionError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
        is_pdf = True

    if is_pdf:
        try:
            reader = PdfReader(BytesIO(data))
            if len(reader.pages) < 1:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "PDF has no pages.")
            # Keep every page — dynamic fields + QR are only drawn on page 1
            # (see render_custom_pdf), pages 2+ are carried through as-is
            # (e.g. a fixed terms/annexure page).
            writer = PdfWriter()
            for p in reader.pages:
                writer.add_page(p)
            out = BytesIO()
            writer.write(out)
            write_bytes = out.getvalue()
            box = reader.pages[0].mediabox
            return "PDF", float(box.width), float(box.height), write_bytes
        except HTTPException:
            raise
        except PdfReadError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read the uploaded PDF.")

    if is_image:
        try:
            img = Image.open(BytesIO(data))
            img.load()
            img = img.convert("RGB")
        except UnidentifiedImageError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read the uploaded image.")
        out = BytesIO()
        img.save(out, format="PNG")
        w, h = A4_PORTRAIT if doc_type == "OFFER" else A4_LANDSCAPE
        return "IMAGE", w, h, out.getvalue()

    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported file type. Upload a PNG, JPG, PDF or Word (.docx) file.")


@router.get("", response_model=list[TemplateRead])
def list_templates(db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    rows = db.exec(select(Template).order_by(Template.type, Template.name)).all()
    return [template_read(t) for t in rows]


@router.get("/{template_id}", response_model=TemplateRead)
def get_template(template_id: str, db: Session = Depends(get_session), _: AdminUser = Depends(get_current_user)):
    t = db.get(Template, template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    return template_read(t)


@router.post("/set-default", response_model=OkResponse)
def set_default(
    payload: SetDefaultTemplateRequest,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    settings_row = get_settings_row(db)
    if payload.type == "OFFER":
        settings_row.default_offer_template = payload.key
    else:
        settings_row.default_cert_template = payload.key
    db.add(settings_row)

    for t in db.exec(select(Template).where(Template.type == payload.type)).all():
        t.is_default = t.key == payload.key
        db.add(t)

    log_audit(db, action=Audit.SET_DEFAULT_TEMPLATE, user_id=user.id, entity="Template", meta={"type": payload.type, "key": payload.key}, request=request)
    db.commit()
    return OkResponse()


@router.post("/upload", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def upload_template(
    request: Request,
    type: str = Form(...),
    name: str = Form(...),
    description: str | None = Form(None),
    accent: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    if type not in ("OFFER", "CERTIFICATE"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "type must be OFFER or CERTIFICATE.")
    if not name.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Template name is required.")

    data = await _read_upload(file)
    background_type, bg_width_pt, bg_height_pt, write_bytes = _process_background_file(
        data, file.filename or "", file.content_type or "", type
    )

    key = f"custom-{uuid.uuid4().hex[:10]}"
    default_layout = DEFAULT_LAYOUT_OFFER if type == "OFFER" else DEFAULT_LAYOUT_CERT

    t = Template(
        type=type,
        key=key,
        name=name.strip(),
        description=(description or None),
        accent=(accent or None),
        is_default=False,
        is_custom=True,
        background_type=background_type,
        bg_width_pt=bg_width_pt,
        bg_height_pt=bg_height_pt,
        layout_json=json.dumps(default_layout),
    )
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not save template.")
    db.refresh(t)

    try:
        template_file_path(t.id, _ext(background_type)).write_bytes(write_bytes)
    except OSError:
        db.delete(t)
        db.commit()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not store template file.")

    log_audit(db, action=Audit.UPLOAD_TEMPLATE, user_id=user.id, entity="Template", entity_id=t.id, meta={"type": type, "key": key}, request=request)
    db.commit()
    return template_read(t)


@router.post("/{template_id}/background", response_model=TemplateRead)
async def attach_background(
    template_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    """Attaches an uploaded design to an EXISTING template — including a
    built-in one (Modern, Corporate, ...). Flips it to a custom, image/PDF-
    backed template in place: same key/name/is_default, but generation now
    renders the uploaded design instead of the built-in reportlab layout."""
    t = db.get(Template, template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")

    data = await _read_upload(file)
    background_type, bg_width_pt, bg_height_pt, write_bytes = _process_background_file(
        data, file.filename or "", file.content_type or "", t.type
    )

    old_ext = _ext(t.background_type) if t.background_type else None
    new_ext = _ext(background_type)
    if old_ext and old_ext != new_ext:
        delete_template_file(t.id, old_ext)

    try:
        template_file_path(t.id, new_ext).write_bytes(write_bytes)
    except OSError:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not store template file.")

    t.background_type = background_type
    t.bg_width_pt = bg_width_pt
    t.bg_height_pt = bg_height_pt
    t.is_custom = True
    if not t.layout_json:
        default_layout = DEFAULT_LAYOUT_OFFER if t.type == "OFFER" else DEFAULT_LAYOUT_CERT
        t.layout_json = json.dumps(default_layout)
    db.add(t)
    log_audit(db, action=Audit.UPLOAD_TEMPLATE, user_id=user.id, entity="Template", entity_id=t.id, meta={"type": t.type, "key": t.key}, request=request)
    db.commit()
    db.refresh(t)
    return template_read(t)


@router.delete("/{template_id}/background", response_model=TemplateRead)
def revert_background(
    template_id: str,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    """Inverse of attach_background() — only for built-ins (key not
    "custom-..."): removes the attached design and reverts to the built-in
    reportlab layout. A genuinely custom template has no built-in fallback to
    revert to, so it must be deleted instead (DELETE /templates/{id})."""
    t = db.get(Template, template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    if t.key.startswith("custom-"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This template has no built-in design to revert to — delete it instead.")
    if not t.background_type:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This template doesn't have an attached design.")

    delete_template_file(t.id, _ext(t.background_type))
    t.background_type = None
    t.bg_width_pt = None
    t.bg_height_pt = None
    t.layout_json = None
    t.is_custom = False
    db.add(t)
    log_audit(db, action=Audit.DELETE_TEMPLATE, user_id=user.id, entity="Template", entity_id=t.id, meta={"type": t.type, "key": t.key, "reverted": True}, request=request)
    db.commit()
    db.refresh(t)
    return template_read(t)


@router.put("/{template_id}/layout", response_model=TemplateRead)
def update_layout(
    template_id: str,
    payload: TemplateLayoutUpdate,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    t = db.get(Template, template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    if not t.is_custom:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only custom templates have an editable layout.")

    t.layout_json = json.dumps({k: v.model_dump(exclude_none=True) for k, v in payload.layout.items()})
    db.add(t)
    log_audit(db, action=Audit.UPDATE_TEMPLATE_LAYOUT, user_id=user.id, entity="Template", entity_id=t.id, request=request)
    db.commit()
    db.refresh(t)
    return template_read(t)


@router.delete("/{template_id}", response_model=OkResponse)
def delete_template(
    template_id: str,
    request: Request,
    db: Session = Depends(get_session),
    user: AdminUser = Depends(get_current_user),
):
    t = db.get(Template, template_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found.")
    # is_custom alone isn't enough here: attach_background() flips a built-in
    # (e.g. "modern") to is_custom=True too, once it has a design attached.
    # Only a template actually CREATED via upload (key="custom-...") should be
    # deletable — deleting a built-in's row would lose that slot permanently,
    # not just revert it to the default look.
    if not t.key.startswith("custom-"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Built-in templates cannot be deleted — use \"Replace design\" to change or remove the attached design instead.",
        )

    if t.is_default:
        fallback_key = BUILTIN_DEFAULT_KEY[t.type]
        settings_row = get_settings_row(db)
        if t.type == "OFFER":
            settings_row.default_offer_template = fallback_key
        else:
            settings_row.default_cert_template = fallback_key
        db.add(settings_row)
        for other in db.exec(select(Template).where(Template.type == t.type)).all():
            other.is_default = other.key == fallback_key
            db.add(other)

    if t.background_type:
        delete_template_file(t.id, _ext(t.background_type))

    log_audit(db, action=Audit.DELETE_TEMPLATE, user_id=user.id, entity="Template", entity_id=t.id, meta={"type": t.type, "key": t.key}, request=request)
    db.delete(t)
    db.commit()
    return OkResponse()
