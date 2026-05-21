import os
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__)

# Récupération sécurisée de la clé
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_gemini():
    data = request.get_json()
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({"error": "Le message est vide"}), 400
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_message
        )
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
