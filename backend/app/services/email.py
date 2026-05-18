import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def _send(to: str, subject: str, html_body: str) -> None:
    """ Low-level send, builds MIME message and delivers via SMTP """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname = settings.smtp_host,
            port = settings.smtp_port,
            username = settings.smtp_user,
            password = settings.smtp_password,
            start_tls = True,
        )
        logger.info("Email sent to %s,  subject: %s", to, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)

async def send_welcome_email(to: str, full_name: str, temp_password: str) -> None:
    """ Sent to a new user with their temporary password """
    subject = f"Welcome to {settings.app_name} — Your account details"
    body = f"""
    <p>Hello {full_name},</p>
    <p>Your account has been created on <strong>{settings.app_name}</strong>.</p>
    <p>Your temporary password is: <strong>{temp_password}</strong></p>
    <p>This password expires in <strong>{settings.temp_password_ttl_hours} hours</strong>.
       Please log in and change it immediately.</p>
    <p>— {settings.app_name} Team</p>
    """
    await _send(to, subject, body)

async def send_password_reset_email(to: str, full_name: str, temp_password: str) -> None:
    """ Sent when an admin resets a user's password """
    subject = f"{settings.app_name} — Password reset"
    body = f"""
    <p>Hello {full_name},</p>
    <p>Your password has been reset by an administrator.</p>
    <p>Your temporary password is: <strong>{temp_password}</strong></p>
    <p>Please log in and change it immediately.</p>
    <p>— {settings.app_name} Team</p>
    """
    await _send(to, subject, body)

async def send_forgot_password_email(to: str, full_name: str, temp_password: str) -> None:
    """ Sent when a user requests a self-service password reset """
    subject = f"{settings.app_name} — Your temporary password"
    body = f"""
    <p>Hello {full_name},</p>
    <p>We received a password reset request for your <strong>{settings.app_name}</strong> account.</p>
    <p>Your temporary password is: <strong>{temp_password}</strong></p>
    <p>This password expires in <strong>{settings.temp_password_ttl_hours} hours</strong>.</p>
    <p>Once you log in, please change your password immediately:</p>
    <ol>
        <li>Go to <strong>My Profile</strong></li>
        <li>Open the <strong>Security</strong> section</li>
        <li>Click <strong>Change Password</strong></li>
    </ol>
    <p>If you did not request this reset, please contact your administrator.</p>
    <p>— {settings.app_name} Team</p>
    """
    await _send(to, subject, body)

async def send_role_change_email(to: str, full_name: str, new_role: str, position: str) -> None:
    """ Sent when a user's role or position is updated """
    subject = f"{settings.app_name} — Your role has been updated"
    body = f"""
    <p>Hello {full_name},</p>
    <p>Your role on <strong>{settings.app_name}</strong> has been updated.</p>
    <ul>
        <li>New role: <strong>{new_role}</strong></li>
        <li>Position: <strong>{position}</strong></li>
    </ul>
    <p>— {settings.app_name} Team</p>
    """
    await _send(to, subject, body)