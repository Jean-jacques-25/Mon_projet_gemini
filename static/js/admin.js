let adminStats = null;

function initializeAdminLayout() {
    fetchAdminDashboardStats();
}

// Fetch Admin statistical reports
async function fetchAdminDashboardStats() {
    try {
        const resp = await fetch("/api/admin/stats");
        if (!resp.ok) return;

        const data = await resp.json();
        adminStats = data.stats;

        // Populate KPIs
        document.getElementById("admin-kpi-revenues").innerText = `${adminStats.platformRevenuesFcfa.toLocaleString()} FCFA`;
        document.getElementById("admin-kpi-users").innerText = `${adminStats.totalUsers} (Agents: ${adminStats.agentsCount})`;
        document.getElementById("admin-kpi-frauds").innerText = adminStats.fraudAlertsCount;

        // Populate configs and forms values
        document.getElementById("admin-cfg-margin").value = adminStats.marginPercent;
        document.getElementById("admin-cfg-dist").value = adminStats.minGpsDistanceMeters;

        // Redraw lists
        renderAdminSubmissionsQueue(data.allSubmissions);
        renderAdminWithdrawalsQueue(data.allWithdrawals);
        renderAdminFraudLogs(data.fraudLogs);

    } catch (err) {
        console.warn("Administration permissions required.");
    }
}

// Render submissions checking queue
function renderAdminSubmissionsQueue(subs) {
    const queue = document.getElementById("admin-submissions-queue");
    const counterBadge = document.getElementById("admin-val-queue-count");
    if (!queue) return;

    // Filter pending structures
    const pending = subs.filter(s => s.status === 'pending');
    counterBadge.innerText = `${pending.length} dossiers`;

    if (pending.length === 0) {
        queue.innerHTML = `
            <div class="p-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-dashed">
                Excellent, aucun relevé d'enquêteur n'est suspecté ou en attente d'approbation !
            </div>
        `;
        return;
    }

    queue.innerHTML = pending.map(s => {
        let fraudBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-250";
        if (s.fraudScore === 'eleve') {
            fraudBadgeColor = "bg-red-100 text-red-700 border-red-200 animate-pulse";
        } else if (s.fraudScore === 'moyen') {
            fraudBadgeColor = "bg-amber-100 text-amber-700 border-amber-200";
        }

        return `
            <div class="p-5 bg-slate-50 border border-slate-200 rounded-3xl relative overflow-hidden space-y-4 text-xs">
                
                <div class="absolute top-4 right-4">
                    <span class="px-2.5 py-0.5 text-[9px] font-black uppercase rounded border ${fraudBadgeColor}">
                        Risque Fraude : ${s.fraudScore}
                    </span>
                </div>

                <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Dossier : ${s.id}</span>
                    <h5 class="font-black text-slate-900 text-sm mt-0.5">${s.missionTitle}</h5>
                    <p class="text-slate-500 text-[11px] mt-0.5">Collecteur : <b>${s.agentName}</b> (${s.agentPhone})</p>
                </div>

                <!-- Warnings boxes if suspicious activity logging -->
                ${s.fraudAlerts && s.fraudAlerts.length > 0 ? `
                    <div class="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-rose-700 leading-relaxed text-[11px]">
                        <span class="font-extrabold flex items-center gap-1"><i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i> Alerte fraude système :</span>
                        <ul class="list-disc list-inside mt-1 pl-1 text-[10px] space-y-0.5">
                            ${s.fraudAlerts.map(alert => `<li>${alert}</li>`).join("")}
                        </ul>
                    </div>
                ` : ''}

                <!-- Answers and images panel -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Réponses fournies</span>
                        <div class="bg-white rounded-xl border divide-y divide-slate-100">
                            ${Object.entries(s.answers).map(([k, v]) => `
                                <div class="p-2 flex justify-between gap-4">
                                    <span class="text-slate-400">${k}</span>
                                    <span class="font-bold text-slate-800 text-right">${v || 'true'}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Preuve d'image</span>
                        <div class="border rounded-2xl overflow-hidden bg-slate-950 h-36 flex items-center justify-center relative">
                            ${s.photoUrl && s.photoUrl.startsWith("data:") ? `
                                <img src="${s.photoUrl}" alt="Photo collecte" class="w-full h-full object-contain" />
                            ` : `
                                <span class="text-[10px] text-slate-500 font-mono">📷 PHOTO HASH OK</span>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Input actions logic -->
                <div class="flex gap-2 pt-3 border-t">
                    <input type="text" id="admin-feedback-${s.id}" placeholder="Entrez le commentaire ou le motif officiel de rejet..." class="flex-1 bg-white border rounded-xl px-3 py-1.5 focus:outline-slate-900" />
                    <button onclick="validatedSubmission('${s.id}', 'reject')" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-xl uppercase font-black tracking-wider shadow">Rejeter</button>
                    <button onclick="validatedSubmission('${s.id}', 'approve')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl uppercase font-black tracking-wider shadow">Accepter</button>
                </div>

            </div>
        `;
    }).join("");
    lucide.createIcons();
}

// Trigger validation actions (approve / reject)
async function validatedSubmission(subId, action) {
    const fb = document.getElementById(`admin-feedback-${subId}`).value.trim();
    const payload = {
        submissionId: subId,
        action: action,
        feedback: fb
    };

    try {
        const resp = await fetch("/api/submissions/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            await fetchAdminDashboardStats();
            await syncAllWorkspaceData();
        }
    } catch(err){}
}

// Render transfer payouts
function renderAdminWithdrawalsQueue(ws) {
    const container = document.getElementById("admin-withdrawals-queue");
    if (!container) return;

    const pending = ws.filter(w => w.status === 'pending');
    if (pending.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 italic text-[11px]">Aucun retrait en attente.</div>`;
        return;
    }

    container.innerHTML = pending.map(w => `
        <div class="p-3 bg-slate-50 border border-indigo-100 rounded-2xl space-y-2 text-[11px]">
            <div class="flex justify-between items-center lider-none">
                <div>
                    <h6 class="font-extrabold text-slate-900">${w.agentName}</h6>
                    <span class="text-[9px] text-slate-400 leading-none">${w.agentPhone}</span>
                </div>
                <span class="font-bold text-slate-500 font-mono">${w.pointsQuantity} PTS</span>
            </div>

            <div class="bg-white p-1.5 rounded border border-slate-100 flex justify-between font-mono font-bold leading-none">
                <span class="text-slate-400">Paiement :</span>
                <span class="text-emerald-600">${w.amountFcfa.toLocaleString()} FCFA</span>
            </div>

            <button onclick="approveAdminPayoutWire('${w.id}')" class="w-full bg-slate-900 hover:bg-emerald-605 text-white py-1 rounded font-bold uppercase text-[9px] tracking-wider">
                Marquer payé (Virement MoMo OK)
            </button>
        </div>
    `).join("");
}

// Mark MoMo completed payouts wire
async function approveAdminPayoutWire(withdrawalId) {
    try {
        const resp = await fetch("/api/withdrawals/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ withdrawalId: withdrawalId })
        });
        if (resp.ok) {
            alert("Virement marqué payé ! Le compte de l'enquêteur à été mis à jour.");
            await fetchAdminDashboardStats();
        }
    } catch (err){}
}

// Save admin configurations parameters
async function saveAdminConfig(e) {
    e.preventDefault();
    const margin = document.getElementById("admin-cfg-margin").value;
    const distance = document.getElementById("admin-cfg-dist").value;

    const payload = {
        marginPercent: parseFloat(margin) || 40,
        minGpsDistanceMeters: parseInt(distance) || 50
    };

    try {
        const resp = await fetch("/api/admin/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            alert("Configurations enregistrées !");
            await fetchAdminDashboardStats();
        }
    } catch(err){}
}

// Render dynamic suspensions tables
function renderAdminFraudLogs(logs) {
    const container = document.getElementById("admin-fraud-logs-stack");
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = `<span class="italic text-slate-400 block py-4 text-center">Aucune fraude répertoriée.</span>`;
        return;
    }

    container.innerHTML = logs.map(l => `
        <div class="p-2 bg-slate-800 rounded-xl space-y-1">
            <div class="flex justify-between font-bold">
                <span class="text-rose-400 font-mono uppercase">${l.type}</span>
                <span class="text-[8px] bg-rose-500/20 px-1 rounded text-rose-300 font-mono uppercase">${l.severity}</span>
            </div>
            <p class="text-slate-300 leading-relaxed text-[9px]">${l.description}</p>
        </div>
    `).join("");
}
