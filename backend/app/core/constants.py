"""Shared status constants + template metadata (enum-free, DB-portable)."""

INTERN_STATUSES = ["UPCOMING", "ACTIVE", "COMPLETED", "TERMINATED"]
OFFER_STATUSES = ["GENERATED", "SENT", "VOID"]
CERT_STATUSES = ["VALID", "REVOKED"]

COMPENSATION_TYPES = ["UNPAID", "FIXED", "PERFORMANCE"]
EVALUATION_FREQUENCIES = ["Monthly", "Quarterly", "Half-Yearly", "Annually"]

CERTIFICATE_TYPES = ["COMPLETION", "EXCELLENCE", "PARTICIPATION", "APPRECIATION"]
CERTIFICATE_TYPE_LABELS = {
    "COMPLETION": "Certificate of Completion",
    "EXCELLENCE": "Certificate of Excellence",
    "PARTICIPATION": "Certificate of Participation",
    "APPRECIATION": "Certificate of Appreciation",
}
WORK_MODES = ["REMOTE", "ON_SITE", "HYBRID"]
WORK_MODE_LABELS = {"REMOTE": "Remote", "ON_SITE": "On-site", "HYBRID": "Hybrid"}
PERFORMANCE_RATING_LABELS = {
    1: "developing",
    2: "satisfactory",
    3: "good",
    4: "very good",
    5: "outstanding",
}

OFFER_TEMPLATES = [
    {"key": "modern", "name": "Modern", "description": "Clean, spacious layout with a bold header band.", "accent": "#4F46E5"},
    {"key": "corporate", "name": "Corporate", "description": "Classic letterhead — formal and trustworthy.", "accent": "#1D4ED8"},
    {"key": "minimal", "name": "Minimal", "description": "Understated, typographic, no heavy graphics.", "accent": "#0F172A"},
]

CERT_TEMPLATES = [
    {"key": "modern", "name": "Modern", "description": "Contemporary certificate with accent bar.", "accent": "#4F46E5"},
    {"key": "corporate", "name": "Corporate", "description": "Formal bordered certificate with seal.", "accent": "#1D4ED8"},
    {"key": "premium", "name": "Premium", "description": "Elegant gold-accented award design.", "accent": "#B45309"},
]

# Normalized (0-1, top-left origin) default field positions for freshly-uploaded
# custom templates, used until the admin repositions them in the layout editor.
# Keys are snake_case (stored verbatim in Template.layout_json); the frontend's
# generic camel<->snake conversion (see frontend/src/lib/api.ts) handles the rest.
DEFAULT_LAYOUT_OFFER = {
    "name": {"x": 0.5, "y": 0.30, "font_size": 16, "align": "center", "bold": True},
    "role": {"x": 0.5, "y": 0.36, "font_size": 11, "align": "center"},
    "department": {"x": 0.5, "y": 0.41, "font_size": 10, "align": "center"},
    "duration": {"x": 0.5, "y": 0.46, "font_size": 10, "align": "center"},
    "start_date": {"x": 0.5, "y": 0.51, "font_size": 10, "align": "center"},
    "issue_date": {"x": 0.5, "y": 0.56, "font_size": 10, "align": "center"},
    "signature_name": {"x": 0.78, "y": 0.85, "font_size": 10, "bold": True, "align": "center"},
    "signature_designation": {"x": 0.78, "y": 0.89, "font_size": 8.5, "align": "center"},
}

DEFAULT_LAYOUT_CERT = {
    "name": {"x": 0.5, "y": 0.40, "font_size": 26, "align": "center", "bold": True},
    "role": {"x": 0.5, "y": 0.50, "font_size": 12, "align": "center"},
    "department": {"x": 0.5, "y": 0.55, "font_size": 10.5, "align": "center"},
    "duration": {"x": 0.5, "y": 0.60, "font_size": 10.5, "align": "center"},
    "start_date": {"x": 0.30, "y": 0.68, "font_size": 10, "align": "center"},
    "end_date": {"x": 0.50, "y": 0.68, "font_size": 10, "align": "center"},
    "issue_date": {"x": 0.70, "y": 0.68, "font_size": 10, "align": "center"},
    "signature_name": {"x": 0.78, "y": 0.85, "font_size": 10, "bold": True, "align": "center"},
    "signature_designation": {"x": 0.78, "y": 0.89, "font_size": 8.5, "align": "center"},
    "qr": {"x": 0.16, "y": 0.85, "size": 0.09},
}

DEFAULT_OFFER_TERMS = "\n".join(
    [
        "This is an internship engagement and does not constitute an offer of permanent employment.",
        "The intern is expected to maintain the confidentiality of all proprietary information.",
        "Working hours and leave policy will be as per company guidelines communicated separately.",
        "Either party may terminate this internship with prior written notice of seven (7) days.",
    ]
)

# Master offer letter body — {{variables}} are substituted per-offer (see
# services/email.py:render() and services/pdf_offer.py). Blank lines separate
# PDF paragraphs; the detail table, terms list and signature block are drawn
# separately and are NOT part of this template.
OFFER_LETTER_VARIABLES = [
    "candidate_name", "position", "department", "company_name", "joining_date",
    "duration", "stipend", "compensation_type", "compensation_details",
    "authorized_by", "designation", "offer_id", "issue_date",
]

DEFAULT_OFFER_LETTER_TEMPLATE = (
    "Dear {{candidate_name}},\n"
    "\n"
    "We are pleased to offer you an internship as {{position}} in the {{department}} "
    "department at {{company_name}}. Your internship will commence on {{joining_date}} "
    "and continue for {{duration}}.\n"
    "\n"
    "{{compensation_details}}\n"
    "\n"
    "We look forward to having you as part of our team."
)

# Audit action names
class Audit:
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    CREATE_INTERN = "CREATE_INTERN"
    UPDATE_INTERN = "UPDATE_INTERN"
    DELETE_INTERN = "DELETE_INTERN"
    UPDATE_STATUS = "UPDATE_STATUS"
    GENERATE_OFFER = "GENERATE_OFFER"
    ISSUE_OFFER = "ISSUE_OFFER"
    VOID_OFFER = "VOID_OFFER"
    DOWNLOAD_OFFER = "DOWNLOAD_OFFER"
    SEND_OFFER_EMAIL = "SEND_OFFER_EMAIL"
    GENERATE_CERTIFICATE = "GENERATE_CERTIFICATE"
    ISSUE_CERTIFICATE = "ISSUE_CERTIFICATE"
    REVOKE_CERTIFICATE = "REVOKE_CERTIFICATE"
    DOWNLOAD_CERTIFICATE = "DOWNLOAD_CERTIFICATE"
    SEND_CERT_EMAIL = "SEND_CERT_EMAIL"
    EMAIL_SEND_FAILED = "EMAIL_SEND_FAILED"
    SET_DEFAULT_TEMPLATE = "SET_DEFAULT_TEMPLATE"
    UPLOAD_TEMPLATE = "UPLOAD_TEMPLATE"
    UPDATE_TEMPLATE_LAYOUT = "UPDATE_TEMPLATE_LAYOUT"
    DELETE_TEMPLATE = "DELETE_TEMPLATE"
    VERIFY_ATTEMPT = "VERIFY_ATTEMPT"
    VERIFY_RATE_LIMITED = "VERIFY_RATE_LIMITED"
    UPDATE_SETTINGS = "UPDATE_SETTINGS"
    CHANGE_PASSWORD = "CHANGE_PASSWORD"
    REVOKE_SESSIONS = "REVOKE_SESSIONS"
