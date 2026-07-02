import resend
from app.config import settings

resend.api_key = settings.RESEND_API_KEY

STATUS_MESSAGES = {
    "pending": "Your order has been placed successfully.",
    "assigned": "A delivery agent has been assigned to your order.",
    "picked_up": "Your package has been picked up.",
    "in_transit": "Your package is in transit.",
    "out_for_delivery": "Your package is out for delivery.",
    "delivered": "Your package has been delivered successfully.",
    "failed": "Delivery attempt failed. Please reschedule.",
}

def send_status_email(to_email: str, order_id: int, status: str, customer_name: str):
    message = STATUS_MESSAGES.get(status, f"Order status updated to {status}.")
    try:
        resend.Emails.send({
            "from": "LastMile Tracker <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"Order #{order_id} — {status.replace('_', ' ').title()}",
            "html": f"<p>Hi {customer_name},</p><p>{message}</p><p>Order ID: {order_id}</p>"
        })
    except Exception as e:
        # never let email failure break the order flow
        print(f"Email send failed: {e}")