# DataBroker229 🇧🇯 | PROJECT_MAP.md

Ce document cartographie l'architecture, les pages, les rôles, les routes API et les règles de gestion métier implémentés dans **DataBroker229 🇧🇯** afin de guider le repreneur logiciel ou l'expert d'intégration.

---

## 🗺️ 1. Cartographie des Pages et Rôles Applicatifs

L'application s'organise selon un parcours utilisateur unifié sécurisé structuré en 2 pages physiques distribuées :

### 1. Page de Connexion & Onboarding (`home.html` / `index.html`)
* **Rôle** : Point d'entrée de la PWA. Gère l'identification instantanée par numéro WhatsApp Béninois (+229).
* **Composants d'interface** :
  - **Slogan officiel** : *"Des données terrain fiables, partout au Bénin."*
  - **Onglets d'Onboarding** : Toggles dynamiques switchant entre le formulaire de connexion (numéro de téléphone unique) et le formulaire d'inscription (Saisie du nom + Option de rôles de départ).
  - **Accélérateurs de démonstration** : Panel de touches facilitant l'injection instantanée des comptes d'évaluation pré-configurés (Agent Koffi, Client Sponsor, Super-Administrateur).
  - **Règles d'ergonomie** : Sauvegarde immédiate du jeton de numéro de téléphone dans le `localStorage` local du navigateur pour assurer un reconnexion automatique lors de l'accès hors-ligne (mode PWA autonome).

### 2. Page d'Espaces & Sessions Clients/Agents (`dashboard.html` / React `App.tsx`)
* **Rôle** : Container d'activités unifié. Aligne le profil navbar et charge les visualisateurs métiers conditionnellement selon la catégorie d'utilisateurs actifs.
* **Composants d'interface partagés** :
  - **Logo Platforme** : DB229 (Vibrant palette verte et jaune).
  - **Boutons Sélecteurs rapides de rôles** : Switchent instantanément de vue à chaud pour l'évaluation interactive du projet.
  - **Aide IA** : Ouvre un volet d'assistance chatbot intelligent couplé au proxy d'intelligence artificielle Gemini. Si la discussion converge vers un problème d'accès, propose de basculer sur WhatsApp via un lien universel direct : [wa.me/22955256871](https://wa.me/22955256871).
  - **Cloche de notification** : Fichier déroulant d'arrière-plan listant les alertes émises par l'équipe plateforme ou les sponsors (Synchronisation dynamique de routine toutes les 15 secondes).
  - **Bouton Quitter** : Efface les sessions cookies et redirige vers la page d'accueil.

---

## 👥 2. Espaces Métiers de Travail (Workspaces)

### A. Espace Agent (Collecteur de Terrain)
- **Objectif** : Parcourir l'annuaire géographique des missions d'études ouvertes au Bénin et soumettre les relevés d'enquêtes correspondants.
- **Visualisation Cartographique** :
  - Intégration de la librairie **Leaflet.js** (S'exécute de manière autonome sans clef API payante, s'adaptant parfaitement aux smartphones locaux).
  - Trace un point rouge clignotant représentant le terminal réel détecté de l'enquêteur.
  - Trace des polygones cerclés de couleur verte symbolisant les périmètres territoriaux autorisés où la collecte doit obligatoirement avoir lieu (Dantokpa, Porto-Novo, etc).
- **Formulaire dynamique adaptatif** :
  - Dès qu'un agent clique sur une mission dans le tableau ou sur une épingle de la carte, le module de saisie décode le schéma JSON des questions configurées par le client.
  - Aligne des champs de saisie conformes : Textes (marchands), Nombres (prix relevé), Sélecteurs (leaders).
  - **Ancrage Géographique** : Bouton d'interrogation GPS forçant le navigateur à mémoriser les coordonnées géographiques latitude et longitude du terminal de collecte.
  - **Capture Photo** : Upload d'image obligatoire converti directement en flux d'échange Base64 sécurisé pour stockage direct en base de données relationnelle.
- **Gamification & Réputation** :
  - Les agents accumulent des points de collectes validés.
  - **Échelons de performance** :
    - BRONZE : Moins de 500 points accumulés. Multiplicateur bonus de gains de **0%**.
    - SILVER : Plus de 500 points. Multiplicateur de gains de **+5%**.
    - GOLD : Plus de 2000 points. Multiplicateur de gains de **+10%**.
    - ÉLITE : Plus de 5000 points. Multiplicateur de gains de **+15%**.
  - **Score de réputation** : Débute à 100%. S'incrémente de +1% par soumission acceptée, et se détériore de -5% par soumission rejetée pour fraude. Si l'indice décline sous le seuil de 60%, le compte est automatiquement verrouillé et suspendu.
- **Module de Retrait (Cagnotte MoMo)** :
  - Possibilité de décharger ses points validés contre de la monnaie scripturale réelle.
  - Seuil d'initiation minimal du dossier : **50 Points (Équivalence fixe 500 FCFA)**.
  - Réseaux ouverts : MTN Mobile Money Bénin, Flooz/Moov Money, Celtiis Cash.

### B. Espace Client (Sponsor d'Enquêtes de Marques)
- **Objectif** : Acheter des services de relevés d'étals, d'audits de stocks concurrentiels et de sondages géolocalisés.
- **Module de génération intelligente de questionnaires** :
  - Aligne une barre de prompt d'assistance IA.
  - En tapant un besoin métier libre, le système interroge le modèle d'intelligence artificielle Gemini qui structure l'intégralité du formulaire d'enquête (consignes claires, coordonnées théoriques du marché, barème suggéré de rémunération, types de questions).
- **Calculateur de budget (Markup Simulator)** :
  - Les tarifs appliqués intègrent la marge réglementaire de la plateforme fixée à **40% de commission brute**.
  - Formule d'estimation de devis client :  
    $$\text{Devis Client (FCFA)} = \frac{\text{Budget Agent par collecte} \times \text{Nombre de collectes souhaitées}}{1 - 0.40}$$
- **Déchargement de rapports décisionnels** :
  - Un bouton universel de téléchargement est mis à disposition pour chaque enquête.
  - Génère dynamiquement une feuille de calcul au format tableur standard Excel (CSV encodé en UTF-8 avec bom d'ouverture automatique Excel) associant métadonnées géographiques et réponses textuelles pour l'analytique interne.

### C. Espace Super-Admin (Régulation Platforme)
- **Objectif** : Modérer les transactions financières, auditer la qualité des données de terrain et réguler les systèmes de défense anti-fraude.
- **KPIs globaux d'activité** : Profit net perçu (Markups), total agents enregistrés au Bénin, décompte historisé des tentatives de fraudes géographiques bloquées.
- **Audit de conformité (File de validation terrain)** :
  - Aligne et compare les réponses, la position GPS théorique des marchés face aux coordonnées réelles d'envoi de l'agent enquêteur, et charge l'image d'étalage en situation réelle.
  - Boutons d'Action rapide : Validation conforme (Crédite les points de l'agent, applique son bonus d'échelon, réajuste son score d'indice confiance) ou Rejet non-conforme (Soustrait de l'indice confiance et consigne le motif d'infraction).
- **Trésorerie Payouts MoMo** :
  - Répertoire des dossiers de retrait d'agents en attente.
  - Un clic confirme le virement réel de la trésorerie vers les terminaux et débite le solde interne correspondant de l'agent.
- **Paramètres de Surveillance Globale** :
  - Possibilité de moduler la commission d'usage de la plateforme (%).
  - Possibilité d'ajuster le rayon de proximité d'alerte géographique (50 mètres par défaut).

---

## 🛡️ 3. Algorithmes Avancés de Sécurisation & Anti-Fraude

Pour certifier la fiabilité absolue des informations collectées de terrain (partout au Bénin), trois règles d'analyse de sécurité croisées s'exécutent automatiquement en arrière-plan à chaque soumission d'agent collecteur :

1. **Règle d'image unique (Image Fingerprint Lock)** :
   Le système convertit l'image Base64 d'envoi en une empreinte de hachage déterministe (`utils.string_hash`). Si l'empreinte correspond à une photo pré-enregistrée dans l'historique de la base de données de la plateforme, le relevé est instantanément étiqueté **"Risque Fraude Élevé"**, la soumission est bloquée à l'examen admin et une alerte de tentative de doublon d'images est loggée à son encontre.

2. **Règle de proximité géographique (GPS Haversine Fence)** :
   Le code utilise la formule mathématique d'**Haversine** pour calculer les distances sphériques sur le globe terrestre :
   $$d = 2r \arcsin \left( \sqrt{ \sin^2 \left( \frac{\Delta \text{lat}}{2} \right) + \cos(\text{lat}_1) \cos(\text{lat}_2) \sin^2 \left( \frac{\Delta \text{lon}}{2} \right) } \right)$$
   - **Contrôle de conformité de zone** : Compare la position de l'enquêteur face aux coordonnées centrales théoriques de la mission. Si l'agent se situe au-delà du rayon kilométrique d'étude validé par le client (ex : plus loin de la zone Dantokpa autorisée), le dossier de collecte est fléché en rouge avec un statut d'infraction géographique explicite.
   - **Contrôle anti-triche d'agents immobiles** : Compare la position de l'enquêteur face à ses collectes historiques précédentes enregistrées sur cette même mission. Si deux collectes séparées d'un même enquêteur se situent à un écart horizontal inférieur au paramètre de voisinage configuré (50 mètres par défaut), le système signale une triche suspecte de soumission répétitive depuis un même emplacement immobile.
