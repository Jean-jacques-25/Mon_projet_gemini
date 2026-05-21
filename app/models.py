import datetime
import json
from app import db

class User(db.Model):
    __tablename__ = "users"
    
    phone = db.Column(db.String(30), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), default="")
    role = db.Column(db.String(20), default="agent")  # "agent", "client", "admin"
    points = db.Column(db.Integer, default=0)
    level = db.Column(db.String(30), default="BRONZE") # "BRONZE", "SILVER", "GOLD", "ÉLITE"
    score = db.Column(db.Integer, default=100) # reputation score (%)
    is_suspended = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")

    def to_dict(self):
        return {
            "phone": self.phone,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "points": self.points,
            "level": self.level,
            "score": self.score,
            "isSuspended": self.is_suspended,
            "createdAt": self.created_at
        }

class Mission(db.Model):
    __tablename__ = "missions"
    
    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    client_phone = db.Column(db.String(30), nullable=False)
    client_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(40), default="en_attente_paiement") # "en_attente_paiement", "active", "terminee"
    points_per_collect = db.Column(db.Integer, default=100)
    budget_agent_fcfa = db.Column(db.Integer, default=1000)
    total_cost_client_fcfa = db.Column(db.Integer, default=1667)
    fields_json = db.Column(db.Text, default="[]") # JSON list of dynamic questionnaire fields
    zone_json = db.Column(db.Text, default="{}") # JSON details of geographic circle / name
    total_required = db.Column(db.Integer, default=10)
    collected_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    expires_at = db.Column(db.String(40), default="")

    @property
    def fields(self):
        return json.loads(self.fields_json or "[]")

    @fields.setter
    def fields(self, value):
        self.fields_json = json.dumps(value)

    @property
    def zone(self):
        return json.loads(self.zone_json or "{}")

    @zone.setter
    def zone(self, value):
        self.zone_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "clientPhone": self.client_phone,
            "clientName": self.client_name,
            "status": self.status,
            "pointsPerCollect": self.points_per_collect,
            "budgetAgentFcfa": self.budget_agent_fcfa,
            "totalCostClientFcfa": self.total_cost_client_fcfa,
            "fields": self.fields,
            "zone": self.zone,
            "totalRequired": self.total_required,
            "collectedCount": self.collected_count,
            "createdAt": self.created_at,
            "expiresAt": self.expires_at
        }

class Submission(db.Model):
    __tablename__ = "submissions"
    
    id = db.Column(db.String(50), primary_key=True)
    mission_id = db.Column(db.String(50), nullable=False)
    mission_title = db.Column(db.String(250), nullable=False)
    agent_phone = db.Column(db.String(30), nullable=False)
    agent_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(30), default="pending")  # "pending", "approved", "rejected"
    answers_json = db.Column(db.Text, default="{}") # key value dict of answers
    photo_url = db.Column(db.Text, nullable=True) # base64 image or local path
    gps_location_json = db.Column(db.Text, default="{}") # coordinates {lat, lng}
    fraud_score = db.Column(db.String(20), default="faible") # "faible", "moyen", "eleve"
    fraud_alerts_json = db.Column(db.Text, default="[]") # list of fraud warnings
    feedback = db.Column(db.Text, default="")
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")

    @property
    def answers(self):
        return json.loads(self.answers_json or "{}")

    @answers.setter
    def answers(self, value):
        self.answers_json = json.dumps(value)

    @property
    def gps_location(self):
        return json.loads(self.gps_location_json or "{}")

    @gps_location.setter
    def gps_location(self, value):
        self.gps_location_json = json.dumps(value)

    @property
    def fraud_alerts(self):
        return json.loads(self.fraud_alerts_json or "[]")

    @fraud_alerts.setter
    def fraud_alerts(self, value):
        self.fraud_alerts_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "missionId": self.mission_id,
            "missionTitle": self.mission_title,
            "agentPhone": self.agent_phone,
            "agentName": self.agent_name,
            "status": self.status,
            "answers": self.answers,
            "photoUrl": self.photo_url,
            "gpsLocation": self.gps_location,
            "fraudScore": self.fraud_score,
            "fraudAlerts": self.fraud_alerts,
            "feedback": self.feedback,
            "createdAt": self.created_at
        }

class WithdrawalRequest(db.Model):
    __tablename__ = "withdrawals"
    
    id = db.Column(db.String(50), primary_key=True)
    agent_phone = db.Column(db.String(30), nullable=False)
    agent_name = db.Column(db.String(100), nullable=False)
    points_quantity = db.Column(db.Integer, default=100)
    amount_fcfa = db.Column(db.Integer, default=1000)
    status = db.Column(db.String(20), default="pending")  # "pending", "completed"
    payment_method = db.Column(db.String(150), nullable=False) # "MTN MoMo (+229...)"
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")

    def to_dict(self):
        return {
            "id": self.id,
            "agentPhone": self.agent_phone,
            "agentName": self.agent_name,
            "pointsQuantity": self.points_quantity,
            "amountFcfa": self.amount_fcfa,
            "status": self.status,
            "paymentMethod": self.payment_method,
            "createdAt": self.created_at
        }

class SupportTicket(db.Model):
    __tablename__ = "support_tickets"
    
    id = db.Column(db.String(50), primary_key=True)
    sender_phone = db.Column(db.String(30), nullable=False)
    sender_name = db.Column(db.String(100), default="Anonyme")
    category = db.Column(db.String(40), nullable=False)  # "auth", "gps_photo", "payment", "other"
    description = db.Column(db.Text, nullable=False)
    screenshot = db.Column(db.Text, nullable=True) # base64
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")

    def to_dict(self):
        return {
            "id": self.id,
            "senderPhone": self.sender_phone,
            "senderName": self.sender_name,
            "category": self.category,
            "description": self.description,
            "screenshot": self.screenshot,
            "createdAt": self.created_at
        }

class FraudLog(db.Model):
    __tablename__ = "fraud_logs"
    
    id = db.Column(db.String(50), primary_key=True)
    submission_id = db.Column(db.String(50), nullable=False)
    agent_phone = db.Column(db.String(30), nullable=False)
    type = db.Column(db.String(100), nullable=False) # "duplicate_photo", "gps_outside", "gps_duplicate"
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default="medium") # "medium", "high"
    created_at = db.Column(db.String(40), default=lambda: datetime.datetime.utcnow().isoformat() + "Z")

    def to_dict(self):
        return {
            "id": self.id,
            "submissionId": self.submission_id,
            "agentPhone": self.agent_phone,
            "type": self.type,
            "description": self.description,
            "severity": self.severity,
            "createdAt": self.created_at
        }

class PlatformConfig(db.Model):
    __tablename__ = "platform_configs"
    
    id = db.Column(db.Integer, primary_key=True, default=1)
    margin_percent = db.Column(db.Float, default=40.0)
    min_gps_distance_meters = db.Column(db.Integer, default=50)
    points_to_fcfa_rate = db.Column(db.Integer, default=10)

    def to_dict(self):
        return {
            "marginPercent": self.margin_percent,
            "minGpsDistanceMeters": self.min_gps_distance_meters,
            "pointsToFcfaRate": self.points_to_fcfa_rate
        }
