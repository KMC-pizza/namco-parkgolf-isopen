import json
import os
import secrets
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except ImportError:
    firebase_admin = None
    credentials = None
    messaging = None


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STATUS_FILE = DATA_DIR / "status.json"
HISTORY_FILE = DATA_DIR / "history.json"
SUBSCRIPTIONS_FILE = DATA_DIR / "subscriptions.json"

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# 운영 시 GitHub Pages 주소만 허용
allowed_origin = os.environ.get(
    "ALLOWED_ORIGIN",
    "https://kmc-pizza.github.io"
)
CORS(app, supports_credentials=True, origins=[allowed_origin])

ADMIN_ID = os.environ.get("ADMIN_ID", "admin")
ADMIN_PASSWORD_HASH = os.environ.get(
    "ADMIN_PASSWORD_HASH",
    generate_password_hash("change-me-now")
)

DATA_DIR.mkdir(exist_ok=True)


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(
        json.dumps(value, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    temp.replace(path)


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"message": "로그인이 필요합니다."}), 401
        return view(*args, **kwargs)
    return wrapped


def init_fcm():
    if firebase_admin is None or firebase_admin._apps:
        return

    service_account = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if service_account and Path(service_account).exists():
        firebase_admin.initialize_app(
            credentials.Certificate(service_account)
        )


def make_push_body(facility, custom_message=""):
    if custom_message:
        return custom_message

    status_labels = {
        "OPEN": "정상 운영합니다.",
        "CLOSED": "임시 휴장되었습니다.",
        "SCHEDULED_CLOSE": "휴장이 예정되어 있습니다."
    }
    body = status_labels.get(facility["status"], "운영상태가 변경되었습니다.")
    if facility.get("reason"):
        body = f'{facility["reason"]}으로 {body}'
    return body


def send_push_for_facility(facility, custom_message=""):
    init_fcm()
    if firebase_admin is None or not firebase_admin._apps:
        return {"sent": 0, "failed": 0, "skipped": True}

    subscriptions = read_json(SUBSCRIPTIONS_FILE, [])
    tokens = [
        item["token"]
        for item in subscriptions
        if facility["id"] in item.get("interests", [])
    ]

    if not tokens:
        return {"sent": 0, "failed": 0, "skipped": False}

    message = messaging.MulticastMessage(
        tokens=tokens[:500],
        notification=messaging.Notification(
            title=facility["name"],
            body=make_push_body(facility, custom_message)
        ),
        data={
            "facilityId": facility["id"],
            "url": f'https://kmc-pizza.github.io/namco-alarmi/?facility={facility["id"]}'
        }
    )

    response = messaging.send_each_for_multicast(message)
    return {
        "sent": response.success_count,
        "failed": response.failure_count,
        "skipped": False
    }


@app.get("/api/status")
def get_status():
    return jsonify(read_json(STATUS_FILE, {"updatedAt": None, "facilities": []}))


@app.get("/api/history")
def get_history():
    return jsonify(read_json(HISTORY_FILE, []))


@app.post("/api/admin/login")
def login():
    payload = request.get_json(silent=True) or {}
    if payload.get("id") != ADMIN_ID:
        return jsonify({"message": "로그인에 실패했습니다."}), 401
    if not check_password_hash(ADMIN_PASSWORD_HASH, payload.get("password", "")):
        return jsonify({"message": "로그인에 실패했습니다."}), 401

    session["admin"] = True
    return jsonify({"message": "로그인되었습니다."})


@app.post("/api/admin/status")
@require_admin
def update_status():
    payload = request.get_json(silent=True) or {}
    required = ["facilityId", "status", "adminName"]
    if any(not payload.get(key) for key in required):
        return jsonify({"message": "필수값이 누락되었습니다."}), 400

    status_data = read_json(STATUS_FILE, {"updatedAt": None, "facilities": []})
    facility = next(
        (item for item in status_data["facilities"]
         if item["id"] == payload["facilityId"]),
        None
    )
    if not facility:
        return jsonify({"message": "시설을 찾을 수 없습니다."}), 404

    before = dict(facility)
    facility.update({
        "status": payload["status"],
        "reason": payload.get("reason", ""),
        "hours": payload.get("hours", ""),
        "closedDay": payload.get("closedDay", "")
    })

    changed_at = datetime.now(timezone.utc).isoformat()
    status_data["updatedAt"] = changed_at

    history = read_json(HISTORY_FILE, [])
    history.insert(0, {
        "id": secrets.token_hex(12),
        "changedAt": changed_at,
        "facilityId": facility["id"],
        "facilityName": facility["name"],
        "fromStatus": before.get("status"),
        "toStatus": facility["status"],
        "reason": facility.get("reason", ""),
        "hours": facility.get("hours", ""),
        "closedDay": facility.get("closedDay", ""),
        "adminName": payload["adminName"],
        "pushRequested": bool(payload.get("sendPush")),
        "pushMessage": payload.get("pushMessage", "")
    })

    write_json(STATUS_FILE, status_data)
    write_json(HISTORY_FILE, history[:1000])

    push_result = None
    if payload.get("sendPush") and before.get("status") != facility["status"]:
        push_result = send_push_for_facility(
            facility,
            payload.get("pushMessage", "")
        )

    return jsonify({
        "message": "운영상태가 저장되었습니다.",
        "push": push_result
    })


@app.post("/api/push/subscribe")
def subscribe_push():
    payload = request.get_json(silent=True) or {}
    token = payload.get("token")
    interests = payload.get("interests", [])

    if not token or not isinstance(interests, list):
        return jsonify({"message": "잘못된 요청입니다."}), 400

    subscriptions = read_json(SUBSCRIPTIONS_FILE, [])
    existing = next((item for item in subscriptions if item["token"] == token), None)

    if existing:
        existing["interests"] = interests
        existing["updatedAt"] = datetime.now(timezone.utc).isoformat()
    else:
        subscriptions.append({
            "token": token,
            "interests": interests,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        })

    write_json(SUBSCRIPTIONS_FILE, subscriptions)
    return jsonify({"message": "알림 구독이 저장되었습니다."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
