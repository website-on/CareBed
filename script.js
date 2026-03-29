// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDy9zDaQ1Nik9HGnvVVkdEbFrtq8jzGXB4",
  authDomain: "osama-a69ad.firebaseapp.com",
  databaseURL: "https://osama-a69ad-default-rtdb.firebaseio.com",
  projectId: "osama-a69ad",
  storageBucket: "osama-a69ad.firebasestorage.app",
  messagingSenderId: "786308467957",
  appId: "1:786308467957:web:cdefbaadc8a8f1d8d589bc"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Global DB State
let hospitalsDB = [];

// Listen for updates from Realtime DB
db.ref('hospitals').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // convert object to array
    hospitalsDB = Object.values(data);
  } else {
    hospitalsDB = [];
  }

  // Refresh active views if needed
  if (!document.getElementById('landing-page').classList.contains('hidden')) {
    doSmartSearch();
  }
  if (viewingHospitalId) {
    // If current logged in user received an update from another session, update currentUser object
    if (currentUserHospital && currentUserHospital.id === viewingHospitalId) {
      currentUserHospital = hospitalsDB.find(h => h.id === currentUserHospital.id) || currentUserHospital;
    }
    loadHospitalDashboardData(viewingHospitalId);
  }
  const searchResultView = document.getElementById('view-find-beds');
  if (searchResultView && searchResultView.classList.contains('active-view')) {
    doSmartSearch();
  }
});

function saveHospitalToFirebase(hospital) {
  if (!hospital.departments) hospital.departments = {};
  if (!hospital.bloodBank) hospital.bloodBank = {};
  db.ref('hospitals/' + hospital.id).set(hospital);
}


let currentUserHospital = null;
let viewingHospitalId = null;

let historicalOccupancyGraph = {
  labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  data: [0, 0, 0, 0, 0, 0, 0]
};

// DOM Elements
const sidebarBtn = document.querySelector('.sidebarBtn');
const sidebar = document.querySelector('.sidebar');
const homeSection = document.querySelector('.home-section');
const navLinks = document.querySelectorAll('.nav-links li a');
const views = document.querySelectorAll('.app-view');
const toastEl = document.getElementById('toast');

// Landing vs App
const landingPage = document.getElementById('landing-page');
const mainApp = document.getElementById('main-app');
const headerSearchBar = document.getElementById('header-search-bar');
const instantHeaderSearch = document.getElementById('instant-header-search');

const btnGuestSearch = document.getElementById('btn-guest-search');
const btnClearSearch = document.getElementById('btn-clear-search');
const logoutBtn = document.getElementById('logout-btn');
const emptyDepts = document.getElementById('empty-depts');

// Auth Views (inside Landing)
const authSelectionView = document.getElementById('auth-selection-view');
const authLoginView = document.getElementById('auth-login-view');
const authRegisterView = document.getElementById('auth-register-view');

const btnChoiceLogin = document.getElementById('btn-choice-login');
const btnChoiceRegister = document.getElementById('btn-choice-register');
const btnBackFromLogin = document.getElementById('btn-back-from-login');
const btnBackFromRegister = document.getElementById('btn-back-from-register');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');

// Forms
const deptForm = document.getElementById('dept-form');
const bloodForm = document.getElementById('blood-form');

let myChart = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Show all hospitals by default in search
  doSmartSearch();
});

// --- MAIN LAYOUT NAVIGATION ---
function launchApp(role) {
  landingPage.classList.add('hidden');
  mainApp.classList.remove('hidden');

  if (role === 'guest') {
    document.getElementById('logged-hospital-name').innerText = "باحث زائر";
    document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff`;
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    logoutBtn.classList.remove('hidden');
    headerSearchBar.classList.remove('hidden'); // Show fast search for guest
    switchToView('find-beds'); // Jump to search directly
    showToast('تم الدخول كزائر للبحث السريع');
  } else {
    document.getElementById('logged-hospital-name').innerText = currentUserHospital.name;
    document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${currentUserHospital.name}&background=0D8ABC&color=fff`;
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    logoutBtn.classList.remove('hidden');
    headerSearchBar.classList.add('hidden');
    switchToView('dashboard');
    showToast('تم تسجيل الدخول بصلاحيات الإدارة.');
  }
}

function exitApp() {
  currentUserHospital = null;
  viewingHospitalId = null;

  auth.signOut().catch(() => { });

  // Reset Forms
  doSmartSearch(); // Reset search to full
  if (instantHeaderSearch) instantHeaderSearch.value = '';

  mainApp.classList.add('hidden');
  landingPage.classList.remove('hidden');

  // Reset Auth views
  authSelectionView.classList.remove('hidden');
  authLoginView.classList.add('hidden');
  authRegisterView.classList.add('hidden');
  loginForm.reset();
  registerForm.reset();
}

btnGuestSearch.addEventListener('click', () => {
  launchApp('guest');
});

logoutBtn.addEventListener('click', exitApp);

// --- SIDEBAR UI LOGIC ---
sidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('close');
  homeSection.classList.toggle('expanded');
});

function switchToView(viewId) {
  navLinks.forEach(l => {
    l.parentElement.classList.remove('active');
    if (l.getAttribute('data-view') === viewId) l.parentElement.classList.add('active');
  });

  views.forEach(v => v.classList.remove('active-view'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active-view');

  if (viewId === 'analysis') renderChart();
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchToView(link.getAttribute('data-view'));
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('close');
    }
  });
});

function showToast(message) {
  toastEl.innerHTML = `<i class='bx bx-check-circle'></i> ${message}`;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('show');
  setTimeout(() => { toastEl.classList.remove('show'); }, 3000);
}

// --- LOGIN / REGISTER LOGIC ---
btnChoiceLogin.addEventListener('click', () => {
  loginForm.reset();
  authSelectionView.classList.add('hidden');
  authLoginView.classList.remove('hidden');
  authRegisterView.classList.add('hidden');
  loginError.classList.add('hidden');
});

btnChoiceRegister.addEventListener('click', () => {
  registerForm.reset();
  authSelectionView.classList.add('hidden');
  authLoginView.classList.add('hidden');
  authRegisterView.classList.remove('hidden');
  loginError.classList.add('hidden');
});

btnBackFromLogin.addEventListener('click', () => {
  loginForm.reset();
  authLoginView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
  loginError.classList.add('hidden');
});
btnBackFromRegister.addEventListener('click', () => {
  registerForm.reset();
  authRegisterView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('login-name').value.trim();
  const gov = document.getElementById('login-gov').value.trim();
  const city = document.getElementById('login-city').value.trim();
  const code = document.getElementById('login-code').value.trim();

  auth.signInWithEmailAndPassword("osama@admin.com", code)
    .then(() => {
      const hospital = hospitalsDB.find(h => h.name === name && h.gov === gov && h.city === city);

      if (hospital) {
        currentUserHospital = hospital;
        viewingHospitalId = hospital.id;
        loginError.classList.add('hidden');
        generateRandomHistoricalData(hospital);
        loadHospitalDashboardData(hospital.id);
        launchApp('admin');
      } else {
        loginError.innerText = "هذا المستشفى غير مسجل، يرجى مراجعة البيانات.";
        loginError.classList.remove('hidden');
        auth.signOut();
      }
    })
    .catch((error) => {
      loginError.innerText = "كود الإدارة المركزي غير صحيح أو ليس لديك صلاحية.";
      loginError.classList.remove('hidden');
    });
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const gov = document.getElementById('reg-gov').value.trim();
  const city = document.getElementById('reg-city').value.trim();
  const beds = 0;
  const code = document.getElementById('reg-code').value.trim();

  if (hospitalsDB.find(h => h.name === name && h.gov === gov && h.city === city)) {
    alert("هذا المستشفى مسجل بالفعل بنفس البيانات.");
    return;
  }

  auth.signInWithEmailAndPassword("osama@admin.com", code)
    .then(() => {
      const newHospital = {
        id: 'h_' + Date.now(),
        code, name, gov, city, beds,
        departments: {},
        bloodBank: {}
      };

      saveHospitalToFirebase(newHospital);
      // Also push locally to render immediately
      hospitalsDB.push(newHospital);
      currentUserHospital = newHospital;
      viewingHospitalId = newHospital.id;

      generateRandomHistoricalData(newHospital);
      loadHospitalDashboardData(newHospital.id);
      launchApp('admin');
    })
    .catch((error) => {
      alert("تعذر تسجيل المستشفى: كود الإدارة المركزي غير صحيح.");
    });
});


// --- SMART INSTANT SEARCH ENGINE ---
function doSmartSearch() {
  const searchNameEl = document.getElementById('search-name');
  const searchGovEl = document.getElementById('search-gov');
  const searchCityEl = document.getElementById('search-city');

  const sName = searchNameEl ? searchNameEl.value.toLowerCase().trim() : '';
  const sGov = searchGovEl ? searchGovEl.value.toLowerCase().trim() : '';
  const sCity = searchCityEl ? searchCityEl.value.toLowerCase().trim() : '';

  const publicList = document.getElementById('public-hospital-list');
  if (!publicList) return;

  let results = hospitalsDB.filter(h => {
    let match = true;
    if (sName && h.name && !h.name.toLowerCase().includes(sName)) match = false;
    if (sGov && h.gov && !h.gov.toLowerCase().includes(sGov)) match = false;
    if (sCity && h.city && !h.city.toLowerCase().includes(sCity)) match = false;
    return match;
  });

  publicList.innerHTML = '';

  if (results.length === 0) {
    publicList.innerHTML = '<div class="empty-state">لا توجد مستشفيات مطابقة للبحث.</div>';
  } else {
    results.forEach(h => {
      const isAvail = h.beds > 0;
      const html = `
              <div class="hospital-card" onclick="viewPublicHospitalDashboard('${h.id}')" style="cursor: pointer; background: var(--bg-primary); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: var(--border-radius-sm); margin-bottom: 10px; transition: 0.3s;">
                <div class="hospital-info" style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="color:var(--color-primary); margin-bottom:5px;"><i class='bx bx-building'></i> ${h.name}</h4>
                    <p style="color:var(--text-secondary); font-size:14px;"><i class='bx bx-map'></i> ${h.gov} - ${h.city}</p>
                  </div>
                  <div class="avail-beds" style="text-align:left; color: ${isAvail ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight:bold;">
                      ${h.beds || 0} <br><span style="font-size:12px; font-weight:normal;">أسرة طوارئ</span>
                  </div>
                </div>
              </div>`;
      publicList.insertAdjacentHTML('beforeend', html);
    });
  }
}

// Bind live search events
['search-name', 'search-gov', 'search-city'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', doSmartSearch);
});

if (btnClearSearch) {
  btnClearSearch.addEventListener('click', () => {
    document.getElementById('search-name').value = '';
    document.getElementById('search-gov').value = '';
    document.getElementById('search-city').value = '';
    if (instantHeaderSearch) instantHeaderSearch.value = '';
    doSmartSearch();
  });
}

if (instantHeaderSearch) {
  instantHeaderSearch.addEventListener('input', (e) => {
    switchToView('find-beds');
    document.getElementById('search-name').value = e.target.value;
    doSmartSearch();
  });
}

// Expose globally for inline onclick
window.viewPublicHospitalDashboard = function (hId) {
  loadHospitalDashboardData(hId);
  switchToView('dashboard');
}

// --- HOSPITAL DASHBOARD LOGIC ---
function loadHospitalDashboardData(hId) {
  viewingHospitalId = hId;
  const hospital = hospitalsDB.find(h => h.id === hId);
  if (!hospital) return;

  document.getElementById('viewing-hospital-title').innerHTML = `<i class='bx bx-building-house'></i> لوحة بيانات: ${hospital.name} <span style="font-size:16px; color:var(--text-secondary);">(${hospital.gov} - ${hospital.city})</span>`;

  let totalBeds = hospital.beds || 0;
  let totalOccupied = 0;
  if (hospital.departments) {
    Object.values(hospital.departments).forEach(dept => {
      totalBeds += (dept.total || 0);
      totalOccupied += (dept.occupied || 0);
    });
  }
  const available = totalBeds - totalOccupied;
  const occupancyRate = totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(1) : 0;

  document.getElementById('kpi-cards').innerHTML = `
    <div class="kpi-card"><div class="right"><div class="text">إجمالي الأسرة المقيدة</div><div class="number">${totalBeds}</div></div><i class='bx bx-bed icon blue'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">الأسرة المشغولة</div><div class="number">${totalOccupied}</div></div><i class='bx bx-user-check icon red'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">الأسرة المتاحة للطوارئ</div><div class="number">${available}</div></div><i class='bx bx-check-shield icon green'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">نسبة الإشغال العام</div><div class="number">${occupancyRate}%</div></div><i class='bx bx-line-chart icon purple'></i></div>
    `;

  const depts = hospital.departments || {};
  const deptKeys = Object.keys(depts);
  const dGrid = document.getElementById('departments-grid');
  dGrid.innerHTML = '';

  if (deptKeys.length === 0) {
    emptyDepts.classList.remove('hidden');
    dGrid.style.display = 'none';
  } else {
    emptyDepts.classList.add('hidden');
    dGrid.style.display = 'grid';
    deptKeys.forEach(name => {
      const dept = depts[name];
      const avail = dept.total - dept.occupied;
      const rate = dept.total > 0 ? ((dept.occupied / dept.total) * 100).toFixed(0) : 0;
      let statusClass = rate > 85 ? 'progress-alert' : (rate > 70 ? 'progress-warning' : 'progress-safe');
      const circumference = 2 * Math.PI * 35;
      const offset = circumference - (rate / 100) * circumference;

      dGrid.insertAdjacentHTML('beforeend', `
            <div class="dept-card">
              <div class="dept-title">${name}</div>
              <div class="progress-ring-container ${statusClass}">
                <svg class="progress-ring" width="80" height="80"><circle class="progress-ring__circle_bg" cx="40" cy="40" r="35"></circle><circle class="progress-ring__circle" cx="40" cy="40" r="35" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle></svg>
                <span class="progress-text">${rate}%</span>
              </div>
              <div class="dept-metrics mt-3">
                <div class="metric"><span class="text-secondary">متاح</span><div class="metric-val text-success">${avail}</div></div>
                <div class="metric"><span class="text-secondary">مشغول</span><div class="metric-val text-danger">${dept.occupied}</div></div>
              </div>
            </div>`);
    });
  }

  const bbs = hospital.bloodBank || {};
  const bKeys = Object.keys(bbs);
  const bList = document.getElementById('blood-bank-list');
  bList.innerHTML = '';

  if (bKeys.length === 0) {
    bList.innerHTML = `<li class="text-secondary" style="border:none; justify-content:center;">لم تصرح المستشفى ببيانات بنك الدم.</li>`;
  } else {
    bKeys.forEach(t => {
      const data = bbs[t];
      const hasReq = data.req > 0;
      bList.insertAdjacentHTML('beforeend', `
            <li>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="blood-badge font-outfit" style="font-size:18px;">${t}</span>
                    <span class="text-secondary" style="font-size:14px;">متاح: <b style="color:var(--text-primary)">${data.avail}</b> كيس</span>
                </div>
                ${hasReq ? `<div class="blood-stats" style="color:var(--color-danger); font-size:14px; font-weight:bold;">مطلوب عاجلاً: ${data.req} لتغطية العجز</div>` : `<div style="color:var(--color-success); font-size:14px;">مستقر</div>`}
            </li>`);
    });
  }

  const emergencyValEl = document.getElementById('emergency-view-val');
  if (emergencyValEl) emergencyValEl.textContent = hospital.beds || 0;
}

// --- ADMIN FORMS ---
deptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUserHospital) return;

  const name = document.getElementById('dept-name').value.trim();
  const total = parseInt(document.getElementById('dept-total').value);
  const occupied = parseInt(document.getElementById('dept-occupied').value);

  if (occupied > total) { alert("الأسرة المشغولة تعلو الكلي!"); return; }

  if (!currentUserHospital.departments) currentUserHospital.departments = {};
  currentUserHospital.departments[name] = { total, occupied };

  saveHospitalToFirebase(currentUserHospital);
  generateRandomHistoricalData(currentUserHospital);
  loadHospitalDashboardData(currentUserHospital.id);
  showToast(`تم حفظ وتحديث بيانات ${name}`);
  deptForm.reset();
});

bloodForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUserHospital) return;

  const type = document.getElementById('blood-type').value;
  const avail = parseInt(document.getElementById('blood-avail').value) || 0;
  const req = parseInt(document.getElementById('blood-requested').value) || 0;

  if (!currentUserHospital.bloodBank) currentUserHospital.bloodBank = {};
  currentUserHospital.bloodBank[type] = { avail, req };

  saveHospitalToFirebase(currentUserHospital);
  loadHospitalDashboardData(currentUserHospital.id);
  showToast(`تم تحديث مخزون واحتياج فصيلة ${type}`);
  bloodForm.reset();
});

const emergencyBedsForm = document.getElementById('emergency-beds-form');
if (emergencyBedsForm) {
  emergencyBedsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUserHospital) return;

    const bedsCount = parseInt(document.getElementById('admin-emergency-beds').value) || 0;
    currentUserHospital.beds = bedsCount;

    saveHospitalToFirebase(currentUserHospital);
    generateRandomHistoricalData(currentUserHospital);
    loadHospitalDashboardData(currentUserHospital.id);
    showToast(`تم تحديث إجمالي أسرة الطوارئ إلى ${bedsCount}`);
    emergencyBedsForm.reset();
  });
}

// Analytics 
function generateRandomHistoricalData(hospital) {
  let totalBeds = hospital.beds || 0;
  let totalOccupied = 0;
  if (hospital.departments) {
    Object.values(hospital.departments).forEach(dept => { totalBeds += (dept.total || 0); totalOccupied += (dept.occupied || 0); });
  }
  const currentRate = totalBeds > 0 ? parseInt((totalOccupied / totalBeds) * 100) : 50;

  for (let i = 0; i < 7; i++) {
    let val = currentRate + (Math.floor(Math.random() * 30) - 15);
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    historicalOccupancyGraph.data[i] = val;
  }
}

function renderChart() {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx || !window.Chart) return;
  if (myChart) myChart.destroy();

  const { labels, data } = historicalOccupancyGraph;

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);

  if (maxVal === 0 && minVal === 0) {
    document.getElementById('peak-day').textContent = `-`;
    document.getElementById('low-pressure-day').textContent = `-`;
    document.getElementById('predicted-occupancy').textContent = `0%`;
  } else {
    const peakDay = labels[data.indexOf(maxVal)];
    const lowDay = labels[data.indexOf(minVal)];
    const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);

    document.getElementById('peak-day').textContent = `${peakDay} (${maxVal}%)`;
    document.getElementById('low-pressure-day').textContent = `${lowDay} (${minVal}%)`;
    document.getElementById('predicted-occupancy').textContent = `${avg}%`;
  }

  myChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'نسبة الإشغال (%)',
        data: data,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#0ea5e9',
        pointRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, border: { dash: [5, 5] }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)', display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
