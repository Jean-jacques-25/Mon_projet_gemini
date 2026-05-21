// GLOBAL APPLICATION STATE
let currentUser = null;
let activeWorkspaceRole = 'agent';
let missions = [];
let submissions = [];
let notifications = [];

// DOM Ready initialization
window.addEventListener('DOMContentLoaded', async () => {
    // Authenticate and redirect back to index if missing phone context
    const storedPhone = localStorage.getItem("databroker_user_phone");
    if (!storedPhone) {
        window.location.href = "/";
        return;
    }

    activeWorkspaceRole = localStorage.getItem("databroker_user_role") || 'agent';

    // Initial Profile and DataSync
    await refreshUserProfile(storedPhone);
    await syncAllWorkspaceData();

    // Setup periodic synchronization loop (every 15 seconds as per specifications)
    setInterval(async () => {
        console.log("Synchronisation de routine 15s DataBroker229...");
        await syncAllWorkspaceData();
    }, 15000);
});

// Sync Profile from backend
async function refreshUserProfile(phone) {
    try {
        const resp = await fetch(`/api/profile?phone=${encodeURIComponent(phone)}`);
        if (!resp.ok) {
            // Suspended or deleted
            localStorage.clear();
            window.location.href = "/";
            return;
        }
        currentUser = await resp.json();
        
        // Render user details in Navbar
        document.getElementById("nav-user-name").innerText = currentUser.name;
        document.getElementById("nav-user-phone").innerText = currentUser.phone;

        // Display admin selection button if approved
        const adminBtn = document.getElementById("nav-admin-tab-btn");
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove("hidden");
            adminBtn.classList.add("flex");
        } else {
            adminBtn.classList.add("hidden");
        }

        // Render gamification bonuses indicators
        updateGamificationNavbar();
    } catch (err) {
        console.warn("Échec de mise à jour du profil utilisateur (Mode autonome actif).");
    }
}

// Sync all main datasets in parallel
async function syncAllWorkspaceData() {
    try {
        // Fetch missions
        const mResp = await fetch("/api/missions");
        if (mResp.ok) {
            missions = await mResp.json();
        }

        // Fetch notifications
        if (currentUser) {
            const nResp = await fetch(`/api/notifications?phone=${encodeURIComponent(currentUser.phone)}`);
            if (nResp.ok) {
                notifications = await nResp.json();
                renderNotificationsDropdown();
            }
        }

        // Trigger individual workspace updates based on visible screen context
        renderActiveWorkspaceView();
    } catch (err) {
        console.warn("Échec du rechargement de synchronisation arrière-plan.");
    }
}

// Render dynamic elements to reflect role updates
function renderActiveWorkspaceView() {
    // Update role selectors CSS
    const tabs = ['agent', 'client', 'admin'];
    tabs.forEach(role => {
        const btn = document.getElementById(`nav-${role}-tab-btn`);
        const panel = document.getElementById(`workspace-${role}`);
        
        if (btn) {
            if (role === activeWorkspaceRole) {
                btn.className = role === 'admin' 
                    ? "px-3 py-1 text-xs font-bold rounded-md transition-all bg-slate-900 text-yellow-400 shadow-sm flex items-center gap-1"
                    : "px-3 py-1 text-xs font-bold rounded-md transition-all bg-white text-emerald-700 shadow-sm";
            } else {
                btn.className = role === 'admin'
                    ? "px-3 py-1 text-xs font-bold rounded-md transition-all text-red-500 hover:text-red-700 flex items-center gap-1"
                    : "px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-500 hover:text-slate-900";
            }
        }

        if (panel) {
            if (role === activeWorkspaceRole) {
                panel.classList.remove("hidden");
                // Launch layout init modules depending on visible scope
                if (role === 'agent') initializeAgentLayout();
                if (role === 'client') initializeClientLayout();
                if (role === 'admin') initializeAdminLayout();
            } else {
                panel.classList.add("hidden");
            }
        }
    });

    const bonusBox = document.getElementById("nav-gamification-box");
    if (activeWorkspaceRole === 'agent') {
        bonusBox.classList.remove("hidden");
        bonusBox.classList.add("flex");
    } else {
        bonusBox.classList.add("hidden");
    }
}

// Swapper
function changeWorkspaceRole(role) {
    activeWorkspaceRole = role;
    localStorage.setItem("databroker_user_role", role);
    renderActiveWorkspaceView();
}

// Gamification navbar render
function updateGamificationNavbar() {
    if (!currentUser) return;
    
    document.getElementById("nav-points-badge").innerText = `${currentUser.points.toLocaleString()} pts`;
    const badge = document.getElementById("nav-level-badge");
    badge.innerText = currentUser.level;

    // Apply specific level tints matching the React styling code
    if (currentUser.level === 'ÉLITE') {
        badge.className = "px-2 py-0.5 text-[9px] font-extrabold rounded-full border bg-purple-100 text-purple-700 border-purple-200";
    } else if (currentUser.level === 'GOLD') {
        badge.className = "px-2 py-0.5 text-[9px] font-extrabold rounded-full border bg-amber-100 text-amber-700 border-amber-200";
    } else if (currentUser.level === 'SILVER') {
        badge.className = "px-2 py-0.5 text-[9px] font-extrabold rounded-full border bg-yellow-100 text-yellow-700 border-yellow-250";
    } else {
         badge.className = "px-2 py-0.5 text-[9px] font-extrabold rounded-full border bg-slate-100 text-slate-700 border-slate-200";
    }
}

// Show/Hide notifications dropdown widget
let showNotif = false;
function toggleNotificationDropdown() {
    showNotif = !showNotif;
    const drop = document.getElementById("notif-dropdown");
    if (showNotif) {
        drop.classList.remove("hidden");
        markAllNotificationsAsRead();
    } else {
        drop.classList.add("hidden");
    }
}

// Render dynamic notifications within dropdown
function renderNotificationsDropdown() {
    const badge = document.getElementById("notif-count-badge");
    const container = document.getElementById("notif-logs-container");
    
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length > 0) {
        badge.innerText = unread.length;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }

    if (notifications.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 italic">Aucun message pour l'instant.</div>`;
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="p-2.5 space-y-0.5 ${!n.isRead ? 'bg-emerald-50/50 font-semibold' : ''}">
            <div class="flex justify-between items-center text-slate-800">
                <span class="font-bold">${n.title}</span>
                <span class="text-[8px] text-slate-400 font-mono">${n.createdAt.substring(11, 16)}</span>
            </div>
            <p class="text-slate-650 text-[10px] leading-relaxed">${n.message}</p>
        </div>
    `).join("");
}

// Mark read API
async function markAllNotificationsAsRead() {
    if (!currentUser) return;
    try {
        await fetch("/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: currentUser.phone })
        });
        notifications.forEach(n => n.isRead = true);
        renderNotificationsDropdown();
    } catch(err){}
}

// Logout session
async function logoutSession() {
    try {
        await fetch("/api/logout", { method: "POST" });
    } catch(err){}
    localStorage.clear();
    window.location.href = "/";
}
