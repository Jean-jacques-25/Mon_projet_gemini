let map = null;
let agentGps = { lat: 6.3654, lng: 2.4183 }; // Default Cotonou
let mapMarkers = [];
let selectedMissionForClaim = null;
let proximitySortEnabled = false;

// Initialize agent workspace layout
function initializeAgentLayout() {
    renderAgentMissionsTable();
    initLeafletAgentMap();
    updateAgentKpiFields();
}

// Fetch current GPS continuously
navigator.geolocation.watchPosition(
    (pos) => {
        agentGps.lat = pos.coords.latitude;
        agentGps.lng = pos.coords.longitude;
        
        const badge = document.getElementById("agent-gps-feedback");
        if (badge) {
            badge.innerText = "GPS Actif 📍";
            badge.className = "text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-tighter";
        }
    },
    (err) => {
        console.warn("GPS Access Denied or Pending.", err);
    },
    { enableHighAccuracy: true }
);

// Init Map
function initLeafletAgentMap() {
    const container = document.getElementById("map");
    if (!container || map) return; // Prevent double initialization

    // Instantiate map
    map = L.map("map").setView([agentGps.lat, agentGps.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // Refresh map marker pins
    redrawMapMarkers();
}

function redrawMapMarkers() {
    if (!map) return;
    
    // Clear old markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    // Plat Agent location with a custom red icon or standard marker
    const agentMarker = L.circleMarker([agentGps.lat, agentGps.lng], {
        radius: 8,
        color: "#ffffff",
        fillColor: "#e11d48",
        fillOpacity: 0.9,
        weight: 2
    }).addTo(map).bindPopup("<b>Vous êtes ici 📍</b>");
    mapMarkers.push(agentMarker);

    // Plot visible active missions
    const activeMissions = missions.filter(m => m.status === 'active');
    activeMissions.forEach(m => {
        const zone = m.zone;
        if (!zone.lat || !zone.lng) return;

        // Add Circle representing survey zone
        const circle = L.circle([zone.lat, zone.lng], {
            color: "#059669",
            fillColor: "#10b981",
            fillOpacity: 0.15,
            radius: (zone.radiusKm || 5.0) * 1000 // In meters
        }).addTo(map);
        mapMarkers.push(circle);

        // Add Pin marker
        const pin = L.marker([zone.lat, zone.lng]).addTo(map)
            .bindPopup(`
                <div class="text-xs font-bold leading-tight space-y-1">
                    <span class="block">${m.title}</span>
                    <span class="text-emerald-600 font-mono">${m.pointsPerCollect} PTS/collecte</span>
                    <button onclick="loadMissionForm('${m.id}')" class="block w-full bg-slate-900 text-white p-1 rounded text-[10px] mt-1 text-center font-bold font-sans uppercase">Saisir terrain</button>
                </div>
            `);
        mapMarkers.push(pin);
    });
}

// Draw list records
function renderAgentMissionsTable() {
    const tbody = document.getElementById("agent-missions-tbody");
    if (!tbody) return;

    let activeMissions = missions.filter(m => m.status === 'active');

    // Filter by search cities
    const textFilter = document.getElementById("agent-city-filter-input")?.value?.trim()?.toLowerCase();
    if (textFilter) {
        activeMissions = activeMissions.filter(m => m.zone.name?.toLowerCase().includes(textFilter));
    }

    if (activeMissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400 italic">Aucune mission trouvée pour votre sélection.</td></tr>`;
        return;
    }

    tbody.innerHTML = activeMissions.map(m => {
        let distanceText = "Calcul...";
        if (m.zone.lat && m.zone.lng) {
            // Earth radius calculation
            const d = calculateDistance(agentGps.lat, agentGps.lng, m.zone.lat, m.zone.lng);
            distanceText = `${d.toFixed(1)} km`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-100">
                <td class="p-3">
                    <div class="font-extrabold text-slate-900">${m.title}</div>
                    <div class="text-[10px] text-slate-450 mt-0.5">📍 Zone : <b>${m.zone.name}</b> (${distanceText})</div>
                </td>
                <td class="p-3 font-medium text-slate-500">
                    <span class="block text-[10px] uppercase font-mono bg-slate-100 rounded px-1.5 w-max">${m.collectedCount}/${m.totalRequired} collectes</span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="loadMissionForm('${m.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-black px-3 py-1 rounded-xl text-[10px] uppercase tracking-wide">
                        +${m.pointsPerCollect} PTS
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Calculate distance clientside
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Toggle proximity sorting
function switchProximitySort(flag) {
    proximitySortEnabled = flag;
    if (flag) {
        missions.sort((a,b) => {
            const dA = calculateDistance(agentGps.lat, agentGps.lng, a.zone.lat, a.zone.lng);
            const dB = calculateDistance(agentGps.lat, agentGps.lng, b.zone.lat, b.zone.lng);
            return dA - dB;
        });
        renderAgentMissionsTable();
    }
}

// Load static/dynamic Form schema fields
function loadMissionForm(missionId) {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    selectedMissionForClaim = mission;

    // Toggle panels visibility
    document.getElementById("form-inner-fields").classList.remove("hidden");
    document.getElementById("form-selected-title").innerText = mission.title;
    document.getElementById("form-selected-desc").innerText = mission.description;
    document.getElementById("form-mission-id").value = missionId;

    const container = document.getElementById("programmatic-fields-container");
    container.innerHTML = ""; // Clear

    mission.fields.forEach(f => {
        let html = "";
        const reqStr = f.required ? "required" : "";

        if (f.type === 'text') {
            html = `
                <div>
                    <label class="block text-slate-705 font-bold mb-1">${f.label} ${f.required ? '*' : ''}</label>
                    <input type="text" name="field-${f.id}" ${reqStr} placeholder="Saisissez la réponse..." class="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-emerald-600" />
                </div>
            `;
        } else if (f.type === 'number') {
            html = `
                <div>
                    <label class="block text-slate-705 font-bold mb-1">${f.label} ${f.required ? '*' : ''}</label>
                    <input type="number" name="field-${f.id}" ${reqStr} placeholder="Ex: 1200" class="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5 focus:bg-white" />
                </div>
            `;
        } else if (f.type === 'boolean') {
            html = `
                <div class="flex items-center gap-2 py-1">
                    <input type="checkbox" name="field-${f.id}" value="Oui" class="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                    <label class="text-slate-705 font-bold">${f.label}</label>
                </div>
            `;
        } else if (f.type === 'select') {
            const opts = f.options || ["Sélectionner"];
            html = `
                <div>
                    <label class="block text-slate-705 font-bold mb-1">${f.label} ${f.required ? '*' : ''}</label>
                    <select name="field-${f.id}" ${reqStr} class="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5">
                        ${opts.map(o => `<option value="${o}">${o}</option>`).join("")}
                    </select>
                </div>
            `;
        } else if (f.type === 'photo') {
             html = `
                <div class="hidden">
                    <!-- Inline images requested is handled via the separate global base64 encoder below -->
                </div>
             `;
        } else if (f.type === 'gps') {
             html = `
                <div class="hidden">
                    <!-- GPS standard field -->
                </div>
             `;
        }

        container.innerHTML += html;
    });
}

// Convert Base64 utility
function convertPhotoToBase64() {
    const fileInput = document.getElementById("form-upload-photo");
    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        document.getElementById("form-photo-base64").value = reader.result;
    };
    reader.readAsDataURL(file);
}

// Fetch form target GPS coordinates
function fetchFormGps() {
    document.getElementById("form-gps-lat").innerText = agentGps.lat.toFixed(6);
    document.getElementById("form-gps-lng").innerText = agentGps.lng.toFixed(6);
}

// Form Submission POST Api
async function submitAgentData(e) {
    e.preventDefault();
    const errBox = document.getElementById("form-submit-error");
    errBox.classList.add("hidden");

    const mId = document.getElementById("form-mission-id").value;
    const photo64 = document.getElementById("form-photo-base64").value;
    const gpsLatStr = document.getElementById("form-gps-lat").innerText;
    const gpsLngStr = document.getElementById("form-gps-lng").innerText;

    if (gpsLatStr === "--" || gpsLngStr === "--") {
        errBox.innerText = "Veuillez impérativement détecter vos coordonnées GPS d'ancrage.";
        errBox.classList.remove("hidden");
        return;
    }

    if (!photo64) {
        errBox.innerText = "Une photo d'étalage en situation réelle est obligatoire pour valider la mission.";
        errBox.classList.remove("hidden");
        return;
    }

    // Compile dynamic questionnaire answers
    const answers = {};
    if (selectedMissionForClaim) {
        selectedMissionForClaim.fields.forEach(f => {
            const el = document.getElementsByName(`field-${f.id}`)[0];
            if (el) {
                if (el.type === 'checkbox') {
                    answers[f.id] = el.checked ? "Oui" : "Non";
                } else {
                    answers[f.id] = el.value;
                }
            }
        });
    }

    const payload = {
        missionId: mId,
        agentPhone: currentUser.phone,
        answers: answers,
        photoUrl: photo64,
        gpsLocation: { lat: parseFloat(gpsLatStr), lng: parseFloat(gpsLngStr) }
    };

    try {
        const resp = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const resData = await resp.json();
        if (!resp.ok) {
            errBox.innerText = resData.error || "Echec de l'envoi.";
            errBox.classList.remove("hidden");
        } else {
            alert("Votre collecte terrain à bien été soumise à modération !");
            // reset form
            document.getElementById("submission-form").reset();
            document.getElementById("form-photo-base64").value = "";
            document.getElementById("form-gps-lat").innerText = "--";
            document.getElementById("form-gps-lng").innerText = "--";
            document.getElementById("form-inner-fields").classList.add("hidden");
            document.getElementById("form-selected-title").innerText = "Sélectionnez une mission";
            document.getElementById("form-selected-desc").innerText = "Félicitations, relevé envoyé ! Choisissez une autre enquête.";
            
            // Sync all
            await syncAllWorkspaceData();
            await refreshUserProfile(currentUser.phone);
        }
    } catch (err) {
        errBox.innerText = "Erreur réseau.";
        errBox.classList.remove("hidden");
    }
}

// Update KPI wallet parameters
function updateAgentKpiFields() {
    if (!currentUser) return;
    document.getElementById("agent-points-total").innerText = currentUser.points;
    document.getElementById("agent-fcfa-total").innerText = `~ ${(currentUser.points * 10).toLocaleString()} FCFA`;
    
    // Auto populate withdraw formula equivalent
    document.getElementById("withdraw-points").addEventListener('input', (event) => {
        const pts = parseInt(event.target.value) || 0;
        document.getElementById("withdraw-equivalence").innerText = `${(pts * 10).toLocaleString()} FCFA`;
    });
}

// Manual Mobile Money Withdraw Cash-out
async function withdrawalPoints(e) {
    e.preventDefault();
    const errBox = document.getElementById("withdrawal-error");
    const succBox = document.getElementById("withdrawal-success");
    errBox.classList.add("hidden");
    succBox.classList.add("hidden");

    const points = parseInt(document.getElementById("withdraw-points").value) || 0;
    const method = document.getElementById("withdraw-method").value;
    const phoneDetails = document.getElementById("withdraw-payment-details").value.trim();

    if (points < 50) {
        errBox.innerText = "Le seuil minimal de retrait est de 50 points (500 FCFA).";
        errBox.classList.remove("hidden");
        return;
    }

    if (!phoneDetails) {
        errBox.innerText = "Indiquez le numéro de téléphone de réception MoMo/Moov/Celtiis.";
        errBox.classList.remove("hidden");
        return;
    }

    const payload = {
        phone: currentUser.phone,
        points: points,
        method: `${method} (${phoneDetails})`
    };

    try {
        const resp = await fetch("/api/withdrawals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const resData = await resp.json();
        if (!resp.ok) {
            errBox.innerText = resData.error || "Une erreur est survenue.";
            errBox.classList.remove("hidden");
        } else {
            succBox.innerText = "Demande validée de retrait ! Virement en cours de traitement.";
            succBox.classList.remove("hidden");
            
            // Reset input
            document.getElementById("withdraw-points").value = "";
            document.getElementById("withdraw-payment-details").value = "";
            
            // Sync
            await refreshUserProfile(currentUser.phone);
            await syncAllWorkspaceData();
        }
    } catch (err) {
        errBox.innerText = "Erreur de connexion serveur.";
        errBox.classList.remove("hidden");
    }
}

// Filter missions triggers
function filterAgentMissions() {
    renderAgentMissionsTable();
}
