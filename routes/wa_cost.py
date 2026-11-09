"""Admin: what WhatsApp messages cost (from Meta's pricing analytics) + our own OTP counts.

GET /api/admin/whatsapp-cost  -> today / last 7 days / this month (India time), split into
OTP (AUTHENTICATION), order messages (UTILITY), marketing and free service replies.
Meta's numbers can lag a few hours. Needs META_WA_TOKEN; the account id is META_WA_WABA_ID
(default: the Varaha Jewels WhatsApp account).
"""
import calendar
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from database import get_session
from dependencies import get_current_admin
from routes.phone_otp import PhoneOtpLog

router = APIRouter()
GRAPH = "https://graph.facebook.com/v21.0"
IST = timedelta(hours=5, minutes=30)
LABELS = {"AUTHENTICATION": "Login OTP", "AUTHENTICATION_INTERNATIONAL": "Login OTP (abroad)",
          "UTILITY": "Order messages", "MARKETING": "Marketing", "SERVICE": "Replies (free)"}
_cache = {"at": 0.0, "data": None}


def _ist_midnight(days_ago: int = 0) -> datetime:
    now_ist = datetime.utcnow() + IST
    return datetime(now_ist.year, now_ist.month, now_ist.day) - timedelta(days=days_ago) - IST  # UTC


def summarize(points, starts: dict) -> dict:
    """points: Meta data points; starts: {"today": utc_dt, ...}. Returns per-window totals."""
    out = {}
    for win, since in starts.items():
        cats = defaultdict(lambda: {"count": 0, "cost": 0.0})
        for p in points:
            if datetime.utcfromtimestamp(int(p.get("start", 0))) >= since:
                c = cats[p.get("pricing_category") or "OTHER"]
                c["count"] += int(p.get("volume") or 0)
                c["cost"] += float(p.get("cost") or 0)
        rows = [{"category": k, "label": LABELS.get(k, k.title()), "count": v["count"], "cost": round(v["cost"], 2)}
                for k, v in sorted(cats.items(), key=lambda kv: -kv[1]["cost"])]
        out[win] = {"rows": rows, "total_cost": round(sum(r["cost"] for r in rows), 2),
                    "total_count": sum(r["count"] for r in rows)}
    return out


def _meta_points(since_utc: datetime):
    token = os.getenv("META_WA_TOKEN")
    waba = os.getenv("META_WA_WABA_ID", "1480989163767271")
    if not token:
        return None, None, "WhatsApp is not set up (META_WA_TOKEN missing)"
    start, end = calendar.timegm(since_utc.utctimetuple()), int(time.time())  # naive UTC -> unix, whatever the server's zone
    fields = (f'pricing_analytics.start({start}).end({end}).granularity(DAILY)'
              f'.dimensions(["PRICING_CATEGORY"]),currency')
    try:
        r = requests.get(f"{GRAPH}/{waba}", params={"fields": fields}, headers={"Authorization": f"Bearer {token}"}, timeout=20)
        d = r.json()
    except Exception as e:
        return None, None, f"Could not reach Meta: {str(e)[:80]}"
    if not r.ok:
        return None, None, f"Meta: {(d.get('error') or {}).get('message', r.status_code)}"[:200]
    pts = [p for blk in (d.get("pricing_analytics") or {}).get("data", []) for p in blk.get("data_points", [])]
    return pts, d.get("currency") or "INR", None


@router.get("/api/admin/whatsapp-cost")
def whatsapp_cost(session: Session = Depends(get_session), current_user=Depends(get_current_admin)):
    now_ist = datetime.utcnow() + IST
    starts = {"today": _ist_midnight(0), "week": _ist_midnight(6),
              "month": datetime(now_ist.year, now_ist.month, 1) - IST}
    earliest = min(starts.values())

    # Meta numbers are cached for 10 minutes (the analytics call is slow and changes slowly)
    if _cache["data"] and time.time() - _cache["at"] < 600:
        meta = _cache["data"]
    else:
        pts, currency, err = _meta_points(earliest)
        meta = {"error": err, "currency": currency or "INR", "windows": summarize(pts or [], starts) if pts is not None else None}
        if not err:
            _cache.update(at=time.time(), data=meta)

    # Our own counts (work even when Meta is unreachable)
    def count(prefix: str, since: datetime) -> int:
        return session.exec(select(func.count()).select_from(PhoneOtpLog)
                            .where(PhoneOtpLog.phone.like(f"{prefix}%"), PhoneOtpLog.created_at >= since)).one()
    ours = {w: {"otp_sent": count("wa:", s), "logins": count("waused:", s)} for w, s in starts.items()}
    return {**meta, "ours": ours, "updated_at": datetime.utcnow().isoformat() + "Z",
            "note": "Meta's figures can be a few hours behind."}
