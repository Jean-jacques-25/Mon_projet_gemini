import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Compass,
  FileCheck,
  TrendingUp,
  AlertOctagon,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Check,
  X,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { Mission, Submission, User, WithdrawalRequest, FraudLog } from "../types";

interface AdminWorkspaceProps {
  onRefreshData: () => void;
}

export default function AdminWorkspace({ onRefreshData }: AdminWorkspaceProps) {
  const [stats, setStats] = useState<any>(null);
  const [submissionsQueue, setSubmissionsQueue] = useState<Submission[]>([]);
  const [withdrawalsQueue, setWithdrawalsQueue] = useState<WithdrawalRequest[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [fraudLogsList, setFraudLogsList] = useState<FraudLog[]>([]);

  // Platform properties values
  const [marginPercent, setMarginPercent] = useState(40);
  const [minGpsDistanceMeters, setMinGpsDistanceMeters] = useState(50);
  const [configSuccess, setConfigSuccess] = useState("");

  // Feedback inputs
  const [subFeedback, setSubFeedback] = useState<Record<string, string>>({});

  const fetchAdminStats = async () => {
    try {
      const resp = await fetch("/api/admin/stats");
      if (resp.ok) {
        const data = await resp.json();
        setStats(data.stats);
        
        // Filter out only pending submissions
        setSubmissionsQueue(data.allSubmissions.filter((s: any) => s.status === "pending"));
        setWithdrawalsQueue(data.allWithdrawals.filter((w: any) => w.status === "pending"));
        setUsersList(data.allUsers);
        setFraudLogsList(data.fraudLogs || []);

        setMarginPercent(data.stats.marginPercent || 40);
        setMinGpsDistanceMeters(data.stats.minGpsDistanceMeters || 50);
      }
    } catch (err) {
      console.warn("Failed to fetch admin statistics", err);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  // Submission validation web handler
  const handleSubmissionAction = async (submissionId: string, action: "approve" | "reject") => {
    const feedbackText = subFeedback[submissionId] || (action === "approve" ? "Relevé validé !" : "Photo erronée ou hors zone.");
    try {
      const resp = await fetch("/api/submissions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          action,
          feedback: feedbackText
        })
      });

      if (resp.ok) {
        fetchAdminStats();
        onRefreshData();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Withdrawal cashout manual release trigger
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const resp = await fetch("/api/withdrawals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId })
      });
      if (resp.ok) {
        fetchAdminStats();
        onRefreshData();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Save admin property configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSuccess("");
    try {
      const resp = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marginPercent,
          minGpsDistanceMeters
        })
      });
      if (resp.ok) {
        setConfigSuccess("Paramètres officiels de la plateforme enregistrés !");
        setTimeout(() => setConfigSuccess(""), 4000);
        fetchAdminStats();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs italic bg-white rounded-2xl border">
        Chargement des KPIs admin sécurisés...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">

      {/* Admin KPIs overall view */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Revenus de la Plateforme</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.platformRevenuesFcfa.toLocaleString()} <span className="text-xs font-normal">FCFA</span></h3>
            <span className="text-[9px] text-emerald-600 font-bold">Marge : {stats.marginPercent}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Réseau Utilisateurs</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalUsers}</h3>
            <span className="text-[9px] text-slate-400 font-mono">Agents: {stats.agentsCount} | Clients: {stats.clientsCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Alerte Fraude Loggées</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.fraudAlertsCount}</h3>
            <span className="text-[9px] text-slate-550">Analytique instantanée</span>
          </div>
        </div>

        <div className="bg-[#121b15] text-white p-5 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="p-3 bg-yellow-400 text-slate-900 rounded-xl font-bold">
            DB229
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-emerald-400">Statut Réseau Bénin</p>
            <h3 className="text-xl font-black italic mt-0.5">ONLINE</h3>
            <span className="text-[9px] text-slate-350 font-mono">jeanjacquesaguin30@gmail.com</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* List of submissions waiting for review (Left Column) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-md flex items-center gap-1.5 animate-pulse">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              File de validation de collectes terrain ({submissionsQueue.length})
            </h4>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Données en attente</span>
          </div>

          {submissionsQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
              Félicitations, aucun relevé terrain en attente de vérification !
            </div>
          ) : (
            <div className="space-y-6">
              {submissionsQueue.map((s) => {
                const fraudScoreColor =
                  s.fraudScore === "eleve" ? "bg-red-100 text-red-700 border-red-200" :
                  s.fraudScore === "moyen" ? "bg-amber-100 text-amber-700 border-amber-200" :
                  "bg-emerald-100 text-emerald-750 border-emerald-200";

                return (
                  <div key={s.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative overflow-hidden">
                    {/* Corner indicator badge for fraud */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${fraudScoreColor}`}>
                        Risque Fraude : {s.fraudScore.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block font-mono">
                        SOUMISSION REF : {s.id}
                      </span>
                      <h5 className="font-extrabold text-sm text-slate-900 mt-0.5">{s.missionTitle}</h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Collecteur : <b>{s.agentName} ({s.agentPhone})</b>
                      </p>
                    </div>

                    {/* Fraud alert warnings panel */}
                    {s.fraudAlerts.length > 0 && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-700 text-xs space-y-1">
                        <span className="font-black flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          ALERTE FRAUDE LOGIQUE GÉNÉRÉE :
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-rose-600 pl-1 space-y-0.5">
                          {s.fraudAlerts.map((alert, idx) => (
                            <li key={idx}>{alert}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Answers table comparison grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Réponses du questionnaire</h6>
                        <div className="bg-white border rounded-xl divide-y divide-slate-100 text-xs">
                          {Object.entries(s.answers).map(([key, val]) => (
                            <div key={key} className="p-2.5 flex justify-between gap-4">
                              <span className="text-slate-500 max-w-[120px] truncate">{key}</span>
                              <span className="font-bold text-slate-900 inline-block text-right">{val || "true"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Photo preview container */}
                      {s.photoUrl && (
                        <div className="space-y-1.5">
                          <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photo fournie par l'agent</h6>
                          <div className="border rounded-xl overflow-hidden h-36 bg-slate-950 relative">
                            {s.photoUrl.startsWith("placeholder") ? (
                              <div className="w-full h-full bg-slate-800 text-slate-500 text-[10px] text-center flex flex-col justify-center items-center">
                                📷 MOCK PHOTO EN COURS
                                <span className="text-[8px] text-slate-400">Image Hash: OK</span>
                              </div>
                            ) : (
                              <img src={s.photoUrl} alt="Relevé" className="w-full h-full object-contain" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Verification and response action fields */}
                    <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-200">
                      <input
                        id={`feedback-field-${s.id}`}
                        type="text"
                        placeholder="Laisser un commentaire ou motif de rejet..."
                        value={subFeedback[s.id] || ""}
                        onChange={(e) => setSubFeedback({ ...subFeedback, [s.id]: e.target.value })}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-slate-900"
                      />
                      <div className="flex gap-2">
                        <button
                          id={`reject-sub-${s.id}`}
                          onClick={() => handleSubmissionAction(s.id, "reject")}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0"
                        >
                          <X className="w-4 h-4" /> Rejeter
                        </button>
                        <button
                          id={`approve-sub-${s.id}`}
                          onClick={() => handleSubmissionAction(s.id, "approve")}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0"
                        >
                          <Check className="w-4 h-4" /> Valider
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Administration parameters and withdrawals queue (Right Column) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Manual payout / cashouts list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-1">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Demandes de Transferts MoMo / Celtiis ({withdrawalsQueue.length})
            </h4>

            <div className="space-y-3">
              {withdrawalsQueue.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6 italic">Aucune de demande de virement en attente.</div>
              ) : (
                withdrawalsQueue.map((w) => (
                  <div key={w.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h6 className="font-extrabold text-xs text-slate-900">{w.agentName}</h6>
                        <p className="text-[10px] text-slate-400 font-mono">{w.agentPhone}</p>
                      </div>
                      <span className="font-bold text-xs text-indigo-700">{w.pointsQuantity} points</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold text-slate-700 bg-white p-1.5 rounded border">
                      <span>MTN MoMo: {w.paymentMethod}</span>
                      <span className="text-emerald-600 font-black">{w.amountFcfa.toLocaleString()} FCFA</span>
                    </div>

                    <button
                      id={`pay-momo-done-${w.id}`}
                      onClick={() => handleApproveWithdrawal(w.id)}
                      className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black text-[9px] py-1.5 rounded uppercase tracking-wider transition-colors text-center"
                    >
                      Marquer Payé (Débiter)
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin Platform Config Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-1">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Ajuster les Paramètres Platforme
            </h4>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Marge Client (%)</label>
                <input
                  type="number"
                  min="10"
                  max="80"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(parseInt(e.target.value) || 40)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Distance Proximité Anti-Fraude (mètres)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={minGpsDistanceMeters}
                  onChange={(e) => setMinGpsDistanceMeters(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-black"
                />
              </div>

              {configSuccess && (
                <p className="text-[11px] text-emerald-600 font-bold">{configSuccess}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition-transform"
              >
                Mettre à jour
              </button>
            </form>
          </div>

          {/* Admin overall active users list */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl">
            <h4 className="font-extrabold text-sm text-yellow-300 mb-3">Réseau des Agents actifs</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {usersList.filter(u => u.role === "agent").map(user => (
                <div key={user.phone} className="p-2 bg-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-100 block">{user.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{user.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-black">{user.points} pts</span>
                    <span className="block text-[8px] font-mono text-slate-450 uppercase">{user.level} (Score: {user.score}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
