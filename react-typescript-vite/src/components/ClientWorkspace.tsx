import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  PlusCircle,
  Plus,
  Trash,
  Info,
  DollarSign,
  Download,
  MapPin,
  List
} from "lucide-react";
import { Mission, MissionField, FieldType, UserRole, MissionStatus } from "../types";

interface ClientWorkspaceProps {
  currentUser: {
    phone: string;
    name: string;
  };
  missions: Mission[];
  submissions: any[];
  onRefreshData: () => void;
}

export default function ClientWorkspace({
  currentUser,
  missions,
  submissions,
  onRefreshData
}: ClientWorkspaceProps) {
  // AI assist states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Mission Creator parameters
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalRequired, setTotalRequired] = useState(10);
  const [budgetAgentFcfa, setBudgetAgentFcfa] = useState(1200);
  const [zoneType, setZoneType] = useState<"city" | "market" | "radius" | "any">("city");
  const [zoneName, setZoneName] = useState("Cotonou");
  const [zoneLat, setZoneLat] = useState(6.3654);
  const [zoneLng, setZoneLng] = useState(2.4183);
  const [zoneRadius, setZoneRadius] = useState(5.0);

  // Dynamic fields list
  const [fields, setFields] = useState<MissionField[]>([
    { id: "f-1", type: FieldType.TEXT, label: "Lieu exact / Nom du point de vente", required: true },
    { id: "f-2", type: FieldType.NUMBER, label: "Prix relevé (FCFA)", required: true },
    { id: "f-3", type: FieldType.PHOTO, label: "Photo d'étalage en situation réelle", required: true },
    { id: "f-4", type: FieldType.GPS, label: "Point de validation géographique", required: true }
  ]);

  // Support parameter addition
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>(FieldType.TEXT);
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldOptionsString, setNewFieldOptionsString] = useState("");

  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const handleAddField = () => {
    if (!newFieldLabel) return;
    const fId = `f-${Date.now()}`;
    const opts = newFieldOptionsString ? newFieldOptionsString.split(",").map((x) => x.trim()) : undefined;
    
    setFields([
      ...fields,
      { id: fId, type: newFieldType, label: newFieldLabel, required: newFieldRequired, options: opts }
    ]);

    setNewFieldLabel("");
    setNewFieldOptionsString("");
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  // Trigger Gemini dynamic API intelligence assist
  const handleAiSuggest = async () => {
    if (!aiPrompt) {
      setAiError("Veuillez formuler votre demande d'enquête (ex: 'Sondage prix huile à Cotonou').");
      return;
    }

    setIsAiLoading(true);
    setAiError("");

    try {
      const resp = await fetch("/api/missions/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, clientCity: zoneName })
      });

      if (!resp.ok) {
        throw new Error("L'IA n'est pas disponible pour l'instant.");
      }

      const parsed = await resp.json();
      
      // Map AI response to states
      setTitle(parsed.title || "");
      setDescription(parsed.description || "");
      if (parsed.zone) {
        setZoneType(parsed.zone.type || "city");
        setZoneName(parsed.zone.name || "Cotonou");
        setZoneLat(parsed.zone.lat || 6.36);
        setZoneLng(parsed.zone.lng || 2.44);
        setZoneRadius(parsed.zone.radiusKm || 5.0);
      }
      setTotalRequired(parsed.totalRequired || 10);
      setBudgetAgentFcfa(parsed.budgetAgentFcfa || 1200);
      if (parsed.fields && parsed.fields.length > 0) {
        setFields(parsed.fields);
      }

      setCreateSuccess("IA assiste : Les champs du questionnaire et tarifs ont été pré-remplis !");
      setTimeout(() => setCreateSuccess(""), 4000);

    } catch (err: any) {
      setAiError(err.message || "Erreur lors de la génération par l'IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Create & Register the newly built mission
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!title || !description) {
      setCreateError("Le titre et la description détaillée de la mission sont indispensables.");
      return;
    }

    if (fields.length === 0) {
      setCreateError("Veuillez configurer au moins un champ de questionnaire terrain.");
      return;
    }

    const zone = {
      type: zoneType,
      name: zoneName,
      lat: zoneLat,
      lng: zoneLng,
      radiusKm: zoneRadius
    };

    try {
      const resp = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          clientPhone: currentUser.phone,
          clientName: currentUser.name,
          zone,
          fields,
          totalRequired,
          budgetAgentFcfa
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setCreateError(resData.error || "Echec du dépôt.");
      } else {
        setCreateSuccess("Mission enregistrée avec succès ! Elle est en attente de validation de paiement.");
        onRefreshData();
        // Reset Creator
        setTitle("");
        setDescription("");
        setAiPrompt("");
      }
    } catch (err) {
      setCreateError("Erreur réseau.");
    }
  };

  // Simulate payment processing
  const handleSimulatePayment = async (mId: string) => {
    try {
      const resp = await fetch("/api/missions/pay-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mId })
      });
      if (resp.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const clientMissions = missions.filter((m) => m.clientPhone === currentUser.phone);
  const activeCount = clientMissions.filter((m) => m.status === MissionStatus.ACTIVE).length;
  const completedCount = clientMissions.filter((m) => m.status === MissionStatus.TERMINEE).length;
  const pendingPaymentCount = clientMissions.filter((m) => m.status === MissionStatus.EN_ATTENTE_PAIEMENT).length;

  // Margin percent calculation
  const marginFraction = 1 - 0.40; // DB default margins 40%
  const computedPriceClient = Math.round((budgetAgentFcfa * totalRequired) / marginFraction);

  return (
    <div className="flex flex-col space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missions Actives</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{activeCount}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Surveillance</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missions Complétées</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{completedCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En attente Paiement</p>
          <h3 className="text-3xl font-black text-yellow-600 mt-1">{pendingPaymentCount}</h3>
        </div>
        <div className="bg-[#121b15] text-white p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Frais de plateforme</p>
            <h3 className="text-xl font-black tracking-tight mt-1">Marge Client incluse: 40%</h3>
          </div>
          <p className="text-[9px] text-slate-405 italic mt-1 font-mono">
            Rapports de données brutes téléchargeables au format Excel (CSV).
          </p>
        </div>
      </div>

      {/* Create Mission Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Creator panel (Left Column) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-1.5">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Créer une nouvelle mission terrain au Bénin
            </h4>
            <p className="text-slate-500 text-xs mt-1">
              Rédigez votre besoin en texte libre et laissez l'IA générer automatiquement le formulaire terrain.
            </p>
          </div>

          {/* Prompt Assist input */}
          <div className="bg-slate-55 bg-indigo-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Générateur Intelligent de Relevé Terrain (Recommandé)
            </label>
            <div className="flex gap-2">
              <input
                id="ai-prompt-input"
                type="text"
                placeholder="Ex: Je veux auditer le prix de l'huile d'arachide de marque 'Auri' sur Cotonou ainsi que la présence de concurrents."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-sm"
              />
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isAiLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg gap-1 flex items-center shrink-0 transition-colors shadow-sm"
              >
                {isAiLoading ? "Analyse IA..." : "Suggérer par IA ✨"}
              </button>
            </div>
            {aiError && <p className="text-[10px] text-rose-600 font-bold">{aiError}</p>}
          </div>

          {/* Form details */}
          <form onSubmit={handleCreateMission} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la mission *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Audit de prix Huile Dantokpa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-emerald-600 focus:ring-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de collectes souhaité *</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  required
                  value={totalRequired}
                  onChange={(e) => setTotalRequired(parseInt(e.target.value) || 10)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description & Consignes détaillées pour les agents *</label>
              <textarea
                required
                rows={3}
                placeholder="Expliquez clairement ce que l'agent doit faire sur place, les marques à chercher, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zone Géographique</label>
                <select
                  value={zoneType}
                  onChange={(e: any) => setZoneType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900"
                >
                  <option value="city">Ville Entière</option>
                  <option value="market">Marché Spécifique</option>
                  <option value="radius">GPS + Rayon d'études</option>
                  <option value="any">Bénin National</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Lieu / Ville</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900"
                  placeholder="Ex : Cotonou..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Budget Agent par collecte *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="500"
                    step="50"
                    required
                    value={budgetAgentFcfa}
                    onChange={(e) => setBudgetAgentFcfa(parseInt(e.target.value) || 500)}
                    className="w-full bg-white border border-slate-200 rounded pl-2 pr-12 py-1 text-xs text-slate-900 font-bold"
                  />
                  <span className="absolute right-2 top-1.5 text-[9px] font-mono text-slate-400">FCFA/coll</span>
                </div>
              </div>
            </div>

            {/* Dynamic fields configuration list */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <h5 className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span>Questionnaire de l'enquête terrain (Formulaire Dynamique)</span>
                <span className="text-[10px] text-emerald-600 font-bold">{fields.length} champs au total</span>
              </h5>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {fields.map((f, i) => (
                  <div key={f.id} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800">{i + 1}. {f.label}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 ml-2 font-mono uppercase">{f.type}</span>
                      {f.required && (
                        <span className="text-[9px] text-emerald-600 font-bold ml-1 italic">(requis)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add form element inline widget */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-t pt-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500">Intitulé de la question</label>
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Ex: Prix bouteille 1L..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500">Type de donnée</label>
                  <select
                    value={newFieldType}
                    onChange={(e: any) => setNewFieldType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value={FieldType.TEXT}>Texte libre</option>
                    <option value={FieldType.NUMBER}>Nombre / Chiffre</option>
                    <option value={FieldType.BOOLEAN}>Oui / Non</option>
                    <option value={FieldType.SELECT}>Liste déroulante</option>
                    <option value={FieldType.PHOTO}>Photo requise</option>
                    <option value={FieldType.GPS}>Géolocalisation GPS</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="w-full bg-slate-900 text-white font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>

              {newFieldType === FieldType.SELECT && (
                <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                  <label className="block font-bold">Options pour la liste (séparées par une virgule)</label>
                  <input
                    type="text"
                    placeholder="Choix A, Choix B, Choix C"
                    value={newFieldOptionsString}
                    onChange={(e) => setNewFieldOptionsString(e.target.value)}
                    className="w-full bg-white border rounded px-2 py-1 mt-1 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Price simulation box */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-xs text-slate-400">Tarification officielle DataBroker229</p>
                <p className="text-[10px] text-slate-450 italic">Calcul : (Budget collectes {totalRequired} * {budgetAgentFcfa} FCFA) + Marge plateforme 40%</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 uppercase">Devis estimatif global</span>
                <h4 className="text-2xl font-black text-yellow-300 italic">
                  {computedPriceClient.toLocaleString()} <span className="text-sm font-normal text-slate-305">FCFA</span>
                </h4>
              </div>
            </div>

            {createError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200 rounded">
                {createError}
              </p>
            )}

            {createSuccess && (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 border border-emerald-200 rounded">
                {createSuccess}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-extrabold text-xs py-3 rounded-lg uppercase tracking-widest block text-center transition-all shadow-md"
            >
              Envoyer la Mission
            </button>
          </form>
        </div>

        {/* Client's Missions list (Right Column) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-1">
              <List className="w-4 h-4 text-emerald-600" /> Vos Enquêtes en cours
            </h4>

            <div className="space-y-3">
              {clientMissions.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6 italic">Vous n'avez pas encore déposé d'enquêtes.</div>
              ) : (
                clientMissions.map((m) => {
                  const completedPct = Math.round((m.collectedCount / m.totalRequired) * 100);
                  const isPendingPayment = m.status === MissionStatus.EN_ATTENTE_PAIEMENT;

                  return (
                    <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate pr-2" title={m.title}>
                          {m.title}
                        </h5>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          m.status === MissionStatus.ACTIVE ? "bg-emerald-100 text-emerald-800" :
                          m.status === MissionStatus.TERMINEE ? "bg-purple-100 text-purple-800" :
                          m.status === MissionStatus.EN_ATTENTE_PAIEMENT ? "bg-amber-100 text-amber-800" :
                          "bg-slate-200 text-slate-800"
                        }`}>
                          {m.status === MissionStatus.ACTIVE ? "Active" :
                           m.status === MissionStatus.TERMINEE ? "Terminée" :
                           m.status === MissionStatus.EN_ATTENTE_PAIEMENT ? "Impayée" : m.status}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Localisation : 📍 {m.zone.name}</span>
                        <span>Points/Relevé : <b>{m.pointsPerCollect} pts</b></span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>Progress : {m.collectedCount}/{m.totalRequired}</span>
                          <span>{completedPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-1.5" style={{ width: `${completedPct}%` }}></div>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2 pt-1 border-t border-slate-200/50">
                        {isPendingPayment ? (
                          <button
                            id={`pay-simulation-${m.id}`}
                            onClick={() => handleSimulatePayment(m.id)}
                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-[9px] py-1 rounded-md uppercase tracking-wide text-center"
                          >
                            💳 Payer ({m.totalCostClientFcfa.toLocaleString()} FCFA)
                          </button>
                        ) : (
                          <a
                            href={`/api/export/csv?missionId=${m.id}`}
                            download
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] py-1 rounded-md uppercase tracking-wide text-center flex items-center justify-center gap-1"
                          >
                            <Download className="w-3 h-3 text-emerald-400" /> Télécharger Données (CSV)
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Feedback list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h4 className="font-extrabold text-slate-900 text-sm mb-3">Dernières données reçues</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {submissions.filter((s) => s.status === "approved" && missions.find((m) => m.id === s.missionId && m.clientPhone === currentUser.phone)).length === 0 ? (
                <span className="text-xs text-slate-400 italic block text-center py-4">Aucun relevé validé sur le terrain.</span>
              ) : (
                submissions
                  .filter((s) => s.status === "approved" && missions.find((m) => m.id === s.missionId && m.clientPhone === currentUser.phone))
                  .map((s) => (
                    <div key={s.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed">
                      <div className="font-bold text-slate-850 flex justify-between items-center">
                        <span>Agent: {s.agentName}</span>
                        <span className="font-mono text-[9px] text-slate-400">{s.id}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{s.missionTitle}</p>
                      
                      {/* Answers overview */}
                      <div className="mt-1 bg-white p-1 rounded border border-slate-100 divide-y divide-slate-50">
                        {Object.entries(s.answers).map(([k, val]: any) => (
                          <div key={k} className="flex justify-between py-0.5 text-[9px]">
                            <span className="text-slate-400 font-medium">Réponse :</span>
                            <span className="text-slate-705 font-bold">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
