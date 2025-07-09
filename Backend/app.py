from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash, g
import sqlite3
import os
import re
import requests
from datetime import timedelta

app = Flask(__name__)
app.secret_key = 'secret'
app.permanent_session_lifetime = timedelta(days=7) #used to save session for number of days
DB_NAME = 'users.db'

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_NAME, check_same_thread=False)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    with sqlite3.connect(DB_NAME) as db:
        db.execute("PRAGMA foreign_keys = ON")
        with open('schema.sql', 'r') as f:
            db.executescript(f.read())

@app.route('/signup', methods=['POST'])
def signup():
    # Support both form data and JSON
    if request.is_json:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
    else:
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required."}), 400

    db = get_db()
    try:
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        db.commit()
        return jsonify({"success": True, "message": "Signup successful."})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Username already exists."}), 409
######
# response of the api is 
# {                                      |  {
#   "success": true,                     |        "success": false,
#   "message": "Signup successful."      |         "message": "Username already exists." 
# }                                      |  }
# Post payload example {username: "testuser", password: "testpass"} 
######


@app.route('/login', methods=['POST'])
def login():
    # Accept both JSON and form-encoded
    if request.is_json:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
    else:
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required."}), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password)).fetchone()
    
    if user:
        session.permanent = True
        session['user'] = username
        return jsonify({"success": True, "message": "Login successful."})
    else:
        return jsonify({"success": False, "message": "Invalid credentials."}), 401
######
# response of the api is
# {                                      |  {
#   "success": true,                     |        "success": false,
#   "message": "Login successful."       |         "message": "Invalid credentials."
# }                                      |  }
# Post payload example {username: "testuser", password: "testpass"}
# If the user is logged in, it will return success true and message Login successful
######

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"success": True, "message": "Logged out successfully."})
######
# response of the api is 
# {                                        
#   "success": true,                            
#   "message": "Logged out successfully."         
# }                                        
# Post payload no data required
######
@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

##########################################

# Ollama API Endpoints

##########################################

@app.route('/api/get_models')
def get_models():
    try:
        res = requests.get("http://localhost:11434/api/tags")
        models = [m['name'] for m in res.json().get("models", [])]
        return jsonify({"response": [models]})
    except:
        return jsonify({"response": [[]]})
######
# response of the api is 
# {response: [["gemma3:1b", "deepseek-r1:1.5b"]]}
# Get method no data required
######

@app.route('/api/list_chats')
def list_chats():
    if 'user' not in session:
        return jsonify([])

    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (session['user'],)).fetchone()
    if not user:
        return jsonify([])

    user_id = user['id']
    chats = db.execute("SELECT id, title, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    return jsonify({"chats":[dict(row) for row in chats]})
######
# response of the api is 
# chats[{created_at: "2025-07-08 14:59:53", id: 5, title: "Greetings"}]
# 0: {created_at: "2025-07-08 14:59:53", id: 5, title: "Greetings"}
# Get method no data required

### Important Note:
# Store the chat_id that is id from the response as it is used full for the next api calls
######


@app.route('/api/chat_history')
def chat_history():
    if 'user' not in session:
        return jsonify([])

    chat_id = request.args.get("chat_id", type=int)
    if not chat_id:
        return jsonify([])

    db = get_db()
    messages = db.execute("SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", (chat_id,)).fetchall()
    return jsonify([dict(m) for m in messages])
######
# response of the api is 
# [{content: "hello", role: "user"}, {,…}]
# 0: {content: "hello", role: "user"}
# 	content: "hello"
# 	role: "user"
# 1: content: "Hello there! How’s your day going so far? 😊 \n\nIs there anything you’d like to chat about or need help with today?"
# role: "assistant"
# Get and usage fetch(`/api/chat_history?chat_id=${chatId}`);
######

@app.route('/api/create_chat', methods=['POST'])
def create_chat():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    db = get_db()
    user = db.execute("SELECT id FROM users WHERE username = ?", (session['user'],)).fetchone()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    user_id = user['id']
    data = request.get_json(silent=True) or {}
    title = data.get("title", "New Chat")

    db.execute("INSERT INTO chats (user_id, title) VALUES (?, ?)", (user_id, title))
    db.commit()
    chat_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

    return jsonify({"success": True, "chat_id": chat_id, "title": title})
######
# response of the api is 
# {chat_id: 6, success: true, title: "New Chat"}
# 	chat_id: 6
# 	success: true
# 	title: "New Chat"
# Post payload {title: "New Chat"}

### Important Note:
# Store the chat_id from the response as it is used full for the next api calls
######



@app.route('/api/respond', methods=['POST'])
def respond():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    model = data.get('model', '').strip()
    chat_id = data.get('chat_id', None)

    if not prompt or not model or not chat_id:
        return jsonify({"error": "Missing prompt, model, or chat_id"}), 400

    db = get_db()
    # Check if it's the first message in the chat
    msg_count = db.execute("SELECT COUNT(*) FROM messages WHERE chat_id = ?", (chat_id,)).fetchone()[0]
    if msg_count == 0:
        title_response = post_prompt_to_api(f"Give a concise title for this chat in about 2-3 words just give the title none other are required: {prompt}", model)
        short_title = title_response.strip().split("\n")[0][:50]  # trim to one line max 50 chars
        db.execute("UPDATE chats SET title = ? WHERE id = ?", (short_title, chat_id))

    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (chat_id, 'user', prompt))
    db.commit()

    response_text = post_prompt_to_api(prompt, model)
    db.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (chat_id, 'assistant', response_text))
    db.commit()

    return jsonify({"response": response_text})
######
# response of the api is 
# response: "Hello there! How’s your day going? 😊 \n\nIs there anything you’d like to chat about or any help I can offer?"
# Post payload example {prompt: "Hello", model: "llama2", chat_id: 1}
# it automatically appends the message to messages table using the chat_id after each prompt 
######



@app.route('/api/delete_chat', methods=['POST'])
def delete_chat():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    chat_id = request.args.get("chat_id", type=int)
    if not chat_id:
        return jsonify({"success": False, "error": "Missing chat_id"}), 400

    db = get_db()
    db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    db.commit()

    return jsonify({"success": True})
######
# response of the api is 
# success: true
# Post payload example {chat_id: 1}
######




def post_prompt_to_api(prompt, model):
    try:
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": model,
            "prompt": prompt,
            "stream": False
        })
        text = res.json().get("response", "")
        return re.sub(r"<think>.*?</think>\s*", "", text, flags=re.DOTALL)
    except Exception as e:
        return f"Error contacting LLM: {e}"

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
