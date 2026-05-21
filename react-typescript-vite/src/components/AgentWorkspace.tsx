import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Compass,
  Award,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Camera,
  Search,
  AlertTriangle,
  FileText
} from "lucide-react";
import { Mission, Submission, User, FieldType, UserRole, AgentLevel } from "../types";

// Setup Leaflet map globally or lazily inside use-effect inside standard sandbox
interface AgentWorkspaceProps {
  currentUser: User;
  missions: Mission[];
  submissions: Submission[];
  withdrawals: any[];
  onRefreshData: () => void;
}

export default function AgentWorkspace({
  currentUser,
  missions,
  submissions,
  withdrawals,
  onRefreshData
}: AgentWorkspaceProps) {
  const [filterCity, setFilterCity] = useState("");
  const [proximityOnly, setProximityOnly] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // Form states
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});
  const [formPhoto, setFormPhoto] = useState<string>("");
  const [formGps, setFormGps] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cashout states
  const [withdrawPoints, setWithdrawPoints] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState("MTN MoMo");
  const [paymentNumber, setPaymentNumber] = useState(currentUser.phone);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any[]>([]);

  // Track user geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn("GPS Geolocation access denied, using default Cotonou coordinates.", err);
          setCoords({ lat: 6.3654, lng: 2.4183 }); // Default Cotonou fallback GPS
        },
        { enableHighAccuracy: true }
      );
    } else {
      setCoords({ lat: 6.3654, lng: 2.4183 });
    }
  }, []);

  // Set up Leaflet map when coordinates or missions update
  useEffect(() => {
    if (!mapContainerRef.current || !coords) return;

    // Wait slightly to ensure styles are loaded
    const timer = setTimeout(() => {
      try {
        const L = (window as any).L;
        if (!L) return;

        if (!mapInstanceRef.current) {
          // Initialize map centered on agent coords
          mapInstanceRef.current = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 13);
          
          // Use OpenStreetMap free vector layer
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstanceRef.current);
        } else {
          mapInstanceRef.current.setView([coords.lat, coords.lng]);
        }

        // Clear existing markers
        markersGroupRef.current.forEach(m => m.remove());
        markersGroupRef.current = [];

        // 1. Current Agent Position marker
        const agentIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white animate-pulse shadow-md"></div>`,
          iconSize: [20, 20]
        });
        const agentMarker = L.marker([coords.lat, coords.lng], { icon: agentIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup("<b>Votre position actuelle</b>");
        markersGroupRef.current.push(agentMarker);

        // 2. Add Active Missions markers
        missions
          .filter(m => m.status === "active")
          .forEach(m => {
            if (m.zone.lat && m.zone.lng) {
              const missionIcon = L.divIcon({
                className: "custom-div-icon",
                html: `<div class="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center shadow-lg border-2 border-white transition-all transform hover:scale-110">
                  +${m.pointsPerCollect}
                </div>`,
                iconSize: [32, 32]
              });

              const marker = L.marker([m.zone.lat, m.zone.lng], { icon: missionIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`
                  <div class="p-1">
                    <h5 class="font-extrabold text-slate-900 border-b pb-1 mb-1 text-xs">${m.title}</h5>
                    <p class="text-[10px] text-slate-500 mb-2">${m.description.slice(0, 60)}...</p>
                    <div class="flex justify-between items-center">
                      <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[10px] rounded">${m.pointsPerCollect} pts</span>
                      <span class="text-[9px] font-bold text-slate-400 capitalize">${m.zone.name}</span>
                    </div>
                  </div>
                `);
              markersGroupRef.current.push(marker);

              // Draw circle representing mission zone scope
              if (m.zone.radiusKm) {
                const circle = L.circle([m.zone.lat, m.zone.lng], {
                  color: "#10b981",
                  fillColor: "#34d399",
                  fillOpacity: 0.15,
                  radius: m.zone.radiusKm * 1000
                }).addTo(mapInstanceRef.current);
                markersGroupRef.current.push(circle);
              }
            }
          });

      } catch (err) {
        console.error("Leaflet loading error: ", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [coords, missions]);

  // Handle Photo input conversion to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Get agent instant GPS coordinate check
  const handleFetchFormGps = () => {
    setFormError("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          setFormError("Impossible de récupérer la position GPS précise. Veuillez autoriser la localisation.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setFormError("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  // Submit collected data
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;

    setFormError("");
    setFormSuccess("");

    // Validation
    const missingFields = selectedMission.fields.filter(
      (f) => f.required && !formAnswers[f.id] && f.type !== FieldType.PHOTO && f.type !== FieldType.GPS
    );

    if (missingFields.length > 0) {
      setFormError(`Le champ '${missingFields[0].label}' est obligatoire.`);
      return;
    }

    // Photo check
    const hasPhotoField = selectedMission.fields.some((f) => f.type === FieldType.PHOTO && f.required);
    if (hasPhotoField && !formPhoto) {
      setFormError("Veuillez prendre/uploader une photo du produit ou rayon.");
      return;
    }

    // GPS check
    const hasGpsField = selectedMission.fields.some((f) => f.type === FieldType.GPS && f.required);
    if (hasGpsField && !formGps) {
      setFormError("Veuillez cliquer sur le bouton d'acquisition GPS de votre position actuelle.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: selectedMission.id,
          agentPhone: currentUser.phone,
          answers: formAnswers,
          photoUrl: formPhoto || undefined,
          gpsLocation: formGps || undefined
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setFormError(resData.error || "Une erreur s'est produite lors de la soumission.");
      } else {
        setFormSuccess("Relevé de terrain soumis avec succès ! L'administrateur va valider les informations.");
        // Reset states
        setFormAnswers({});
        setFormPhoto("");
        setFormGps(null);
        onRefreshData();
        setTimeout(() => {
          setSelectedMission(null);
          setFormSuccess("");
        }, 3000);
      }
    } catch (err) {
      setFormError("Erreur réseau de communication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cashout request
  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    if (withdrawPoints < 50) {
      setWithdrawError("Le montant minimal de retrait de points est de 50 points (500 FCFA).");
      return;
    }

    if (currentUser.points < withdrawPoints) {
      setWithdrawError(`Solde insuffisant. Vous disposez de ${currentUser.points} points.`);
      return;
    }

    try {
      const resp = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentUser.phone,
          points: withdrawPoints,
          method: `${paymentMethod} (${paymentNumber})`
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setWithdrawError(resData.error || "Echec du retrait.");
      } else {
        setWithdrawSuccess(`Demande de retrait de ${withdrawPoints} points enregistrée ! (Valeur brute: ${withdrawPoints * 10} FCFA)`);
        setWithdrawPoints(100);
        onRefreshData();
      }
    } catch (err) {
      setWithdrawError("Erreur de connexion serveur.");
    }
  };

  // Get my submissions stats
  const mySubmissions = submissions.filter((s) => s.agentPhone === currentUser.phone);
  const myApproved = mySubmissions.filter((s) => s.status === "approved");
  const myRejected = mySubmissions.filter((s) => s.status === "rejected");
  const myPending = mySubmissions.filter((s) => s.status === "pending");

  // Filter missions
  const filteredMissions = missions.filter((m) => {
    if (m.status !== "active") return false;
    if (filterCity) {
      return m.zone.name.toLowerCase().includes(filterCity.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div id="agent-points-card" className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Mon Solde Réseau</p>
            <h3 className="text-3xl font-black mt-1 italic tracking-tight text-yellow-300">
              {currentUser.points.toLocaleString()} <span className="text-xs font-normal text-slate-300 not-italic">pts</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Valeur : <span className="text-emerald-400 font-bold">{(currentUser.points * 10).toLocaleString()} FCFA</span>
            </p>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-2 flex items-center justify-between text-[11px] text-emerald-400 font-bold bg-white/5 px-2 py-1 rounded">
            <span>🚀 Gamification {currentUser.level}</span>
          </div>
        </div>

        <div id="agent-approved-card" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collectes Validées</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{myApproved.length}</h3>
          <div className="mt-2 flex items-center text-emerald-500 text-xs font-bold gap-1">
            <CheckCircle className="w-4 h-4" />
            Réputation {currentUser.score}%
          </div>
        </div>

        <div id="agent-rejections-card" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejetées / En attente</p>
          <div className="flex items-baseline space-x-3 mt-1">
            <span className="text-3xl font-black text-rose-600">{myRejected.length}</span>
            <span className="text-slate-300 text-2xl font-light">/</span>
            <span className="text-2xl font-bold text-slate-500">{myPending.length}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Rejet réduit votre score de réputation</p>
        </div>

        {/* Withdrawal form card directly inside */}
        <div id="agent-cashout-card" className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col justify-between text-slate-800">
          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> Demander un Retrait (Min 50)
          </h4>
          <form onSubmit={handleWithdrawRequest} className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500">Points</label>
                <input
                  type="number"
                  min="50"
                  value={withdrawPoints}
                  onChange={(e) => setWithdrawPoints(parseInt(e.target.value) || 50)}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-black text-slate-900 focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500">Montant (FCFA)</label>
                <div className="w-full bg-slate-200/50 rounded px-1.5 py-1 text-xs font-black text-emerald-700">
                  {withdrawPoints * 10} FCFA
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 font-bold">Réseau</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-emerald-600"
                >
                  <option>MTN MoMo</option>
                  <option>Moov Money</option>
                  <option>Celtiis Cash</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500">N° Mobile</label>
                <input
                  type="text"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:outline-emerald-600 font-mono"
                  placeholder="+229..."
                />
              </div>
            </div>
            {withdrawError && <p className="text-[10px] text-rose-600 font-black">{withdrawError}</p>}
            {withdrawSuccess && <p className="text-[10px] text-emerald-600 font-black">{withdrawSuccess}</p>}
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition-colors uppercase tracking-widest mt-1 shadow"
            >
              Envoyer Retrait
            </button>
          </form>
        </div>
      </div>

      {/* Main visual Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Mission Directory */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Filters & Map Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                Missions sur la carte du Bénin
              </h4>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer par ville/marché..."
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Leaflet GPS map container */}
            <div
              id="leaflet-agent-map"
              ref={mapContainerRef}
              className="w-full h-80 rounded-xl relative border border-slate-200 overflow-hidden z-20"
              style={{ minHeight: "320px" }}
            >
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                Chargement de la carte OpenStreetMap béninoise... (Leaflet.js)
              </div>
            </div>
          </div>

          {/* Table List of Missions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-900">Missions terrain ouvertes à proximité</h4>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">1 Point = 10 FCFA</span>
            </div>

            {filteredMissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Aucune mission disponible pour cette ville.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Mission / Localité</th>
                      <th className="px-4 py-3 text-center">Rémunération</th>
                      <th className="px-4 py-3 text-center">Progrès</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMissions.map((m) => {
                      const completedPct = (m.collectedCount / m.totalRequired) * 100;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900 text-sm">{m.title}</div>
                            <p className="text-slate-500 text-xs mt-0.5 max-w-[340px] line-clamp-1">{m.description}</p>
                            <div className="text-[10px] text-slate-400 flex items-center mt-1.5 gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-bold capitalize">
                                📍 {m.zone.name}
                              </span>
                              {m.zone.radiusKm && (
                                <span className="text-slate-500">Rayon: {m.zone.radiusKm} km</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg text-xs shadow-inner">
                              +{m.pointsPerCollect} pts
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center">
                              <div className="w-20 bg-slate-150 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${completedPct}%` }}></div>
                              </div>
                              <span className="text-[9px] mt-1 font-extrabold text-slate-500">
                                {m.collectedCount}/{m.totalRequired} collectes
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              id={`start-collect-${m.id}`}
                              onClick={() => {
                                setSelectedMission(m);
                                setFormAnswers({});
                                setFormPhoto("");
                                setFormGps(coords); // Default load exact pos
                              }}
                              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-black rounded-full group-hover:bg-emerald-600 hover:scale-105 transition-all shadow-sm"
                            >
                              DÉBUTER
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Collection Panel & Retraits History */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Interactive Collection Form Modal/Panel */}
          {selectedMission && (
            <div id="agent-active-form-widget" className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 relative border border-emerald-500/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-[9px] font-black rounded uppercase tracking-widest">
                    Formulaire Dynamique IA
                  </span>
                  <h4 className="font-extrabold text-sm text-yellow-300 mt-1">{selectedMission.title}</h4>
                </div>
                <button
                  onClick={() => setSelectedMission(null)}
                  className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 bg-opacity-80 rounded"
                >
                  Fermer
                </button>
              </div>

              <div className="text-[11px] text-slate-300 mb-4 bg-slate-800 p-2.5 rounded border border-slate-700">
                <span className="font-bold">Instructions du client :</span> {selectedMission.description}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {selectedMission.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>{field.label} {field.required && <span className="text-emerald-400">*</span>}</span>
                      <span className="text-[8px] uppercase text-slate-500 font-mono italic">{field.type}</span>
                    </label>

                    {field.type === FieldType.TEXT && (
                      <input
                        type="text"
                        required={field.required}
                        value={formAnswers[field.id] || ""}
                        onChange={(e) => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                        placeholder="Réponse texte..."
                      />
                    )}

                    {field.type === FieldType.NUMBER && (
                      <input
                        type="number"
                        required={field.required}
                        value={formAnswers[field.id] || ""}
                        onChange={(e) => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                        placeholder="Ex : 1250..."
                      />
                    )}

                    {field.type === FieldType.SELECT && (
                      <select
                        required={field.required}
                        value={formAnswers[field.id] || ""}
                        onChange={(e) => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Sélectionnez une option</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === FieldType.BOOLEAN && (
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setFormAnswers({ ...formAnswers, [field.id]: "Oui" })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            formAnswers[field.id] === "Oui"
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormAnswers({ ...formAnswers, [field.id]: "Non" })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            formAnswers[field.id] === "Non"
                              ? "bg-rose-600 border-rose-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          Non
                        </button>
                      </div>
                    )}

                    {field.type === FieldType.PHOTO && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 py-3 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-705">
                            <Camera className="w-4 h-4 text-emerald-400" />
                            Uploader la photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </label>
                        </div>
                        {formPhoto && (
                          <div className="relative rounded overflow-hidden h-32 bg-slate-950">
                            <img src={formPhoto} alt="Visuel" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {field.type === FieldType.GPS && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleFetchFormGps}
                          className="w-full bg-slate-800 border border-slate-700 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-750 text-emerald-400"
                        >
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          Géolocaliser ma collecte
                        </button>
                        {formGps && (
                          <div className="text-[10px] text-slate-400 leading-tight font-mono text-center bg-slate-850 p-1 rounded">
                            Lat : {formGps.lat.toFixed(6)} | Lng : {formGps.lng.toFixed(6)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {formError && (
                  <p className="text-xs text-rose-400 font-bold bg-rose-950/20 p-2 rounded border border-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
                  </p>
                )}

                {formSuccess && (
                  <p className="text-xs text-emerald-400 font-bold bg-emerald-950/20 p-2 rounded border border-emerald-900">
                    {formSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-black text-xs py-3 rounded-xl transition-all uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> {isSubmitting ? "Envoi..." : "Envoyer mon relevé"}
                </button>
              </form>
            </div>
          )}

          {/* Activity / Withdrawal list widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              Mes demandes de Paiement / Retraits
            </h4>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {withdrawals.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-4 italic">Aucune demande soumise.</div>
              ) : (
                withdrawals.map((w) => {
                  const isCompleted = w.status === "completed";
                  return (
                    <div key={w.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{w.paymentMethod}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs text-slate-900">
                          +{w.amountFcfa.toLocaleString()} FCFA
                        </div>
                        <span className={`inline-block text-[8px] font-black uppercase px-1.5 mt-0.5 rounded-full ${
                          isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {isCompleted ? "Transféré" : "En cours"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Safety Fraud policy brief */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-slate-700 text-xs">
            <h5 className="font-bold text-yellow-800 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Politique Anti-Fraude Bénin
            </h5>
            <p className="mt-1.5 leading-relaxed text-[11px] text-slate-600">
              Chaque soumission sur une mission doit impérativement provenir de coordonnées GPS uniques et être séparée de minimum 50 mètres.
              L'utilisation de photos d'étalage dupliquées entraînera le rejet de la collecte et la suspension immédiate du compte de l'agent.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
