// --- KONFIGURATION ---
const BOT_ID = "1426918794504306879"; // Deine Discord Bot Client ID hier eintragen!
const ADMIN_USER = "admin";
const ADMIN_PASS = "user";

let timeLeft = 30;
let authMode = 'login';
let currentUser = null;
let registeredUsers = JSON.parse(localStorage.getItem('vb_users')) || [];
let dataStore = JSON.parse(localStorage.getItem('vb_data')) || [];

function init() {
    createUptimeBars();
    setUI('online');
    updateBotStatus();
    render();
    startCountdown();
    checkPersistentLogin();
}

function tab(pageId, event) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');
}

function createUptimeBars() {
    const container = document.getElementById('uptime-bars');
    if (!container) return;
    container.innerHTML = '';
    const now = new Date();
    for (let i = 80; i >= 0; i--) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
        bar.setAttribute('data-info', `${dStr}: Operational`);
        container.appendChild(bar);
    }
}

function toggleDetails(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById('bot-arrow');
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    if(arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
}

async function updateBotStatus() {
    const lastUpdate = document.getElementById('last-update-time');
    const now = new Date();
    if(lastUpdate) lastUpdate.innerText = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${BOT_ID}`);
        const json = await res.json();
        if (json.success && json.data.discord_status === 'offline') setUI('offline');
        else setUI('online');
    } catch (e) { setUI('online'); }
}

function setUI(type) {
    const title = document.getElementById('status-title');
    const detail = document.getElementById('status-text-detail');
    const circle = document.getElementById('main-circle');
    const dot = document.getElementById('bot-dot');

    if (type === 'online') {
        if(title) title.innerText = "All systems are operational";
        if(detail) { detail.innerText = "Online"; detail.style.color = "var(--green)"; }
        if(circle) circle.className = "check-icon online-bg";
        if(dot) dot.className = "dot dot-online";
    } else {
        if(title) title.innerText = "Systems experiencing issues";
        if(detail) { detail.innerText = "Offline"; detail.style.color = "var(--red)"; }
        if(circle) circle.className = "check-icon offline-bg";
        if(dot) dot.className = "dot dot-offline";
    }
}

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
    document.getElementById('modeText').innerText = authMode === 'login' ? 'No account? Sign up' : 'Already have an account? Login';
}

function doAuth() {
    const u = document.getElementById('userInput').value;
    const p = document.getElementById('passInput').value;
    if (authMode === 'reg') {
        if (u.toLowerCase() === ADMIN_USER) return alert("Name taken");
        registeredUsers.push({ u, p, adm: false });
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
    if (user.adm) document.body.classList.add('is-admin');
    document.getElementById('auth-area').innerHTML = `<span style="font-size:12px; margin-right:10px;">${user.u}</span><button class="login-trigger" onclick="logout()">Logout</button>`;
    render();
}

function checkPersistentLogin() {
    const saved = sessionStorage.getItem('logged_user');
    if (saved) { currentUser = JSON.parse(saved); applyLoginUI(currentUser); }
}

function logout() { sessionStorage.removeItem('logged_user'); location.reload(); }

let activeType = '';
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
        const del = (currentUser && currentUser.adm) ? `<i class="fas fa-trash" style="color:var(--red); cursor:pointer; font-size:12px; margin-left:10px;" onclick="deleteItem(${item.id})"></i>` : '';
        const cardClass = item.type === 'maint' ? 'announcement-card maint-card' : 'announcement-card incident-card';
        const html = `
            <div class="${cardClass}">
                <div class="ann-header"><span class="ann-title">${item.title} ${del}</span><span class="ann-date">${item.date}</span></div>
                <div class="ann-desc">${item.desc}</div>
            </div>`;
        if (item.type === 'maint') mBox.innerHTML = html + mBox.innerHTML;
        else iBox.innerHTML = html + iBox.innerHTML;
    });
}
