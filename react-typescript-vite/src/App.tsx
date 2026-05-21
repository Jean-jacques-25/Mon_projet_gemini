import React, { useState, useEffect } from "react";
import { UserRole, AgentLevel, Mission, Submission, User, WithdrawalRequest } from "./types";
import Navbar from "./components/Navbar";
import AgentWorkspace from "./components/AgentWorkspace";
import ClientWorkspace from "./components/ClientWorkspace";
import AdminWorkspace from "./components/AdminWorkspace";
import SupportForm from "./components/SupportForm";
import Chatbot from "./components/Chatbot";
import { Sparkles, Shield, UserCheck, Phone, Mail, HelpCircle, FileText, AlertTriangle, Download } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.AGENT);
  
  // Login form states
  const [phone, setPhone] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState<UserRole>(UserRole.AGENT);
  const [showRegister, setShowRegister] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Global data states fetched from server
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Page active tabs (Workspace vs Contact Support)
  const [currentTab, setCurrentTab] = useState<"workspace" | "support">("workspace");
  const [chatBotOpen, setChatBotOpen] = useState(false);

  // Sync state data
  const loadData = async (userPhone?: string) => {
    try {
      // Missions
      const resp1 = await fetch("/api/missions");
      if (resp1.ok) {
        const ms = await resp1.json();
        setMissions(ms);
      }

      // Submissions
      const resp2 = await fetch("/api/admin/stats");
      if (resp2.ok) {
        const statsData = await resp2.json();
        setSubmissions(statsData.allSubmissions || []);
        setWithdrawals(statsData.allWithdrawals || []);
        
        // Update currently logged in user state parameters dynamically
        const phoneToQuery = userPhone || currentUser?.phone;
        if (phoneToQuery) {
          const matchedUser = statsData.allUsers.find((u: any) => u.phone === phoneToQuery);
          if (matchedUser) {
            setCurrentUser(matchedUser);
          }
        }
      }

      // Notifications
      const phoneToQueryNotif = userPhone || currentUser?.phone;
      if (phoneToQueryNotif) {
        const resp3 = await fetch(`/api/notifications?phone=${encodeURIComponent(phoneToQueryNotif)}`);
        if (resp3.ok) {
          const list = await resp3.json();
          setNotifications(list);
        }
      }
    } catch (err) {
      console.warn("Failed syncing API states:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Run sync periodic check to simulate live network
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.phone]);

  // Auth Submit Action: Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!phone) {
      setAuthError("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    try {
      const resp = await fetch("/api/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setAuthError(resData.error || "Une erreur s'est produite.");
      } else {
        setCurrentUser(resData.user);
        setActiveRole(resData.user.role);
        setAuthSuccess("Connexion réussie ! Chargement de l'espace de données.");
        loadData(resData.user.phone);
      }
    } catch (err) {
      setAuthError("Échec de la communication avec le serveur backend.");
    }
  };

  // Auth Submit Action: Register Account
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!regName || !regPhone || !regRole) {
      setAuthError("Le nom complet, le numéro de téléphone et le rôle sont indispensables.");
      return;
    }

    try {
      const resp = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          email: regEmail || undefined,
          role: regRole
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setAuthError(resData.error || "Echec de l'inscription.");
      } else {
        setAuthSuccess("Compte créé avec succès ! Connectez-vous à présent.");
        setPhone(regPhone);
        setShowRegister(false);
      }
    } catch (err) {
      setAuthError("Erreur lors de la communication.");
    }
  };

  // Auth Submit Action: Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      setCurrentUser(null);
      setPhone("");
      setRegName("");
      setRegPhone("");
      setNotifications([]);
    } catch (err) {
      console.warn(err);
    }
  };

  // Marking notification checklist read
  const handleMarkNotifRead = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone })
      });
      loadData();
    } catch (err) {
      console.warn(err);
    }
  };

  // Pre-load demo credentials for effortless evaluation
  const triggerDemoAccount = (demoPhone: string) => {
    setPhone(demoPhone);
    setAuthError("");
  };

  // Non logged interface screen (Visual Masterpiece)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4 text-slate-100">
        <div className="w-full max-w-4xl bg-[#121b15]/95 border-2 border-emerald-500/25 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Logo Brand information sidebar (Left side) */}
          <div className="md:col-span-5 p-6 md:p-10 bg-gradient-to-br from-emerald-950 to-slate-900 border-r border-emerald-500/10 flex flex-col justify-between text-slate-100">
            <div>
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl">
                DB
              </div>
              <h2 className="text-2xl font-black mt-6 leading-tight">
                DataBroker229 <span className="text-emerald-500 underline decoration-yellow-400">🇧🇯</span>
              </h2>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mt-1">Bénin</p>

              <blockquote className="mt-8 italic text-xs text-slate-350 border-l-2 border-emerald-500 pl-3">
                "Des données terrain fiables, partout au Bénin."
              </blockquote>
            </div>

            <div className="space-y-4 pt-8">
              <div className="text-xs space-y-1.5 font-medium text-slate-300">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-500 shrink-0" /> jeanjacquesaguin30@gmail.com
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" /> WhatsApp : +229 55256871
                </p>
              </div>

              <p className="text-[10px] text-slate-450">
                © 2026 DataBroker229 Inc. Tous droits réservés.
              </p>
            </div>
          </div>

          {/* Form and Demo signin selectors (Right side) */}
          <div className="md:col-span-7 p-6 md:p-10 bg-slate-900 flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-white">
                {showRegister ? "Créez votre compte de données" : "Accédez à la plateforme"}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {showRegister ? "Inscrivez-vous et commencez à opérer" : "Connexion sécurisée par numéro de téléphone"}
              </p>
            </div>

            {authError && (
              <p className="text-xs text-rose-450 bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg font-black">
                ⚠️ {authError}
              </p>
            )}

            {authSuccess && (
              <p className="text-xs text-emerald-450 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg font-bold">
                {authSuccess}
              </p>
            )}

            {!showRegister ? (
              // Login form
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Numéro de Téléphone Béninois *</label>
                  <input
                    id="login-phone-input"
                    type="text"
                    required
                    placeholder="Ex : +22997000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-emerald-500 font-mono"
                  />
                </div>

                <button
                  id="submit-login-btn"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-black text-xs py-3 rounded-xl transition-all uppercase tracking-widest shadow-lg"
                >
                  Entrer
                </button>

                <div className="text-center pt-2">
                  <button
                    id="toggle-register-btn"
                    type="button"
                    onClick={() => {
                      setShowRegister(true);
                      setAuthError("");
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Pas encore de compte ? S'inscrire ici
                  </button>
                </div>
              </form>
            ) : (
              // Register form
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">Nom Complet *</label>
                    <input
                      id="reg-name-input"
                      type="text"
                      required
                      placeholder="Ex: Koffi Saliou"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-705 rounded-xl px-3 py-2 text-xs focus:outline-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">N° de Téléphone *</label>
                    <input
                      id="reg-phone-input"
                      type="text"
                      required
                      placeholder="Ex: +22961000001"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-705 rounded-xl px-3 py-2 text-xs focus:outline-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">Couriel (Optionnel)</label>
                    <input
                      id="reg-email-input"
                      type="email"
                      placeholder="koffi@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-705 rounded-xl px-3 py-2 text-xs focus:outline-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">Rôle d'utilisation *</label>
                    <select
                      id="reg-role-select"
                      required
                      value={regRole}
                      onChange={(e: any) => setRegRole(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-705 rounded-xl px-3 py-2 text-xs focus:outline-emerald-500"
                    >
                      <option value={UserRole.AGENT}>Agent de terrain (collecte relevés)</option>
                      <option value={UserRole.CLIENT}>Client d'Enquêtes (création & rapports)</option>
                    </select>
                  </div>
                </div>

                <button
                  id="submit-register-btn"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-black text-xs py-3 rounded-xl transition-all uppercase tracking-widest shadow-lg"
                >
                  S'inscrire
                </button>

                <div className="text-center pt-2">
                  <button
                    id="toggle-login-btn"
                    type="button"
                    onClick={() => {
                      setShowRegister(false);
                      setAuthError("");
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Déjà inscrit ? Se connecter ici
                  </button>
                </div>
              </form>
            )}

            {/* Quick Demo Selector for evaluation convenience */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-450 uppercase block text-center">
                Comptes de test préconfigurés (cliquez pour remplir) :
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => triggerDemoAccount("+22961000001")}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-755 rounded text-[10px] font-bold text-emerald-450 border border-emerald-950"
                >
                  Agent Saliou (+22961)
                </button>
                <button
                  onClick={() => triggerDemoAccount("+22962000002")}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-755 rounded text-[10px] font-bold text-emerald-450 border border-emerald-950"
                >
                  Agent Bernice (+22962)
                </button>
                <button
                  onClick={() => triggerDemoAccount("+22955000001")}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-755 rounded text-[10px] font-bold text-emerald-450 border border-emerald-950"
                >
                  Client Jean-Jacques
                </button>
                <button
                  onClick={() => triggerDemoAccount("+22999999999")}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-755 rounded text-[10px] font-bold text-yellow-500 border border-amber-955"
                >
                  Admin Central
                </button>
              </div>
            </div>

            {/* Direct code export PWA download banner */}
            <div className="pt-4 border-t border-slate-800 text-center space-y-2">
              <a
                href="/databroker229-export.zip"
                download
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-black py-2.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4 shrink-0" /> Télécharger l'export complet (ZIP)
              </a>
              <p className="text-[10px] text-slate-400 leading-relaxed px-4">
                Version finale autonome PWA pour téléphones Android + code Flask d'arrière-plan + cartes techniques (MAP & REFERENCES).
              </p>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      
      {/* Dynamic top Nav bar */}
      <Navbar
        currentUser={currentUser}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotifRead}
        onLogout={handleLogout}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        openChatbot={() => setChatBotOpen(true)}
        openSupport={() => setCurrentTab("support")}
      />

      {/* Main layout container with sidebar or direct views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col space-y-6">
        
        {/* Navigation Tabs - Workspace vs Support */}
        <div className="flex items-center space-x-1 border-b border-slate-200">
          <button
            id="tab-workspace"
            onClick={() => setCurrentTab("workspace")}
            className={`px-4 py-2 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
              currentTab === "workspace"
                ? "border-emerald-600 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Données du Réseau
          </button>
          <button
            id="tab-support"
            onClick={() => setCurrentTab("support")}
            className={`px-4 py-2 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
              currentTab === "support"
                ? "border-emerald-600 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Signaler un Problème
          </button>
        </div>

        {/* Dynamic screen views switching */}
        {currentTab === "support" ? (
          <SupportForm currentUser={currentUser} />
        ) : (
          <div>
            {activeRole === UserRole.AGENT && (
              <AgentWorkspace
                currentUser={currentUser}
                missions={missions}
                submissions={submissions}
                withdrawals={withdrawals.filter((w) => w.agentPhone === currentUser.phone)}
                onRefreshData={() => loadData()}
              />
            )}

            {activeRole === UserRole.CLIENT && (
              <ClientWorkspace
                currentUser={currentUser}
                missions={missions}
                submissions={submissions}
                onRefreshData={() => loadData()}
              />
            )}

            {activeRole === UserRole.ADMIN && (
              <AdminWorkspace onRefreshData={() => loadData()} />
            )}
          </div>
        )}

      </main>

      {/* Floating Chatbot Assistant panel */}
      <Chatbot isOpen={chatBotOpen} onClose={() => setChatBotOpen(false)} />

      {/* Floating trigger widget */}
      {!chatBotOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            id="floating-trigger-chatbot-btn"
            onClick={() => setChatBotOpen(true)}
            className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all transform hover:scale-105"
            title="Poser une question à l'assistant virtuel"
          >
            <HelpCircle className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Footer information section */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 px-4 md:px-8 shrink-0">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <div>
            <h5 className="text-sm font-black text-white">
              DataBroker229 <span className="text-emerald-500 underline decoration-yellow-400">🇧🇯</span> Bénin
            </h5>
            <p className="text-xs text-slate-400 mt-1">
              "Des données terrain fiables, partout au Bénin."
            </p>
          </div>
          <div className="text-xs space-y-0.5 md:text-right">
            <p>Assistance officielle WhatsApp : <a href="https://wa.me/22955256871" target="_blank" rel="noreferrer" className="text-emerald-400 font-extrabold font-mono hover:underline">+229 55256871</a></p>
            <p>Email commercial : <a href="mailto:jeanjacquesaguin30@gmail.com" className="text-indigo-400 font-mono hover:underline">jeanjacquesaguin30@gmail.com</a></p>
          </div>
        </div>
      </footer>

    </div>
  );
}
