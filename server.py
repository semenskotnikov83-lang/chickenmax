import asyncio
import base64
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Dict, Set, Optional, List
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

SECRET_KEY = os.environ.get("SECRET_KEY", "chickenmax_secret_salt_998877665544332211")
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

VAPID_PRIVATE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vapid_private.pem")
VAPID_PUBLIC_KEY_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vapid_public.txt")
VAPID_CLAIMS = {"sub": "mailto:admin@chickenmax.app"}

def _init_vapid_keys():
    try:
        from py_vapid import Vapid
        if not os.path.exists(VAPID_PRIVATE_KEY_PATH):
            vapid = Vapid()
            vapid.generate_keys()
            vapid.save_key(VAPID_PRIVATE_KEY_PATH)
            pub = vapid.public_key.public_bytes(
                __import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding", "PublicFormat"]).Encoding.X962,
                __import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding", "PublicFormat"]).PublicFormat.UncompressedPoint
            )
            with open(VAPID_PUBLIC_KEY_PATH, "w") as f:
                f.write(base64.urlsafe_b64encode(pub).decode().rstrip("="))
        with open(VAPID_PUBLIC_KEY_PATH) as f:
            return f.read().strip()
    except Exception as e:
        print(f"[VAPID] key init error: {e}")
        return ""

VAPID_PUBLIC_KEY = _init_vapid_keys()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="ChickenMax")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Database:
    def __init__(self):
        self.is_pg = bool(DATABASE_URL)
        self.sqlite_conn = None
        self.pg_conn = None
        if not self.is_pg:
            self.sqlite_conn = sqlite3.connect("chickenmax.db", check_same_thread=False)
            self.sqlite_conn.row_factory = sqlite3.Row

    def get_pg(self):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        if self.pg_conn is None or self.pg_conn.closed != 0:
            url = DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            self.pg_conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
            self.pg_conn.autocommit = True
        return self.pg_conn

    def adapt_sql(self, sql: str) -> str:
        if not self.is_pg:
            return sql
        sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        if re.search(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", sql, re.IGNORECASE):
            sql = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT INTO", sql, flags=re.IGNORECASE)
            if "ON CONFLICT" not in sql.upper():
                sql = sql.rstrip() + " ON CONFLICT DO NOTHING"
        elif re.search(r"\bINSERT\s+OR\s+REPLACE\s+INTO\b", sql, re.IGNORECASE):
            if "push_subscriptions" in sql.lower():
                sql = re.sub(r"\bINSERT\s+OR\s+REPLACE\s+INTO\s+push_subscriptions\b", "INSERT INTO push_subscriptions", sql, flags=re.IGNORECASE)
                if "ON CONFLICT" not in sql.upper():
                    sql = sql.rstrip() + " ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth"
        sql = re.sub(r"\?", "%s", sql)
        return sql

    def execute(self, sql: str, params: tuple = ()):
        if self.is_pg:
            try:
                conn = self.get_pg()
                cur = conn.cursor()
                cur.execute(self.adapt_sql(sql), params)
                return cur
            except Exception:
                self.pg_conn = None
                conn = self.get_pg()
                cur = conn.cursor()
                cur.execute(self.adapt_sql(sql), params)
                return cur
        else:
            cur = self.sqlite_conn.cursor()
            cur.execute(sql, params)
            self.sqlite_conn.commit()
            return cur

    def fetchone(self, sql: str, params: tuple = ()):
        cur = self.execute(sql, params)
        res = cur.fetchone()
        cur.close()
        return res

    def fetchall(self, sql: str, params: tuple = ()):
        cur = self.execute(sql, params)
        res = cur.fetchall()
        cur.close()
        return res

    def insert_user(self, username: str, user_code: str, pw_hash: str, color: str, last_seen: str):
        if self.is_pg:
            sql = "INSERT INTO users (username, user_code, password_hash, avatar_color, avatar_url, bio, last_seen) VALUES (%s, %s, %s, %s, '', '', %s) RETURNING id"
            cur = self.execute(sql, (username, user_code, pw_hash, color, last_seen))
            row = cur.fetchone()
            cur.close()
            return row["id"]
        else:
            sql = "INSERT INTO users (username, user_code, password_hash, avatar_color, avatar_url, bio, last_seen) VALUES (?, ?, ?, ?, '', '', ?)"
            cur = self.execute(sql, (username, user_code, pw_hash, color, last_seen))
            return cur.lastrowid

    def insert_message(self, sender_id: int, receiver_id: Optional[int], content: str, timestamp: str, reply_to_id: Optional[int] = None, group_id: Optional[int] = None, msg_type: str = "text", media_url: str = "", duration: int = 0, file_name: str = "", file_size: int = 0):
        if self.is_pg:
            sql = "INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read, reply_to_id, group_id, msg_type, media_url, duration, file_name, file_size, is_edited, is_pinned) VALUES (%s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s, 0, 0) RETURNING id"
            cur = self.execute(sql, (sender_id, receiver_id, content, timestamp, reply_to_id, group_id, msg_type, media_url, duration, file_name, file_size))
            row = cur.fetchone()
            cur.close()
            return row["id"]
        else:
            sql = "INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read, reply_to_id, group_id, msg_type, media_url, duration, file_name, file_size, is_edited, is_pinned) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 0, 0)"
            cur = self.execute(sql, (sender_id, receiver_id, content, timestamp, reply_to_id, group_id, msg_type, media_url, duration, file_name, file_size))
            return cur.lastrowid

db = Database()

def init_db():
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            user_code TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            avatar_url TEXT DEFAULT '',
            bio TEXT DEFAULT '',
            custom_status TEXT DEFAULT '',
            profile_color TEXT DEFAULT '',
            custom_banner TEXT DEFAULT '',
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS friends (
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            avatar_url TEXT DEFAULT '',
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER,
            group_id INTEGER,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            reply_to_id INTEGER,
            msg_type TEXT DEFAULT 'text',
            media_url TEXT DEFAULT '',
            duration INTEGER DEFAULT 0,
            file_name TEXT DEFAULT '',
            file_size INTEGER DEFAULT 0,
            is_edited INTEGER DEFAULT 0,
            is_pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            message_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            PRIMARY KEY (message_id, user_id, emoji)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, endpoint)
        )
    """)

    try:
        db.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN reply_to_id INTEGER")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN group_id INTEGER")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN msg_type TEXT DEFAULT 'text'")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN media_url TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN duration INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN file_name TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN file_size INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE users ADD COLUMN custom_status TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE users ADD COLUMN profile_color TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE users ADD COLUMN custom_banner TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        db.execute("UPDATE messages SET content = '' WHERE msg_type = 'image' AND (content LIKE '%.jpg' OR content LIKE '%.png' OR content LIKE '%.jpeg' OR content LIKE '%.webp' OR content LIKE '%.gif' OR content = 'Фотография' OR content = 'GIF анимация')")
    except Exception:
        pass

    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages (sender_id, receiver_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON messages (receiver_id, sender_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages (group_id)",
        "CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions (message_id)",
        "CREATE INDEX IF NOT EXISTS idx_reactions_user_msg ON reactions (message_id, user_id)",
        "CREATE INDEX IF NOT EXISTS idx_friends_user_friend ON friends (user_id, friend_id)",
        "CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members (group_id, user_id)",
        "CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id)"
    ]
    for idx_sql in indexes:
        try:
            db.execute(idx_sql)
        except Exception:
            pass

init_db()

COLORS = [
    "#5865F2", "#57F287", "#FEE75C", "#EB459E",
    "#ED4245", "#00B0F4", "#F47B67", "#9B59B6"
]

def send_web_push_to_user(receiver_id: int, title: str, body: str, sender_id: int = None, url: str = "/"):
    def _send():
        try:
            from pywebpush import webpush, WebPushException
            subs = db.fetchall(
                "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
                (receiver_id,)
            )
            payload = json.dumps({
                "title": title,
                "body": body,
                "url": url,
                "sender_id": sender_id,
                "tag": f"chat-{sender_id}"
            })
            dead = []
            for s in subs:
                try:
                    webpush(
                        subscription_info={
                            "endpoint": s["endpoint"],
                            "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}
                        },
                        data=payload,
                        vapid_private_key=VAPID_PRIVATE_KEY_PATH,
                        vapid_claims=dict(VAPID_CLAIMS)
                    )
                except WebPushException as e:
                    if e.response is not None and e.response.status_code in (404, 410):
                        dead.append(s["endpoint"])
                except Exception:
                    pass
            for ep in dead:
                try:
                    db.execute("DELETE FROM push_subscriptions WHERE endpoint = ?", (ep,))
                except Exception:
                    pass
        except Exception as e:
            print(f"[PUSH] error: {e}")
    threading.Thread(target=_send, daemon=True).start()

AI_BOT_USERNAME = "AI CHAT"
AI_BOT_CODE = "#00000"
AI_API_URL = "https://ru.cheapvibecode.ru/v1/chat/completions"
AI_API_KEY = "sk-cvc-ffe999c4451bc10547581ecc1db5e933758f5716ae3bd70ee18981a4a8ebec67"
AI_MODEL_ID = "gpt-6-luna"
AI_IMAGE_MODEL = "grok-imagine-image"
AI_TRANSCRIBE_MODEL = "gpt-4o-transcribe"

def ensure_ai_bot() -> int:
    row = db.fetchone("SELECT id FROM users WHERE username = ?", (AI_BOT_USERNAME,))
    if row:
        return row["id"]
    pw_hash = hashlib.sha256(secrets.token_hex(16).encode("utf-8")).hexdigest()
    if db.is_pg:
        cur = db.execute(
            "INSERT INTO users (username, user_code, password_hash, avatar_color, avatar_url, bio, custom_status, profile_color, last_seen) "
            "VALUES (%s, %s, %s, %s, '', %s, %s, %s, CURRENT_TIMESTAMP) RETURNING id",
            (AI_BOT_USERNAME, AI_BOT_CODE, pw_hash, "#10a37f", "Искусственный интеллект ChickenMax (модель: gpt-6-luna)", "🤖", "#10a37f")
        )
        r = cur.fetchone()
        cur.close()
        return r["id"]
    else:
        cur = db.execute(
            "INSERT INTO users (username, user_code, password_hash, avatar_color, avatar_url, bio, custom_status, profile_color, last_seen) "
            "VALUES (?, ?, ?, ?, '', ?, ?, ?, CURRENT_TIMESTAMP)",
            (AI_BOT_USERNAME, AI_BOT_CODE, pw_hash, "#10a37f", "Искусственный интеллект ChickenMax (модель: gpt-6-luna)", "🤖", "#10a37f")
        )
        return cur.lastrowid

AI_BOT_ID = ensure_ai_bot()

async def generate_ai_image(prompt: str) -> Optional[str]:
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = {
                "prompt": prompt,
                "model": AI_IMAGE_MODEL,
                "n": 1
            }
            headers = {
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json"
            }
            async with session.post(
                "https://ru.cheapvibecode.ru/v1/images/generations",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=45)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    items = data.get("data", [])
                    if items:
                        b64 = items[0].get("b64_json")
                        if b64:
                            img_bytes = base64.b64decode(b64)
                            fn = f"ai_{uuid.uuid4().hex}.jpg"
                            fp = os.path.join(UPLOAD_DIR, fn)
                            with open(fp, "wb") as f:
                                f.write(img_bytes)
                            return f"/uploads/{fn}"
                        url = items[0].get("url")
                        if url:
                            return url
                else:
                    err = await resp.text()
                    print(f"[AI Image] Error {resp.status}: {err}")
    except Exception as e:
        print(f"[AI Image] Exception: {e}")
    return None

async def process_ai_chat_response(user_id: int, ai_bot_id: int, user_prompt: str, prompt_msg_type: str = "text"):
    stop_typing = False

    async def keep_typing():
        while not stop_typing:
            await manager.send_to_user(user_id, {
                "type": "typing",
                "sender_id": ai_bot_id,
                "username": AI_BOT_USERNAME
            })
            await asyncio.sleep(3)

    typing_task = asyncio.create_task(keep_typing())

    reply_text = ""
    is_image = False
    img_url = ""
    try:
        is_drawing_request = bool(re.search(r'^(нарисуй|сгенерируй|/img|/imagine|draw|изобрази)\b', user_prompt.strip(), re.IGNORECASE))
        if is_drawing_request:
            clean_prompt = re.sub(r'^(нарисуй мне|нарисуй|сгенерируй картинку|сгенерируй фото|сгенерируй|изобрази|/img|/imagine|draw)\s*', '', user_prompt.strip(), flags=re.IGNORECASE).strip() or user_prompt.strip()
            res_url = await generate_ai_image(clean_prompt)
            if res_url:
                is_image = True
                img_url = res_url
                reply_text = clean_prompt
            else:
                reply_text = "Не удалось сгенерировать изображение. Попробуйте еще раз с другим запросом."
        elif prompt_msg_type != "text" and not user_prompt:
            reply_text = "Я пока умею обрабатывать только текстовые сообщения."
        else:
            history_rows = db.fetchall("""
                SELECT sender_id, content
                FROM messages
                WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                  AND (group_id IS NULL OR group_id = 0)
                ORDER BY id DESC LIMIT 14
            """, (user_id, ai_bot_id, ai_bot_id, user_id))

            system_instruction = (
                "Ты умный, профессиональный и вежливый русскоязычный ИИ-ассистент AI CHAT в мессенджере ChickenMax. "
                "Модель: gpt-6-luna. Разработчик и создатель мессенджера — Меф. "
                "Отвечай четко, структурированно, грамотно и по существу. Ты также умеешь генерировать картинки (команда /img или фраза 'нарисуй ...')."
            )

            messages = [{"role": "system", "content": system_instruction}]
            for h in reversed(history_rows):
                c = (h["content"] or "").strip()
                if c:
                    role = "assistant" if h["sender_id"] == ai_bot_id else "user"
                    messages.append({"role": role, "content": c})

            import aiohttp
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": AI_MODEL_ID,
                    "messages": messages,
                    "temperature": 0.7
                }
                headers = {
                    "Authorization": f"Bearer {AI_API_KEY}",
                    "Content-Type": "application/json"
                }
                async with session.post(AI_API_URL, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=45)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            reply_text = choices[0].get("message", {}).get("content", "").strip()
                    else:
                        err_text = await resp.text()
                        print(f"[AI] Error {resp.status}: {err_text}")
    except Exception as e:
        print(f"[AI] Exception: {e}")
        reply_text = "Извините, сервис нейросети временно недоступен. Попробуйте отправить запрос еще раз."
    finally:
        stop_typing = True
        typing_task.cancel()

    if not reply_text:
        reply_text = "Извините, не удалось сформировать ответ. Попробуйте еще раз."

    timestamp = datetime.now().strftime("%H:%M")
    msg_id = db.insert_message(
        sender_id=ai_bot_id,
        receiver_id=user_id,
        content=reply_text,
        timestamp=timestamp,
        reply_to_id=None,
        group_id=None,
        msg_type="image" if is_image else "text",
        media_url=img_url if is_image else ""
    )

    payload = {
        "type": "message",
        "id": msg_id,
        "sender_id": ai_bot_id,
        "sender_username": AI_BOT_USERNAME,
        "sender_color": "#10a37f",
        "sender_avatar": "",
        "sender_custom_status": "🤖",
        "sender_profile_color": "#10a37f",
        "receiver_id": user_id,
        "group_id": None,
        "content": reply_text,
        "timestamp": timestamp,
        "is_read": False,
        "msg_type": "image" if is_image else "text",
        "media_url": img_url if is_image else "",
        "duration": 0,
        "file_name": "",
        "file_size": 0,
        "is_edited": False,
        "is_pinned": False,
        "reactions": [],
        "reply_to": None,
        "burn_timer": 0,
        "temp_id": None
    }

    await manager.send_to_user(user_id, payload)
    send_web_push_to_user(user_id, AI_BOT_USERNAME, "📷 Сгенерировано фото" if is_image else reply_text, sender_id=ai_bot_id)

async def process_ai_group_response(group_id: int, user_id: int, user_prompt: str):
    user = db.fetchone("SELECT username FROM users WHERE id = ?", (user_id,))
    username = user["username"] if user else "Участник"

    is_drawing = bool(re.search(r'^(нарисуй|сгенерируй|/img|/imagine|draw|изобрази)\b', user_prompt.strip(), re.IGNORECASE))
    if is_drawing:
        clean_prompt = re.sub(r'^(нарисуй мне|нарисуй|сгенерируй картинку|сгенерируй фото|сгенерируй|изобрази|/img|/imagine|draw)\s*', '', user_prompt.strip(), flags=re.IGNORECASE).strip() or user_prompt.strip()
        img_url = await generate_ai_image(clean_prompt)
        timestamp = datetime.now().strftime("%H:%M")
        if img_url:
            msg_id = db.insert_message(
                sender_id=AI_BOT_ID,
                receiver_id=None,
                content=f"@{username} {clean_prompt}",
                timestamp=timestamp,
                reply_to_id=None,
                group_id=group_id,
                msg_type="image",
                media_url=img_url
            )
            payload = {
                "type": "message",
                "id": msg_id,
                "sender_id": AI_BOT_ID,
                "sender_username": AI_BOT_USERNAME,
                "sender_color": "#10a37f",
                "sender_avatar": "",
                "sender_custom_status": "🤖",
                "sender_profile_color": "#10a37f",
                "receiver_id": None,
                "group_id": group_id,
                "content": f"@{username} {clean_prompt}",
                "timestamp": timestamp,
                "is_read": True,
                "msg_type": "image",
                "media_url": img_url,
                "duration": 0,
                "file_name": "",
                "file_size": 0,
                "is_edited": False,
                "is_pinned": False,
                "reactions": [],
                "reply_to": None,
                "burn_timer": 0,
                "temp_id": None
            }
            await manager.send_to_group(group_id, payload)
            return

    history_rows = db.fetchall("""
        SELECT sender_id, content
        FROM messages
        WHERE group_id = ?
        ORDER BY id DESC LIMIT 10
    """, (group_id,))

    system_instruction = (
        "Ты умный ИИ-помощник AI CHAT в групповой беседе мессенджера ChickenMax. "
        "Отвечай кратко, емко, по делу и дружелюбно. "
        f"Тебя вызвал участник @{username}. Обращайся к нему при ответе."
    )

    messages = [{"role": "system", "content": system_instruction}]
    for h in reversed(history_rows):
        c = (h["content"] or "").strip()
        if c:
            role = "assistant" if h["sender_id"] == AI_BOT_ID else "user"
            messages.append({"role": role, "content": c})

    timestamp = datetime.now().strftime("%H:%M")
    msg_id = db.insert_message(
        sender_id=AI_BOT_ID,
        receiver_id=None,
        content="💬 Обдумываю ответ...",
        timestamp=timestamp,
        reply_to_id=None,
        group_id=group_id,
        msg_type="text"
    )

    payload = {
        "type": "message",
        "id": msg_id,
        "sender_id": AI_BOT_ID,
        "sender_username": AI_BOT_USERNAME,
        "sender_color": "#10a37f",
        "sender_avatar": "",
        "sender_custom_status": "🤖",
        "sender_profile_color": "#10a37f",
        "receiver_id": None,
        "group_id": group_id,
        "content": "💬 Обдумываю ответ...",
        "timestamp": timestamp,
        "is_read": True,
        "msg_type": "text",
        "media_url": "",
        "duration": 0,
        "file_name": "",
        "file_size": 0,
        "is_edited": False,
        "is_pinned": False,
        "reactions": [],
        "reply_to": None,
        "burn_timer": 0,
        "temp_id": None
    }
    await manager.send_to_group(group_id, payload)

    reply_text = ""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            ai_payload = {
                "model": AI_MODEL_ID,
                "messages": messages,
                "temperature": 0.7
            }
            headers = {
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json"
            }
            async with session.post(AI_API_URL, headers=headers, json=ai_payload, timeout=aiohttp.ClientTimeout(total=45)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        reply_text = choices[0].get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"[AI Group] Exception: {e}")

    if not reply_text:
        reply_text = f"@{username}, сервис нейросети временно недоступен."

    db.execute("UPDATE messages SET content = ? WHERE id = ?", (reply_text, msg_id))
    edit_payload = {
        "type": "message_edited",
        "message_id": msg_id,
        "content": reply_text,
        "is_edited": False
    }
    await manager.send_to_group(group_id, edit_payload)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_token(user_id: int) -> str:
    payload = f"{user_id}:{secrets.token_hex(16)}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

active_tokens: Dict[str, int] = {}

def get_current_user_id(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    if token in active_tokens:
        update_user_last_seen(active_tokens[token])
        return active_tokens[token]
    parts = token.split(":")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid token")
    payload = f"{parts[0]}:{parts[1]}"
    sig = parts[2]
    expected_sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = int(parts[0])
    active_tokens[token] = user_id
    update_user_last_seen(user_id)
    return user_id

def update_user_last_seen(user_id: int):
    now_str = datetime.now(timezone.utc).isoformat()
    db.execute("UPDATE users SET last_seen = ? WHERE id = ?", (now_str, user_id))

def format_last_seen(last_seen_val, is_online: bool) -> str:
    if is_online:
        return "в сети"
    if not last_seen_val:
        return "был(а) недавно"
    try:
        if isinstance(last_seen_val, datetime):
            dt = last_seen_val
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(str(last_seen_val).replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff_seconds = int((now - dt).total_seconds())
        if diff_seconds < 60:
            return "был(а) только что"
        if diff_seconds < 3600:
            mins = diff_seconds // 60
            if mins % 10 == 1 and mins != 11:
                w = "минуту"
            elif mins % 10 in [2, 3, 4] and mins not in [12, 13, 14]:
                w = "минуты"
            else:
                w = "минут"
            return f"был(а) {mins} {w} назад"
        if diff_seconds < 86400:
            hours = diff_seconds // 3600
            if hours % 10 == 1 and hours != 11:
                w = "час"
            elif hours % 10 in [2, 3, 4] and hours not in [12, 13, 14]:
                w = "часа"
            else:
                w = "часов"
            return f"был(а) {hours} {w} назад"
        days = diff_seconds // 86400
        return f"был(а) {days} дн. назад"
    except Exception:
        return "был(а) недавно"

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        update_user_last_seen(user_id)
        await self.broadcast_presence(user_id, True)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                update_user_last_seen(user_id)
                await self.broadcast_presence(user_id, False)

    def is_online(self, user_id: int) -> bool:
        if AI_BOT_ID and user_id == AI_BOT_ID:
            return True
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_to_user(self, user_id: int, data: dict):
        if user_id in self.active_connections:
            closed_sockets = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    closed_sockets.add(ws)
            for ws in closed_sockets:
                self.active_connections[user_id].discard(ws)

    async def send_to_group(self, group_id: int, data: dict, exclude_user_id: Optional[int] = None):
        members = db.fetchall("SELECT user_id FROM group_members WHERE group_id = ?", (group_id,))
        for m in members:
            uid = m["user_id"]
            if exclude_user_id and uid == exclude_user_id:
                continue
            await self.send_to_user(uid, data)

    async def broadcast_presence(self, user_id: int, is_online: bool):
        friends = db.fetchall("SELECT friend_id FROM friends WHERE user_id = ?", (user_id,))
        user_row = db.fetchone("SELECT last_seen FROM users WHERE id = ?", (user_id,))
        last_seen_str = user_row["last_seen"] if user_row else ""
            
        status_text = format_last_seen(last_seen_str, is_online)
        for f in friends:
            await self.send_to_user(f["friend_id"], {
                "type": "presence",
                "user_id": user_id,
                "is_online": is_online,
                "status_text": status_text
            })

manager = ConnectionManager()

class RegisterDto(BaseModel):
    username: str
    password: str

class LoginDto(BaseModel):
    username: str
    password: str

class AddFriendDto(BaseModel):
    query: str

class CreateGroupDto(BaseModel):
    name: str
    member_ids: List[int] = []

class AddGroupMembersDto(BaseModel):
    member_ids: List[int] = []

class PushSubscriptionDto(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

class SendMessageDto(BaseModel):
    receiver_id: Optional[int] = None
    group_id: Optional[int] = None
    content: str = ""
    reply_to_id: Optional[int] = None
    msg_type: str = "text"
    media_url: str = ""
    duration: int = 0
    file_name: str = ""
    file_size: int = 0
    temp_id: Optional[str] = None
    burn_timer: int = 0
    timestamp: Optional[str] = None

class EditMessageDto(BaseModel):
    message_id: int
    content: str

class DeleteMessageDto(BaseModel):
    message_id: int

class TranscribeDto(BaseModel):
    message_id: int
    wav_data: Optional[str] = None

class PinMessageDto(BaseModel):
    message_id: int
    is_pinned: bool

class ReadMessagesDto(BaseModel):
    sender_id: Optional[int] = None
    group_id: Optional[int] = None

class UpdateAvatarDto(BaseModel):
    avatar_url: Optional[str] = ""
    avatar_data: Optional[str] = ""

class UpdateBannerDto(BaseModel):
    banner_url: Optional[str] = ""
    banner_data: Optional[str] = ""

class UpdateProfileDto(BaseModel):
    username: Optional[str] = ""
    bio: Optional[str] = ""
    custom_status: Optional[str] = ""
    profile_color: Optional[str] = ""
    custom_banner: Optional[str] = ""

class ReactionDto(BaseModel):
    message_id: int
    emoji: str

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "ChickenMax", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/ai/bot")
def get_ai_bot_info():
    bot_id = ensure_ai_bot()
    bot_user = db.fetchone("SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color FROM users WHERE id = ?", (bot_id,))
    return {
        "id": bot_id,
        "username": bot_user["username"] if bot_user else AI_BOT_USERNAME,
        "user_code": bot_user["user_code"] if bot_user else AI_BOT_CODE,
        "avatar_color": bot_user["avatar_color"] if bot_user else "#10a37f",
        "avatar_url": bot_user["avatar_url"] if bot_user else "",
        "bio": bot_user["bio"] if bot_user else "Искусственный интеллект ChickenMax (модель: gpt-6-luna)",
        "custom_status": "🤖",
        "profile_color": "#10a37f",
        "is_online": True,
        "status_text": "нейросеть в сети"
    }

@app.post("/api/register")
def register(dto: RegisterDto):
    username = dto.username.strip()
    if username.lower() in ["ai chat", "aichat", "bot", "ai", "избранное"]:
        raise HTTPException(status_code=400, detail="Этот ник зарезервирован")
    if len(username) < 2 or len(username) > 24:
        raise HTTPException(status_code=400, detail="Длина ника должна быть от 2 до 24 символов")
    if len(dto.password) < 4:
        raise HTTPException(status_code=400, detail="Пароль минимум 4 символа")

    color = random.choice(COLORS)
    code_digits = "".join([str(random.randint(0, 9)) for _ in range(5)])
    user_code = f"#{code_digits}"
    now_str = datetime.now(timezone.utc).isoformat()

    existing = db.fetchone("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
    if existing:
        raise HTTPException(status_code=400, detail="Этот ник уже занят другим чикеном")

    while db.fetchone("SELECT id FROM users WHERE user_code = ?", (user_code,)):
        code_digits = "".join([str(random.randint(0, 9)) for _ in range(5)])
        user_code = f"#{code_digits}"

    user_id = db.insert_user(username, user_code, hash_password(dto.password), color, now_str)

    token = create_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "user_code": user_code,
            "avatar_color": color,
            "avatar_url": "",
            "bio": "",
            "custom_status": "",
            "profile_color": "",
            "custom_banner": ""
        }
    }

@app.post("/api/login")
def login(dto: LoginDto):
    username = dto.username.strip()
    pw_hash = hash_password(dto.password)
    user = db.fetchone(
        "SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, password_hash FROM users WHERE LOWER(username) = LOWER(?)",
        (username,)
    )

    if not user or user["password_hash"] != pw_hash:
        raise HTTPException(status_code=400, detail="Неверный ник или пароль")

    update_user_last_seen(user["id"])
    token = create_token(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "user_code": user["user_code"],
            "avatar_color": user["avatar_color"],
            "avatar_url": user["avatar_url"] or "",
            "bio": user["bio"] or "",
            "custom_status": user.get("custom_status", "") or "",
            "profile_color": user.get("profile_color", "") or "",
            "custom_banner": user.get("custom_banner", "") or ""
        }
    }

@app.get("/api/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    user = db.fetchone(
        "SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, last_seen, created_at FROM users WHERE id = ?",
        (user_id,)
    )
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {
        "id": user["id"],
        "username": user["username"],
        "user_code": user["user_code"],
        "avatar_color": user["avatar_color"],
        "avatar_url": user["avatar_url"] or "",
        "bio": user["bio"] or "",
        "custom_status": user.get("custom_status", "") or "",
        "profile_color": user.get("profile_color", "") or "",
        "custom_banner": user.get("custom_banner", "") or "",
        "created_at": str(user.get("created_at", ""))[:10] if user.get("created_at") else ""
    }

@app.post("/api/user/profile")
@app.put("/api/user/profile")
@app.post("/api/profile/update")
@app.put("/api/profile/update")
async def update_profile(dto: UpdateProfileDto, user_id: int = Depends(get_current_user_id)):
    cur = db.fetchone("SELECT id, username, bio, custom_status, profile_color, custom_banner FROM users WHERE id = ?", (user_id,))
    if not cur:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    new_username = (dto.username or cur["username"]).strip()
    new_bio = (dto.bio if dto.bio is not None else (cur["bio"] or "")).strip()
    new_status = (dto.custom_status if dto.custom_status is not None else (cur.get("custom_status", "") or "")).strip()
    new_color = (dto.profile_color if dto.profile_color is not None else (cur.get("profile_color", "") or "")).strip()
    new_banner = (dto.custom_banner if dto.custom_banner is not None else (cur.get("custom_banner", "") or "")).strip()

    if len(new_username) < 2 or len(new_username) > 24:
        raise HTTPException(status_code=400, detail="Ник от 2 до 24 знаков")
    if len(new_bio) > 200:
        raise HTTPException(status_code=400, detail="Описание до 200 символов")
    if len(new_status) > 10:
        raise HTTPException(status_code=400, detail="Статус до 10 знаков")
    if len(new_banner) > 500:
        raise HTTPException(status_code=400, detail="Баннер слишком длинный")

    existing = db.fetchone("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?", (new_username, user_id))
    if existing:
        raise HTTPException(status_code=400, detail="Этот ник уже занят другим чикеном")

    db.execute(
        "UPDATE users SET username = ?, bio = ?, custom_status = ?, profile_color = ?, custom_banner = ? WHERE id = ?",
        (new_username, new_bio, new_status, new_color, new_banner, user_id)
    )
    friends = db.fetchall("SELECT friend_id FROM friends WHERE user_id = ?", (user_id,))

    payload = {
        "type": "profile_updated",
        "user_id": user_id,
        "username": new_username,
        "bio": new_bio,
        "custom_status": new_status,
        "profile_color": new_color,
        "custom_banner": new_banner
    }
    for f in friends:
        await manager.send_to_user(f["friend_id"], payload)
    await manager.send_to_user(user_id, payload)

    return {
        "status": "ok",
        "username": new_username,
        "bio": new_bio,
        "custom_status": new_status,
        "profile_color": new_color,
        "custom_banner": new_banner
    }

@app.get("/api/users/search")
def search_users(query: str = "", user_id: int = Depends(get_current_user_id)):
    q = (query or "").strip()
    if not q:
        return []
    if q.startswith("#"):
        rows = db.fetchall("SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, last_seen FROM users WHERE user_code = ? LIMIT 20", (q,))
    elif q.isdigit():
        rows = db.fetchall("SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, last_seen FROM users WHERE id = ? OR user_code = ? LIMIT 20", (int(q), f"#{q}"))
    else:
        rows = db.fetchall("SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, last_seen FROM users WHERE LOWER(username) LIKE LOWER(?) LIMIT 20", (f"%{q}%",))
    res = []
    for u in rows:
        is_online = manager.is_online(u["id"])
        res.append({
            "id": u["id"],
            "username": u["username"],
            "user_code": u["user_code"],
            "avatar_color": u["avatar_color"],
            "avatar_url": u["avatar_url"] or "",
            "bio": u["bio"] or "",
            "custom_status": u.get("custom_status", "") or "",
            "profile_color": u.get("profile_color", "") or "",
            "custom_banner": u.get("custom_banner", "") or "",
            "is_online": is_online,
            "status_text": format_last_seen(u["last_seen"], is_online)
        })
    return res

@app.get("/api/user/{target_id}")
@app.get("/api/users/{target_id}")
def get_user_profile(target_id: int, user_id: int = Depends(get_current_user_id)):
    user = db.fetchone(
        "SELECT id, username, user_code, avatar_color, avatar_url, bio, custom_status, profile_color, custom_banner, last_seen, created_at FROM users WHERE id = ?",
        (target_id,)
    )
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    is_online = manager.is_online(target_id)
    return {
        "id": user["id"],
        "username": user["username"],
        "user_code": user["user_code"],
        "avatar_color": user["avatar_color"],
        "avatar_url": user["avatar_url"] or "",
        "bio": user["bio"] or "",
        "custom_status": user.get("custom_status", "") or "",
        "profile_color": user.get("profile_color", "") or "",
        "custom_banner": user.get("custom_banner", "") or "",
        "is_online": is_online,
        "status_text": format_last_seen(user["last_seen"], is_online),
        "created_at": str(user["created_at"])[:10] if user["created_at"] else ""
    }

@app.post("/api/user/avatar")
@app.put("/api/user/avatar")
@app.post("/api/profile/avatar")
@app.put("/api/profile/avatar")
async def update_avatar(dto: UpdateAvatarDto, user_id: int = Depends(get_current_user_id)):
    url = (dto.avatar_url or "").strip()
    data_str = (dto.avatar_data or "").strip()

    if data_str:
        if data_str.startswith("data:image/") or data_str.startswith("http://") or data_str.startswith("https://"):
            url = data_str
        else:
            url = f"data:image/jpeg;base64,{data_str}"
    elif url:
        if not (url.startswith("data:image/") or url.startswith("http://") or url.startswith("https://") or url.startswith("/uploads/")):
            url = f"data:image/jpeg;base64,{url}"

    if not url:
        raise HTTPException(status_code=400, detail="Аватар не передан")

    if len(url) > 2_000_000:
        raise HTTPException(status_code=400, detail="Размер картинки слишком большой (до 2 МБ)")

    db.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (url, user_id))
    friends = db.fetchall("SELECT friend_id FROM friends WHERE user_id = ?", (user_id,))

    payload = {
        "type": "avatar_updated",
        "user_id": user_id,
        "avatar_url": url
    }
    for f in friends:
        await manager.send_to_user(f["friend_id"], payload)
    await manager.send_to_user(user_id, payload)

    return {"status": "ok", "avatar_url": url}

@app.post("/api/user/banner")
@app.put("/api/user/banner")
@app.post("/api/profile/banner")
@app.put("/api/profile/banner")
async def update_banner(dto: UpdateBannerDto, user_id: int = Depends(get_current_user_id)):
    url = (dto.banner_url or "").strip()
    data_str = (dto.banner_data or "").strip()

    if data_str:
        if data_str.startswith("data:image/") or data_str.startswith("http://") or data_str.startswith("https://") or data_str.startswith("linear-gradient"):
            url = data_str
        else:
            url = f"data:image/jpeg;base64,{data_str}"
    elif url:
        if not (url.startswith("data:image/") or url.startswith("http://") or url.startswith("https://") or url.startswith("linear-gradient") or url.startswith("/uploads/")):
            url = f"data:image/jpeg;base64,{url}"

    if not url:
        raise HTTPException(status_code=400, detail="Баннер не передан")

    if len(url) > 2_000_000:
        raise HTTPException(status_code=400, detail="Размер ссылки слишком большой")

    db.execute("UPDATE users SET custom_banner = ? WHERE id = ?", (url, user_id))
    cur = db.fetchone("SELECT username, bio, custom_status, profile_color FROM users WHERE id = ?", (user_id,))
    friends = db.fetchall("SELECT friend_id FROM friends WHERE user_id = ?", (user_id,))

    payload = {
        "type": "profile_updated",
        "user_id": user_id,
        "username": cur["username"] if cur else "",
        "bio": cur["bio"] if cur else "",
        "custom_status": cur.get("custom_status", "") if cur else "",
        "profile_color": cur.get("profile_color", "") if cur else "",
        "custom_banner": url
    }
    for f in friends:
        await manager.send_to_user(f["friend_id"], payload)
    await manager.send_to_user(user_id, payload)

    return {"status": "ok", "custom_banner": url}

@app.post("/api/upload")
async def upload_file_endpoint(file: UploadFile = File(...), user_id: int = Depends(get_current_user_id)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не выбран")

    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        if file.content_type and "video" in file.content_type:
            ext = ".webm"
        elif file.content_type and "audio" in file.content_type:
            ext = ".webm"
        else:
            ext = ".bin"

    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_name)

    total_size = 0
    with open(dest_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > 50 * 1024 * 1024:
                buffer.close()
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                raise HTTPException(status_code=400, detail="Размер файла превышает 50 МБ")
            buffer.write(chunk)

    return {
        "url": f"/uploads/{unique_name}",
        "file_name": file.filename,
        "file_size": total_size
    }

@app.get("/api/shared-media")
def get_shared_media(target_id: Optional[int] = None, group_id: Optional[int] = None, user_id: int = Depends(get_current_user_id)):
    if group_id:
        is_member = db.fetchone("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
        if not is_member:
            raise HTTPException(status_code=403, detail="Нет доступа")
        rows = db.fetchall(
            "SELECT id, sender_id, content, msg_type, media_url, file_name, file_size, duration, timestamp FROM messages WHERE group_id = ? ORDER BY id DESC LIMIT 500",
            (group_id,)
        )
    elif target_id:
        rows = db.fetchall(
            "SELECT id, sender_id, content, msg_type, media_url, file_name, file_size, duration, timestamp FROM messages WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND group_id IS NULL ORDER BY id DESC LIMIT 500",
            (user_id, target_id, target_id, user_id)
        )
    else:
        raise HTTPException(status_code=400, detail="Не указан чат")

    photos = []
    videos = []
    files = []
    voices = []
    links = []

    link_regex = re.compile(r'(https?://[^\s<>"\'()]+|www\.[^\s<>"\'()]+)', re.IGNORECASE)

    for r in rows:
        m_type = r["msg_type"] or "text"
        m_url = r["media_url"] or ""
        ts = str(r["timestamp"] or "")
        f_name = r["file_name"] or ""
        f_size = r["file_size"] or 0
        dur = r["duration"] or 0
        s_id = r["sender_id"]
        msg_id = r["id"]

        if m_type == "image" and m_url:
            photos.append({"id": msg_id, "url": m_url, "timestamp": ts, "sender_id": s_id})
        elif (m_type == "video_note" or m_type == "video") and m_url:
            videos.append({"id": msg_id, "url": m_url, "duration": dur, "timestamp": ts, "sender_id": s_id})
        elif m_type == "file" and m_url:
            files.append({"id": msg_id, "url": m_url, "file_name": f_name or "file", "file_size": f_size, "timestamp": ts, "sender_id": s_id})
        elif m_type == "voice" and m_url:
            voices.append({"id": msg_id, "url": m_url, "duration": dur, "timestamp": ts, "sender_id": s_id})

        txt = r["content"] or ""
        if txt and not txt.startswith("e2e:"):
            matches = link_regex.findall(txt)
            for m in matches:
                url_fixed = m if m.startswith("http") else f"https://{m}"
                links.append({"id": msg_id, "url": url_fixed, "timestamp": ts, "sender_id": s_id})

    return {
        "photos": photos,
        "videos": videos,
        "files": files,
        "voices": voices,
        "links": links
    }

@app.get("/api/friends")
def get_friends(user_id: int = Depends(get_current_user_id)):
    rows = db.fetchall("""
        WITH dialog_partners AS (
            SELECT friend_id AS partner_id FROM friends WHERE user_id = ?
            UNION
            SELECT sender_id AS partner_id FROM messages WHERE receiver_id = ? AND group_id IS NULL
            UNION
            SELECT receiver_id AS partner_id FROM messages WHERE sender_id = ? AND receiver_id IS NOT NULL AND group_id IS NULL
        )
        SELECT u.id, u.username, u.user_code, u.avatar_color, u.avatar_url, u.bio, u.custom_status, u.profile_color, u.custom_banner, u.last_seen,
               (SELECT CASE 
                    WHEN msg_type = 'image' THEN (CASE WHEN content != '' THEN '📷 ' || content ELSE '📷 Фото' END)
                    WHEN msg_type = 'voice' THEN '🎙️ Голосовое'
                    WHEN msg_type = 'video_note' THEN '📹 Кружочек'
                    WHEN msg_type = 'file' THEN '📁 ' || COALESCE(file_name, 'Файл')
                    WHEN msg_type = 'sticker' THEN '🐔 Стикер'
                    ELSE content 
                END FROM messages 
                WHERE ((sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id))
                  AND group_id IS NULL
                ORDER BY id DESC LIMIT 1) as last_message,
               (SELECT timestamp FROM messages 
                WHERE ((sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id))
                  AND group_id IS NULL
                ORDER BY id DESC LIMIT 1) as last_time,
               (SELECT COUNT(*) FROM messages 
                WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0 AND group_id IS NULL) as unread_count
        FROM dialog_partners dp
        JOIN users u ON u.id = dp.partner_id
        WHERE dp.partner_id != ?
        ORDER BY last_time DESC NULLS LAST, u.id DESC
    """, (user_id,) * 9)

    result = []
    for r in rows:
        is_online = manager.is_online(r["id"])
        result.append({
            "id": r["id"],
            "username": r["username"],
            "user_code": r["user_code"],
            "avatar_color": r["avatar_color"],
            "avatar_url": r["avatar_url"] or "",
            "bio": r["bio"] or "",
            "custom_status": r.get("custom_status", "") or "",
            "profile_color": r.get("profile_color", "") or "",
            "custom_banner": r.get("custom_banner", "") or "",
            "last_message": r["last_message"] or "",
            "last_time": r["last_time"] or "",
            "unread_count": r["unread_count"] or 0,
            "is_online": is_online,
            "status_text": format_last_seen(r["last_seen"], is_online)
        })
    return result

@app.post("/api/friends/add")
async def add_friend(dto: AddFriendDto, user_id: int = Depends(get_current_user_id)):
    query = dto.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Введите ID, код или ник друга")

    target = None
    if query.startswith("#"):
        target = db.fetchone("SELECT id, username, user_code, avatar_color, avatar_url, bio, last_seen FROM users WHERE user_code = ?", (query,))
    elif query.isdigit():
        target = db.fetchone("SELECT id, username, user_code, avatar_color, avatar_url, bio, last_seen FROM users WHERE id = ? OR user_code = ?", (int(query), f"#{query}"))
    
    if not target:
        target = db.fetchone("SELECT id, username, user_code, avatar_color, avatar_url, bio, last_seen FROM users WHERE LOWER(username) = LOWER(?)", (query,))

    if not target:
        raise HTTPException(status_code=404, detail="Чикен с таким ID/ником не найден")

    target_id = target["id"]
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя добавить самого себя в друзья")

    already = db.fetchone(
        "SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?",
        (user_id, target_id)
    )
    if already:
        raise HTTPException(status_code=400, detail="Этот кент уже у тебя в друзьях")

    db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (user_id, target_id))
    db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (target_id, user_id))

    me = db.fetchone("SELECT id, username, user_code, avatar_color, avatar_url, bio, last_seen FROM users WHERE id = ?", (user_id,))

    target_online = manager.is_online(target_id)
    me_online = manager.is_online(user_id)

    await manager.send_to_user(target_id, {
        "type": "friend_added",
        "friend": {
            "id": me["id"],
            "username": me["username"],
            "user_code": me["user_code"],
            "avatar_color": me["avatar_color"],
            "avatar_url": me["avatar_url"] or "",
            "bio": me["bio"] or "",
            "is_online": me_online,
            "status_text": format_last_seen(me["last_seen"], me_online),
            "unread_count": 0
        }
    })

    return {
        "id": target["id"],
        "username": target["username"],
        "user_code": target["user_code"],
        "avatar_color": target["avatar_color"],
        "avatar_url": target["avatar_url"] or "",
        "bio": target["bio"] or "",
        "is_online": target_online,
        "status_text": format_last_seen(target["last_seen"], target_online),
        "unread_count": 0
    }

def get_message_reactions(message_ids: list) -> dict:
    if not message_ids:
        return {}
    q_marks = ",".join(["?" for _ in message_ids])
    rows = db.fetchall(f"SELECT message_id, user_id, emoji FROM reactions WHERE message_id IN ({q_marks})", tuple(message_ids))
    res = {}
    for r in rows:
        mid = r["message_id"]
        em = r["emoji"]
        if mid not in res:
            res[mid] = {}
        if em not in res[mid]:
            res[mid][em] = {"emoji": em, "count": 0, "users": []}
        res[mid][em]["count"] += 1
        res[mid][em]["users"].append(r["user_id"])
    return {mid: list(em_dict.values()) for mid, em_dict in res.items()}

@app.get("/api/messages/{friend_id}")
def get_chat_history(friend_id: int, user_id: int = Depends(get_current_user_id)):
    rows = db.fetchall("""
        SELECT 
            m.id, m.sender_id, m.receiver_id, m.content, m.timestamp, m.is_read, m.reply_to_id,
            m.msg_type, m.media_url, m.duration, m.file_name, m.file_size, m.is_edited, m.is_pinned,
            rm.content AS reply_content,
            ru.username AS reply_username
        FROM messages m
        LEFT JOIN messages rm ON rm.id = m.reply_to_id
        LEFT JOIN users ru ON ru.id = rm.sender_id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?)
           OR (m.sender_id = ? AND m.receiver_id = ?))
          AND (m.group_id IS NULL OR m.group_id = 0)
        ORDER BY m.id DESC
        LIMIT 250
    """, (user_id, friend_id, friend_id, user_id))

    rows.reverse()

    msg_ids = [r["id"] for r in rows]
    reactions_map = get_message_reactions(msg_ids)

    return [{
        "id": r["id"],
        "sender_id": r["sender_id"],
        "receiver_id": r["receiver_id"],
        "content": r["content"],
        "timestamp": r["timestamp"],
        "is_read": bool(r["is_read"]),
        "msg_type": r["msg_type"] or "text",
        "media_url": r["media_url"] or "",
        "duration": r["duration"] or 0,
        "file_name": r["file_name"] or "",
        "file_size": r["file_size"] or 0,
        "is_edited": bool(r["is_edited"]),
        "is_pinned": bool(r["is_pinned"]),
        "reactions": reactions_map.get(r["id"], []),
        "reply_to": {
            "id": r["reply_to_id"],
            "username": r["reply_username"] or "Сообщение",
            "content": r["reply_content"] or ""
        } if r["reply_to_id"] else None
    } for r in rows]

@app.post("/api/groups/create")
async def create_group(dto: CreateGroupDto, user_id: int = Depends(get_current_user_id)):
    name = dto.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название группы не может быть пустым")

    color = random.choice(COLORS)
    if db.is_pg:
        sql = "INSERT INTO groups (name, avatar_color, avatar_url, owner_id) VALUES (%s, %s, '', %s) RETURNING id"
        cur = db.execute(sql, (name, color, user_id))
        row = cur.fetchone()
        cur.close()
        group_id = row["id"]
    else:
        sql = "INSERT INTO groups (name, avatar_color, avatar_url, owner_id) VALUES (?, ?, '', ?)"
        cur = db.execute(sql, (name, color, user_id))
        group_id = cur.lastrowid

    if db.is_pg:
        db.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'owner') ON CONFLICT DO NOTHING", (group_id, user_id))
    else:
        db.execute("INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')", (group_id, user_id))

    for mid in dto.member_ids:
        if mid and int(mid) != user_id:
            if db.is_pg:
                db.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'member') ON CONFLICT DO NOTHING", (group_id, int(mid)))
            else:
                db.execute("INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')", (group_id, int(mid)))

    actual_count = db.fetchone("SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?", (group_id,))
    count = actual_count["cnt"] if actual_count else (len(dto.member_ids) + 1)

    group_data = {
        "id": group_id,
        "name": name,
        "avatar_color": color,
        "avatar_url": "",
        "owner_id": user_id,
        "members_count": count,
        "is_group": True,
        "last_message": "Группа создана",
        "last_time": datetime.now().strftime("%H:%M"),
        "unread_count": 0
    }

    all_members = db.fetchall("SELECT user_id FROM group_members WHERE group_id = ?", (group_id,))
    for m in all_members:
        await manager.send_to_user(m["user_id"], {
            "type": "group_created",
            "group": group_data
        })

    return group_data

@app.get("/api/groups")
def get_my_groups(user_id: int = Depends(get_current_user_id)):
    rows = db.fetchall("""
        SELECT 
            g.id, g.name, g.avatar_color, g.avatar_url, g.owner_id,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS members_count,
            (SELECT CASE 
                WHEN m.msg_type = 'image' THEN (CASE WHEN m.content != '' THEN '📷 ' || m.content ELSE '📷 Фото' END)
                WHEN m.msg_type = 'voice' THEN '🎙️ Голосовое'
                WHEN m.msg_type = 'video_note' THEN '📹 Кружочек'
                WHEN m.msg_type = 'file' THEN '📁 ' || COALESCE(m.file_name, 'Файл')
                WHEN m.msg_type = 'sticker' THEN '🐔 Стикер'
                ELSE m.content 
            END FROM messages m WHERE m.group_id = g.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT timestamp FROM messages m WHERE m.group_id = g.id ORDER BY m.id DESC LIMIT 1) AS last_time
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = ?
        ORDER BY last_time DESC NULLS LAST
    """, (user_id,))

    return [{
        "id": r["id"],
        "name": r["name"],
        "avatar_color": r["avatar_color"],
        "avatar_url": r["avatar_url"] or "",
        "owner_id": r["owner_id"],
        "members_count": r["members_count"] or 1,
        "is_group": True,
        "last_message": r["last_message"] or "Группа создана",
        "last_time": r["last_time"] or "",
        "unread_count": 0
    } for r in rows]

@app.get("/api/groups/{group_id}/members")
def get_group_members(group_id: int, user_id: int = Depends(get_current_user_id)):
    is_member = db.fetchone("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
    if not is_member:
        raise HTTPException(status_code=403, detail="Вы не состоите в этой группе")
    rows = db.fetchall("""
        SELECT u.id, u.username, u.user_code, u.avatar_color, u.avatar_url, u.bio, u.custom_status, u.profile_color, u.custom_banner, u.last_seen, gm.role
        FROM users u
        JOIN group_members gm ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY CASE WHEN gm.role = 'owner' THEN 0 ELSE 1 END, u.username ASC
    """, (group_id,))
    return [{
        "id": r["id"],
        "username": r["username"],
        "user_code": r["user_code"],
        "avatar_color": r["avatar_color"],
        "avatar_url": r["avatar_url"] or "",
        "bio": r["bio"] or "",
        "custom_status": r.get("custom_status", "") or "",
        "profile_color": r.get("profile_color", "") or "",
        "custom_banner": r.get("custom_banner", "") or "",
        "role": r["role"],
        "is_online": manager.is_online(r["id"]),
        "status_text": format_last_seen(r["last_seen"], manager.is_online(r["id"]))
    } for r in rows]

@app.post("/api/groups/{group_id}/members/add")
async def add_group_members(group_id: int, dto: AddGroupMembersDto, user_id: int = Depends(get_current_user_id)):
    is_member = db.fetchone("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
    if not is_member:
        raise HTTPException(status_code=403, detail="Вы не состоите в этой конфе")

    group = db.fetchone("SELECT id, name, avatar_color, avatar_url, owner_id FROM groups WHERE id = ?", (group_id,))
    if not group:
        raise HTTPException(status_code=404, detail="Конфа не найдена")

    added_uids = []
    for mid in dto.member_ids:
        if mid and int(mid) != user_id:
            if db.is_pg:
                db.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'member') ON CONFLICT DO NOTHING", (group_id, int(mid)))
            else:
                db.execute("INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')", (group_id, int(mid)))
            added_uids.append(int(mid))

    actual_count = db.fetchone("SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?", (group_id,))
    members_count = actual_count["cnt"] if actual_count else 1

    group_data = {
        "id": group["id"],
        "name": group["name"],
        "avatar_color": group["avatar_color"],
        "avatar_url": group["avatar_url"] or "",
        "owner_id": group["owner_id"],
        "members_count": members_count,
        "is_group": True,
        "last_message": "Новые участники добавлены",
        "last_time": datetime.now().strftime("%H:%M"),
        "unread_count": 0
    }

    for uid in added_uids:
        await manager.send_to_user(uid, {
            "type": "group_created",
            "group": group_data
        })

    return {"status": "ok", "members_count": members_count}

@app.get("/api/groups/{group_id}/messages")
def get_group_messages(group_id: int, user_id: int = Depends(get_current_user_id)):
    is_member = db.fetchone("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
    if not is_member:
        raise HTTPException(status_code=403, detail="Вы не состоите в этой группе")

    rows = db.fetchall("""
        SELECT 
            m.id, m.sender_id, m.group_id, m.content, m.timestamp, m.is_read, m.reply_to_id,
            m.msg_type, m.media_url, m.duration, m.file_name, m.file_size, m.is_edited, m.is_pinned,
            u.username AS sender_username, u.avatar_color AS sender_color, u.avatar_url AS sender_avatar,
            u.custom_status AS sender_custom_status, u.profile_color AS sender_profile_color,
            rm.content AS reply_content,
            ru.username AS reply_username
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        LEFT JOIN messages rm ON rm.id = m.reply_to_id
        LEFT JOIN users ru ON ru.id = rm.sender_id
        WHERE m.group_id = ?
        ORDER BY m.id DESC
        LIMIT 250
    """, (group_id,))

    rows.reverse()

    msg_ids = [r["id"] for r in rows]
    reactions_map = get_message_reactions(msg_ids)

    return [{
        "id": r["id"],
        "sender_id": r["sender_id"],
        "sender_username": r["sender_username"],
        "sender_color": r["sender_color"],
        "sender_avatar": r["sender_avatar"] or "",
        "sender_custom_status": r.get("sender_custom_status", "") or "",
        "sender_profile_color": r.get("sender_profile_color", "") or "",
        "group_id": r["group_id"],
        "content": r["content"],
        "timestamp": r["timestamp"],
        "is_read": bool(r["is_read"]),
        "msg_type": r["msg_type"] or "text",
        "media_url": r["media_url"] or "",
        "duration": r["duration"] or 0,
        "file_name": r["file_name"] or "",
        "file_size": r["file_size"] or 0,
        "is_edited": bool(r["is_edited"]),
        "is_pinned": bool(r["is_pinned"]),
        "reactions": reactions_map.get(r["id"], []),
        "reply_to": {
            "id": r["reply_to_id"],
            "username": r["reply_username"] or "Сообщение",
            "content": r["reply_content"] or ""
        } if r["reply_to_id"] else None
    } for r in rows]

@app.post("/api/messages/edit")
@app.put("/api/messages/edit")
async def edit_message_api(dto: EditMessageDto, user_id: int = Depends(get_current_user_id)):
    msg = db.fetchone("SELECT id, sender_id, receiver_id, group_id FROM messages WHERE id = ?", (dto.message_id,))
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    if msg["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="Вы можете редактировать только свои сообщения")
    new_text = dto.content.strip()
    if not new_text:
        raise HTTPException(status_code=400, detail="Текст не может быть пустым")

    db.execute("UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?", (new_text, dto.message_id))
    payload = {
        "type": "message_edited",
        "message_id": dto.message_id,
        "content": new_text,
        "is_edited": True
    }
    if msg["group_id"]:
        await manager.send_to_group(msg["group_id"], payload)
    else:
        await manager.send_to_user(msg["sender_id"], payload)
        if msg["receiver_id"]:
            await manager.send_to_user(msg["receiver_id"], payload)
    return {"status": "ok", "message_id": dto.message_id, "content": new_text}

@app.post("/api/messages/delete")
@app.delete("/api/messages/delete")
async def delete_message_api(dto: DeleteMessageDto, user_id: int = Depends(get_current_user_id)):
    msg = db.fetchone("SELECT id, sender_id, receiver_id, group_id FROM messages WHERE id = ?", (dto.message_id,))
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    if msg["sender_id"] != user_id:
        if msg["group_id"]:
            grp = db.fetchone("SELECT owner_id FROM groups WHERE id = ?", (msg["group_id"],))
            if not grp or grp["owner_id"] != user_id:
                raise HTTPException(status_code=403, detail="Нет прав на удаление")
        elif msg["receiver_id"] == user_id:
            pass
        else:
            raise HTTPException(status_code=403, detail="Вы можете удалять только свои сообщения")

    db.execute("DELETE FROM messages WHERE id = ?", (dto.message_id,))
    db.execute("DELETE FROM reactions WHERE message_id = ?", (dto.message_id,))
    payload = {
        "type": "message_deleted",
        "message_id": dto.message_id
    }
    if msg["group_id"]:
        await manager.send_to_group(msg["group_id"], payload)
    else:
        await manager.send_to_user(msg["sender_id"], payload)
        if msg["receiver_id"]:
            await manager.send_to_user(msg["receiver_id"], payload)
    return {"status": "ok", "message_id": dto.message_id}

@app.post("/api/messages/pin")
async def pin_message_api(dto: PinMessageDto, user_id: int = Depends(get_current_user_id)):
    msg = db.fetchone("SELECT id, sender_id, receiver_id, group_id, content, timestamp FROM messages WHERE id = ?", (dto.message_id,))
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")

    val = 1 if dto.is_pinned else 0
    db.execute("UPDATE messages SET is_pinned = ? WHERE id = ?", (val, dto.message_id))
    payload = {
        "type": "message_pinned",
        "message_id": dto.message_id,
        "is_pinned": bool(val),
        "content": msg["content"],
        "timestamp": msg["timestamp"]
    }
    if msg["group_id"]:
        await manager.send_to_group(msg["group_id"], payload)
    else:
        await manager.send_to_user(msg["sender_id"], payload)
        if msg["receiver_id"]:
            await manager.send_to_user(msg["receiver_id"], payload)
    return {"status": "ok", "message_id": dto.message_id, "is_pinned": bool(val)}

@app.get("/api/messages/pinned/{target_id}")
def get_pinned_message(target_id: int, is_group: int = 0, user_id: int = Depends(get_current_user_id)):
    if is_group:
        row = db.fetchone("SELECT id, content, timestamp, sender_id FROM messages WHERE group_id = ? AND is_pinned = 1 ORDER BY id DESC LIMIT 1", (target_id,))
    else:
        row = db.fetchone("""
            SELECT id, content, timestamp, sender_id 
            FROM messages 
            WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
              AND is_pinned = 1 AND (group_id IS NULL OR group_id = 0)
            ORDER BY id DESC LIMIT 1
        """, (user_id, target_id, target_id, user_id))
    if not row:
        return {"pinned": None}
    sender = db.fetchone("SELECT username FROM users WHERE id = ?", (row["sender_id"],))
    return {
        "pinned": {
            "id": row["id"],
            "content": row["content"],
            "timestamp": row["timestamp"],
            "sender_username": sender["username"] if sender else ""
        }
    }

@app.post("/api/messages/react")
async def toggle_reaction(dto: ReactionDto, user_id: int = Depends(get_current_user_id)):
    msg = db.fetchone("SELECT sender_id, receiver_id, group_id FROM messages WHERE id = ?", (dto.message_id,))
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")

    existing = db.fetchone("SELECT 1 FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?", 
                           (dto.message_id, user_id, dto.emoji))
    if existing:
        db.execute("DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
                   (dto.message_id, user_id, dto.emoji))
    else:
        db.execute("INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
                   (dto.message_id, user_id, dto.emoji))

    reactions_map = get_message_reactions([dto.message_id])
    updated_reactions = reactions_map.get(dto.message_id, [])

    payload = {
        "type": "reaction_updated",
        "message_id": dto.message_id,
        "reactions": updated_reactions
    }

    if msg["group_id"]:
        await manager.send_to_group(msg["group_id"], payload)
    else:
        await manager.send_to_user(msg["sender_id"], payload)
        if msg["receiver_id"]:
            await manager.send_to_user(msg["receiver_id"], payload)
    return {"status": "ok", "reactions": updated_reactions}

@app.post("/api/messages/read")
async def mark_messages_read(dto: ReadMessagesDto, user_id: int = Depends(get_current_user_id)):
    if dto.sender_id:
        db.execute(
            "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
            (dto.sender_id, user_id)
        )
        await manager.send_to_user(dto.sender_id, {
            "type": "messages_read",
            "reader_id": user_id,
            "friend_id": dto.sender_id
        })
    return {"status": "ok"}

@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    return {"public_key": VAPID_PUBLIC_KEY}

@app.post("/api/push/subscribe")
def subscribe_push(dto: PushSubscriptionDto, user_id: int = Depends(get_current_user_id)):
    if not dto.endpoint or not dto.p256dh or not dto.auth:
        raise HTTPException(status_code=400, detail="Неполные данные подписки")
    db.execute(
        "INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)",
        (user_id, dto.endpoint, dto.p256dh, dto.auth)
    )
    return {"status": "ok"}

@app.delete("/api/push/unsubscribe")
def unsubscribe_push(user_id: int = Depends(get_current_user_id)):
    db.execute("DELETE FROM push_subscriptions WHERE user_id = ?", (user_id,))
    return {"status": "ok"}

@app.post("/api/push/test")
def test_push_endpoint(user_id: int = Depends(get_current_user_id)):
    send_web_push_to_user(user_id, "ChickenMax", "Тестовое пуш-уведомление успешно доставлено!", sender_id=user_id)
    return {"status": "ok"}

METERED_APP_NAME = os.environ.get("METERED_APP_NAME", "").strip()
METERED_API_KEY = os.environ.get("METERED_API_KEY", "").strip()
METERED_CACHE = {"ts": 0.0, "servers": []}

@app.get("/api/rtc/ice-servers")
async def get_rtc_ice_servers():
    import time
    now = time.time()
    if METERED_APP_NAME and METERED_API_KEY:
        if METERED_CACHE["servers"] and (now - METERED_CACHE["ts"] < 600):
            return {"iceServers": METERED_CACHE["servers"]}
        try:
            import aiohttp
            url = f"https://{METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey={METERED_API_KEY}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        servers = await resp.json()
                        if isinstance(servers, list) and servers:
                            METERED_CACHE["ts"] = now
                            METERED_CACHE["servers"] = servers
                            return {"iceServers": servers}
        except Exception:
            pass

    default_servers = [
        {"urls": "stun:stun.yandex.ru:3478"},
        {"urls": "stun:stun.yandex.net:3478"},
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun.miwifi.com:3478"},
        {"urls": "stun:staticauth.openrelay.metered.ca:80"},
        {
            "urls": [
                "turn:staticauth.openrelay.metered.ca:80",
                "turn:staticauth.openrelay.metered.ca:443",
                "turn:staticauth.openrelay.metered.ca:443?transport=tcp",
                "turns:staticauth.openrelay.metered.ca:443?transport=tcp"
            ],
            "username": "openrelayproject",
            "credential": "openrelayprojectsecret"
        }
    ]
    return {"iceServers": default_servers}

@app.get("/sw.js")
def service_worker_file():
    sw_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "sw.js")
    return FileResponse(
        sw_path,
        media_type="application/javascript",
        headers={
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )

@app.post("/api/messages/transcribe")
async def transcribe_message(dto: TranscribeDto, user_id: int = Depends(get_current_user_id)):
    msg = db.fetchone("SELECT id, sender_id, receiver_id, group_id, msg_type, media_url, content FROM messages WHERE id = ?", (dto.message_id,))
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    if msg["msg_type"] != "voice" or not msg["media_url"]:
        raise HTTPException(status_code=400, detail="Это сообщение не является голосовым")

    existing_txt = (msg["content"] or "").strip()
    if existing_txt and not existing_txt.startswith("Голосовое"):
        return {"text": existing_txt}

    wav_bytes = None
    if dto.wav_data:
        try:
            b64_str = dto.wav_data.split(",", 1)[-1]
            wav_bytes = base64.b64decode(b64_str)
        except Exception:
            wav_bytes = None

    if not wav_bytes:
        rel_path = msg["media_url"].lstrip("/")
        file_path = os.path.join(UPLOAD_DIR, os.path.basename(rel_path))
        if os.path.exists(file_path):
            if file_path.lower().endswith(".wav"):
                with open(file_path, "rb") as f:
                    wav_bytes = f.read()
            else:
                try:
                    import subprocess, tempfile
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
                        tmp_out_path = tmp_out.name
                    cmd = ["ffmpeg", "-y", "-i", file_path, "-ar", "16000", "-ac", "1", tmp_out_path]
                    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
                    if p.returncode == 0 and os.path.exists(tmp_out_path):
                        with open(tmp_out_path, "rb") as f:
                            wav_bytes = f.read()
                    if os.path.exists(tmp_out_path):
                        os.remove(tmp_out_path)
                except Exception:
                    pass

    if not wav_bytes:
        raise HTTPException(status_code=400, detail="Формат аудио не поддерживается сервисом распознавания")

    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field("model", AI_TRANSCRIBE_MODEL)
            data.add_field("file", wav_bytes, filename="voice.wav", content_type="audio/wav")
            headers = {"Authorization": f"Bearer {AI_API_KEY}"}
            async with session.post(
                "https://ru.cheapvibecode.ru/v1/audio/transcriptions",
                headers=headers,
                data=data,
                timeout=aiohttp.ClientTimeout(total=45)
            ) as resp:
                if resp.status == 200:
                    res_json = await resp.json()
                    transcribed = res_json.get("text", "").strip()
                    if transcribed:
                        db.execute("UPDATE messages SET content = ? WHERE id = ?", (transcribed, dto.message_id))
                        payload = {"type": "voice_transcribed", "message_id": dto.message_id, "content": transcribed}
                        if msg.get("receiver_id"):
                            await manager.send_to_user(msg["receiver_id"], payload)
                            await manager.send_to_user(msg["sender_id"], payload)
                        elif msg.get("group_id"):
                            await manager.send_to_group(msg["group_id"], payload)
                        return {"text": transcribed}
                else:
                    err = await resp.text()
                    print(f"[Transcribe] Error {resp.status}: {err}")
    except Exception as e:
        print(f"[Transcribe] Exception: {e}")

    raise HTTPException(status_code=502, detail="Не удалось распознать голосовое сообщение")

@app.post("/api/messages/send")
async def send_message_api(dto: SendMessageDto, user_id: int = Depends(get_current_user_id)):
    content = dto.content.strip()
    if content.startswith("/img ") or content.startswith("/imagine "):
        img_prompt = re.sub(r'^/(img|imagine)\s*', '', content).strip()
        if img_prompt:
            gen_url = await generate_ai_image(img_prompt)
            if gen_url:
                dto.msg_type = "image"
                dto.media_url = gen_url
                content = img_prompt

    if not content and not dto.media_url:
        raise HTTPException(status_code=400, detail="Пустое сообщение")

    reply_to = None
    if dto.reply_to_id:
        rm = db.fetchone("""
            SELECT m.id, m.content, u.username 
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.id = ?
        """, (dto.reply_to_id,))
        if rm:
            reply_to = {
                "id": rm["id"],
                "username": rm["username"],
                "content": rm["content"]
            }

    sender = db.fetchone("SELECT username, avatar_color, avatar_url FROM users WHERE id = ?", (user_id,))
    client_ts = (dto.timestamp or "").strip()
    if client_ts and re.match(r'^\d{1,2}:\d{2}$', client_ts):
        timestamp = client_ts
    else:
        timestamp = datetime.now().strftime("%H:%M")
    if dto.receiver_id:
        db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (user_id, dto.receiver_id))
        db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (dto.receiver_id, user_id))

    if dto.msg_type == "image" and content:
        c_lower = content.strip().lower()
        if re.search(r'\.(jpe?g|png|webp|gif|bmp|svg)$', c_lower) or re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', c_lower) or c_lower in ["фотография", "gif анимация"]:
            content = ""

    msg_id = db.insert_message(
        user_id, dto.receiver_id, content, timestamp,
        dto.reply_to_id if reply_to else None,
        dto.group_id, dto.msg_type, dto.media_url, dto.duration,
        dto.file_name, dto.file_size
    )

    payload = {
        "type": "message",
        "id": msg_id,
        "sender_id": user_id,
        "sender_username": sender["username"] if sender else "",
        "sender_color": sender["avatar_color"] if sender else "#5865F2",
        "sender_avatar": (sender["avatar_url"] if sender else "") or "",
        "receiver_id": dto.receiver_id,
        "group_id": dto.group_id,
        "content": content,
        "timestamp": timestamp,
        "is_read": False,
        "msg_type": dto.msg_type,
        "media_url": dto.media_url,
        "duration": dto.duration,
        "file_name": dto.file_name,
        "file_size": dto.file_size,
        "is_edited": False,
        "is_pinned": False,
        "reactions": [],
        "reply_to": reply_to,
        "burn_timer": int(getattr(dto, "burn_timer", 0)),
        "temp_id": dto.temp_id
    }

    payload_sender = dict(payload)
    payload_others = dict(payload)
    payload_others["temp_id"] = None

    if dto.group_id:
        await manager.send_to_group(dto.group_id, payload_others, exclude_user_id=user_id)
        await manager.send_to_user(user_id, payload_sender)
    else:
        if dto.receiver_id:
            await manager.send_to_user(dto.receiver_id, payload_others)
        await manager.send_to_user(user_id, payload_sender)

    sender_name = sender["username"] if sender else "Сообщение"
    push_body = content if content else ("📷 Фото" if dto.msg_type == "image" else ("🎙️ Голосовое" if dto.msg_type == "voice" else ("📹 Кружочек" if dto.msg_type == "video_note" else "Файл")))
    if dto.receiver_id:
        send_web_push_to_user(dto.receiver_id, sender_name, push_body, sender_id=user_id)
    elif dto.group_id:
        group_members = db.fetchall(
            "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?",
            (dto.group_id, user_id)
        )
        for gm in group_members:
            send_web_push_to_user(gm["user_id"], sender_name, push_body, sender_id=user_id)
    if dto.receiver_id and dto.receiver_id == AI_BOT_ID:
        asyncio.create_task(process_ai_chat_response(user_id, AI_BOT_ID, content, dto.msg_type))
    elif dto.group_id and re.search(r'(@|/)(ai|bot|аи|бот)\b', content.lower(), re.IGNORECASE):
        clean_prompt = re.sub(r'(@|/)(ai|bot|аи|бот)\b', '', content, flags=re.IGNORECASE).strip()
        asyncio.create_task(process_ai_group_response(dto.group_id, user_id, clean_prompt))
    return payload

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = None
    try:
        parts = token.split(":")
        if len(parts) == 3:
            payload = f"{parts[0]}:{parts[1]}"
            sig = parts[2]
            expected_sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(sig, expected_sig):
                user_id = int(parts[0])
    except Exception:
        pass

    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            if msg_type == "message":
                receiver_id = data.get("receiver_id")
                if receiver_id is not None:
                    try:
                        receiver_id = int(receiver_id)
                    except Exception:
                        receiver_id = None

                group_id = data.get("group_id")
                if group_id is not None:
                    try:
                        group_id = int(group_id)
                    except Exception:
                        group_id = None

                content = str(data.get("content", "")).strip()
                media_url = str(data.get("media_url", ""))
                msg_format = str(data.get("msg_type", "text"))
                duration = int(data.get("duration", 0))
                file_name = str(data.get("file_name", ""))
                file_size = int(data.get("file_size", 0))

                if not content and not media_url:
                    continue

                reply_to_id = data.get("reply_to_id")
                if reply_to_id is not None:
                    try:
                        reply_to_id = int(reply_to_id)
                    except Exception:
                        reply_to_id = None

                reply_to = None
                if reply_to_id:
                    rm = db.fetchone("""
                        SELECT m.id, m.content, u.username 
                        FROM messages m
                        JOIN users u ON u.id = m.sender_id
                        WHERE m.id = ?
                    """, (reply_to_id,))
                    if rm:
                        reply_to = {
                            "id": rm["id"],
                            "username": rm["username"],
                            "content": rm["content"]
                        }

                sender = db.fetchone("SELECT username, avatar_color, avatar_url, custom_status, profile_color FROM users WHERE id = ?", (user_id,))
                if receiver_id:
                    db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (user_id, receiver_id))
                    db.execute("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", (receiver_id, user_id))

                if msg_format == "image" and content:
                    c_lower = content.strip().lower()
                    if re.search(r'\.(jpe?g|png|webp|gif|bmp|svg)$', c_lower) or re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', c_lower) or c_lower in ["фотография", "gif анимация"]:
                        content = ""

                client_ts = str(data.get("timestamp") or "").strip()
                if client_ts and re.match(r'^\d{1,2}:\d{2}$', client_ts):
                    timestamp = client_ts
                else:
                    timestamp = datetime.now().strftime("%H:%M")

                if content.startswith("/img ") or content.startswith("/imagine "):
                    img_prompt = re.sub(r'^/(img|imagine)\s*', '', content).strip()
                    if img_prompt:
                        gen_url = await generate_ai_image(img_prompt)
                        if gen_url:
                            msg_format = "image"
                            media_url = gen_url
                            content = img_prompt

                msg_id = db.insert_message(
                    user_id, receiver_id, content, timestamp,
                    reply_to_id if reply_to else None,
                    group_id, msg_format, media_url, duration,
                    file_name, file_size
                )

                temp_id = data.get("temp_id")

                payload = {
                    "type": "message",
                    "id": msg_id,
                    "sender_id": user_id,
                    "sender_username": sender["username"] if sender else "",
                    "sender_color": sender["avatar_color"] if sender else "#5865F2",
                    "sender_avatar": (sender["avatar_url"] if sender else "") or "",
                    "sender_custom_status": (sender.get("custom_status", "") if sender else "") or "",
                    "sender_profile_color": (sender.get("profile_color", "") if sender else "") or "",
                    "receiver_id": receiver_id,
                    "group_id": group_id,
                    "content": content,
                    "timestamp": timestamp,
                    "is_read": False,
                    "msg_type": msg_format,
                    "media_url": media_url,
                    "duration": duration,
                    "file_name": file_name,
                    "file_size": file_size,
                    "is_edited": False,
                    "is_pinned": False,
                    "reactions": [],
                    "reply_to": reply_to,
                    "burn_timer": int(data.get("burn_timer", 0)),
                    "temp_id": temp_id
                }

                payload_sender = dict(payload)
                payload_others = dict(payload)
                payload_others["temp_id"] = None

                if group_id:
                    await manager.send_to_group(group_id, payload_others, exclude_user_id=user_id)
                    await manager.send_to_user(user_id, payload_sender)
                else:
                    if receiver_id:
                        await manager.send_to_user(receiver_id, payload_others)
                    await manager.send_to_user(user_id, payload_sender)

                sender_name = sender["username"] if sender else "Сообщение"
                push_body = content if content else ("📷 Фото" if msg_format == "image" else ("🎙️ Голосовое" if msg_format == "voice" else ("📹 Кружочек" if msg_format == "video_note" else "Файл")))
                if receiver_id:
                    send_web_push_to_user(receiver_id, sender_name, push_body, sender_id=user_id)
                elif group_id:
                    grp_members = db.fetchall(
                        "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?",
                        (group_id, user_id)
                    )
                    for gm in grp_members:
                        send_web_push_to_user(gm["user_id"], sender_name, push_body, sender_id=user_id)

                if receiver_id and receiver_id == AI_BOT_ID:
                    asyncio.create_task(process_ai_chat_response(user_id, AI_BOT_ID, content, msg_format))
                elif group_id and re.search(r'(@|/)(ai|bot|аи|бот)\b', content.lower(), re.IGNORECASE):
                    clean_prompt = re.sub(r'(@|/)(ai|bot|аи|бот)\b', '', content, flags=re.IGNORECASE).strip()
                    asyncio.create_task(process_ai_group_response(group_id, user_id, clean_prompt))

            elif msg_type == "edit":
                mid = int(data.get("message_id"))
                new_text = str(data.get("content", "")).strip()
                if new_text:
                    msg = db.fetchone("SELECT sender_id, receiver_id, group_id FROM messages WHERE id = ?", (mid,))
                    if msg and msg["sender_id"] == user_id:
                        db.execute("UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?", (new_text, mid))
                        payload = {"type": "message_edited", "message_id": mid, "content": new_text, "is_edited": True}
                        if msg["group_id"]:
                            await manager.send_to_group(msg["group_id"], payload)
                        else:
                            await manager.send_to_user(msg["sender_id"], payload)
                            if msg["receiver_id"]:
                                await manager.send_to_user(msg["receiver_id"], payload)

            elif msg_type == "delete":
                mid = int(data.get("message_id"))
                msg = db.fetchone("SELECT sender_id, receiver_id, group_id FROM messages WHERE id = ?", (mid,))
                if msg:
                    is_allowed = False
                    if msg["sender_id"] == user_id or msg["receiver_id"] == user_id:
                        is_allowed = True
                    elif msg["group_id"]:
                        grp = db.fetchone("SELECT owner_id FROM groups WHERE id = ?", (msg["group_id"],))
                        if grp and grp["owner_id"] == user_id:
                            is_allowed = True
                    if is_allowed:
                        db.execute("DELETE FROM messages WHERE id = ?", (mid,))
                        db.execute("DELETE FROM reactions WHERE message_id = ?", (mid,))
                        payload = {"type": "message_deleted", "message_id": mid}
                        if msg["group_id"]:
                            await manager.send_to_group(msg["group_id"], payload)
                        else:
                            await manager.send_to_user(msg["sender_id"], payload)
                            if msg["receiver_id"]:
                                await manager.send_to_user(msg["receiver_id"], payload)

            elif msg_type == "pin":
                mid = int(data.get("message_id"))
                is_pinned = bool(data.get("is_pinned", True))
                msg = db.fetchone("SELECT id, sender_id, receiver_id, group_id, content, timestamp FROM messages WHERE id = ?", (mid,))
                if msg:
                    db.execute("UPDATE messages SET is_pinned = ? WHERE id = ?", (1 if is_pinned else 0, mid))
                    payload = {
                        "type": "message_pinned",
                        "message_id": mid,
                        "is_pinned": is_pinned,
                        "content": msg["content"],
                        "timestamp": msg["timestamp"]
                    }
                    if msg["group_id"]:
                        await manager.send_to_group(msg["group_id"], payload)
                    else:
                        await manager.send_to_user(msg["sender_id"], payload)
                        if msg["receiver_id"]:
                            await manager.send_to_user(msg["receiver_id"], payload)

            elif msg_type == "react":
                mid = int(data.get("message_id"))
                em = str(data.get("emoji"))
                msg = db.fetchone("SELECT sender_id, receiver_id, group_id FROM messages WHERE id = ?", (mid,))
                if msg:
                    existing = db.fetchone("SELECT 1 FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?", 
                                           (mid, user_id, em))
                    if existing:
                        db.execute("DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?", (mid, user_id, em))
                    else:
                        db.execute("INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)", (mid, user_id, em))
                    
                    reactions_map = get_message_reactions([mid])
                    updated_reactions = reactions_map.get(mid, [])
                    payload = {"type": "reaction_updated", "message_id": mid, "reactions": updated_reactions}
                    if msg["group_id"]:
                        await manager.send_to_group(msg["group_id"], payload)
                    else:
                        await manager.send_to_user(msg["sender_id"], payload)
                        if msg["receiver_id"]:
                            await manager.send_to_user(msg["receiver_id"], payload)

            elif msg_type in ["call_offer", "call_answer", "call_ice", "call_end", "call_reject"]:
                receiver_id = int(data.get("receiver_id"))
                data["sender_id"] = user_id
                await manager.send_to_user(receiver_id, data)
                if msg_type == "call_offer":
                    caller = db.fetchone("SELECT username FROM users WHERE id = ?", (user_id,))
                    caller_name = caller["username"] if caller else "Пользователь"
                    send_web_push_to_user(receiver_id, "Входящий звонок", f"📞 Звонит {caller_name}", sender_id=user_id)

            elif msg_type == "read":
                sender_id = int(data.get("sender_id"))
                db.execute(
                    "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
                    (sender_id, user_id)
                )

                await manager.send_to_user(sender_id, {
                    "type": "messages_read",
                    "reader_id": user_id,
                    "friend_id": sender_id
                })

            elif msg_type == "typing":
                receiver_id = int(data.get("receiver_id"))
                await manager.send_to_user(receiver_id, {
                    "type": "typing",
                    "sender_id": user_id
                })

            elif msg_type == "ping":
                update_user_last_seen(user_id)
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket)
    except Exception:
        await manager.disconnect(user_id, websocket)

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
