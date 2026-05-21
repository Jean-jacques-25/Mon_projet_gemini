import React, { useState } from "react";
import { HelpCircle, Mail, AlertTriangle, Send, PhoneCall, FileText } from "lucide-react";

interface SupportFormProps {
  currentUser: {
    phone: string;
    name: string;
  } | null;
}

export default function SupportForm({ currentUser }: SupportFormProps) {
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!description) {
      setError("Veuillez formuler une description détaillée de votre problème.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentUser?.phone || "+22900000000",
          name: currentUser?.name || "Visiteur anonyme",
          category,
          description,
          screenshot: screenshot || undefined
        })
      });

      const resData = await resp.json();
      if (!resp.ok) {
        setError(resData.error || "Echec de l'enregistrement du ticket.");
      } else {
        setSuccess("Votre signalement a été enregistré ! Notre équipe technique l'examine.");
        setDescription("");
        setScreenshot("");
      }
    } catch (err) {
      setError("Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      <div className="border-b pb-3 mb-4">
        <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          Centre d'Assistance & Support Client Bénin
        </h4>
        <p className="text-slate-500 text-xs mt-1">
          Un souci technique avec le GPS, un paiement retardé ou une question d'utilisation ? Nos conseillers sont à votre écoute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Support creation form */}
        <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie du problème</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-emerald-600"
              >
                <option value="bug">Bug de l'application</option>
                <option value="payment">Problème de Paiement ou Retrait</option>
                <option value="mission">Problème de Mission terrain</option>
                <option value="gps_photo">Dysfonctionnement GPS ou Caméra</option>
                <option value="account">Gestion de compte</option>
                <option value="other">Autre demande</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capture d'écran (Optionnel)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description détaillée du problème *</label>
            <textarea
              rows={4}
              required
              placeholder="Expliquez-nous précisément ce que vous observez (indiquez le modèle d'appareil ou d'autres marqueurs si nécessaire)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {screenshot && (
            <div className="relative border rounded-lg overflow-hidden h-32 w-48 bg-slate-100">
              <img src={screenshot} alt="Screenshot preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setScreenshot("")}
                className="absolute top-1 right-1 bg-red-650 hover:bg-red-700 text-white rounded-full p-1 text-[8px] font-bold"
              >
                X
              </button>
            </div>
          )}

          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-2 border rounded">{success}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 text-emerald-400" /> {isSubmitting ? "Envoi..." : "Envoyer le Signalement"}
          </button>
        </form>

        {/* Support contact info (Right Column) */}
        <div className="md:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-slate-700">
          <div>
            <h5 className="font-extrabold text-sm text-slate-900 mb-1">Assistance Express</h5>
            <p className="text-xs text-slate-500">Contactez directement notre régulation béninoise en cas de blocage.</p>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            
            <a
              href="https://wa.me/22955256871"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-110 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block">WhatsApp Officiel</span>
                <span className="text-emerald-600 font-bold font-mono">+229 55256871</span>
              </div>
            </a>

            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block">E-mail Support</span>
                <span className="text-indigo-600 font-bold font-mono">jeanjacquesaguin30@gmail.com</span>
              </div>
            </div>

            <div className="p-3.5 bg-yellow-50 border border-yellow-250 rounded-xl text-yellow-850 text-[11px] font-medium leading-relaxed">
              <span className="font-bold block text-yellow-800 mb-1">⏰ Heures d'ouverture des paiements:</span>
              Les validations de collectes et transferts MoMo s'effectuent tous les jours de la semaine, entre 08h00 et 20h00, heure de Cotonou.
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
