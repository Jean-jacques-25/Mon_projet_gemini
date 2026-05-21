import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  User,
  UserRole,
  AgentLevel,
  Mission,
  MissionStatus,
  FieldType,
  Submission,
  WithdrawalRequest,
  SupportTicket,
  SystemNotification,
  FraudLog
} from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY is not defined. AI features will fallback to offline mock rules.");
}

// Body parsers with high limit for agent photos
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// DB file path for persistence
const DB_PATH = path.join(process.cwd(), "db.json");

// Helper GPS distance calculator (Haversine formula) in kilometers
function getGpsDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple deterministic hash generator for simulated anti-fraude image check
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Global In-Memory state with disk backup
interface DBState {
  users: Record<string, User>;
  missions: Record<string, Mission>;
  submissions: Record<string, Submission>;
  withdrawals: Record<string, WithdrawalRequest>;
  supportTickets: Record<string, SupportTicket>;
  notifications: Record<string, SystemNotification[]>;
  fraudLogs: FraudLog[];
  platformConfig: {
    marginPercent: number;
    minGpsDistanceMeters: number;
    pointsToFcfaRate: number; // e.g. 1 point = 10 FCFA (so 10)
  };
}

let db: DBState = {
  users: {},
  missions: {},
  submissions: {},
  withdrawals: {},
  supportTickets: {},
  notifications: {},
  fraudLogs: [],
  platformConfig: {
    marginPercent: 40,
    minGpsDistanceMeters: 50,
    pointsToFcfaRate: 10
  }
};

// Direct load/save DB
function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const contents = fs.readFileSync(DB_PATH, "utf-8");
      db = JSON.parse(contents);
      console.log("Persistent Database loaded successfully. Users:", Object.keys(db.users).length);
    } else {
      prepopulateDB();
      saveDatabase();
    }
  } catch (err) {
    console.error("Failed to load local DB. Prepopulating fresh copy.", err);
    prepopulateDB();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist database to disk", err);
  }
}

function prepopulateDB() {
  db = {
    users: {
      "+22999999999": {
        phone: "+22999999999",
        name: "Admin DataBroker229",
        email: "jeanjacquesaguin30@gmail.com",
        role: UserRole.ADMIN,
        points: 0,
        level: AgentLevel.ELITE,
        score: 100,
        isSuspended: false,
        createdAt: "2026-05-10T12:00:00Z"
      },
      "+22961000001": {
        phone: "+22961000001",
        name: "Saliou Koffi",
        email: "salioukoffi@gmail.com",
        role: UserRole.AGENT,
        points: 420,
        level: AgentLevel.BRONZE,
        score: 94,
        isSuspended: false,
        createdAt: "2026-05-11T09:00:00Z"
      },
      "+22962000002": {
        phone: "+22962000002",
        name: "Bernice Dossou",
        email: "bernice.dossou@gmail.com",
        role: UserRole.AGENT,
        points: 2450,
        level: AgentLevel.GOLD,
        score: 98,
        isSuspended: false,
        createdAt: "2026-05-12T08:30:00Z"
      },
      "+22955000001": {
        phone: "+22955000001",
        name: "Jean-Jacques Aguin",
        email: "jeanjacquesaguin30@gmail.com",
        role: UserRole.CLIENT,
        points: 0,
        level: AgentLevel.BRONZE,
        score: 100,
        isSuspended: false,
        createdAt: "2026-05-13T10:00:00Z"
      }
    },
    missions: {
      "m-1": {
        id: "m-1",
        title: "Vérification Huile d'Arachide Dantokpa (Cotonou)",
        description: "Enquête sur la disponibilité et les prix de vente au détail de l'huile d'arachide de marque 'Auri' et les marques concurrentes au marché Dantokpa. Prendre des photos claires et géolocalisées du rayon d'étalage.",
        clientPhone: "+22955000001",
        clientName: "Jean-Jacques Aguin",
        status: MissionStatus.ACTIVE,
        pointsPerCollect: 120, // 1200 FCFA
        budgetAgentFcfa: 1200,
        totalCostClientFcfa: 2000, // Client pays 2000 FCFA (Includes platform markup 40%)
        fields: [
          { id: "f-1", type: FieldType.TEXT, label: "Nom de la boutique / Marchand", required: true },
          { id: "f-2", type: FieldType.NUMBER, label: "Prix bouteille 1L (FCFA)", required: true },
          { id: "f-3", type: FieldType.SELECT, label: "Disponibilité d'autres marques d'huile", required: true, options: ["Seulement Auri", "Auri + Marques concurrentes", "Pas d'huile Auri"] },
          { id: "f-4", type: FieldType.PHOTO, label: "Photo claire de l'étagère de revente", required: true },
          { id: "f-5", type: FieldType.GPS, label: "Localisation GPS de la collecte", required: true }
        ],
        zone: {
          type: "market",
          name: "Marché Dantokpa",
          lat: 6.3688,
          lng: 2.4411,
          radiusKm: 1.0
        },
        totalRequired: 5,
        collectedCount: 2,
        createdAt: "2026-05-15T08:00:00Z",
        expiresAt: "2026-06-15T23:59:59Z"
      },
      "m-2": {
        id: "m-2",
        title: "Présence Canettes Boissons gazeuses (Porto-Novo)",
        description: "Contrôler la présence et le prix public recommandé de canettes de boissons Coca-Cola 33cl et Pepsi 33cl auprès de revendeurs, boutiques de quartier ou supérettes à Porto-Novo.",
        clientPhone: "+22955000001",
        clientName: "Jean-Jacques Aguin",
        status: MissionStatus.ACTIVE,
        pointsPerCollect: 80, // 800 FCFA
        budgetAgentFcfa: 800,
        totalCostClientFcfa: 1334,
        fields: [
          { id: "f-a", type: FieldType.TEXT, label: "Nom du point de vente", required: true },
          { id: "f-b", type: FieldType.SELECT, label: "Leader visible en rayon", required: true, options: ["Coca-Cola", "Pepsi", "A égalité"] },
          { id: "f-c", type: FieldType.NUMBER, label: "Prix constaté Coca-Cola (FCFA)", required: true },
          { id: "f-d", type: FieldType.PHOTO, label: "Photo des bouteilles au frais", required: false },
          { id: "f-e", type: FieldType.GPS, label: "Position GPS", required: true }
        ],
        zone: {
          type: "city",
          name: "Porto-Novo",
          lat: 6.4969,
          lng: 2.6289,
          radiusKm: 5.0
        },
        totalRequired: 10,
        collectedCount: 0,
        createdAt: "2026-05-18T14:00:00Z",
        expiresAt: "2026-06-25T23:59:59Z"
      },
      "m-3": {
        id: "m-3",
        title: "Contrôle Ciment Bouclier Cotonou",
        description: "Vérifier le coût réel et la disponibilité du sac de Ciment NOCIBE ou SCB en comparaison au prix plafonné par l'État béninois.",
        clientPhone: "+22955000001",
        clientName: "Jean-Jacques Aguin",
        status: MissionStatus.EN_ATTENTE_PAIEMENT,
        pointsPerCollect: 150, // 1500 FCFA
        budgetAgentFcfa: 1500,
        totalCostClientFcfa: 2500,
        fields: [
          { id: "f1", type: FieldType.TEXT, label: "Quincaillerie", required: true },
          { id: "f2", type: FieldType.NUMBER, label: "Prix constaté du sac de 50kg (FCFA)", required: true },
          { id: "f3", type: FieldType.BOOLEAN, label: "Facture fournie sur demande ?", required: true },
          { id: "f4", type: FieldType.PHOTO, label: "Photo extérieure de la quincaillerie", required: true },
          { id: "f5", type: FieldType.GPS, label: "Localisation GPS", required: true }
        ],
        zone: {
          type: "city",
          name: "Cotonou",
          lat: 6.3654,
          lng: 2.4183,
          radiusKm: 8.0
        },
        totalRequired: 8,
        collectedCount: 0,
        createdAt: "2026-05-19T10:00:00Z",
        expiresAt: "2026-06-10T23:59:59Z"
      }
    },
    submissions: {
      "s-1": {
        id: "s-1",
        missionId: "m-1",
        missionTitle: "Vérification Huile d'Arachide Dantokpa (Cotonou)",
        agentPhone: "+22962000002",
        agentName: "Bernice Dossou",
        status: "approved",
        answers: {
          "f-1": "Établissements Gbogan, Allée Centrale Dantokpa",
          "f-2": "1350",
          "f-3": "Auri + Marques concurrentes"
        },
        photoUrl: "placeholder_arachide_approved",
        gpsLocation: { lat: 6.3685, lng: 2.4410 },
        fraudScore: "faible",
        fraudAlerts: [],
        createdAt: "2026-05-16T10:15:00Z"
      },
      "s-2": {
        id: "s-2",
        missionId: "m-1",
        missionTitle: "Vérification Huile d'Arachide Dantokpa (Cotonou)",
        agentPhone: "+22961000001",
        agentName: "Saliou Koffi",
        status: "approved",
        answers: {
          "f-1": "Boutique Chez Maman Chérie, Zone Ouest Dantokpa",
          "f-2": "1400",
          "f-3": "Seulement Auri"
        },
        photoUrl: "placeholder_arachide_approved_2",
        gpsLocation: { lat: 6.3690, lng: 2.4415 },
        fraudScore: "faible",
        fraudAlerts: [],
        createdAt: "2026-05-17T11:45:00Z"
      },
      "s-3": {
        id: "s-3",
        missionId: "m-1",
        missionTitle: "Vérification Huile d'Arachide Dantokpa (Cotonou)",
        agentPhone: "+22961000001",
        agentName: "Saliou Koffi",
        status: "pending",
        answers: {
          "f-1": "Kiosque d'en face, Boutique Gbogan",
          "f-2": "1340",
          "f-3": "Pas d'huile Auri"
        },
        photoUrl: "placeholder_arachide_approved", // Simulating duplicate photo
        gpsLocation: { lat: 6.3685, lng: 2.4410 }, // Simulating duplicate GPS
        fraudScore: "eleve",
        fraudAlerts: ["Photo identique à la collecte s-1 (Bernice Dossou)", "Position GPS identique à la collecte s-1 à moins de 5 mètres"],
        createdAt: "2026-05-19T17:00:00Z"
      }
    },
    withdrawals: {
      "w-1": {
        id: "w-1",
        agentPhone: "+22962000002",
        agentName: "Bernice Dossou",
        pointsQuantity: 1500,
        amountFcfa: 15000,
        status: "pending",
        paymentMethod: "MTN MoMo (+22955256871)",
        createdAt: "2026-05-18T19:00:00Z"
      }
    },
    supportTickets: {
      "t-1": {
        id: "t-1",
        senderPhone: "+22961000001",
        senderName: "Saliou Koffi",
        category: "gps_photo",
        description: "Mon GPS ne semble pas se mettre à jour sur la carte quand je suis à l'intérieur du grand hangar de Dantokpa.",
        createdAt: "2026-05-18T15:20:00Z"
      }
    },
    notifications: {
      "+22961000001": [
        {
          id: "n-1",
          recipientPhone: "+22961000001",
          title: "Nouvelle Mission Disponible",
          message: "La mission 'Présence Canettes Boissons gazeuses (Porto-Novo)' est désormais ouverte !",
          isRead: false,
          createdAt: "2026-05-18T14:02:00Z"
        }
      ],
      "+22962000002": [
        {
          id: "n-2",
          recipientPhone: "+22962000002",
          title: "Collecte Validée 🇨🇳",
          message: "Félicitations Bernice, votre collecte s-1 a été validée d'un score parfait de 95% +120 points !",
          isRead: false,
          createdAt: "2026-05-17T09:00:00Z"
        }
      ]
    },
    fraudLogs: [
      {
        id: "fl-1",
        submissionId: "s-3",
        agentPhone: "+22961000001",
        type: "duplicate_photo",
        description: "La base64/photo fournie correspond exactement à la signature de s-1.",
        severity: "high",
        createdAt: "2026-05-19T17:00:05Z"
      },
      {
        id: "fl-2",
        submissionId: "s-3",
        agentPhone: "+22961000001",
        type: "gps_duplicate",
        description: "Le point de géolocalisation correspond exactement au point s-1.",
        severity: "medium",
        createdAt: "2026-05-19T17:00:07Z"
      }
    ],
    platformConfig: {
      marginPercent: 40,
      minGpsDistanceMeters: 50,
      pointsToFcfaRate: 10
    }
  };
}

// Start database
loadDatabase();

// ================= API ENDPOINTS =================

// Auth 1: Inscription
app.post("/api/inscription", (req, res) => {
  const { name, phone, email, role } = req.body;
  
  if (!phone || !name || !role) {
    return res.status(400).json({ error: "Le nom, le téléphone et le rôle sont obligatoires." });
  }

  // Format phone slightly
  const cleanPhone = phone.trim();

  if (db.users[cleanPhone]) {
    return res.status(400).json({ error: "Ce numéro de téléphone est déjà enregistré." });
  }

  const newUser: User = {
    phone: cleanPhone,
    name: name.trim(),
    email: email ? email.trim() : "",
    role: role === UserRole.ADMIN ? UserRole.AGENT : role, // Admin cannot be created publicly
    points: 0,
    level: AgentLevel.BRONZE,
    score: 100,
    isSuspended: false,
    createdAt: new Date().toISOString()
  };

  db.users[cleanPhone] = newUser;
  
  // Send welcome notification
  if (!db.notifications[cleanPhone]) {
    db.notifications[cleanPhone] = [];
  }
  db.notifications[cleanPhone].push({
    id: `n-${Date.now()}`,
    recipientPhone: cleanPhone,
    title: "Bienvenue sur DataBroker229 !",
    message: `Bonjour ${newUser.name}. Slogan officiel : "Des données terrain fiables, partout au Bénin." Notre équipe vous souhaite un bon succès !`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, user: newUser });
});

// Auth 2: Connexion
app.post("/api/connexion", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Le numéro de téléphone est requis." });
  }

  const cleanPhone = phone.trim();
  const user = db.users[cleanPhone];

  if (!user) {
    return res.status(404).json({ error: "Ce numéro de téléphone n'existe pas. Veuillez vous inscrire." });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: "Ce compte a été suspendu pour activités suspectes réitérées." });
  }

  return res.json({ success: true, user });
});

// Auth 3: Logout
app.post("/api/logout", (req, res) => {
  return res.json({ success: true });
});

// Get User Profile details
app.get("/api/profile", (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Paramètre phone requis." });
  }
  const user = db.users[phone as string];
  if (!user) {
    return res.status(404).json({ error: "Introuvable." });
  }
  return res.json(user);
});

// GET: Filter and find missions
app.get("/api/missions", (req, res) => {
  const { status, clientPhone, city, zoneType, lat, lng, proximityFlag } = req.query;
  let list = Object.values(db.missions);

  // Default filters
  if (status) {
    list = list.filter(m => m.status === status);
  } else {
    // Agents don't see suspendue or en attente de paiement unless they created it
    // By default, show active ones
  }

  if (clientPhone) {
    list = list.filter(m => m.clientPhone === clientPhone);
  }

  if (city) {
    const term = (city as string).toLowerCase();
    list = list.filter(m => m.zone.name.toLowerCase().includes(term));
  }

  if (zoneType) {
    list = list.filter(m => m.zone.type === zoneType);
  }

  // GPS Proximity filter: sorting by distance if agent GPS coordinates are supplied
  if (proximityFlag === "true" && lat && lng) {
    const agentLat = parseFloat(lat as string);
    const agentLng = parseFloat(lng as string);

    // Add virtual distance in km to help UI and filter
    list = list.map(m => {
      let distanceKm = 999;
      if (m.zone.lat && m.zone.lng) {
        distanceKm = getGpsDistance(agentLat, agentLng, m.zone.lat, m.zone.lng);
      }
      return { ...m, distanceKm };
    });

    // Sort closest first
    list.sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  return res.json(list);
});

// POST: Create mission manually
app.post("/api/missions", (req, res) => {
  const {
    title,
    description,
    clientPhone,
    clientName,
    zone,
    fields,
    totalRequired,
    budgetAgentFcfa
  } = req.body;

  if (!title || !clientPhone || !totalRequired || !budgetAgentFcfa) {
    return res.status(400).json({ error: "Des informations de base sont manquantes pour créer la mission." });
  }

  // Enforce margin calculations : target margins minimum 40%
  // Margin formula: Total Price client = Agents budget / (1 - platform margin_percent / 100)
  // Let's configure properly: Price Client = Agent Budget + Margin (e.g. 40% margin of client pricing, meaning Budget / 0.6)
  const marginFrac = 1 - (db.platformConfig.marginPercent / 100);
  const calculatedClientCost = Math.round((budgetAgentFcfa * totalRequired) / marginFrac);

  // Map to points
  // 100 points = 1000 FCFA => 1 point = 10 FCFA
  const pointsPerCollect = Math.round(budgetAgentFcfa / db.platformConfig.pointsToFcfaRate);

  const missionId = `m-${Date.now()}`;
  const newMission: Mission = {
    id: missionId,
    title,
    description,
    clientPhone,
    clientName,
    status: MissionStatus.EN_ATTENTE_PAIEMENT, // Flow starts here
    pointsPerCollect,
    budgetAgentFcfa,
    totalCostClientFcfa: calculatedClientCost,
    fields: fields || [{ id: "f-gps", type: FieldType.GPS, label: "Position GPS", required: true }],
    zone: zone || { type: "any", name: "Bénin National" },
    totalRequired,
    collectedCount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days default
  };

  db.missions[missionId] = newMission;

  // Notify Admin
  if (!db.notifications["+22999999999"]) db.notifications["+22999999999"] = [];
  db.notifications["+22999999999"].push({
    id: `n-${Date.now()}`,
    recipientPhone: "+22999999999",
    title: "Nouvelle mission soumise",
    message: `Le client ${clientName} a soumis la mission '${title}'. En attente de validation de paiement (${calculatedClientCost} FCFA).`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, mission: newMission });
});

// API: IA smart mission creator (Gemini flash based dynamic UI suggest)
app.post("/api/missions/ai-suggest", async (req, res) => {
  const { prompt, clientCity } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "La description textuelle de votre besoin est indispensable." });
  }

  if (!ai) {
    // Offline fallback if model key lacks
    return res.json({
      title: `Collecte: ${prompt.slice(0, 30)}...`,
      description: `Collecte terrain intelligente au Bénin pour recueillir: ${prompt}`,
      zone: { type: "city", name: clientCity || "Cotonou", lat: 6.3654, lng: 2.4183, radiusKm: 5 },
      totalRequired: 10,
      budgetAgentFcfa: 1500,
      totalCostClientFcfa: 25000,
      pointsPerCollect: 150,
      fields: [
        { id: "f1", type: FieldType.TEXT, label: "Lieu exact ou nom du commerce", required: true },
        { id: "f2", type: FieldType.NUMBER, label: "Prix indicatif relevé (FCFA)", required: true },
        { id: "f3", type: FieldType.SELECT, label: "Le produit est-il visible au public ?", required: true, options: ["Oui", "Non", "En réserve seulement"] },
        { id: "f4", type: FieldType.PHOTO, label: "Photo d'étalage en situation réelle", required: true },
        { id: "f5", type: FieldType.GPS, label: "Validation GPS requise", required: true }
      ]
    });
  }

  try {
    const aiPrompt = `Tu es un assistant expert pour DataBroker229, le leader de l'intelligence commerciale terrain au Bénin.
Le client formule sa demande de collecte d'informations libres en français: "${prompt}".
Génère une proposition de mission structurée répondant rigoureusement à cette demande.
Tu dois renvoyer obligatoirement un objet JSON valide reprenant exactement ces clés :
 {
  "title": "Titre professionnel court et frappant",
  "description": "Une explication détaillée et claire pour motiver les agents collecteurs qui se rendront sur place",
  "zone": {
    "type": "city" | "market" | "radius",
    "name": "Nom de la ville ou du marché ciblé du Bénin (ex: Dantokpa, Cotonou, Porto-Novo, Parakou)",
    "lat": 6.36, // Coordonnées géographiques approximatives béninoises appropriées
    "lng": 2.44,
    "radiusKm": 5 // distance km suggérée
  },
  "totalRequired": 10, // Nombre recommandé de collectes à faire (entre 5 et 30)
  "budgetAgentFcfa": 1200, // Budget recommandé payé à l'agent par collecte (entre 500 et 4000 FCFA selon la complexité)
  "fields": [
     // Maximum 5 champs appropriés pertinents.
     // Chaque champ a: id ("f1", "f2", etc.), type ("text", "number", "boolean", "select", "photo", "gps"), label ("libellé clair en français"), required (true/false), options (si type "select", ex: ["Choix A", "Choix B"])
  ]
 }
Assure-toi que la liste des champs formés possède toujours au moins un champ de type "photo" obligatoire et un de type "gps" obligatoire pour contrer la fraude.
Reste dans la thématique du Bénin et des données de terrain.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const bodyText = response.text || "{}";
    const data = JSON.parse(bodyText.trim());

    // Compute costs on server safely
    const totalRequired = data.totalRequired || 10;
    const budgetAgent = data.budgetAgentFcfa || 1000;
    const marginFrac = 1 - (db.platformConfig.marginPercent / 100);
    data.totalCostClientFcfa = Math.round((budgetAgent * totalRequired) / marginFrac);
    data.pointsPerCollect = Math.round(budgetAgent / db.platformConfig.pointsToFcfaRate);

    return res.json(data);
  } catch (err: any) {
    console.error("AI Generation error:", err);
    return res.status(500).json({ error: "L'IA n'a pas pu structurer la mission. Formulaire classique proposé en secours." });
  }
});

// POST: Agent Collection submission (Multi-submissions are enabled)
app.post("/api/submissions", (req, res) => {
  const { missionId, agentPhone, answers, photoUrl, gpsLocation } = req.body;

  if (!missionId || !agentPhone || !answers) {
    return res.status(400).json({ error: "Informations de collecte incomplètes." });
  }

  const agent = db.users[agentPhone];
  if (!agent) {
    return res.status(404).json({ error: "Agent introuvable." });
  }

  const mission = db.missions[missionId];
  if (!mission) {
    return res.status(404).json({ error: "Mission introuvable." });
  }

  if (mission.status !== MissionStatus.ACTIVE) {
    return res.status(400).json({ error: "Cette mission n'est plus active." });
  }

  // --- ANTI-FRAUDE ENGINE ---
  let fraudScore: "faible" | "moyen" | "eleve" = "faible";
  const fraudAlerts: string[] = [];

  // 1. Photo Check: Duplicate detection via base64 or photo similarity simulation
  if (photoUrl) {
    const photoHash = stringHash(photoUrl);
    // Find if another submission has exactly same image footprint
    const allSubs = Object.values(db.submissions);
    const duplicatePhoto = allSubs.find(s => s.photoUrl && stringHash(s.photoUrl) === photoHash);
    
    if (duplicatePhoto) {
      fraudScore = "eleve";
      fraudAlerts.push(`Photo identique suspectée (concordance avec collecte ${duplicatePhoto.id} par ${duplicatePhoto.agentName})`);
    }
  }

  // 2. GPS Location validation check
  if (gpsLocation) {
    const currentLat = parseFloat(gpsLocation.lat);
    const currentLng = parseFloat(gpsLocation.lng);

    // Strict GPS zone check if mission specifies Coordinates
    if (mission.zone.lat && mission.zone.lng && mission.zone.radiusKm) {
      const distanceToZone = getGpsDistance(currentLat, currentLng, mission.zone.lat, mission.zone.lng);
      if (distanceToZone > mission.zone.radiusKm) {
        fraudScore = "eleve";
        fraudAlerts.push(`Hors Zone : Collecte effectuée à ${distanceToZone.toFixed(2)} km du centre d'étude (${mission.zone.name}) alors que la portée maximale est de ${mission.zone.radiusKm} km.`);
      }
    }

    // Proximity check with agent's own previous collections or other agent's listings to avoid lazy duplicates
    const allSubs = Object.values(db.submissions);
    for (const sub of allSubs) {
      if (sub.missionId === missionId && sub.gpsLocation) {
        const distMeters = getGpsDistance(currentLat, currentLng, sub.gpsLocation.lat, sub.gpsLocation.lng) * 1000;
        if (distMeters < db.platformConfig.minGpsDistanceMeters) {
          if (fraudScore !== "eleve") fraudScore = "moyen";
          fraudAlerts.push(`Localisation suspecte : trop proche d'une collecte existante (${sub.id} à seulement ${distMeters.toFixed(1)} mètres).`);
        }
      }
    }
  }

  const submissionId = `s-${Date.now()}`;
  const newSubmission: Submission = {
    id: submissionId,
    missionId,
    missionTitle: mission.title,
    agentPhone,
    agentName: agent.name,
    status: "pending",
    answers,
    photoUrl,
    gpsLocation,
    fraudScore,
    fraudAlerts,
    createdAt: new Date().toISOString()
  };

  db.submissions[submissionId] = newSubmission;

  // Record fraud logs if any alert
  fraudAlerts.forEach(alertText => {
    db.fraudLogs.push({
      id: `fl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submissionId,
      agentPhone,
      type: alertText.includes("Photo") ? "duplicate_photo" : "gps_outside",
      description: alertText,
      severity: fraudScore === "eleve" ? "high" : "medium",
      createdAt: new Date().toISOString()
    });
  });

  // Server notifications
  if (!db.notifications["+22999999999"]) db.notifications["+22999999999"] = [];
  db.notifications["+22999999999"].push({
    id: `n-${Date.now()}`,
    recipientPhone: "+22999999999",
    title: `Collecte soumise - ${mission.title}`,
    message: `L'agent ${agent.name} a soumis un relevé. Score de suspicion : ${fraudScore.toUpperCase()}`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, submission: newSubmission });
});

// Admin validation of collection submissions
app.post("/api/submissions/action", (req, res) => {
  const { submissionId, action, feedback } = req.body; // action: "approve" | "reject"
  
  if (!submissionId || !action) {
    return res.status(400).json({ error: "submissionId et action sont obligatoires." });
  }

  const sub = db.submissions[submissionId];
  if (!sub) {
    return res.status(404).json({ error: "Collecte introuvable." });
  }

  if (sub.status !== "pending") {
    return res.status(400).json({ error: "Cette collecte a déjà été traitée." });
  }

  const mission = db.missions[sub.missionId];
  const agent = db.users[sub.agentPhone];

  if (action === "approve") {
    sub.status = "approved";
    sub.feedback = feedback || "Données conformes, merci !";

    if (mission) {
      mission.collectedCount += 1;
      
      // If collection count targets reached, complete automatically!
      if (mission.collectedCount >= mission.totalRequired) {
        mission.status = MissionStatus.TERMINEE;

        // Notify Client that the report is complete!
        if (!db.notifications[mission.clientPhone]) db.notifications[mission.clientPhone] = [];
        db.notifications[mission.clientPhone].push({
          id: `n-${Date.now()}`,
          recipientPhone: mission.clientPhone,
          title: `Mission terminée : ${mission.title}`,
          message: `Félicitations, vos ${mission.totalRequired} collectes sont entièrement compilées ! Vos rapports Excel et PDF sont générés et prêts au téléchargement. Slogan officiel : "Des données terrain fiables, partout au Bénin."`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    if (agent) {
      // Points allocation + dynamic gamification level bonus calculation
      // levels gamification: Silver (+5%), Gold (+10%), Elite (+15%)
      let multiplier = 1.0;
      if (agent.level === AgentLevel.SILVER) multiplier = 1.05;
      else if (agent.level === AgentLevel.GOLD) multiplier = 1.10;
      else if (agent.level === AgentLevel.ELITE) multiplier = 1.15;

      const basePoints = mission ? mission.pointsPerCollect : 100;
      const rewardedPoints = Math.round(basePoints * multiplier);

      agent.points += rewardedPoints;

      // Automatically advance levels if points milestone hit
      // Bronze: 0-499, Silver: 500-1999, Gold: 2000-4999, Elite: 5000+
      const oldLevel = agent.level;
      if (agent.points >= 5000) {
        agent.level = AgentLevel.ELITE;
      } else if (agent.points >= 2000) {
        agent.level = AgentLevel.GOLD;
      } else if (agent.points >= 500) {
        agent.level = AgentLevel.SILVER;
      }

      // Quality score increase slightly on approval (caps 100)
      agent.score = Math.min(100, agent.score + 1);

      // Notify Agent
      if (!db.notifications[sub.agentPhone]) db.notifications[sub.agentPhone] = [];
      db.notifications[sub.agentPhone].push({
        id: `n-${Date.now()}`,
        recipientPhone: sub.agentPhone,
        title: "Collecte Validée ! 🎉",
        message: `Votre relevé pour '${sub.missionTitle}' a été approuvé. Vous gagnez ${rewardedPoints} points (incluant Bonus de Niveau). Votre solde est de ${agent.points} pts.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      if (agent.level !== oldLevel) {
        db.notifications[sub.agentPhone].push({
          id: `n-${Date.now()}-lvl`,
          recipientPhone: sub.agentPhone,
          title: "Nouveau Niveau Atteint ! 🏆",
          message: `Félicitations ! Vous êtes passé au niveau ${agent.level}. Vos bonus de gain passent à +${(multiplier - 1) * 100}% !`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }

  } else {
    // REJECT action
    sub.status = "rejected";
    sub.feedback = feedback || "Motif : Photo floue ou données non concordantes.";

    if (agent) {
      // Reliability score drops on fraud or bad submissions
      agent.score = Math.max(50, agent.score - 5);

      // Auto-banning risk if quality score drops below 60
      if (agent.score < 60) {
        agent.isSuspended = true;
        db.notifications["+22999999999"].push({
          id: `n-${Date.now()}-susp`,
          recipientPhone: "+22999999999",
          title: "Agent Suspendu Automatiquement",
          message: `L'agent ${agent.name} (${agent.phone}) a été suspendu car son score de fiabilité est tombé à ${agent.score}% suite à un rejet.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      // Notify Agent of rejection
      if (!db.notifications[sub.agentPhone]) db.notifications[sub.agentPhone] = [];
      db.notifications[sub.agentPhone].push({
        id: `n-${Date.now()}-rej`,
        recipientPhone: sub.agentPhone,
        title: "Collecte Rejetée ⚠️",
        message: `Votre relevé pour '${sub.missionTitle}' a été refusé. Motif : ${sub.feedback}. Votre réputation est à ${agent.score}%`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  saveDatabase();
  return res.json({ success: true, submission: sub, agent });
});

// Create points retirement / withdrawal request (minimum 50 points (500 FCFA))
app.post("/api/withdrawals", (req, res) => {
  const { phone, points, method } = req.body;

  if (!phone || !points || !method) {
    return res.status(400).json({ error: "Numéro, points et méthode obligatoires." });
  }

  const agent = db.users[phone];
  if (!agent) {
    return res.status(404).json({ error: "Agent introuvable." });
  }

  const qty = parseInt(points);
  if (qty < 50) {
    return res.status(400).json({ error: "Le seuil minimal de retrait est de 50 points (500 FCFA)." });
  }

  if (agent.points < qty) {
    return res.status(400).json({ error: "Solde de points insuffisant." });
  }

  // Calculate FCFA value: 1 point = 10 FCFA
  const amountFcfa = qty * db.platformConfig.pointsToFcfaRate;

  // Deduct points from current balance
  agent.points -= qty;

  const withdrawalId = `w-${Date.now()}`;
  const newRequest: WithdrawalRequest = {
    id: withdrawalId,
    agentPhone: phone,
    agentName: agent.name,
    pointsQuantity: qty,
    amountFcfa,
    status: "pending",
    paymentMethod: method,
    createdAt: new Date().toISOString()
  };

  db.withdrawals[withdrawalId] = newRequest;

  // Notify Admin of cashout request
  if (!db.notifications["+22999999999"]) db.notifications["+22999999999"] = [];
  db.notifications["+22999999999"].push({
    id: `n-${Date.now()}`,
    recipientPhone: "+22999999999",
    title: "Demande de Retrait Reçue 💵",
    message: `L'agent ${agent.name} demande ${qty} points (${amountFcfa} FCFA) via ${method}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, balance: agent.points, withdrawal: newRequest });
});

// Admin approves cashout manually
app.post("/api/withdrawals/approve", (req, res) => {
  const { withdrawalId } = req.body;
  if (!withdrawalId) {
    return res.status(400).json({ error: "withdrawalId obligatoire." });
  }

  const wr = db.withdrawals[withdrawalId];
  if (!wr) {
    return res.status(404).json({ error: "Demande introuvable." });
  }

  wr.status = "completed";

  // Notify Agent
  if (!db.notifications[wr.agentPhone]) db.notifications[wr.agentPhone] = [];
  db.notifications[wr.agentPhone].push({
    id: `n-${Date.now()}`,
    recipientPhone: wr.agentPhone,
    title: "Retrait Approuvé ! 💰",
    message: `Votre transfert de ${wr.amountFcfa} FCFA (${wr.pointsQuantity} pts) a été versé avec succès via ${wr.paymentMethod}. Merci pour votre dévouement sur le terrain !`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, withdrawal: wr });
});

// Admin validate user payment for pending missions
app.post("/api/missions/pay-confirm", (req, res) => {
  const { missionId } = req.body;
  const mission = db.missions[missionId];
  if (!mission) {
    return res.status(404).json({ error: "Mission introuvable." });
  }

  mission.status = MissionStatus.ACTIVE;

  // Notify Client
  if (!db.notifications[mission.clientPhone]) db.notifications[mission.clientPhone] = [];
  db.notifications[mission.clientPhone].push({
    id: `n-${Date.now()}`,
    recipientPhone: mission.clientPhone,
    title: "Mission Activée 🎉",
    message: `Le paiement pour '${mission.title}' a été validé. Les agents du Bénin reçoivent l'alerte dès maintenant.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // Notify all agents about new active mission
  Object.values(db.users).forEach(u => {
    if (u.role === UserRole.AGENT) {
      if (!db.notifications[u.phone]) db.notifications[u.phone] = [];
      db.notifications[u.phone].push({
        id: `n-${Date.now()}-alert`,
        recipientPhone: u.phone,
        title: "Nouvelle Mission Disponible ! 🇧🇯",
        message: `Une mission près de vous : '${mission.title}' offrant +${mission.pointsPerCollect} points par soumission !`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  saveDatabase();
  return res.json({ success: true, mission });
});

// Support Ticket submissions
app.post("/api/support", (req, res) => {
  const { phone, name, category, description, screenshot } = req.body;

  if (!phone || !category || !description) {
    return res.status(400).json({ error: "Les champs téléphone, catégorie et description sont requis." });
  }

  const ticketId = `t-${Date.now()}`;
  const newTicket: SupportTicket = {
    id: ticketId,
    senderPhone: phone,
    senderName: name || "Anonyme",
    category,
    description,
    screenshot,
    createdAt: new Date().toISOString()
  };

  db.supportTickets[ticketId] = newTicket;

  // Let Admin know
  if (!db.notifications["+22999999999"]) db.notifications["+22999999999"] = [];
  db.notifications["+22999999999"].push({
    id: `n-${Date.now()}`,
    recipientPhone: "+22999999999",
    title: "Ticket de support soumis",
    message: `Ticket (${category}) de la part de ${name || phone}. Description: ${description.slice(0, 50)}...`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase();
  return res.json({ success: true, ticket: newTicket });
});

// Support intelligence Chatbot with WhatsApp wa.me links
app.post("/api/chatbot", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Votre message est vide." });
  }

  if (!ai) {
    // Return friendly offline fallback immediately if AI key is missing
    return res.json({
      reply: `Désolé, je suis en mode maintenance locale. Slogan officiel : "Des données terrain fiables, partout au Bénin." Pour toute assistance urgente, contactez notre support officiel au WhatsApp : +229 55256871 (Email : jeanjacquesaguin30@gmail.com).`
    });
  }

  try {
    const activeMissionsSummary = Object.values(db.missions)
      .map(m => `- ${m.title} (${m.zone.name}): +${m.pointsPerCollect} points.`)
      .join("\n");

    const systemInstruction = `Tu es l'assistant IA officiel de DataBroker229 🇧🇯 (le réseau d'intelligence terrain au Bénin).
Slogan de l'entreprise: "Des données terrain fiables, partout au Bénin."
Email de l'assistance : jeanjacquesaguin30@gmail.com
WhatsApp de l'assistance : +229 55256871 (Lien vers WhatsApp: wa.me/22955256871)

Ta mission :
- Conseiller chaleureusement et efficacement les agents collecteurs, les clients et les curieux.
- Expliquer le barême officiel béninois : 1 point = 10 FCFA (seuil minimum de retrait : 50 points soit 500 FCFA).
- Présenter la gamification :
  💡 BRONZE : 0 à 499 pts (bonus 0%)
  🥈 SILVER : 500 à 1999 pts (bonus +5%)
  🥇 GOLD : 2000 à 4999 pts (bonus +10%)
  🏆 ELITE : 5000+ pts (bonus +15%)
- Évoquer les contrôles anti-fraude rigoureux : double soumission de photos ou de coordonnées GPS identiques refusée, géolocalisation vérifiée avec un seuil minimal de 50 mètres.
- Si la question de l'utilisateur concerne une assistance technique avancée, un litige de paiement ou un bug, ou si tu ne connais pas la réponse avec certitude, tu dois impérativement formuler mot pour mot la phrase suivante en conclusion :
"Je n’ai pas trouvé une réponse précise à votre problème. Contactez le support DataBroker229 🇧🇯 sur WhatsApp : +229 55256871"
et donner le lien direct.

Voici les missions actuellement actives sur la plateforme :
${activeMissionsSummary}

Réponds de manière conviviale, professionnelle et ancrée au Bénin (utilise de temps en temps des expressions polies).`;

    const chatHistory = history || [];
    const contents = [...chatHistory, { role: "user", parts: [{ text: message }] }];

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ reply: result.text || "Quelque chose s'est mal passé." });
  } catch (err) {
    console.error("Chatbot generation error:", err);
    return res.json({
      reply: "Je rencontre une micro-coupure réseau. N'hésitez pas à poser votre question ou contactez-nous directement sur notre support WhatsApp au +229 55256871 !"
    });
  }
});

// Notifications fetcher
app.get("/api/notifications", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json([]);
  const list = db.notifications[phone as string] || [];
  return res.json(list);
});

// Notification mark as read
app.post("/api/notifications/read", (req, res) => {
  const { phone } = req.body;
  if (phone && db.notifications[phone]) {
    db.notifications[phone].forEach(n => n.isRead = true);
    saveDatabase();
  }
  return res.json({ success: true });
});

// Admin stats overview API
app.get("/api/admin/stats", (req, res) => {
  const usersList = Object.values(db.users);
  const missionsList = Object.values(db.missions);
  const subsList = Object.values(db.submissions);
  const withdrawalsList = Object.values(db.withdrawals);

  const stats = {
    totalUsers: usersList.length,
    agentsCount: usersList.filter(u => u.role === UserRole.AGENT).length,
    clientsCount: usersList.filter(u => u.role === UserRole.CLIENT).length,
    
    totalMissions: missionsList.length,
    activeMissions: missionsList.filter(m => m.status === MissionStatus.ACTIVE).length,
    pendingPaymentMissions: missionsList.filter(m => m.status === MissionStatus.EN_ATTENTE_PAIEMENT).length,
    completedMissions: missionsList.filter(m => m.status === MissionStatus.TERMINEE).length,
    
    totalSubmissions: subsList.length,
    pendingSubmissions: subsList.filter(s => s.status === "pending").length,
    approvedSubmissions: subsList.filter(s => s.status === "approved").length,
    rejectedSubmissions: subsList.filter(s => s.status === "rejected").length,

    pendingWithdrawals: withdrawalsList.filter(w => w.status === "pending").length,
    paidWithdrawalsAmountFcfa: withdrawalsList.filter(w => w.status === "completed").reduce((sum, w) => sum + w.amountFcfa, 0),
    
    platformRevenuesFcfa: Object.values(db.missions).reduce((sum, m) => {
      // Calculate revenue made from paid or completed missions (platform markup is client price - agent's payout)
      if (m.status !== MissionStatus.EN_ATTENTE_PAIEMENT) {
        return sum + (m.totalCostClientFcfa - (m.budgetAgentFcfa * m.totalRequired));
      }
      return sum;
    }, 0),

    fraudAlertsCount: db.fraudLogs.length,
    marginPercent: db.platformConfig.marginPercent,
    minGpsDistanceMeters: db.platformConfig.minGpsDistanceMeters
  };

  return res.json({
    stats,
    fraudLogs: db.fraudLogs.slice(-15), // Last 15 alerts
    allWithdrawals: withdrawalsList.sort((a,b) => b.createdAt.localeCompare(a.createdAt)),
    allUsers: usersList,
    allSubmissions: subsList.sort((a,b) => b.createdAt.localeCompare(a.createdAt))
  });
});

// Admin update platform settings
app.post("/api/admin/config", (req, res) => {
  const { marginPercent, minGpsDistanceMeters } = req.body;
  if (marginPercent !== undefined) {
    db.platformConfig.marginPercent = parseFloat(marginPercent);
  }
  if (minGpsDistanceMeters !== undefined) {
    db.platformConfig.minGpsDistanceMeters = parseInt(minGpsDistanceMeters);
  }
  saveDatabase();
  return res.json({ success: true, config: db.platformConfig });
});

// Raw CSV / XML Excel Dynamic Generation
app.get("/api/export/csv", (req, res) => {
  const { missionId } = req.query;
  if (!missionId) {
    return res.status(400).send("missionId requis");
  }

  const mission = db.missions[missionId as string];
  if (!mission) {
    return res.status(404).send("Mission introuvable.");
  }

  // Filter approved reviews only
  const subs = Object.values(db.submissions).filter(s => s.missionId === missionId && s.status === "approved");

  // Generate headers
  const baseHeaders = ["Collect ID", "Agent Phone", "Agent Nom", "Date Soumission", "GPS Latitude", "GPS Longitude"];
  const dynamicFieldHeaders = mission.fields.map(f => f.label);
  const headers = [...baseHeaders, ...dynamicFieldHeaders];

  // Map rows
  const rows = subs.map(s => {
    const baseFields = [
      s.id,
      s.agentPhone,
      s.agentName,
      s.createdAt,
      s.gpsLocation?.lat || "",
      s.gpsLocation?.lng || ""
    ];
    const dynamicFields = mission.fields.map(f => {
      const val = s.answers[f.id] || "";
      return `"${val.replace(/"/g, '""')}"`; // escape cell Quotes
    });
    return [...baseFields, ...dynamicFields].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n"); // prepended BOM for Excel parsing

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="DataBroker229_Mission_${missionId}.csv"`);
  return res.status(200).send(csvContent);
});

// Explicit route to serve the complete generated ZIP package
app.get("/databroker229-export.zip", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "databroker229-export.zip");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="databroker229-export.zip"');
    return res.sendFile(filePath);
  } else {
    const distPath = path.join(process.cwd(), "dist", "databroker229-export.zip");
    if (fs.existsSync(distPath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="databroker229-export.zip"');
      return res.sendFile(distPath);
    }
    return res.status(404).send("Le fichier export ZIP n'est pas encore généré sur le serveur. Veuillez patienter ou contacter l'administrateur.");
  }
});

// ================= VITE ASSET CONTROLLERS =================

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`DataBroker229 Benin backend started.`);
    console.log(`Server listening at http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

startServer();
