import os

class Config:
    # Secret keys
    SECRET_KEY = os.environ.get("SECRET_KEY", "databroker229-benin-secret-10b981")
    
    # Gemini configurations
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    # Database: Render PostgreSQL in production, default SQLite fallback for dev
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        # Render provides postgres:// urls, which SQLAlchemy needs as postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        # Fallback local SQLite database for development
        SQLALCHEMY_DATABASE_URI = "sqlite:///databroker229.db"
