let clientFieldsList = [
    { id: "f-1", type: "text", label: "Lieu exact / Nom du point de vente", required: true },
    { id: "f-2", type: "number", label: "Prix relevé (FCFA)", required: true },
    { id: "f-3", type: "photo", label: "Photo d'étalage en situation réelle", required: true },
    { id: "f-4", type: "gps", "label": "Point de validation géographique", required: true }
];

function initializeClientLayout() {
    renderClientMissionsList();
    renderClientFieldsPreviewStack();
    recalculateClientPricingEstimates();
}

// Draw creation questionnaires stack fields
function renderClientFieldsPreviewStack() {
    const stack = document.getElementById("create-m-fields-stack");
    if (!stack) return;

    document.getElementById("create-m-fields-count").innerText = `${clientFieldsList.length} champs configurés`;

    if (clientFieldsList.length === 0) {
        stack.innerHTML = `<p class="text-[10px] text-slate-400 italic py-2">Aucun champ configuré.</p>`;
        return;
    }

    stack.innerHTML = clientFieldsList.map((f, idx) => `
        <div class="flex justify-between items-center py-1.5 text-[11px] hover:bg-slate-50">
            <div>
                <span class="font-bold text-slate-700 font-mono">${idx + 1}. ${f.label}</span>
                <span class="text-[9px] bg-slate-100 text-slate-400 px-1 rounded ml-1.5 uppercase font-mono font-bold">${f.type}</span>
                ${f.required ? '<span class="text-[9px] text-emerald-600 font-bold ml-1 font-mono italic">(requis)</span>' : ''}
            </div>
            <button type="button" onclick="removeFieldFromCreation(${idx})" class="p-1 text-rose-600 hover:bg-rose-50 rounded"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
        </div>
    `).join("");
    lucide.createIcons();
}

function addFieldToCreationMission() {
    const label = document.getElementById("create-m-new-label").value.trim();
    const type = document.getElementById("create-m-new-type").value;
    if (!label) return;

    clientFieldsList.push({
        id: `f-${Date.now()}`,
        type: type,
        label: label,
        required: true
    });

    document.getElementById("create-m-new-label").value = "";
    renderClientFieldsPreviewStack();
}

function removeFieldFromCreation(idx) {
    clientFieldsList.splice(idx, 1);
    renderClientFieldsPreviewStack();
}

// Devis price Simulator (markup 40% incorporated)
function recalculateClientPricingEstimates() {
    const required = parseInt(document.getElementById("create-m-total-required").value) || 10;
    const budgetUnit = parseInt(document.getElementById("create-m-budget-agent").value) || 1000;
    
    const marginFraction = 1 - 0.40; // DB Platform commission is 40%
    const globalValue = Math.round((budgetUnit * required) / marginFraction);

    document.getElementById("create-m-pricing-total").innerText = `${globalValue.toLocaleString()} FCFA`;
}

// Trigger Google Gemini automated questionnaires suggetion
async function suggestMissionsViaGemini() {
    const prompt = document.getElementById("client-ai-prompt").value.trim();
    const city = document.getElementById("create-m-zone-name").value.trim();
    const btn = document.getElementById("client-ai-suggest-btn");

    if (!prompt) return;

    btn.disabled = true;
    btn.innerText = "IA Analyse...";

    try {
        const resp = await fetch("/api/missions/ai-suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt, clientCity: city })
        });

        if (resp.ok) {
            const data = await resp.json();
            
            // Populate configurations
            document.getElementById("create-m-title").value = data.title || "";
            document.getElementById("create-m-description").value = data.description || "";
            document.getElementById("create-m-total-required").value = data.totalRequired || 10;
            document.getElementById("create-m-budget-agent").value = data.budgetAgentFcfa || 1200;
            
            if (data.zone) {
                document.getElementById("create-m-zone-type").value = data.zone.type || "city";
                document.getElementById("create-m-zone-name").value = data.zone.name || "Cotonou";
            }

            if (data.fields && data.fields.length > 0) {
                clientFieldsList = data.fields;
                renderClientFieldsPreviewStack();
            }

            recalculateClientPricingEstimates();
        }
    } catch (err) {
        console.warn("AI suggestions temporarily offline.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Suggérer 🪄";
    }
}

// Create & Submit target mission
async function createNewMission(e) {
    e.preventDefault();
    const errBox = document.getElementById("client-create-error");
    const succBox = document.getElementById("client-create-success");
    errBox.classList.add("hidden");
    succBox.classList.add("hidden");

    const title = document.getElementById("create-m-title").value.trim();
    const totalRequired = parseInt(document.getElementById("create-m-total-required").value) || 10;
    const description = document.getElementById("create-m-description").value.trim();
    const zoneType = document.getElementById("create-m-zone-type").value;
    const zoneName = document.getElementById("create-m-zone-name").value.trim();
    const budgetUnit = parseInt(document.getElementById("create-m-budget-agent").value) || 1200;

    if (clientFieldsList.length === 0) {
        errBox.innerText = "Veuillez insérer au moins une question de formulaire avant de sauvegarder.";
        errBox.classList.remove("hidden");
        return;
    }

    const payload = {
        title: title,
        description: description,
        clientPhone: currentUser.phone,
        clientName: currentUser.name,
        totalRequired: totalRequired,
        budgetAgentFcfa: budgetUnit,
        zone: {
            type: zoneType,
            name: zoneName,
            lat: 6.36, // Cotonou general
            lng: 2.44,
            radiusKm: 5.0
        },
        fields: clientFieldsList
    };

    try {
        const resp = await fetch("/api/missions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const resData = await resp.json();
        if (!resp.ok) {
            errBox.innerText = resData.error || "Echec du dépôt.";
            errBox.classList.remove("hidden");
        } else {
            succBox.innerText = "Mission enregistrée ! Elle est visible sous la file 'Attente Paiement' ci-contre.";
            succBox.classList.remove("hidden");
            
            // clear creators
            document.getElementById("create-m-title").value = "";
            document.getElementById("create-m-description").value = "";
            document.getElementById("client-ai-prompt").value = "";

            await syncAllWorkspaceData();
        }
    } catch (err) {
        errBox.innerText = "Erreur serveur.";
        errBox.classList.remove("hidden");
    }
}

// Render Client's active missions listings
async function renderClientMissionsList() {
    const container = document.getElementById("client-missions-container");
    if (!container) return;

    const sponsorMissions = missions.filter(m => m.clientPhone === currentUser.phone);

    // Update Client KPIs dynamically
    document.getElementById("client-active-missions-count").innerText = sponsorMissions.filter(m => m.status === 'active').length;
    document.getElementById("client-unpaid-missions-count").innerText = sponsorMissions.filter(m => m.status === 'en_attente_paiement').length;

    if (sponsorMissions.length === 0) {
        container.innerHTML = `<div class="text-center text-slate-400 py-6 italic text-xs">Aucune mission déposée pour l'instant.</div>`;
        return;
    }

    container.innerHTML = sponsorMissions.map(m => {
        const pct = Math.round((m.collectedCount / m.totalRequired) * 100);
        const isUnpaid = m.status === 'en_attente_paiement';
        
        return `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div class="flex justify-between items-start leading-none">
                    <h5 class="font-extrabold text-slate-900 truncate max-w-[140px]">${m.title}</h5>
                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                        m.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'terminee' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                    }">${m.status === 'active' ? 'active' : m.status === 'terminee' ? 'complétée' : 'impayée'}</span>
                </div>

                <div class="flex justify-between text-[10px] text-slate-400">
                    <span>Cotonou (📍 ${m.zone.name})</span>
                    <span>Relevés : <b>${m.collectedCount}/${m.totalRequired}</b></span>
                </div>

                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div class="bg-emerald-600 h-1 rounded-full" style="width: ${pct}%"></div>
                </div>

                <div class="pt-1.5 border-t border-slate-200/50">
                    ${isUnpaid ? `
                        <button onclick="simulateClientMobilePayment('${m.id}')" class="w-full bg-yellow-500 hover:bg-yellow-650 text-slate-950 text-[9px] font-black py-1 rounded uppercase tracking-wide">
                            💳 Régler (${m.totalCostClientFcfa.toLocaleString()} FCFA)
                        </button>
                    ` : `
                        <a href="/api/export/csv?missionId=${m.id}" download class="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] py-1 rounded uppercase tracking-wide flex items-center justify-center gap-1">
                            <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-400"></i> Télécharger (CSV)
                        </a>
                    `}
                </div>
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

// Mobile Money checkout simulation
async function simulateClientMobilePayment(missionId) {
    try {
        const resp = await fetch("/api/missions/pay-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ missionId: missionId })
        });
        if (resp.ok) {
            alert("Votre paiement MoMo à bien été traité par la banque ! Les agents du réseau commencent la collecte.");
            await syncAllWorkspaceData();
        }
    } catch (err){}
}
