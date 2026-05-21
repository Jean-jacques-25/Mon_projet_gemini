export enum UserRole {
  AGENT = "agent",
  CLIENT = "client",
  ADMIN = "admin"
}

export enum AgentLevel {
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  ELITE = "ELITE"
}

export enum MissionStatus {
  EN_ATTENTE_PAIEMENT = "en_attente_paiement",
  ACTIVE = "active",
  TERMINEE = "terminee",
  SUSPENDUE = "suspendue"
}

export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  BOOLEAN = "boolean",
  SELECT = "select",
  PHOTO = "photo",
  GPS = "gps"
}

export interface User {
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  points: number;
  level: AgentLevel;
  score: number; // Reliability score (e.g. 95%)
  isSuspended: boolean;
  createdAt: string;
}

export interface MissionField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // for select
}

export interface ZoneConfig {
  type: "city" | "market" | "radius" | "any";
  name: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  clientPhone: string;
  clientName: string;
  status: MissionStatus;
  pointsPerCollect: number;
  budgetAgentFcfa: number;
  totalCostClientFcfa: number;
  fields: MissionField[];
  zone: ZoneConfig;
  totalRequired: number;
  collectedCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface Submission {
  id: string;
  missionId: string;
  missionTitle: string;
  agentPhone: string;
  agentName: string;
  status: "pending" | "approved" | "rejected";
  answers: Record<string, string>; // fieldId -> value
  photoUrl?: string; // Base64 or uploaded URL
  gpsLocation?: { lat: number; lng: number };
  fraudScore: "faible" | "moyen" | "eleve";
  fraudAlerts: string[];
  createdAt: string;
  feedback?: string;
}

export interface WithdrawalRequest {
  id: string;
  agentPhone: string;
  agentName: string;
  pointsQuantity: number;
  amountFcfa: number;
  status: "pending" | "completed";
  paymentMethod: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  senderPhone: string;
  senderName: string;
  category: "bug" | "payment" | "mission" | "gps_photo" | "account" | "other";
  description: string;
  screenshot?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  recipientPhone: string; // "all" or specific phone
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface FraudLog {
  id: string;
  submissionId: string;
  agentPhone: string;
  type: "duplicate_photo" | "gps_outside" | "gps_duplicate" | "too_close";
  description: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
}
