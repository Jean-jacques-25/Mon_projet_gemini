# DataBroker229 🇧🇯 | Syste'me d'Intelligence de Donne'es Terrain

> **Slogan Officiel :** "Des données terrain fiables, partout au Bénin."  
> **Contact Assistance :** jeanjacquesaguin35@gmail.com  
> **Support WhatsApp :** +229 55256871  

Bienvenue dans le dépôt exporté officiel de **DataBroker229 🇧🇯**. 

Ce projet s'organise autour d'une architecture bi-stack (au choix) conçue pour s'exécuter aussi bien localement de manière autonome (avec SQLite) qu'en production cloud sécurisée (PostgreSQL sur Render).

---

## 📦 Structure Globale du Projet

L'archive zip contient **DEUX** versions complètes, prêtes à l'emploi :

1. **Version Principale : Python Flask + Vanilla PWA (Recommandée pour Android/Render)**
   - Située à la racine de l'archive.
   - S'exécute de manière légère, rapide et persistante sous l'environnement Python.
   - Intègre les APIs Flask modelées avec Flask-SQLAlchemy et stockées sous SQLite/PostgreSQL.
   - Intègre les interfaces PWA assemblées en HTML5/CSS (Tailwind compilé) et Vanilla JS.

2. **Version Supplémentaire : React + TypeScript + Vite + Express Node.js**
   - Située dans le sous-dossier `./react-typescript-vite/`.
   - Utilise l'architecture de composants typée de React 19 et le compilateur ultra-rapide Vite.

---

## 🚀 1. Déploiement & Lancement Local : Version Flask

### Prerequis
Avoir Python 3.9+ installé sur votre machine Windows/Mac ou Linux.

### Étape 1 : Installation des dépendances
Ouvrez un terminal dans le dossier principal racine et tapez :
```bash
pip install -r requirements.txt
```

### Étape 2 : Configuration du fichier d'environnement `.env`
Créez un fichier nommé `.env` (ou éditez le `.env.example`) dans le dossier racine :
```env
# Clé secrète de cryptage de session Flask
SECRET_KEY="votre_cle_de_securite_exclusive"

# Clé API Google Gemini pour les suggestions de questionnaires terrain et Chatbot IA
GEMINI_API_KEY="AIzaSy..."

# PostgreSQL Link (Laisser vide pour exécuter automatiquement sur SQLite localement)
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Étape 3 : Lancement local
Démarrez le serveur interne Flask en tapant :
```bash
python app.py
```
Le serveur s'initialise par défaut sur http://localhost:3000. 
*(Si ce port est occupé, le système s'adapte sur le port désigné par votre variable système `PORT`).*

---

## 🗄️ 2. Configuration PostgreSQL (Render en Production)

Pour basculer d'une exécution locale de test (SQLite) vers une base de données de production PostgreSQL sur **Render** ou un hébergeur cloud alternatif :

1. Ouvrez votre console Render et créez une instance **Render PostgreSQL** (Formule gratuite validée).
2. Copiez l'**Internal Database URL** ou l'**External Connection String** fournie par Render.
3. Renseignez cette URL de connexion sous la clé correspondante du fichier `.env` ou dans le panel des variables d'environnement globale de Render :
   ```env
   DATABASE_URL="postgres://db_user:db_pass@host-instance/db_name"
   ```
4. Lors de sa première requête d'initialisation, le code de l'App Factory (`app/__init__.py`) vérifie automatiquement la connexion à cette URI PostgreSQL et bootstrap l'intégralité des 6 tables relationnelles requises sans manipulation manuelle !

---

## 🧪 3. Configuration des clefs tierces : APIs & SMTP

### Clés API Google Gemini
Le module IA de DataBroker229 utilise la librairie hautement sécurisée et moderne de Google `@google/genai` (Node) ou `google-genai` (Python).
- Si la variable `GEMINI_API_KEY` est présente dans le fichier d'environnement, les prompts utilisateurs pour générer des questionnaires se connectent en temps réel aux modèles **gemini-2.5-flash** pour structurer les questionnaires géolocalisés.
- Si la clé est manquante ou invalide, un algorithme de fallback dynamique local s'exécute pour pré-remplir les données de démonstration sans saturer l'application.

---

## 📳 4. Installation Mobile PWA (Android / iOS)

DataBroker229 est une **Progressive Web App** à 100% autonome. Elle intègre un fichier `manifest.json` d'accréditation et un script de cache d'arrière-plan `service-worker.js`.

### Comment l'installer sur un téléphone Android (mémoire locale) :
1. Une fois votre application déployée en ligne (sur Render ou via un hébergeur local visible sur votre réseau Wi-Fi), ouvrez le navigateur Google Chrome de votre smartphone Android.
2. Saisissez l'adresse de votre application (ex : `https://databroker229.onrender.com`).
3. Google Chrome détecte automatiquement la signature PWA. Un pop-up s'affiche en bas de l'écran : **"Ajouter DataBroker229 à l'écran d'accueil"**.
4. Cliquez dessus. L'icône de l'application s'ajoute directement sur l'écran d'accueil de votre smartphone à côté de vos applications natives Android !
5. L'application s'ouvre alors en mode plein écran autonome, sans barre d'adresse de navigateur web, fluide et sécurisée !

---

## 🛡️ 5. Résolution des erreurs courantes (Troubleshooting)

### Erreur `ModuleNotFoundError` sous Python
* **Symptôme** : L'invite de commandes indique d'un module manquant à l'import (`flask`, `sqlalchemy`, etc).
* **Correction** : Réexécutez un téléchargement groupé propre : `pip install --force-reinstall -r requirements.txt`.

### Erreur `SSL connection error` avec PostgreSQL Render
* **Symptôme** : SQLAlchemy bloque sur les échanges de certificats sécurité SSL en ligne.
* **Correction** : Ajoutez l'argument de query SSL optionnelle à votre variable `DATABASE_URL` :
  `DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"`

### Erreur `Port 3000 already in use`
* **Symptôme** : Un autre service ou serveur node s'exécute sur le même port de transit local.
* **Correction** : Modifiez temporairement le port système de Flask dans un terminal avant lancement :
  * Windows : `set PORT=3500 && python app.py`
  * Linux/Mac : `PORT=3500 python app.py`
