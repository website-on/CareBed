// Global DB State
let hospitalsDB = [
  {
    id: 'h_test_1',
    code: '1234',
    name: 'مستشفى الشفاء المركزي',
    gov: 'القاهرة',
    city: 'الزمالك',
    beds: 15,
    departments: {
      'العناية المركزة': { total: 20, occupied: 15 },
      'الطوارئ': { total: 30, occupied: 28 }
    },
    bloodBank: {
      'A+': { avail: 10, req: 5 },
      'O+': { avail: 45, req: 0 },
      'B-': { avail: 2, req: 10 }
    }
  },
  {
    id: 'h_test_2',
    code: '5678',
    name: 'مستشفى السلام الدولي',
    gov: 'الاسكندرية',
    city: 'سموحة',
    beds: 5,
    departments: {},
    bloodBank: {}
  }
];

let currentUserHospital = null;
let viewingHospitalId = null; // Used when a guest clicks on a search result

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

// Views and Buttons
const loginBtnTop = document.getElementById('login-btn-top');
const logoutBtn = document.getElementById('logout-btn');
const emptyDepts = document.getElementById('empty-depts');

// Modals & Auth UI
const loginModal = document.getElementById('login-modal');
const closeLoginModal = document.getElementById('close-login-modal');
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

// Forms & Inputs
const publicSearchForm = document.getElementById('public-search-form');
const deptForm = document.getElementById('dept-form');
const bloodForm = document.getElementById('blood-form');

let myChart = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // initial state is guest, empty search
  renderPublicHospitals('');
});

// --- UI / NAVIGATION LOGIC ---
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
  document.getElementById(`view-${viewId}`).classList.add('active-view');

  if (viewId === 'analysis') renderChart();
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.id === 'admin-tab-link') return; // Handled separately
    e.preventDefault();
    switchToView(link.getAttribute('data-view'));

    // Close sidebar on mobile after clicking a link
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

// --- LOGIN / REGISTER TABS & MODAL LOGIC ---
loginBtnTop.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentUserHospital) {
    switchToView('dashboard'); // Directly if logged in
  } else {
    // Reset to selection view
    authSelectionView.classList.remove('hidden');
    authLoginView.classList.add('hidden');
    authRegisterView.classList.add('hidden');
    loginError.classList.add('hidden');

    loginModal.classList.add('active-modal'); // Open auth
  }
});

closeLoginModal.addEventListener('click', () => {
  loginModal.classList.remove('active-modal');
});
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) loginModal.classList.remove('active-modal');
});

// Switch to Login View
btnChoiceLogin.addEventListener('click', () => {
  loginForm.reset();
  authSelectionView.classList.add('hidden');
  authLoginView.classList.remove('hidden');
  authRegisterView.classList.add('hidden');
  loginError.classList.add('hidden');
});

// Switch to Register View
btnChoiceRegister.addEventListener('click', () => {
  registerForm.reset();
  authSelectionView.classList.add('hidden');
  authLoginView.classList.add('hidden');
  authRegisterView.classList.remove('hidden');
  loginError.classList.add('hidden');
});

// Go Back
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

// Process Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('login-name').value.trim();
  const gov = document.getElementById('login-gov').value.trim();
  const city = document.getElementById('login-city').value.trim();
  const code = document.getElementById('login-code').value.trim();

  const hospital = hospitalsDB.find(h => h.name === name && h.code === code && h.gov === gov && h.city === city);

  if (hospital) {
    handleSuccessfulLogin(hospital);
  } else {
    loginError.classList.remove('hidden');
  }
});

// Process Registration
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const gov = document.getElementById('reg-gov').value.trim();
  const city = document.getElementById('reg-city').value.trim();
  const beds = 0; // Starts with 0 beds, to be configured in admin dashboard
  const code = document.getElementById('reg-code').value.trim();

  if (hospitalsDB.find(h => h.code === code)) {
    alert("هذا الكود السري مستخدم مسبقاً، اختر كوداً أصعب.");
    return;
  }

  const newHospital = {
    id: 'h_' + Date.now(),
    code, name, gov, city, beds,
    departments: {},
    bloodBank: {}
  };

  hospitalsDB.push(newHospital);
  handleSuccessfulLogin(newHospital);
});

function handleSuccessfulLogin(hospital) {
  currentUserHospital = hospital;
  viewingHospitalId = hospital.id; // automatically view own

  // Reset views for next time
  authSelectionView.classList.remove('hidden');
  authLoginView.classList.add('hidden');
  authRegisterView.classList.add('hidden');

  loginModal.classList.remove('active-modal');
  loginError.classList.add('hidden');

  // UI Update
  document.getElementById('logged-hospital-name').innerText = hospital.name;
  document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${hospital.name}&background=0D8ABC&color=fff`;
  loginBtnTop.classList.add('hidden');
  logoutBtn.classList.remove('hidden');

  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  loginForm.reset();
  registerForm.reset();

  generateRandomHistoricalData(hospital);
  loadHospitalDashboardData(hospital.id);
  switchToView('dashboard'); // Take to dashboard automatically upon login
  showToast('تم تسجيل الدخول بصلاحيات الإدارة.');
}

// Logical Logout
logoutBtn.addEventListener('click', () => {
  currentUserHospital = null;
  viewingHospitalId = null;

  document.getElementById('logged-hospital-name').innerText = "مستخدم زائر";
  document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff`;
  logoutBtn.classList.add('hidden');
  loginBtnTop.classList.remove('hidden');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

  // Explicitly reset the form containers in case of any data
  document.getElementById('search-results-container').classList.add('hidden');
  document.getElementById('public-hospital-list').innerHTML = '';
  document.getElementById('public-search-form').reset();

  // Reset to home view and manage active states natively
  switchToView('home');
  renderPublicHospitals('');
  showToast('تم تسجيل الخروج بنجاح وعودة للرئيسية');
});


// --- PUBLIC SEARCH ENGINE ---
publicSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const sName = document.getElementById('search-name').value.toLowerCase().trim();
  const sGov = document.getElementById('search-gov').value.toLowerCase().trim();
  const sCity = document.getElementById('search-city').value.toLowerCase().trim();

  // Show container
  document.getElementById('search-results-container').classList.remove('hidden');

  let results = hospitalsDB.filter(h => {
    let match = true;
    if (sName && !h.name.toLowerCase().includes(sName)) match = false;
    if (sGov && !h.gov.toLowerCase().includes(sGov)) match = false;
    if (sCity && !h.city.toLowerCase().includes(sCity)) match = false;
    return match;
  });

  const publicList = document.getElementById('public-hospital-list');
  publicList.innerHTML = '';

  if (results.length === 0) {
    publicList.innerHTML = '<div class="empty-state">لا توجد نتائج مطابقة لبحثك. تأكد من البيانات.</div>';
  } else {
    results.forEach(h => {
      const isAvail = h.beds > 0;
      const html = `
            <div class="hospital-card" onclick="viewPublicHospitalDashboard('${h.id}')" style="cursor: pointer;">
              <div class="hospital-info">
                <h4><i class='bx bx-building'></i> ${h.name}</h4>
                <p><i class='bx bx-map'></i> ${h.gov} - ${h.city}</p>
              </div>
              <div class="hospital-action text-left">
                <div class="avail-beds" style="justify-content:flex-end; gap:10px; color: ${isAvail ? 'var(--color-success)' : 'var(--color-danger)'};">
                    ${h.beds} <span>أسرة طوارئ متاحة</span>
                </div>
              </div>
            </div>`;
      publicList.insertAdjacentHTML('beforeend', html);
    });
  }
});

function renderPublicHospitals(dummyPlaceholder) {
  // Just reset if needed. It usually triggers empty or full on submit.
}

// When user clicks a hospital from search results -> Open Dashboard for it
function viewPublicHospitalDashboard(hId) {
  loadHospitalDashboardData(hId);
  switchToView('dashboard');
}

// --- HOSPITAL DASHBOARD LOGIC (The Analytics view basically) ---
function loadHospitalDashboardData(hId) {
  viewingHospitalId = hId;
  const hospital = hospitalsDB.find(h => h.id === hId);
  if (!hospital) return;

  document.getElementById('viewing-hospital-title').innerHTML = `<i class='bx bx-building-house'></i> لوحة بيانات: ${hospital.name} <span style="font-size:16px; color:var(--text-secondary);">(${hospital.gov} - ${hospital.city})</span>`;

  // Process KPI
  let totalBeds = hospital.beds;
  let totalOccupied = 0;
  Object.values(hospital.departments).forEach(dept => {
    totalBeds += dept.total;
    totalOccupied += dept.occupied;
  });
  const available = totalBeds - totalOccupied;
  const occupancyRate = totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(1) : 0;

  document.getElementById('kpi-cards').innerHTML = `
    <div class="kpi-card"><div class="right"><div class="text">إجمالي الأسرة المقيدة</div><div class="number">${totalBeds}</div></div><i class='bx bx-bed icon blue'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">الأسرة المشغولة</div><div class="number">${totalOccupied}</div></div><i class='bx bx-user-check icon red'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">الأسرة المتاحة للطوارئ</div><div class="number">${available}</div></div><i class='bx bx-check-shield icon green'></i></div>
    <div class="kpi-card"><div class="right"><div class="text">نسبة الإشغال العام</div><div class="number">${occupancyRate}%</div></div><i class='bx bx-line-chart icon purple'></i></div>
    `;

  // Process Departments
  const depts = hospital.departments;
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

  // Process Blood Bank
  const bbs = hospital.bloodBank;
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
  if (emergencyValEl) emergencyValEl.textContent = hospital.beds;
}


// --- ADMIN FORMS ---
deptForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUserHospital) return;

  const name = document.getElementById('dept-name').value.trim();
  const total = parseInt(document.getElementById('dept-total').value);
  const occupied = parseInt(document.getElementById('dept-occupied').value);

  if (occupied > total) { alert("الأسرة المشغولة تعلو الكلي!"); return; }

  currentUserHospital.departments[name] = { total, occupied };

  generateRandomHistoricalData(currentUserHospital);
  loadHospitalDashboardData(currentUserHospital.id); // Reflect instantly
  showToast(`تم حفظ وتحديث بيانات ${name}`);
  deptForm.reset();
});

bloodForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUserHospital) return;

  const type = document.getElementById('blood-type').value;
  const avail = parseInt(document.getElementById('blood-avail').value) || 0;
  const req = parseInt(document.getElementById('blood-requested').value) || 0;

  currentUserHospital.bloodBank[type] = { avail, req };

  loadHospitalDashboardData(currentUserHospital.id); // Reflect instantly
  showToast(`تم تحديث مخزون واحتياج فصيلة ${type}`);
  bloodForm.reset();
});

// Manage Emergency Beds from Admin
const emergencyBedsForm = document.getElementById('emergency-beds-form');
if (emergencyBedsForm) {
  emergencyBedsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUserHospital) return;

    const bedsCount = parseInt(document.getElementById('admin-emergency-beds').value) || 0;
    currentUserHospital.beds = bedsCount;

    generateRandomHistoricalData(currentUserHospital);
    loadHospitalDashboardData(currentUserHospital.id); // Reflect instantly
    showToast(`تم تحديث إجمالي أسرة الطوارئ إلى ${bedsCount}`);
    emergencyBedsForm.reset();
  });
}

// Analytics (Fake data gen for demo)
function generateRandomHistoricalData(hospital) {
  let totalBeds = hospital.beds;
  let totalOccupied = 0;
  Object.values(hospital.departments).forEach(dept => { totalBeds += dept.total; totalOccupied += dept.occupied; });
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
  if (!ctx) return;
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

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'نسبة الإشغال (%)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
