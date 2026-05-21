# DataBroker229 🇧🇯 | FULL_CODE_REFERENCE.md

Ce document rassemble l'intégralité du code source développé pour la version autonome de production **Python Flask + Vanilla HTML/CSS/JS PWA** de **DataBroker229 🇧🇯**, classé par fichier pour une consultation ou installation hors-ligne assistée directe.

---

## 🐍 1. STRUCTURE BACKEND PYTHON FLASK

### Fichier : `app.py`
```python
from app import create_app

app = create_app()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=True)
```

### Fichier : `config.py`
```python
import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "databroker229-benin-secret-10b981")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        SQLALCHEMY_DATABASE_URI = "sqlite:///databroker229.db"
```

### Fichier : `app/__init__.py`
```python
import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    flask_app = Flask(__name__, 
                      template_folder="../templates", 
                      static_folder="../static",
                      static_url_path="")
    flask_app.config.from_object("config.Config")
    CORS(flask_app)
    db.init_app(flask_app)
    
    from app.routes import api as api_blueprint
    flask_app.register_blueprint(api_blueprint)
    
    @flask_app.route("/manifest.json")
    def serve_manifest():
        return send_from_directory(flask_app.static_folder, "manifest.json")
        
    @flask_app.route("/service-worker.js")
    def serve_sw():
        return send_from_directory(flask_app.static_folder, "service-worker.js")

    @flask_app.route("/")
    @flask_app.route("/index")
    def index():
        from flask import render_template
        return render_template("home.html")

    @flask_app.route("/dashboard")
    def dashboard():
        from flask import render_template
        return render_template("dashboard.html")

    with flask_app.app_context():
        try:
            db.create_all()
            print("PostgreSQL/SQLite tables verified and created successfully.")
        except Exception as e:
            print(f"Failed to bootstrap database models: {e}")
            
    return flask_app
```

---

## 🗄️ 2. STRUCTURE CONFIGURATIONS ET SCRIPTS DEPLOIEMENTS

### Fichier : `requirements.txt`
```text
Flask==3.0.3
Flask-SQLAlchemy==3.1.1
Flask-Cors==4.0.1
psycopg2-binary==2.9.9
google-genai==0.3.0
python-dotenv==1.0.1
gunicorn==22.0.0
```

### Fichier : `Procfile`
```text
web: gunicorn app:app
```

### Fichier : `render.yaml`
```yaml
services:
  - type: web
    name: databroker229-web
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: databroker229-db
          property: connectionString
      - key: GEMINI_API_KEY
        sync: false

databases:
  - name: databroker229-db
    plan: free
```

---

## 📳 3. STRUCTURE D'INTERFACES PWA STATIQUES

### Fichier : `static/manifest.json`
```json
{
  "short_name": "DataBroker229",
  "name": "DataBroker229 Benin PWA",
  "description": "Des données terrain fiables, partout au Bénin.",
  "icons": [
    {
      "src": "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=192&h=192&q=80",
      "type": "image/jpeg",
      "sizes": "192x192"
    },
    {
      "src": "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=512&h=512&q=80",
      "type": "image/jpeg",
      "sizes": "512x512"
    }
  ],
  "start_url": "/",
  "background_color": "#f8fafc",
  "theme_color": "#059669",
  "display": "standalone",
  "orientation": "portrait"
}
```

### Fichier : `static/service-worker.js`
```javascript
const CACHE_NAME = "databroker229-flask-cache-v1";
const ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/static/js/main.js",
  "/static/js/agent.js",
  "/static/js/client.js",
  "/static/js/admin.js",
  "/static/js/chatbot.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
  "https://unpkg.com/lucide@latest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching production assets inside flask SW...");
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        return caches.match("/");
      });
    })
  );
});
```

*Note: Le code JavaScript client modulaire (`static/js/main.js`, `agent.js`, `client.js`, `admin.js`, `chatbot.js`) et HTML/Templates (`base.html`, `home.html`, `dashboard.html`) sont déjà pleinement transcrits et exécutables à l'intérieur de l'archive ZIP.*
