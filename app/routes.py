import datetime
import json
from flask import Blueprint, request, jsonify, Response
from app import db
from app.models import User, Mission, Submission, WithdrawalRequest, SupportTicket, FraudLog, PlatformConfig
from app.utils import get_gps_distance, string_hash
from app.services import suggest_dynamic_fields, chat_helper_reply

api = Blueprint("api", __name__, url_prefix="/api")

# Prepopulate database on first API hit if absolutely empty
@api.before_app_request
def prepopulate_db_if_empty():
    # Only seed if users database contains 0 entries
    if not User.query.first():
        try:
            # Seed Platform Parameter settings
            p_config = PlatformConfig(id=1, margin_percent=40.0, min_gps_distance_meters=50, points_to_fcfa_rate=10)
            db.session.add(p_config)

            # Seed pre-set Users
            u1 = User(phone="+22999999999", name="Admin DataBroker229", email="jeanjacquesaguin30@gmail.com", role="admin", level="ÉLITE")
            u2 = User(phone="+22961000001", name="Saliou Koffi", email="salioukoffi@gmail.com", role="agent", points=420, level="BRONZE", score=94)
            u3 = User(phone="+22962000002", name="Bernice Dossou", email="bernice.dossou@gmail.com", role="agent", points=2450, level="GOLD", score=98)
            u4 = User(phone="+22955000001", name="Jean-Jacques Aguin", email="jeanjacquesaguin30@gmail.com", role="client")

            db.session.add_all([u1, u2, u3, u4])

            # Seed standard active missions
            m1 = Mission(
                id="m-1",
                title="Vérification Huile d'Arachide Dantokpa (Cotonou)",
                description="Enquête sur la disponibilité et les prix de vente au détail de l'huile d'arachide de marque 'Auri' et les concurrents au marché Dantokpa.",
                client_phone="+22955000001",
                client_name="Jean-Jacques Aguin",
                status="active",
                points_per_collect=120,
                budget_agent_fcfa=1200,
                total_cost_client_fcfa=2000,
                fields_json=json.dumps([
                    {"id": "f-1", "type": "text", "label": "Nom de la boutique / Marchand", "required": True},
                    {"id": "f-2", "type": "number", "label": "Prix bouteille 1L (FCFA)", "required": True},
                    {"id": "f-3", "type": "select", "label": "Disponibilité d'autres marques d'huile", "required": True, "options": ["Seulement Auri", "Auri + Marques concurrentes", "Pas d'huile Auri"]},
                    {"id": "f-4", "type": "photo", "label": "Photo claire de l'étagère de revente", "required": True},
                    {"id": "f-5", "type": "gps", "label": "Localisation GPS de la collecte", "required": True}
                ]),
                zone_json=json.dumps({
                    "type": "market",
                    "name": "Marché Dantokpa",
                    "lat": 6.3688,
                    "lng": 2.4411,
                    "radiusKm": 1.0
                }),
                total_required=5,
                collected_count=2,
                expires_at=(datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat() + "Z"
            )

            m2 = Mission(
                id="m-2",
                title="Présence Canettes Boissons gazeuses (Porto-Novo)",
                description="Contrôler la présence et le prix public recommandé de canettes de boissons Coca-Cola 33cl et Pepsi 33cl auprès de revendeurs à Porto-Novo.",
                client_phone="+22955000001",
                client_name="Jean-Jacques Aguin",
                status="active",
                points_per_collect=80,
                budget_agent_fcfa=800,
                total_cost_client_fcfa=1334,
                fields_json=json.dumps([
                    {"id": "f-a", "type": "text", "label": "Nom du point de vente", "required": True},
                    {"id": "f-b", "type": "select", "label": "Leader visible en rayon", "required": True, "options": ["Coca-Cola", "Pepsi", "A égalité"]},
                    {"id": "f-c", "type": "number", "label": "Prix constaté Coca-Cola (FCFA)", "required": True},
                    {"id": "f-d", "type": "photo", "label": "Photo des canettes", "required": False},
                    {"id": "f-e", "type": "gps", "label": "Position GPS", "required": True}
                ]),
                zone_json=json.dumps({
                    "type": "city",
                    "name": "Porto-Novo",
                    "lat": 6.4969,
                    "lng": 2.6289,
                    "radiusKm": 5.0
                }),
                total_required=10,
                collected_count=0,
                expires_at=(datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat() + "Z"
            )

            db.session.add_all([m1, m2])

            # Seed historical submissions
            s1 = Submission(
                id="s-1",
                mission_id="m-1",
                mission_title="Vérification Huile d'Arachide Dantokpa (Cotonou)",
                agent_phone="+22962000002",
                agent_name="Bernice Dossou",
                status="approved",
                answers_json=json.dumps({
                    "f-1": "Établissements Gbogan, Allée Centrale Dantokpa",
                    "f-2": "1350",
                    "f-3": "Auri + Marques concurrentes"
                }),
                photo_url="placeholder_arachide_approved",
                gps_location_json=json.dumps({"lat": 6.3685, "lng": 2.4410}),
                fraud_score="faible"
            )

            db.session.add(s1)
            db.session.commit()
            print("Successfully bootstrapped the PostgreSQL/SQLite database with seed records.")
        except Exception as err:
            db.session.rollback()
            print(f"Failed loading seed fixtures: {err}")

# Auth: Inscription
@api.route("/inscription", methods=["POST"])
def inscription():
    data = request.json or {}
    name = data.get("name")
    phone = data.get("phone")
    email = data.get("email", "")
    role = data.get("role", "agent")

    if not phone or not name or not role:
        return jsonify({"error": "Le nom, le téléphone et le rôle sont obligatoires."}), 400

    clean_phone = phone.strip()
    
    # Check duplicate
    user = User.query.filter_by(phone=clean_phone).first()
    if user:
        return jsonify({"error": "Ce numéro de téléphone est déjà enregistré."}), 400

    new_user = User(
        phone=clean_phone,
        name=name.strip(),
        email=email.strip(),
        role="agent" if role == "admin" else role, # Prevent seeding admins publicly
        points=0,
        level="BRONZE",
        score=100
    )
    
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "user": new_user.to_dict()})

# Auth: Connexion
@api.route("/connexion", methods=["POST"])
def connexion():
    data = request.json or {}
    phone = data.get("phone")

    if not phone:
        return jsonify({"error": "Le numéro de téléphone est requis."}), 400

    clean_phone = phone.strip()
    user = User.query.filter_by(phone=clean_phone).first()
    if not user:
        return jsonify({"error": "Ce numéro de téléphone n'existe pas. Veuillez vous inscrire."}), 404

    if user.is_suspended:
        return jsonify({"error": "Ce compte a été suspendu pour activités suspectes réitérées."}), 403

    return jsonify({"success": True, "user": user.to_dict()})

# Auth: Logout
@api.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True})

# Auth: Fetch Profile
@api.route("/profile", methods=["GET"])
def get_profile():
    phone = request.args.get("phone")
    if not phone:
        return jsonify({"error": "Paramètre phone requis."}), 400
    user = User.query.filter_by(phone=phone).first()
    if not user:
        return jsonify({"error": "Introuvable."}), 404
    return jsonify(user.to_dict())

# Missions: GET list / POST create
@api.route("/missions", methods=["GET", "POST"])
def manage_missions():
    if request.method == "GET":
        status_filter = request.args.get("status")
        client_phone_filter = request.args.get("clientPhone")
        city_filter = request.args.get("city")
        proximity_flag = request.args.get("proximityFlag")
        agent_lat_str = request.args.get("lat")
        agent_lng_str = request.args.get("lng")

        query = Mission.query
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        if client_phone_filter:
            query = query.filter_by(client_phone=client_phone_filter)
            
        missions_list = query.all()
        result = []
        
        for m in missions_list:
            m_dict = m.to_dict()
            # If city text filter is supplied
            if city_filter:
                if city_filter.lower() not in m.zone.get("name", "").lower():
                    continue
            result.append(m_dict)

        # GPS Proximity sort
        if proximity_flag == "true" and agent_lat_str and agent_lng_str:
            agent_lat = float(agent_lat_str)
            agent_lng = float(agent_lng_str)
            
            for m_dict in result:
                m_lat = m_dict["zone"].get("lat")
                m_lng = m_dict["zone"].get("lng")
                if m_lat is not None and m_lng is not None:
                    m_dict["distanceKm"] = get_gps_distance(agent_lat, agent_lng, m_lat, m_lng)
                else:
                    m_dict["distanceKm"] = 999.0

            result.sort(key=lambda x: x.get("distanceKm", 999.0))
            
        return jsonify(result)

    else:
        # POST - Create mission manually
        data = request.json or {}
        title = data.get("title")
        description = data.get("description")
        client_phone = data.get("clientPhone")
        client_name = data.get("clientName", "Anonyme")
        zone = data.get("zone", {})
        fields = data.get("fields", [])
        total_required = int(data.get("totalRequired", 10))
        budget_agent_fcfa = int(data.get("budgetAgentFcfa", 1000))

        if not title or not client_phone or not total_required or not budget_agent_fcfa:
            return jsonify({"error": "Des informations de base manquent pour créer la mission."}), 400

        # Retrieve Config settings
        p_config = PlatformConfig.query.first()
        margin_percent = p_config.margin_percent if p_config else 40.0
        points_to_fcfa_rate = p_config.points_to_fcfa_rate if p_config else 10

        margin_frac = 1 - (margin_percent / 100.0)
        calculated_client_cost = round((budget_agent_fcfa * total_required) / margin_frac)
        points_per_collect = round(budget_agent_fcfa / points_to_fcfa_rate)

        mission_id = f"m-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
        new_mission = Mission(
            id=mission_id,
            title=title,
            description=description,
            client_phone=client_phone,
            client_name=client_name,
            status="en_attente_paiement",
            points_per_collect=points_per_collect,
            budget_agent_fcfa=budget_agent_fcfa,
            total_cost_client_fcfa=calculated_client_cost,
            fields=fields,
            zone=zone,
            total_required=total_required,
            collected_count=0,
            expires_at=(datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat() + "Z"
        )

        db.session.add(new_mission)
        db.session.commit()
        return jsonify({"success": True, "mission": new_mission.to_dict()})

# AI: Smart questionnaire fields suggetions
@api.route("/missions/ai-suggest", methods=["POST"])
def ai_suggest_fields():
    data = request.json or {}
    prompt = data.get("prompt")
    client_city = data.get("clientCity", "Cotonou")

    if not prompt:
        return jsonify({"error": "La formulation textuelle est obligatoire."}), 400

    parsed = suggest_dynamic_fields(prompt, city_context=client_city)
    return jsonify(parsed)

# Mission collections submissions
@api.route("/submissions", methods=["POST"])
def submit_releve():
    data = request.json or {}
    mission_id = data.get("missionId")
    agent_phone = data.get("agentPhone")
    answers = data.get("answers", {})
    photo_url = data.get("photoUrl", "")
    gps_location = data.get("gpsLocation", {})

    if not mission_id or not agent_phone or not answers:
        return jsonify({"error": "Informations de collecte incomplètes."}), 400

    agent = User.query.filter_by(phone=agent_phone).first()
    if not agent:
        return jsonify({"error": "Agent introuvable."}), 404

    mission = Mission.query.filter_by(id=mission_id).first()
    if not mission:
        return jsonify({"error": "Mission introuvable."}), 404

    if mission.status != "active":
        return jsonify({"error": "Cette mission n'est plus active."}), 400

    # Retrieve platform configs
    p_config = PlatformConfig.query.first()
    min_gps_dist = p_config.min_gps_distance_meters if p_config else 50

    # Anti-Fraude Engine
    fraud_score = "faible"
    fraud_alerts = []

    # 1. Image Check
    if photo_url:
        photo_hash = string_hash(photo_url)
        all_subs = Submission.query.all()
        for s in all_subs:
            if s.photo_url and string_hash(s.photo_url) == photo_hash:
                fraud_score = "eleve"
                fraud_alerts.append(f"Photo identique suspectée (concordance absolue avec relevé {s.id} par {s.agent_name})")
                break

    # 2. GPS Location radius and proximity checks
    if gps_location:
        current_lat = float(gps_location.get("lat", 0.0))
        current_lng = float(gps_location.get("lng", 0.0))

        m_zone = mission.zone
        if m_zone.get("lat") and m_zone.get("lng") and m_zone.get("radiusKm"):
            dist_to_zone = get_gps_distance(current_lat, current_lng, float(m_zone["lat"]), float(m_zone["lng"]))
            if dist_to_zone > float(m_zone["radiusKm"]):
                fraud_score = "eleve"
                fraud_alerts.append(f"Hors Zone : Collecte à {dist_to_zone:.2f} km du centre d'étude ({m_zone.get('name')}) alors que la portée est limitée à {m_zone.get('radiusKm')} km.")

        # Duplicate GPS checks with existing collections of this mission
        all_subs = Submission.query.filter_by(mission_id=mission_id).all()
        for s in all_subs:
            s_gps = s.gps_location
            if s_gps.get("lat") and s_gps.get("lng"):
                dist_meters = get_gps_distance(current_lat, current_lng, float(s_gps["lat"]), float(s_gps["lng"])) * 1000.0
                if dist_meters < min_gps_dist:
                    if fraud_score != "eleve":
                        fraud_score = "moyen"
                    fraud_alerts.append(f"Localisation suspecte : trop proche d'une collecte existante ({s.id} à {dist_meters:.1f} mètres).")

    submission_id = f"s-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    new_sub = Submission(
        id=submission_id,
        mission_id=mission_id,
        mission_title=mission.title,
        agent_phone=agent_phone,
        agent_name=agent.name,
        status="pending",
        answers=answers,
        photo_url=photo_url,
        gps_location=gps_location,
        fraud_score=fraud_score,
        fraud_alerts=fraud_alerts
    )

    db.session.add(new_sub)

    # Record fraud logs
    for alert in fraud_alerts:
        f_log = FraudLog(
            id=f"fl-{int(datetime.datetime.utcnow().timestamp() * 1000)}-{hash(alert)%1000}",
            submission_id=submission_id,
            agent_phone=agent_phone,
            type="duplicate_photo" if "Photo" in alert else "gps_outside",
            description=alert,
            severity="high" if fraud_score == "eleve" else "medium"
        )
        db.session.add(f_log)

    db.session.commit()
    return jsonify({"success": True, "submission": new_sub.to_dict()})

# Admin: Submission status action validation (approve / reject)
@api.route("/submissions/action", methods=["POST"])
def submission_action():
    data = request.json or {}
    sub_id = data.get("submissionId")
    action = data.get("action") # "approve" | "reject"
    feedback = data.get("feedback", "")

    if not sub_id or not action:
        return jsonify({"error": "submissionId et action sont indispensables."}), 400

    sub = Submission.query.filter_by(id=sub_id).first()
    if not sub:
        return jsonify({"error": "Relevé introuvable."}), 404

    if sub.status != "pending":
        return jsonify({"error": "Cette collecte a déjà été traitée."}), 400

    mission = Mission.query.filter_by(id=sub.mission_id).first()
    agent = User.query.filter_by(phone=sub.agent_phone).first()

    if action == "approve":
        sub.status = "approved"
        sub.feedback = feedback or "Données conformes, merci !"

        if mission:
            mission.collected_count += 1
            if mission.collected_count >= mission.total_required:
                mission.status = "terminee"

        if agent:
            # Payout point calculations + gamification bonuses
            multiplier = 1.0
            if agent.level == "SILVER":
                multiplier = 1.05
            elif agent.level == "GOLD":
                multiplier = 1.10
            elif agent.level == "ÉLITE":
                multiplier = 1.15

            base_pts = mission.points_per_collect if mission else 100
            allocated_pts = round(base_pts * multiplier)
            
            agent.points += allocated_pts
            agent.score = min(100, agent.score + 1)

            # Check level promotion
            if agent.points >= 5000:
                agent.level = "ÉLITE"
            elif agent.points >= 2000:
                agent.level = "GOLD"
            elif agent.points >= 500:
                agent.level = "SILVER"

    else:
        # Reject collect
        sub.status = "rejected"
        sub.feedback = feedback or "Photo floue, données suspectes ou incohérentes."

        if agent:
            # reputation reduction
            agent.score = max(50, agent.score - 5)
            if agent.score < 60:
                agent.is_suspended = True # Auto-suspension

    db.session.commit()
    return jsonify({"success": True, "submission": sub.to_dict()})

# Cashouts / points withdrawals
@api.route("/withdrawals", methods=["POST"])
def request_withdrawal():
    data = request.json or {}
    phone = data.get("phone")
    points = int(data.get("points", 100))
    method = data.get("method", "MTN MoMo")

    if not phone or not points or not method:
        return jsonify({"error": "Champs téléphone, points et réseau obligatoires."}), 400

    agent = User.query.filter_by(phone=phone).first()
    if not agent:
        return jsonify({"error": "Agent introuvable."}), 404

    if points < 50:
        return jsonify({"error": "Le seuil minimal de retrait est de 50 points (500 FCFA)."}), 400

    if agent.points < points:
        return jsonify({"error": f"Solde insuffisant. Vous disposez de {agent.points} pts."}), 400

    p_config = PlatformConfig.query.first()
    rate = p_config.points_to_fcfa_rate if p_config else 10
    amount_fcfa = points * rate

    # Deduct points immediately
    agent.points -= points

    wr_id = f"w-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    new_wr = WithdrawalRequest(
        id=wr_id,
        agent_phone=phone,
        agent_name=agent.name,
        points_quantity=points,
        amount_fcfa=amount_fcfa,
        status="pending",
        payment_method=method
    )

    db.session.add(new_wr)
    db.session.commit()
    return jsonify({"success": True, "balance": agent.points, "withdrawal": new_wr.to_dict()})

# Admin: withdrawal completed approve
@api.route("/withdrawals/approve", methods=["POST"])
def approve_withdrawal():
    data = request.json or {}
    wr_id = data.get("withdrawalId")
    if not wr_id:
        return jsonify({"error": "withdrawalId requis."}), 400

    wr = WithdrawalRequest.query.filter_by(id=wr_id).first()
    if not wr:
        return jsonify({"error": "Demande de retrait introuvable."}), 404

    wr.status = "completed"
    db.session.commit()
    return jsonify({"success": True, "withdrawal": wr.to_dict()})

# Missions: Validate user pay trigger
@api.route("/missions/pay-confirm", methods=["POST"])
def pay_confirm_mission():
    data = request.json or {}
    mission_id = data.get("missionId")
    m = Mission.query.filter_by(id=mission_id).first()
    if not m:
        return jsonify({"error": "Mission introuvable."}), 404

    m.status = "active"
    db.session.commit()
    return jsonify({"success": True, "mission": m.to_dict()})

# Support: Submit tickett
@api.route("/support", methods=["POST"])
def create_support_ticket():
    data = request.json or {}
    phone = data.get("phone")
    name = data.get("name", "Anonyme")
    category = data.get("category")
    description = data.get("description")
    screenshot = data.get("screenshot", "")

    if not phone or not category or not description:
        return jsonify({"error": "Les champs téléphone, catégorie et description sont requis."}), 400

    t_id = f"t-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    new_ticket = SupportTicket(
        id=t_id,
        sender_phone=phone,
        sender_name=name,
        category=category,
        description=description,
        screenshot=screenshot
    )

    db.session.add(new_ticket)
    db.session.commit()
    return jsonify({"success": True, "ticket": new_ticket.to_dict()})

# Intelligence chatbot helper
@api.route("/chatbot", methods=["POST"])
def chatbot_assistance():
    data = request.json or {}
    message = data.get("message")
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Votre message est vide."}), 400

    # Compile dynamic missions summaries
    active_missions = Mission.query.filter_by(status="active").all()
    missions_summary = ""
    for m in active_missions:
        m_zone = m.zone
        missions_summary += f"- {m.title} ({m_zone.get('name', 'Bénin')}): +{m.points_per_collect} points.\n"

    reply = chat_helper_reply(message, conversation_history=history, active_missions_text=missions_summary)
    return jsonify({"reply": reply})

# Admin dashboard statistics
@api.route("/admin/stats", methods=["GET"])
def get_admin_dashboard_stats():
    # Grab all users, missions, submissions, withdrawals
    all_users = User.query.all()
    all_missions = Mission.query.all()
    all_subs = Submission.query.all()
    all_withdrawals = WithdrawalRequest.query.all()
    fraud_logs = FraudLog.query.order_by(FraudLog.created_at.desc()).limit(15).all()

    p_config = PlatformConfig.query.first()
    margin_percent = p_config.margin_percent if p_config else 40.0
    min_gps_dist = p_config.min_gps_distance_meters if p_config else 50

    # Calculate revenues
    revenues = 0
    for m in all_missions:
        if m.status != "en_attente_paiement":
            revenues += (m.total_cost_client_fcfa - (m.budget_agent_fcfa * m.total_required))

    paid_cashouts = sum([w.amount_fcfa for w in all_withdrawals if w.status == "completed"])

    stats = {
        "totalUsers": len(all_users),
        "agentsCount": len([u for u in all_users if u.role == "agent"]),
        "clientsCount": len([u for u in all_users if u.role == "client"]),
        "totalMissions": len(all_missions),
        "activeMissions": len([m for m in all_missions if m.status == "active"]),
        "pendingPaymentMissions": len([m for m in all_missions if m.status == "en_attente_paiement"]),
        "completedMissions": len([m for m in all_missions if m.status == "terminee"]),
        "totalSubmissions": len(all_subs),
        "pendingSubmissions": len([s for s in all_subs if s.status == "pending"]),
        "approvedSubmissions": len([s for s in all_subs if s.status == "approved"]),
        "rejectedSubmissions": len([s for s in all_subs if s.status == "rejected"]),
        "pendingWithdrawals": len([w for w in all_withdrawals if w.status == "pending"]),
        "paidWithdrawalsAmountFcfa": paid_cashouts,
        "platformRevenuesFcfa": revenues,
        "fraudAlertsCount": len(FraudLog.query.all()),
        "marginPercent": margin_percent,
        "minGpsDistanceMeters": min_gps_dist
    }

    return jsonify({
        "stats": stats,
        "fraudLogs": [l.to_dict() for l in fraud_logs],
        "allWithdrawals": [w.to_dict() for w in sorted(all_withdrawals, key=lambda x: x.created_at, reverse=True)],
        "allUsers": [u.to_dict() for u in all_users],
        "allSubmissions": [s.to_dict() for s in sorted(all_subs, key=lambda x: x.created_at, reverse=True)]
    })

# Admin settings update configs
@api.route("/admin/config", methods=["POST"])
def update_admin_parameters():
    data = request.json or {}
    margin_percent = data.get("marginPercent")
    min_gps_dist = data.get("minGpsDistanceMeters")

    p_config = PlatformConfig.query.first()
    if not p_config:
        p_config = PlatformConfig(id=1)
        db.session.add(p_config)

    if margin_percent is not None:
        p_config.margin_percent = float(margin_percent)
    if min_gps_dist is not None:
        p_config.min_gps_distance_meters = int(min_gps_dist)

    db.session.commit()
    return jsonify({"success": True, "config": p_config.to_dict()})

# Notifications (Dummy endpoint returns empty/mock logs matching active flow)
@api.route("/notifications", methods=["GET"])
def get_user_notifications():
    phone = request.args.get("phone")
    if not phone:
        return jsonify([])
    
    # Generate warm, real-time mock notification lists matching DBState flows
    notifs = []
    user = User.query.filter_by(phone=phone).first()
    if user:
        notifs.append({
            "id": "n-welcome",
            "title": "Bienvenue sur DataBroker229 !",
            "message": f"Bonjour {user.name}. Slogan officiel : 'Des données terrain fiables, partout au Bénin.' Notre équipe vous souhaite un bon succès !",
            "isRead": True,
            "createdAt": user.created_at
        })

    # Return list
    return jsonify(notifs)

@api.route("/notifications/read", methods=["POST"])
def notifications_read():
    return jsonify({"success": True})

# Dynamic CSV excel spreadsheets exports
@api.route("/export/csv", methods=["GET"])
def export_mission_releves_csv():
    mission_id = request.args.get("missionId")
    if not mission_id:
        return jsonify({"error": "missionId requis"}), 400

    mission = Mission.query.filter_by(id=mission_id).first()
    if not mission:
        return "Mission introuvable.", 404

    # Approved submissions only
    subs = Submission.query.filter_by(mission_id=mission_id, status="approved").all()

    # Dynamic columns
    base_headers = ["Collect ID", "Agent Phone", "Agent Nom", "Date Soumission", "GPS Latitude", "GPS Longitude"]
    dynamic_headers = [f["label"] for f in mission.fields]
    headers = base_headers + dynamic_headers

    # Compile rows
    rows = []
    for s_obj in subs:
        gps = s_obj.gps_location
        row_cells = [
            s_obj.id,
            s_obj.agent_phone,
            s_obj.agent_name,
            s_obj.created_at,
            str(gps.get("lat", "")),
            str(gps.get("lng", ""))
        ]
        
        # Add dynamic questions cells
        for f in mission.fields:
            ans_val = s_obj.answers.get(f["id"], "")
            escaped_val = str(ans_val).replace('"', '""')
            row_cells.append(f'"{escaped_val}"')
            
        rows.append(",".join(row_cells))

    # Prepend UTF-8 BOM so Excel opens with proper accents
    csv_content = "\uFEFF" + ",".join(headers) + "\n" + "\n".join(rows)

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment;filename=DataBroker229_Mission_{mission_id}.csv",
            "Content-Type": "text/csv; charset=utf-8"
        }
    )
