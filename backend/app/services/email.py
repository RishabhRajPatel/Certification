import re
import smtplib
from datetime import datetime
from html import escape as _esc
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings as app_settings
from app.models import Certificate, Intern, OfferLetter, Setting

_VAR = re.compile(r"\{\{(\w+)\}\}")


class EmailNotConfiguredError(Exception):
    """SMTP_HOST isn't set — sending is disabled until an admin configures it."""


def render(template: str, variables: dict) -> str:
    return _VAR.sub(lambda m: str(variables.get(m.group(1), m.group(0))), template)


def _fmt(d: datetime) -> str:
    return d.strftime("%d %B %Y")


def send_email(
    to: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[list[tuple[str, bytes, str]]] = None,
) -> None:
    """attachments: list of (filename, bytes, mime_subtype e.g. 'pdf'). Raises
    EmailNotConfiguredError or the underlying smtplib/socket error — callers
    catch and record the failure rather than letting it bubble up."""
    if not app_settings.SMTP_HOST:
        raise EmailNotConfiguredError("Email is not configured. Set SMTP_HOST and related SMTP_* settings.")
    if not to or "@" not in to:
        raise ValueError("Recipient has no valid email address on file.")

    from_addr = app_settings.SMTP_FROM_EMAIL or app_settings.SMTP_USER
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = f"{app_settings.SMTP_FROM_NAME} <{from_addr}>"
    msg["To"] = to

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_body, "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    for filename, data, mime_subtype in attachments or []:
        part = MIMEApplication(data, _subtype=mime_subtype)
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    with smtplib.SMTP(app_settings.SMTP_HOST, app_settings.SMTP_PORT, timeout=15) as server:
        if app_settings.SMTP_USE_TLS:
            server.starttls()
        if app_settings.SMTP_USER:
            server.login(app_settings.SMTP_USER, app_settings.SMTP_PASSWORD)
        server.sendmail(from_addr, [to], msg.as_string())


def _wrap_html(accent: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <div style="height: 4px; background: {accent}; border-radius: 2px; margin-bottom: 24px;"></div>
      {body_html}
      <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
        This is an automated message — please do not reply directly to this email.
      </p>
    </div>
    """


def build_certificate_email(cert: Certificate, intern: Intern, settings_row: Setting) -> tuple[str, str, str]:
    variables = {
        "document_type": "Certificate",
        "candidate_name": intern.full_name,
        "company_name": settings_row.company_name,
        "document_id": cert.number,
        "course_name": cert.role,
        "job_title": cert.role,
        "start_date": _fmt(cert.start_date),
        "end_date": _fmt(cert.end_date),
        "issue_date": _fmt(cert.issue_date),
    }
    subject = render(settings_row.cert_email_subject, variables)

    verify_url = None
    if settings_row.cert_email_include_verify_link and cert.verification_token:
        verify_url = f"{app_settings.app_url}/verify/{cert.verification_token}"

    text = (
        f"Dear {intern.full_name},\n\n"
        f"Congratulations on successfully completing your internship with {settings_row.company_name}.\n\n"
        "Your Internship Certificate has been officially issued.\n\n"
        f"Certificate ID: {cert.number}\n"
        f"Program: {cert.role}\n"
        f"Duration: {_fmt(cert.start_date)} – {_fmt(cert.end_date)}\n\n"
        "Your certificate is attached to this email as a PDF.\n"
    )
    if verify_url:
        text += f"\nYou can verify this certificate at:\n{verify_url}\n"
    text += f"\nRegards,\nHR Department\n{settings_row.company_name}\n"

    verify_html = (
        f'<p style="margin: 16px 0;"><a href="{verify_url}" style="color: {settings_row.brand_color}; font-weight: 600;">Verify Certificate</a></p>'
        if verify_url else ""
    )
    html = _wrap_html(
        settings_row.brand_color,
        f"""
        <p>Dear {_esc(intern.full_name)},</p>
        <p>Congratulations on successfully completing your internship with <b>{_esc(settings_row.company_name)}</b>.</p>
        <p>Your Internship Certificate has been officially issued.</p>
        <table style="margin: 16px 0; font-size: 14px;">
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Certificate ID</td><td><b>{_esc(cert.number)}</b></td></tr>
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Program</td><td><b>{_esc(cert.role)}</b></td></tr>
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Duration</td><td><b>{_fmt(cert.start_date)} – {_fmt(cert.end_date)}</b></td></tr>
        </table>
        <p>Your certificate is attached to this email as a PDF.</p>
        {verify_html}
        <p>Regards,<br/>HR Department<br/>{_esc(settings_row.company_name)}</p>
        """,
    )
    return subject, html, text


def build_offer_email(offer: OfferLetter, intern: Intern, settings_row: Setting) -> tuple[str, str, str]:
    variables = {
        "document_type": "Offer Letter",
        "candidate_name": intern.full_name,
        "company_name": settings_row.company_name,
        "document_id": offer.number,
        "job_title": offer.position,
        "course_name": offer.position,
        "joining_date": _fmt(offer.joining_date),
    }
    subject = render(settings_row.offer_email_subject, variables)

    text = (
        f"Dear {intern.full_name},\n\n"
        f"We are pleased to offer you the position of {offer.position} at {settings_row.company_name}.\n\n"
        "Your official offer letter has been attached to this email.\n\n"
        f"Offer ID: {offer.number}\n"
        f"Position: {offer.position}\n"
        f"Joining Date: {_fmt(offer.joining_date)}\n\n"
        "Please review the attached offer letter carefully.\n\n"
        f"Regards,\nHR Department\n{settings_row.company_name}\n"
    )
    html = _wrap_html(
        settings_row.brand_color,
        f"""
        <p>Dear {_esc(intern.full_name)},</p>
        <p>We are pleased to offer you the position of <b>{_esc(offer.position)}</b> at <b>{_esc(settings_row.company_name)}</b>.</p>
        <p>Your official offer letter has been attached to this email.</p>
        <table style="margin: 16px 0; font-size: 14px;">
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Offer ID</td><td><b>{_esc(offer.number)}</b></td></tr>
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Position</td><td><b>{_esc(offer.position)}</b></td></tr>
          <tr><td style="color:#6b7280; padding: 2px 12px 2px 0;">Joining Date</td><td><b>{_fmt(offer.joining_date)}</b></td></tr>
        </table>
        <p>Please review the attached offer letter carefully.</p>
        <p>Regards,<br/>HR Department<br/>{_esc(settings_row.company_name)}</p>
        """,
    )
    return subject, html, text
