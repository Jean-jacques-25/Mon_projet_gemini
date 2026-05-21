import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initiate SQLAlchemy globally so models can import it
db = SQLAlchemy()

def create_app():
    # Instantiate Flask with static and template configurations
    flask_app = Flask(__name__, 
                      template_folder="../templates", 
                      static_folder="../static",
                      static_url_path="")
    
    # Load settings from config
    flask_app.config.from_object("config.Config")
    
    # Enable CORS
    CORS(flask_app)
    
    # Bind database
    db.init_init_app = db.init_app(flask_app)
    
    # Register API blueprints
    from app.routes import api as api_blueprint
    flask_app.register_blueprint(api_blueprint)
    
    # Dynamic routes for PWA assets serving from static folder
    @flask_app.route("/manifest.json")
    def serve_manifest():
        return send_from_directory(flask_app.static_folder, "manifest.json")
        
    @flask_app.route("/service-worker.js")
    def serve_sw():
        return send_from_directory(flask_app.static_folder, "service-worker.js")

    # Serve the main client layout at standard URL routes
    @flask_app.route("/")
    @flask_app.route("/index")
    def index():
        from flask import render_template
        return render_template("home.html")

    @flask_app.route("/dashboard")
    def dashboard():
        from flask import render_template
        return render_template("dashboard.html")

    # Create tables automatically inside context
    with flask_app.app_context():
        try:
            db.create_all()
            print("PostgreSQL/SQLite tables verified and created successfully.")
        except Exception as e:
            print(f"Failed to bootstrap database models: {e}")
            
    return flask_app
