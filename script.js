const BOT_ID = "1426918794504306879"; 
// --- KONFIGURATION ---
const ADMIN_USER = "admin";
const ADMIN_PASS = "user";

let timeLeft = 30;
let authMode = 'login';
let currentUser = null;

// Lade gespeicherte Daten
let registeredUsers = JSON.parse(localStorage.getItem('vb_users')) || [];
let dataStore = JSON.parse(localStorage.getItem('vb_data')) || [];
// Manueller Status Override (falls API nicht geht)
let manualStatus = localStorage.getItem('vb_manual_status') || 'auto'; 

function init() {
    createUptimeBars();
    updateBotStatus();
    render();
    startCountdown();
    checkPersistentLogin();
}

// TAB SYSTEM
function tab(pageId, event) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');
}

// UPTIME BALKEN (Jetzt mit zufälligen kleinen Ausfällen für Realismus)
function createUptimeBars() {
    const container = document.getElementById('uptime-bars');
    if (!container) return;
    container.innerHTML = '';
    const now = new Date();
    for (let i = 80; i >= 0; i--) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        
        // Zufall: 5% Chance auf einen gelben Balken (Partial Outage)
        const rand = Math.random();
        let statusText = "Operational";
        if(rand > 0.95) {
            bar.style.background = "var(--red)";
            statusText = "Major Outage";
        } else if(rand > 0.92) {
            bar.style.background = "#d29922";
            statusText = "Partial Outage";
        }

        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
        bar.setAttribute('data-info', `${dStr}: ${statusText}`);
        container.appendChild(bar);
    }
}

// STATUS UPDATER
async function updateBotStatus() {
    const lastUpdate = document.getElementById('last-update-time');
    const now = new Date();
    if(lastUpdate) lastUpdate.innerText = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    // Wenn Admin manuell auf Offline gestellt hat
    if (manualStatus === 'offline') {
        setUI('offline');
        return;
    }
    if (manualStatus === 'online') {
        setUI('online');
        return;
    }

    // Sonst: API Check
    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${BOT_ID}`);
        const json = await res.json();
        // Lanyard checkt 'dnd', 'online', 'idle' -> alles ist Online
        if (json.success && json.data.discord_status === 'offline') {
            setUI('offline');
        } else {
            setUI('online');
        }
    } catch (e) { 
        setUI('online'); // Fallback
    }
}

// NEU: Admin Status Switch
function toggleManualStatus(type) {
    manualStatus = type;
    localStorage.setItem('vb_manual_status', type);
    updateBotStatus();
}

function setUI(type) {
    const title = document.getElementById('status-title');
    const detail = document.getElementById('status-text-detail');
    const circle = document.getElementById('main-circle');
    const dot = document.getElementById('bot-dot');

    if (type === 'online') {
        if(title) title.innerText = "All systems are operational";
        if(detail) { detail.innerText = "Online"; detail.style.color = "var(--green)"; }
        if(circle) { circle.className = "check-icon online-bg"; circle.innerHTML = '<i class="fas fa-check"></i>'; }
        if(dot) dot.className = "dot dot-online";
    } else {
        if(title) title.innerText = "Systems experiencing issues";
        if(detail) { detail.innerText = "Offline"; detail.style.color = "var(--red)"; }
        if(circle) { circle.className = "check-icon offline-bg"; circle.innerHTML = '<i class="fas fa-exclamation-triangle"></i>'; }
        if(dot) dot.className = "dot dot-offline";
    }
}

// RESTLICHE LOGIK (Login, Render etc.)
function startCountdown() {
    setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) { timeLeft = 30; updateBotStatus(); }
        if (document.getElementById('countdown')) document.getElementById('countdown').innerText = timeLeft;
    }, 1000);
}

function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function toggleAuthMode() {
    authMode = (authMode === 'login' ? 'reg' : 'login');
    document.getElementById('modalLabel').innerText = authMode === 'login' ? 'Login' : 'Create Account';
    document.getElementById('submitText').innerText = authMode === 'login' ? 'Login' : 'Sign Up';
}

function doAuth() {
    const u = document.getElementById('userInput').value;
    const p = document.getElementById('passInput').value;
    if (authMode === 'reg') {
        registeredUsers.push({ u, p, adm: (u === ADMIN_USER) });
        localStorage.setItem('vb_users', JSON.stringify(registeredUsers));
        alert("Success!"); toggleAuthMode();
    } else {
        let user = (u === ADMIN_USER && p === ADMIN_PASS) ? { u: ADMIN_USER, adm: true } : registeredUsers.find(x => x.u === u && x.p === p);
        if (user) {
            currentUser = user;
            sessionStorage.setItem('logged_user', JSON.stringify(user));
            applyLoginUI(user);
            closeModal('authModal');
        } else alert("Invalid credentials");
    }
}

function applyLoginUI(user) {
    if (user.adm) {
        document.body.classList.add('is-admin');
        // Füge Admin-Buttons zum Status hinzu
        const hero = document.querySelector('.hero-section');
        if(!document.getElementById('admin-status-ctrl')) {
            const ctrl = document.createElement('div');
            ctrl.id = 'admin-status-ctrl';
            ctrl.style.marginTop = "20px";
            ctrl.innerHTML = `
                <button class="btn btn-secondary" style="width:auto; padding:5px 10px; font-size:11px;" onclick="toggleManualStatus('online')">Force Online</button>
                <button class="btn btn-secondary" style="width:auto; padding:5px 10px; font-size:11px;" onclick="toggleManualStatus('offline')">Force Offline</button>
                <button class="btn btn-secondary" style="width:auto; padding:5px 10px; font-size:11px;" onclick="toggleManualStatus('auto')">Auto (API)</button>
            `;
            hero.appendChild(ctrl);
        }
    }
    document.getElementById('auth-area').innerHTML = `<span style="font-size:12px; margin-right:10px;">${user.u}</span><button class="login-trigger" onclick="logout()">Logout</button>`;
    render();
}

function checkPersistentLogin() {
    const saved = sessionStorage.getItem('logged_user');
    if (saved) { currentUser = JSON.parse(saved); applyLoginUI(currentUser); }
}

function logout() { sessionStorage.removeItem('logged_user'); location.reload(); }

function toggleDetails(id) {
    const el = document.getElementById(id);
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
}

function prepAdd(t) { activeType = t; openModal('addModal'); }

function saveItem() {
    const title = document.getElementById('titleInput').value;
    const desc = document.getElementById('descInput').value;
    if(!title) return;
    dataStore.push({ id: Date.now(), type: activeType, title, desc, date: new Date().toLocaleDateString('de-DE') });
    localStorage.setItem('vb_data', JSON.stringify(dataStore));
    render(); closeModal('addModal');
}

function deleteItem(id) {
    if (!confirm("Delete?")) return;
    dataStore = dataStore.filter(item => item.id !== id);
    localStorage.setItem('vb_data', JSON.stringify(dataStore));
    render();
}

function render() {
    const mBox = document.getElementById('maint-content');
    const iBox = document.getElementById('incident-content');
    if (!mBox || !iBox) return;
    mBox.innerHTML = ''; iBox.innerHTML = '';
    dataStore.forEach(item => {
        const del = (currentUser && currentUser.adm) ? `<i class="fas fa-trash" style="color:var(--red); cursor:pointer; margin-left:10px;" onclick="deleteItem(${item.id})"></i>` : '';
        const cardClass = item.type === 'maint' ? 'announcement-card maint-card' : 'announcement-card incident-card';
        const html = `<div class="${cardClass}"><div class="ann-header"><span>${item.title} ${del}</span><span class="ann-date">${item.date}</span></div><div class="ann-desc">${item.desc}</div></div>`;
        if (item.type === 'maint') mBox.innerHTML = html + mBox.innerHTML;
        else iBox.innerHTML = html + iBox.innerHTML;
    });
}
