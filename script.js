const auth = firebase.auth();
const db = firebase.database();

// Global DB State
let hospitalsDB = [];

// Listen for real-time updates
db.ref('hospitals').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    hospitalsDB = Object.values(data);
  } else {
    hospitalsDB = [];
  }

  // Refresh UI
  if (typeof doSmartSearch === 'function') doSmartSearch();
  if (typeof doLandingSmartSearch === 'function' && document.getElementById('auth-guest-search-view') && !document.getElementById('auth-guest-search-view').classList.contains('hidden')) {
    doLandingSmartSearch();
  }
  if (typeof userRole !== 'undefined') {
    if (userRole === 'super-admin') {
      if (typeof renderPendingHospitals === 'function') renderPendingHospitals();
      if (typeof renderApprovedHospitals === 'function') renderApprovedHospitals();
    } else if (typeof currentUserHospital !== 'undefined' && currentUserHospital && typeof viewingHospitalId !== 'undefined' && viewingHospitalId) {
      const updatedUser = hospitalsDB.find(h => h.id === currentUserHospital.id);
      if (updatedUser) {
        currentUserHospital = updatedUser;
        if (typeof updateNotificationsUI === 'function') updateNotificationsUI();
      }
      if (typeof loadHospitalDashboardData === 'function') loadHospitalDashboardData(viewingHospitalId);
    }
  }
});

function saveHospitalToFirebase(hospital) {
  if (!hospital.departments) hospital.departments = {};
  if (!hospital.bloodBank) hospital.bloodBank = {};

  const idx = hospitalsDB.findIndex(h => h.id === hospital.id);
  if (idx >= 0) hospitalsDB[idx] = hospital;
  else hospitalsDB.push(hospital);

  // Sync to Firebase
  db.ref('hospitals/' + hospital.id).set(hospital).catch(err => {
    console.error("Firebase sync error:", err);
  });
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
const authCodeLoginView = document.getElementById('auth-code-login-view');
const authGmailRegisterView = document.getElementById('auth-gmail-register-view');

const btnChoiceGmailRegister = document.getElementById('btn-choice-gmail-register');
const btnChoiceCodeLogin = document.getElementById('btn-choice-code-login');
const btnChoiceSuperAdmin = document.getElementById('btn-choice-super-admin');

const authGuestSearchView = document.getElementById('auth-guest-search-view');
const authSuperAdminView = document.getElementById('auth-super-admin-view');
const btnBackFromSearch = document.getElementById('btn-back-from-search');
const landingSearchName = document.getElementById('landing-search-name');
const landingSearchGov = document.getElementById('landing-search-gov');
const landingSearchCity = document.getElementById('landing-search-city');
const landingSearchResults = document.getElementById('landing-search-results');

const btnBackFromCode = document.getElementById('btn-back-from-code');
const btnBackFromGmail = document.getElementById('btn-back-from-gmail');
const btnBackFromSuperAdmin = document.getElementById('btn-back-from-super-admin');

const btnGoogleAuth = document.getElementById('btn-google-auth');
const gmailDetailsForm = document.getElementById('gmail-details-form');
const gmailAuthStep = document.getElementById('gmail-auth-step');

const codeLoginForm = document.getElementById('code-login-form');
const superAdminForm = document.getElementById('super-admin-form');

const notifBellBtn = document.getElementById('notif-bell-btn');
const notifDropdown = document.getElementById('notif-dropdown');
const notifBadge = document.getElementById('notif-badge');
const notifList = document.getElementById('notif-list');

const accessLockedOverlay = document.getElementById('access-locked-overlay');
const btnUnlockInternal = document.getElementById('btn-unlock-internal');
const unlockCodeInput = document.getElementById('unlock-code-input');
const unlockError = document.getElementById('unlock-error');

const profileUpload = document.getElementById('profile-upload');
const profileImg = document.getElementById('profile-img');

// Forms
const deptForm = document.getElementById('dept-form');
const bloodForm = document.getElementById('blood-form');

let myChart = null;
let userRole = 'guest'; // 'guest', 'admin' (no code), 'admin-unlocked' (with code), 'super-admin'

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Show all hospitals by default in search
  doSmartSearch();
});

// --- MAIN LAYOUT NAVIGATION ---
function launchApp(role) {
  landingPage.classList.add('hidden');
  mainApp.classList.remove('hidden');
  userRole = role;

  if (role === 'guest') {
    document.getElementById('logged-hospital-name').innerText = "باحث زائر";
    profileImg.src = `https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff`;
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    logoutBtn.classList.remove('hidden');
    headerSearchBar.classList.remove('hidden');
    document.getElementById('notif-bell-btn').classList.add('hidden');
    accessLockedOverlay.classList.add('hidden');
    switchToView('find-beds');
    showToast('تم الدخول كزائر للبحث السريع');
  } else if (role === 'super-admin') {
    document.getElementById('logged-hospital-name').innerText = "المدير العام";
    profileImg.src = `https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff`;
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    logoutBtn.classList.remove('hidden');
    headerSearchBar.classList.add('hidden');
    document.getElementById('notif-bell-btn').classList.add('hidden');
    accessLockedOverlay.classList.add('hidden');

    // Hide sidebar completely for super admin
    document.querySelector('.sidebar').classList.add('hidden');
    document.querySelector('.sidebarBtn').classList.add('hidden');
    homeSection.style.width = '100%';
    homeSection.style.right = '0';

    switchToView('super-admin');
    renderPendingHospitals();
    renderApprovedHospitals();
    showToast('تم الدخول كمدير عام.');
  } else {
    document.getElementById('logged-hospital-name').innerText = currentUserHospital.name;
    if (currentUserHospital.profileImg) {
      profileImg.src = currentUserHospital.profileImg;
    } else {
      profileImg.src = `https://ui-avatars.com/api/?name=${currentUserHospital.name}&background=0D8ABC&color=fff`;
    }

    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    logoutBtn.classList.remove('hidden');
    headerSearchBar.classList.add('hidden');
    document.getElementById('notif-bell-btn').classList.remove('hidden');

    switchToView('dashboard');
    showToast('تم تسجيل الدخول بنجاح.');
    updateNotificationsUI();
  }
}

function exitApp() {
  currentUserHospital = null;
  viewingHospitalId = null;
  userRole = 'guest';

  auth.signOut().catch(() => { });

  // Reset Forms
  doSmartSearch();
  if (instantHeaderSearch) instantHeaderSearch.value = '';

  document.querySelector('.sidebar').classList.remove('hidden');
  document.querySelector('.sidebarBtn').classList.remove('hidden');
  homeSection.style.width = '';
  homeSection.style.right = '';

  mainApp.classList.add('hidden');
  landingPage.classList.remove('hidden');

  // Reset Auth views
  authSelectionView.classList.remove('hidden');
  authCodeLoginView.classList.add('hidden');
  authGmailRegisterView.classList.add('hidden');
  authGuestSearchView.classList.add('hidden');
  authSuperAdminView.classList.add('hidden');
  codeLoginForm.reset();
  if (superAdminForm) superAdminForm.reset();
  if (gmailDetailsForm) gmailDetailsForm.reset();
}

btnGuestSearch.addEventListener('click', () => {
  authSelectionView.classList.add('hidden');
  authCodeLoginView.classList.add('hidden');
  authGmailRegisterView.classList.add('hidden');
  authGuestSearchView.classList.remove('hidden');
  doLandingSmartSearch(); // Trigger an initial search
});

btnBackFromSearch.addEventListener('click', () => {
  authGuestSearchView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
});

function doLandingSmartSearch() {
  const sName = landingSearchName ? landingSearchName.value.toLowerCase().trim() : '';
  const sGov = landingSearchGov ? landingSearchGov.value.toLowerCase().trim() : '';
  const sCity = landingSearchCity ? landingSearchCity.value.toLowerCase().trim() : '';

  if (!landingSearchResults) return;

  let results = hospitalsDB.filter(h => {
    let match = true;
    if (sName && h.name && !h.name.toLowerCase().includes(sName)) match = false;
    if (sGov && h.gov && !h.gov.toLowerCase().includes(sGov)) match = false;
    if (sCity && h.city && !h.city.toLowerCase().includes(sCity)) match = false;
    return match;
  });

  landingSearchResults.innerHTML = '';

  if (results.length === 0) {
    landingSearchResults.innerHTML = '<div class="empty-state" style="padding:10px;">لا توجد مستشفيات مطابقة للبحث.</div>';
  } else {
    results.forEach(h => {
      const isAvail = h.beds > 0;
      const html = `
              <div class="hospital-card" onclick="openHospitalFromLanding('${h.id}')" style="cursor: pointer; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px; transition: 0.3s; border: 1px solid rgba(255,255,255,0.05);">
                <div class="hospital-info" style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h5 style="color:var(--color-primary); margin-bottom:3px;"><i class='bx bx-building'></i> ${h.name}</h5>
                    <p style="color:var(--text-secondary); font-size:12px;"><i class='bx bx-map'></i> ${h.gov} - ${h.city}</p>
                  </div>
                  <div class="avail-beds" style="text-align:left; color: ${isAvail ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight:bold; font-size: 14px;">
                      ${h.beds || 0} <br><span style="font-size:10px; font-weight:normal;">أسرة طوارئ</span>
                  </div>
                </div>
              </div>`;
      landingSearchResults.insertAdjacentHTML('beforeend', html);
    });
  }
}

['landing-search-name', 'landing-search-gov', 'landing-search-city'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', doLandingSmartSearch);
});

window.openHospitalFromLanding = function (hId) {
  launchApp('guest');
  loadHospitalDashboardData(hId);
  switchToView('dashboard');
};

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

  // Handle access locks
  const restrictedViews = ['blood-needs', 'hospitals', 'emergency'];
  if (userRole === 'admin' && restrictedViews.includes(viewId)) {
    accessLockedOverlay.classList.remove('hidden');
  } else {
    accessLockedOverlay.classList.add('hidden');
    unlockCodeInput.value = '';
    unlockError.classList.add('hidden');
  }
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

btnChoiceGmailRegister.addEventListener('click', () => {
  authSelectionView.classList.add('hidden');
  authCodeLoginView.classList.add('hidden');
  authSuperAdminView.classList.add('hidden');
  authGmailRegisterView.classList.remove('hidden');
  gmailAuthStep.classList.remove('hidden');
  gmailDetailsForm.classList.add('hidden');
});

btnChoiceCodeLogin.addEventListener('click', () => {
  authSelectionView.classList.add('hidden');
  authGmailRegisterView.classList.add('hidden');
  authSuperAdminView.classList.add('hidden');
  authCodeLoginView.classList.remove('hidden');
  document.getElementById('code-login-error').classList.add('hidden');
});

btnChoiceSuperAdmin.addEventListener('click', () => {
  authSelectionView.classList.add('hidden');
  authGmailRegisterView.classList.add('hidden');
  authCodeLoginView.classList.add('hidden');
  authGuestSearchView.classList.add('hidden');
  authSuperAdminView.classList.remove('hidden');
  document.getElementById('super-admin-error').classList.add('hidden');
});

btnBackFromCode.addEventListener('click', () => {
  codeLoginForm.reset();
  authCodeLoginView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
});

btnBackFromGmail.addEventListener('click', () => {
  gmailDetailsForm.reset();
  authGmailRegisterView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
});

btnBackFromSuperAdmin.addEventListener('click', () => {
  superAdminForm.reset();
  authSuperAdminView.classList.add('hidden');
  authSelectionView.classList.remove('hidden');
});

btnGoogleAuth.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then((result) => {
    gmailAuthStep.classList.add('hidden');
    gmailDetailsForm.classList.remove('hidden');
  }).catch((error) => {
    if (typeof showToast === 'function') showToast('فشل التسجيل بحساب جوجل: ' + error.message);
  });
});

gmailDetailsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-gmail-name').value.trim();
  const gov = document.getElementById('reg-gmail-gov').value.trim();
  const city = document.getElementById('reg-gmail-city').value.trim();
  const phone = document.getElementById('reg-gmail-phone').value.trim();

  // Register as pending
  const newId = 'h_' + Date.now();
  const newHospital = { id: newId, name, gov, city, phone, beds: 0, departments: {}, bloodBank: {}, notifications: [], profileImg: null, code: null };

  const msg = `تم استلام بيانات ${name}. جاري المراجعة من الإدارة لتوليد الكود السري.`;
  newHospital.notifications = [{ id: Date.now(), msg, date: new Date().toLocaleString() }];

  saveHospitalToFirebase(newHospital); // Use our local-only function instead of direct db.ref

  currentUserHospital = newHospital;
  viewingHospitalId = newHospital.id;

  generateRandomHistoricalData(newHospital);
  loadHospitalDashboardData(newHospital.id);
  launchApp('admin'); // Only 'admin', doesn't have code yet
});

codeLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('login-code-only').value.trim();

  let hospital = hospitalsDB.find(h => h.code === code);

  if (!hospital && code.length === 5) {
    // Create a temporary mock hospital mapped to this code
    hospital = {
      id: 'mock_' + code,
      name: 'مستشفى مؤقت (' + code + ')',
      gov: 'محافظة مؤقتة',
      city: 'مدينة مؤقتة',
      phone: '000',
      beds: 50,
      departments: {
        'الطوارئ': { total: 20, occupied: 5 }
      },
      bloodBank: {},
      notifications: [],
      profileImg: null,
      code: code
    };
    saveHospitalToFirebase(hospital);
  }

  if (hospital) {
    currentUserHospital = hospital;
    viewingHospitalId = hospital.id;
    document.getElementById('code-login-error').classList.add('hidden');
    generateRandomHistoricalData(hospital);
    loadHospitalDashboardData(hospital.id);
    launchApp('admin-unlocked'); // fully unlocked
  } else {
    document.getElementById('code-login-error').classList.remove('hidden');
  }
});

superAdminForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('login-super-admin-code').value.trim();

  firebase.auth().signInWithEmailAndPassword("osama@gmail.com", code)
    .then((userCredential) => {
      document.getElementById('super-admin-error').classList.add('hidden');
      launchApp('super-admin');
    })
    .catch((error) => {
      console.error("Firebase auth error: ", error);
      document.getElementById('super-admin-error').classList.remove('hidden');
    });
});

// Access Overlay Input
btnUnlockInternal.addEventListener('click', () => {
  const code = unlockCodeInput.value.trim();
  if (currentUserHospital && currentUserHospital.code === code) {
    userRole = 'admin-unlocked';
    accessLockedOverlay.classList.add('hidden');
    showToast('تم فتح الصلاحيات بنجاح');
  } else {
    unlockError.classList.remove('hidden');
  }
});

// Notifications
function updateNotificationsUI() {
  if (!currentUserHospital) return;
  const notifs = currentUserHospital.notifications || [];
  notifBadge.textContent = notifs.length;
  notifBadge.style.display = notifs.length > 0 ? 'block' : 'none';

  notifList.innerHTML = '';
  if (notifs.length === 0) {
    notifList.innerHTML = '<div class="empty-state" style="padding: 10px;">لا توجد إشعارات.</div>';
  } else {
    notifs.forEach(n => {
      notifList.insertAdjacentHTML('beforeend', `
                <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; margin-bottom: 10px; border: 1px solid rgba(14, 165, 233, 0.2);">
                    <p style="font-size: 14px; margin-bottom: 5px; color: var(--text-primary);"><i class='bx bx-info-circle text-primary'></i> ${n.msg}</p>
                    <small style="color: var(--text-secondary); display:block; margin-bottom: 5px;">${n.date}</small>
                    <div style="display:flex; justify-content: flex-end; gap: 5px;">
                        <button style="background: transparent; color: var(--color-success); border: none; cursor: pointer; font-size: 12px; font-weight: bold;" onclick="saveNotif('${n.id}')">حفظ</button>
                        <button style="background: transparent; color: var(--color-danger); border: none; cursor: pointer; font-size: 12px; font-weight: bold;" onclick="delNotif('${n.id}')">حذف</button>
                    </div>
                </div>
            `);
    });
  }
}

notifBellBtn.addEventListener('click', (e) => {
  if (e.target.tagName.toLowerCase() === 'button') return;
  notifDropdown.classList.toggle('hidden');
});

window.saveNotif = function (nid) {
  showToast('تم حفظ الإشعار في الأرشيف');
}

window.delNotif = function (nid) {
  if (!currentUserHospital) return;
  currentUserHospital.notifications = (currentUserHospital.notifications || []).filter(n => n.id.toString() !== nid.toString());
  db.ref('hospitals/' + currentUserHospital.id).set(currentUserHospital);
  showToast('تم حذف الإشعار');
}

// Super Admin
function renderPendingHospitals() {
  const list = document.getElementById('pending-hospitals-list');
  const pendings = hospitalsDB.filter(h => !h.code);
  list.innerHTML = '';
  if (pendings.length === 0) {
    list.innerHTML = '<div class="empty-state">لا يوجد طلبات حالية.</div>';
    return;
  }

  pendings.forEach(h => {
    list.insertAdjacentHTML('beforeend', `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <h4 style="color: var(--color-warning);">${h.name}</h4>
                    <p style="color:var(--text-secondary); font-size: 14px;">${h.gov} - ${h.city} | أرقام التواصل: ${h.phone || 'غير محدد'}</p>
                </div>
                <button class="btn btn-success" style="padding: 10px 20px; border:none; border-radius: 5px; font-size: 13px;" onclick="approveHospital('${h.id}')">موافقة وإرسال كود</button>
            </div>
        `);
  });
}

function renderApprovedHospitals() {
  const list = document.getElementById('approved-hospitals-list');
  const approved = hospitalsDB.filter(h => h.code);
  list.innerHTML = '';
  if (approved.length === 0) {
    list.innerHTML = '<div class="empty-state">لا توجد مستشفيات بعد.</div>';
    return;
  }

  approved.forEach(h => {
    list.insertAdjacentHTML('beforeend', `
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
              <div>
                  <h4 style="color: var(--color-success); margin-bottom: 5px;">${h.name}</h4>
                  <p style="color:var(--text-secondary); font-size: 14px;">${h.gov} - ${h.city} | أرقام التواصل: ${h.phone || '-'} <br><br> الكود الممنوح للدخول: <span style="background: #f59e0b; padding: 2px 7px; border-radius: 4px; color:#fff; font-weight:bold; font-size: 15px; margin-right: 5px;">${h.code}</span></p>
              </div>
          </div>
      `);
  });
}

window.approveHospital = function (id) {
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const msg = `تم الموافقة على طلبك. الكود السري العشوائي الخاص بك للدخول الداخلي هو: ${code}`;

  const h = hospitalsDB.find(h => h.id === id);
  if (h) {
    h.code = code;
    if (!h.notifications) h.notifications = [];
    h.notifications.push({ id: Date.now(), msg, date: new Date().toLocaleString() });
    db.ref('hospitals/' + id).set(h);
    showToast('تم إنشاء الكود (' + code + ') وإرساله.');
    renderPendingHospitals();
    renderApprovedHospitals();
  }
}

// Profile Image Upload
profileImg.addEventListener('click', () => {
  if (userRole !== 'guest' && userRole !== 'super-admin') {
    profileUpload.click();
  }
});

profileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && currentUserHospital) {
    const reader = new FileReader();
    reader.onload = function (event) {
      currentUserHospital.profileImg = event.target.result;
      profileImg.src = event.target.result;
      db.ref('hospitals/' + currentUserHospital.id).set(currentUserHospital);
      showToast('تم تحديث صورة المستشفى بنجاح');
    };
    reader.readAsDataURL(file);
  }
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
