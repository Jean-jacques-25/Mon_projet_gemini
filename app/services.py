import os
import json
from google import genai
from google.genai import types

def get_gemini_client():
    """
    Lazy initialization for safety, preventing startup crashes.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        # Instantiate modern google-genai client
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Failed to initialize Google Gen AI Client: {e}")
        return None

def suggest_dynamic_fields(prompt, city_context="Cotonou"):
    client = get_gemini_client()
    if not client:
        # Offline fallback simulation in case of missing keys
        return {
            "title": f"Collecte: {prompt[:30]}...",
            "description": f"Enquête intelligente au Bénin pour récupérer le relevé: {prompt}",
            "zone": {
                "type": "city",
                "name": city_context,
                "lat": 6.3654,
                "lng": 2.4183,
                "radiusKm": 5.0
            },
            "totalRequired": 10,
            "budgetAgentFcfa": 1200,
            "fields": [
                {"id": "f1", "type": "text", "label": "Lieu ou quincaillerie/boutique", "required": True},
                {"id": "f2", "type": "number", "label": "Prix public constaté (FCFA)", "required": True},
                {"id": "f3", "type": "photo", "label": "Photo claire du produit/étalage", "required": True},
                {"id": "f4", "type": "gps", "label": "Ancrage GPS obligatoire", "required": True}
            ]
        }

    try:
        system_instruction = (
            "Tu es l'assistant de DataBroker229, leader de l'intelligence commerciale terrain au Bénin.\n"
            "Analyse le besoin du client et formule une mission de collecte terrain structurée.\n"
            "Tu dois impérativement renvoyer du JSON brut valide respectant la structure :\n"
            "{\n"
            "  \"title\": \"Titre court\",\n"
            "  \"description\": \"Description claire pour guider l'agent\",\n"
            "  \"zone\": {\n"
            "    \"type\": \"city\" ou \"market\" ou \"radius\",\n"
            "    \"name\": \"Nom du marché ou ville du Bénin\",\n"
            "    \"lat\": 6.36,\n"
            "    \"lng\": 2.44,\n"
            "    \"radiusKm\": 5\n"
            "  },\n"
            "  \"totalRequired\": 10,\n"
            "  \"budgetAgentFcfa\": 1200,\n"
            "  \"fields\": [\n"
            "    { \"id\": \"f1\", \"type\": \"text\"|\"number\"|\"select\"|\"boolean\"|\"photo\"|\"gps\", \"label\": \"libellé\", \"required\": true, \"options\": [\"opt1\", \"opt2\"] }\n"
            "  ]\n"
            "}\n"
            "Inclus au moins un champ 'photo' obligatoire et un champ 'gps' obligatoire."
        )

        user_content = f"Formule la mission pour cette demande : '{prompt}' pour la ville de {city_context} Bénin."

        # Execute using gemini-2.5-flash
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.7
            )
        )
        
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"Exception during suggest_dynamic_fields: {e}")
        # Return fallback
        return {
            "title": f"Collecte: {prompt[:30]}",
            "description": f"Enquête de terrain : {prompt}",
            "zone": {"type": "city", "name": city_context, "lat": 6.36, "lng": 2.44, "radiusKm": 5},
            "totalRequired": 12,
            "budgetAgentFcfa": 1000,
            "fields": [
                {"id": "f1", "type": "text", "label": "Commerce inspecté", "required": True},
                {"id": "f2", "type": "number", "label": "Prix (FCFA)", "required": True},
                {"id": "f3", "type": "photo", "label": "Photo", "required": True},
                {"id": "f4", "type": "gps", "label": "GPS", "required": True}
            ]
        }

def chat_helper_reply(user_message, conversation_history=None, active_missions_text=""):
    client = get_gemini_client()
    if not client:
        return f"Désolé, je réponds en mode autonome local. Slogan officiel : 'Des données terrain fiables, partout au Bénin.' Contactez le support WhatsApp au +229 55256871 pour toute aide avancée."

    try:
        system_instruction = (
            "Tu es l'assistant IA officiel de DataBroker229 🇧🇯 (réseau d'intelligence terrain au Bénin).\n"
            "Slogan de l'entreprise: 'Des données terrain fiables, partout au Bénin.'\n"
            "Email d'assistance : jeanjacquesaguin30@gmail.com\n"
            "WhatsApp d'assistance : +229 55256871 (Lien : wa.me/22955256871)\n"
            "Barème de paiement au Bénin :\n"
            "- 1 Point = 10 FCFA. Seuil minimal de retrait : 50 points (500 FCFA) par MoMo, Moov ou Celtiis.\n"
            "Contrôles de sécurité anti-fraude :\n"
            "- Double soumission de photos ou coordonnées GPS identiques est bannie.\n"
            "- La distance géographique d'ancrage doit respecter un écart minimal de 50 mètres.\n\n"
            "Si l'utilisateur pose une question technique critique ou signale un litige, dis textuellement :\n"
            "'Je n'ai pas trouvé de réponse précise à votre problème. Contactez le support DataBroker229 🇧🇯 sur WhatsApp : +229 55256871' avec le lien direct.\n\n"
            f"Missions ouvertes :\n{active_missions_text}"
        )

        history_items = []
        if conversation_history:
            for item in conversation_history:
                role = "user" if item.get("role") == "user" else "model"
                text = item.get("parts", [{}])[0].get("text", "")
                if text:
                    history_items.append(
                        types.Content(role=role, parts=[types.Part.from_text(text=text)])
                    )

        # Append latest user prompt
        history_items.append(
            types.Content(role="user", parts=[types.Part.from_text(text=user_message)])
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=history_items,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7
            )
        )
        return response.text or "Quelque chose s'est mal passé."
    except Exception as e:
        print(f"Exception during chat_helper_reply: {e}")
        return "Je rencontre une micro-coupure réseau. N'hésitez pas à nous joindre directement sur le support WhatsApp : +229 55256871 !"
