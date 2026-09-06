"""Seed the database with an admin user, templates, settings and sample data.

Run from the backend/ directory:  python -m app.db.seed
"""
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.core.config import settings as cfg
from app.core.constants import CERT_TEMPLATES, DEFAULT_OFFER_TERMS, OFFER_TEMPLATES
from app.core.security import hash_password
from app.db.session import create_db_and_tables, engine
from app.models import (
    AdminUser,
    Certificate,
    Counter,
    Document,
    Intern,
    OfferLetter,
    ProgressTask,
    Setting,
    Template,
)
from app.services.verification import generate_verification_token, hash_token
from app.utils.dates import month_label

YEAR = datetime.now().year


def _days(n: int) -> datetime:
    return datetime.now() + timedelta(days=n)


def _pad(n: int) -> str:
    return f"{n:05d}"


TASK_TITLES = [
    "Onboarding & environment setup",
    "First feature / project assigned",
    "Mid-internship review",
    "Primary project delivery",
    "Final presentation & handover",
]

SEEDS = [
    dict(full_name="Rishabh Raj", email="rishabh.raj@example.com", phone="+91 90123 45678", college="NIT Patna", course="B.Tech CSE", role="Full-Stack Developer Intern", department="Engineering", manager="Vikram Singh", start=-24, end=6, stipend=15000, status="ACTIVE"),
    dict(full_name="Ananya Sharma", email="ananya.sharma@example.com", phone="+91 90876 54321", college="IIT Delhi", course="B.Tech ECE", role="Data Analyst Intern", department="Analytics", manager="Priya Nair", start=-40, end=-5, stipend=20000, status="COMPLETED"),
    dict(full_name="Mohammed Faiz", email="faiz.m@example.com", phone="+91 99887 76655", college="Jamia Millia Islamia", course="MCA", role="Backend Developer Intern", department="Engineering", manager="Vikram Singh", start=-60, end=-12, stipend=18000, status="COMPLETED"),
    dict(full_name="Sneha Iyer", email="sneha.iyer@example.com", phone="+91 98111 22334", college="VIT Vellore", course="B.Tech IT", role="UI/UX Design Intern", department="Design", manager="Kabir Rao", start=-10, end=50, stipend=12000, status="ACTIVE"),
    dict(full_name="Arjun Malhotra", email="arjun.m@example.com", phone="+91 97555 66778", college="BITS Pilani", course="B.E. CS", role="DevOps Intern", department="Infrastructure", manager="Neha Gupta", start=7, end=97, stipend=22000, status="UPCOMING"),
    dict(full_name="Kavya Reddy", email="kavya.reddy@example.com", phone="+91 96222 33445", college="IIIT Hyderabad", course="B.Tech CSE", role="Machine Learning Intern", department="AI Research", manager="Priya Nair", start=-30, end=30, stipend=25000, status="ACTIVE"),
    dict(full_name="Rohan Das", email="rohan.das@example.com", phone="+91 95333 44556", college="Jadavpur University", course="B.Tech CSE", role="QA Automation Intern", department="Quality", manager="Neha Gupta", start=-75, end=-20, stipend=14000, status="COMPLETED"),
    dict(full_name="Ishita Verma", email="ishita.verma@example.com", phone="+91 94444 55667", college="Delhi University", course="B.Com", role="HR Operations Intern", department="Human Resources", manager="Aarti Mehra", start=-5, end=25, stipend=10000, status="TERMINATED"),
]


def seed() -> None:
    create_db_and_tables()
    with Session(engine) as db:
        # Settings — only populated on first creation; an admin's later edits via
        # the Settings page must survive redeploys/restarts, not get overwritten.
        s = db.get(Setting, "app")
        if not s:
            s = Setting(
                id="app",
                company_name="Maayad Infotech Pvt. Ltd.",
                company_email="maayadinfotech@gmail.com",
                company_phone="+91 84710 82642",
                company_website="https://maayad.com",
                company_address="REGD. OFFICE: HOUSE NO. 169, BEHIND SHOPING CENTRE, SHASTRI NAGAR (AJMER), AJMER, RAJASTHAN – 305001",
                signature_name="Rishabh Raj Patel",
                signature_designation="Head of Human Resources",
            )
            db.add(s)

        # Templates
        for t in OFFER_TEMPLATES:
            existing = db.exec(select(Template).where(Template.type == "OFFER", Template.key == t["key"])).first()
            if not existing:
                db.add(Template(type="OFFER", key=t["key"], name=t["name"], description=t["description"], accent=t["accent"], is_default=(t["key"] == "corporate")))
        for t in CERT_TEMPLATES:
            existing = db.exec(select(Template).where(Template.type == "CERTIFICATE", Template.key == t["key"])).first()
            if not existing:
                db.add(Template(type="CERTIFICATE", key=t["key"], name=t["name"], description=t["description"], accent=t["accent"], is_default=(t["key"] == "premium")))

        # Admin
        email = cfg.SEED_ADMIN_EMAIL.lower()
        admin = db.exec(select(AdminUser).where(AdminUser.email == email)).first()
        if not admin:
            admin = AdminUser(email=email, name=cfg.SEED_ADMIN_NAME, password_hash=hash_password(cfg.SEED_ADMIN_PASSWORD), role="SUPERADMIN")
            db.add(admin)
        else:
            admin.name = cfg.SEED_ADMIN_NAME
            admin.role = "SUPERADMIN"
            db.add(admin)
        db.commit()
        print(f"👤 Admin ready → {email} / {cfg.SEED_ADMIN_PASSWORD}")

        if not cfg.SEED_DEMO_DATA:
            print("ℹ️  SEED_DEMO_DATA is off — skipping demo interns/offers/certificates.")
            return

        # Reset sample data
        for M in (Document, Certificate, OfferLetter, ProgressTask, Intern, Counter):
            for row in db.exec(select(M)).all():
                db.delete(row)
        db.commit()

        intern_seq = offer_seq = cert_seq = 0
        for sd in SEEDS:
            intern_seq += 1
            start, end = _days(sd["start"]), _days(sd["end"])
            intern = Intern(
                intern_code=f"INT-{YEAR}-{_pad(intern_seq)}",
                full_name=sd["full_name"], email=sd["email"], phone=sd["phone"],
                college=sd["college"], course=sd["course"], role=sd["role"],
                department=sd["department"], reporting_manager=sd["manager"],
                stipend=sd["stipend"], start_date=start, end_date=end,
                duration_label=month_label(start, end), status=sd["status"],
            )
            db.add(intern)
            db.commit()
            db.refresh(intern)

            total = sd["end"] - sd["start"]
            elapsed = max(0, min(total, 0 - sd["start"]))
            ratio = elapsed / total if total > 0 else 1
            done = 5 if sd["status"] == "COMPLETED" else round(ratio * 5)
            for i, title in enumerate(TASK_TITLES):
                db.add(ProgressTask(intern_id=intern.id, title=title, order_index=i, is_done=i < done))

            if sd["status"] != "TERMINATED":
                offer_seq += 1
                offer = OfferLetter(
                    number=f"OFF-{YEAR}-{_pad(offer_seq)}", intern_id=intern.id,
                    template_key="corporate", position=sd["role"], department=sd["department"],
                    duration_label=month_label(start, end), joining_date=start, stipend=sd["stipend"],
                    authorized_name="Rishabh Raj Patel", authorized_designation="Head of Human Resources",
                    terms=DEFAULT_OFFER_TERMS,
                    status="GENERATED",  # sample data reads as already-issued, not a lingering draft
                )
                db.add(offer)
                db.commit()
                db.add(Document(intern_id=intern.id, type="OFFER", title=f"Offer Letter — {sd['full_name']}", ref_id=offer.id))

            if sd["status"] == "COMPLETED":
                cert_seq += 1
                token = generate_verification_token()
                cert = Certificate(
                    number=f"CERT-{YEAR}-{_pad(cert_seq)}",
                    verification_token=token,
                    verification_token_hash=hash_token(token),
                    intern_id=intern.id, template_key="premium",
                    title="Certificate of Internship Completion", role=sd["role"], department=sd["department"],
                    duration_label=month_label(start, end), start_date=start, end_date=end,
                    authorized_name="Rishabh Raj Patel", authorized_designation="Head of Human Resources",
                    status="VALID",  # sample data reads as already-issued, not a lingering draft
                )
                db.add(cert)
                db.commit()
                db.add(Document(intern_id=intern.id, type="CERTIFICATE", title=f"Certificate — {sd['full_name']}", ref_id=cert.id))

        db.add(Counter(key=f"INT-{YEAR}", value=intern_seq))
        db.add(Counter(key=f"OFFER-{YEAR}", value=offer_seq))
        db.add(Counter(key=f"CERT-{YEAR}", value=cert_seq))
        db.commit()
        print(f"✅ Seeded {intern_seq} interns, {offer_seq} offers, {cert_seq} certificates.")


if __name__ == "__main__":
    seed()
