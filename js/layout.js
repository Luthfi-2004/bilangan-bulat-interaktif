// ==========================================================
// LAYOUT ENGINE & CLIENT-SIDE SPA ROUTER
// Media Pembelajaran Operasi Campuran Bilangan Bulat
// ==========================================================

// ---- HTML KOMPONEN INLINE (tidak bergantung fetch/server) ----

const SIDEBAR_HTML = `
<div class="sidebar-brand" style="position:relative;">
  <i class="fa-solid fa-calculator text-blue-600 text-xl flex-shrink-0"></i>
  <span class="sidebar-brand-text" style="margin-left:0.5rem;font-size:1.125rem;font-weight:700;background:linear-gradient(to right,#2563eb,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">BilBul</span>
  <button id="sidebar-toggle-desktop" title="Perkecil/Perbesar Sidebar">
    <i class="fa-solid fa-chevron-left"></i>
  </button>
</div>
<nav class="flex-1 overflow-y-auto py-4 no-scrollbar">
  <ul id="sidebar-menu" style="list-style:none;margin:0;padding:0;">
    <li><a href="./dashboard.html" data-path="/dashboard.html" class="nav-link"><i class="fa-solid fa-house"></i><span class="sidebar-label">Beranda Belajar</span></a></li>
    <li><a href="./petunjuk.html" data-path="/petunjuk.html" class="nav-link"><i class="fa-solid fa-circle-info"></i><span class="sidebar-label">Petunjuk</span></a></li>
    <li><a href="./tes-awal.html" data-path="/tes-awal.html" class="nav-link"><i class="fa-solid fa-clipboard-list"></i><span class="sidebar-label">Tes Awal</span></a></li>
    <li><a href="./materi/index.html" data-path="/materi/" class="nav-link"><i class="fa-solid fa-book-open"></i><span class="sidebar-label">Materi</span></a></li>
    <li><a href="./latihan.html" data-path="/latihan.html" class="nav-link"><i class="fa-solid fa-pen-to-square"></i><span class="sidebar-label">Latihan</span></a></li>
    <li><a href="./soal-cerita.html" data-path="/soal-cerita.html" class="nav-link"><i class="fa-solid fa-comment-dots"></i><span class="sidebar-label">Soal Cerita</span></a></li>
    <li><a href="./game.html" data-path="/game.html" class="nav-link"><i class="fa-solid fa-gamepad"></i><span class="sidebar-label">Game</span></a></li>
    <li><a href="./kuis.html" data-path="/kuis.html" class="nav-link"><i class="fa-solid fa-stopwatch"></i><span class="sidebar-label">Kuis Akhir</span></a></li>
    <li><a href="./hasil.html" data-path="/hasil.html" class="nav-link"><i class="fa-solid fa-chart-line"></i><span class="sidebar-label">Hasil Belajar</span></a></li>
    <li><a href="./pencapaian.html" data-path="/pencapaian.html" class="nav-link"><i class="fa-solid fa-trophy"></i><span class="sidebar-label">Pencapaian</span></a></li>
  </ul>
</nav>
`;

const TOPBAR_HTML = `
<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 1rem;">
  <div style="display:flex;align-items:center;gap:0.75rem;">
    <button id="menu-toggle-btn" aria-label="Toggle menu" title="Buka/Tutup Menu">
      <i class="fa-solid fa-bars" style="font-size:1.1rem;"></i>
    </button>
    <span id="topbar-greeting" style="font-size:0.875rem;color:#64748b;font-weight:500;" class="hidden-mobile">Selamat datang di Media Pembelajaran Interaktif!</span>
    <span style="font-size:0.875rem;font-weight:700;color:#1e293b;" class="visible-mobile">BilBul</span>
  </div>
  <div id="student-profile" style="display:flex;align-items:center;gap:0.5rem;">
    <!-- Injected by main.js -->
  </div>
</div>
`;

const FOOTER_HTML = `
<div style="text-align:center;font-size:0.8rem;color:#94a3b8;">
  &copy; 2024 Media Pembelajaran Operasi Campuran Bilangan Bulat. Dibuat untuk Kelas VII.
</div>
`;

// ---- INLINE STYLES untuk sidebar responsif (fallback jika CSS terlambat load) ----
function injectResponsiveStyles() {
  if (document.getElementById('layout-responsive-styles')) return;
  const style = document.createElement('style');
  style.id = 'layout-responsive-styles';
  style.textContent = `
    /* --- TOPBAR GREETING --- */
    .hidden-mobile { display: inline; }
    .visible-mobile { display: none; }
    @media (max-width: 767px) {
      .hidden-mobile { display: none; }
      .visible-mobile { display: inline; }
    }

    /* --- SIDEBAR BRAND --- */
    .sidebar-brand {
      display: flex; align-items: center;
      height: 64px; padding: 0 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0; overflow: hidden;
      transition: padding 0.3s ease;
    }
    .sidebar-brand-text {
      display: inline-block; white-space: nowrap;
      overflow: hidden; transition: opacity 0.25s ease, width 0.3s ease;
      width: auto;
    }

    /* --- NAV LINKS --- */
    .nav-link {
      display: flex; align-items: center;
      padding: 0.75rem 1.25rem;
      color: #475569; text-decoration: none;
      transition: background 0.2s, color 0.2s, padding 0.3s;
      white-space: nowrap; overflow: hidden;
      position: relative; gap: 0.75rem;
    }
    .nav-link:hover { background: #f8fafc; color: #2563eb; }
    .nav-link.active {
      background: #eff6ff; color: #2563eb;
      font-weight: 600; border-right: 3px solid #2563eb;
    }
    .nav-link i {
      width: 1.25rem; text-align: center;
      font-size: 1.05rem; flex-shrink: 0;
      transition: margin 0.3s;
    }

    /* --- DESKTOP TOGGLE BUTTON --- */
    #sidebar-toggle-desktop {
      position: absolute; right: -13px; top: 50%;
      transform: translateY(-50%);
      width: 26px; height: 26px;
      background: white; border: 1.5px solid #e2e8f0;
      border-radius: 50%; display: flex;
      align-items: center; justify-content: center;
      cursor: pointer; z-index: 50; color: #64748b;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: all 0.2s; flex-shrink: 0;
    }
    #sidebar-toggle-desktop:hover {
      background: #2563eb; color: white; border-color: #2563eb;
    }
    #sidebar-toggle-desktop i {
      font-size: 10px; transition: transform 0.3s;
    }
    #app-sidebar.sidebar-collapsed #sidebar-toggle-desktop i {
      transform: rotate(180deg);
    }

    /* --- HAMBURGER BUTTON --- */
    #menu-toggle-btn {
      width: 38px; height: 38px; border-radius: 9px;
      background: #f1f5f9; border: 1px solid #e2e8f0;
      color: #475569; cursor: pointer;
      display: none; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0;
    }
    #menu-toggle-btn:hover { background: #2563eb; color: white; border-color: #2563eb; }

    /* --- SIDEBAR BASE (semua ukuran) --- */
    #app-sidebar {
      width: 248px; flex-shrink: 0;
      transition: width 0.3s cubic-bezier(.4,0,.2,1),
                  transform 0.3s cubic-bezier(.4,0,.2,1),
                  box-shadow 0.3s;
      overflow: hidden; z-index: 40;
      display: flex; flex-direction: column;
    }

    /* --- DESKTOP (>=1024px) --- */
    @media (min-width: 1024px) {
      #menu-toggle-btn { display: none !important; }
      #sidebar-toggle-desktop { display: flex; }

      #app-sidebar.sidebar-collapsed { width: 68px; }
      #app-sidebar.sidebar-collapsed .sidebar-label { opacity: 0; width: 0; overflow: hidden; pointer-events: none; }
      #app-sidebar.sidebar-collapsed .sidebar-brand-text { opacity: 0; width: 0; overflow: hidden; }
      #app-sidebar.sidebar-collapsed .sidebar-brand { padding-left: 0; padding-right: 0; justify-content: center; }
      #app-sidebar.sidebar-collapsed .nav-link { justify-content: center; padding-left: 0; padding-right: 0; gap: 0; }
      #app-sidebar.sidebar-collapsed .nav-link i { margin: 0; width: auto; }

      /* Tooltip saat collapsed */
      #app-sidebar.sidebar-collapsed .nav-link { position: relative; }
      #app-sidebar.sidebar-collapsed .sidebar-label {
        position: absolute !important; left: 72px;
        background: #1e293b; color: white;
        padding: 4px 10px; border-radius: 6px;
        font-size: 0.78rem; font-weight: 500;
        white-space: nowrap; opacity: 0 !important;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 100;
        width: auto !important; overflow: visible !important;
        transition: opacity 0.15s !important;
      }
      #app-sidebar.sidebar-collapsed .nav-link:hover .sidebar-label {
        opacity: 1 !important;
      }
    }

    /* --- TABLET (768-1023px) --- */
    @media (min-width: 768px) and (max-width: 1023px) {
      #menu-toggle-btn { display: flex !important; }
      #sidebar-toggle-desktop { display: none !important; }
      #app-sidebar {
        position: fixed !important; top: 0; left: 0;
        height: 100% !important; transform: translateX(-100%);
        box-shadow: none; z-index: 40;
      }
      #app-sidebar.sidebar-open {
        transform: translateX(0);
        box-shadow: 8px 0 32px rgba(0,0,0,0.15);
      }
    }

    /* --- MOBILE (<768px) --- */
    @media (max-width: 767px) {
      #menu-toggle-btn { display: flex !important; }
      #sidebar-toggle-desktop { display: none !important; }
      #app-sidebar {
        position: fixed !important; top: 0; left: 0;
        height: 100% !important; width: 272px !important;
        transform: translateX(-100%);
        box-shadow: none; z-index: 40;
      }
      #app-sidebar.sidebar-open {
        transform: translateX(0);
        box-shadow: 8px 0 32px rgba(0,0,0,0.2);
      }
    }

    /* --- OVERLAY --- */
    #sidebar-overlay {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0.45);
      backdrop-filter: blur(2px);
      z-index: 30; opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    #sidebar-overlay.active { opacity: 1; pointer-events: auto; }

    /* --- APP CONTENT PADDING --- */
    #app-content { padding: 1.5rem; }
    @media (min-width: 1024px) { #app-content { padding: 2rem; } }
    @media (max-width: 767px) { #app-content { padding: 1rem; } }

    /* --- SCROLLBAR --- */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
  `;
  document.head.appendChild(style);
}

// 1. Auto-inject SweetAlert2 jika belum tersedia di dokumen
(function ensureSweetAlert() {
  if (typeof window.Swal === 'undefined' && !document.querySelector('script[src*="sweetalert2"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(script);
  }

  // Override window.alert agar dialog bawaan browser tidak pernah muncul
  const origAlert = window.alert;
  window.alert = function (message) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: 'Pemberitahuan',
        text: String(message),
        icon: 'info',
        confirmButtonColor: '#2563eb',
        customClass: {
          popup: 'rounded-2xl shadow-xl font-sans',
          confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm'
        }
      });
    }
    return origAlert(message);
  };
})();

// 2. Cegah BFCache me-restore sesi belajar siswa setelah logout
window.addEventListener('pageshow', (event) => {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' || path.endsWith('/login.html') || path.includes('/admin/')) {
    return;
  }
  if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
    const cached = localStorage.getItem('math_current_user');
    if (!cached) {
      const isMateri = path.includes('/materi/');
      const target = isMateri ? '../login.html?logout=true' : 'login.html?logout=true';
      window.location.replace(target);
    }
  }
});

// Helper: apakah path ini di sub-folder /materi/?
function getAppBasePath() {
  return window.location.pathname.includes('/materi/') ? '../' : './';
}

// 3. Layout Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  // Lewati jika halaman ditandai bebas layout, login, admin, atau landing
  if (document.body.dataset.noLayout === 'true' || 
      document.getElementById('no-app-layout') ||
      window.location.pathname.includes('/admin/') ||
      window.location.pathname.endsWith('/login.html')) {
    return;
  }

  // Inject style responsif ke <head>
  injectResponsiveStyles();

  // Bangun shell layout satu kali
  if (!document.getElementById('app-layout')) {
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="app-layout" style="display:flex;height:100vh;overflow:hidden;position:relative;background:#f8fafc;">
        <!-- Overlay untuk mobile/tablet -->
        <div id="sidebar-overlay"></div>
        
        <!-- Sidebar -->
        <aside id="app-sidebar" style="border-right:1px solid #e2e8f0;background:white;">
          ${SIDEBAR_HTML}
        </aside>
        
        <!-- Main Area -->
        <div id="app-main" style="flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;">
          <!-- Topbar -->
          <header id="app-topbar" style="height:64px;flex-shrink:0;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);position:sticky;top:0;z-index:10;">
            ${TOPBAR_HTML}
          </header>
          
          <!-- Konten Dinamis -->
          <main id="app-content" style="flex:1;overflow-y:auto;transition:opacity 0.15s;">
            ${originalContent}
          </main>
          
          <!-- Footer -->
          <footer id="app-footer" style="flex-shrink:0;background:white;border-top:1px solid #e2e8f0;padding:0.75rem 1rem;">
            ${FOOTER_HTML}
          </footer>
        </div>
      </div>
    `;

    // Pastikan container halaman awal langsung tampil
    const hiddenWrap = document.querySelector('#app-content #page-container, #app-content #home-content');
    if (hiddenWrap) {
      hiddenWrap.style.display = 'block';
    }
  }

  // Fix href untuk materi subfolder
  const isSubfolder = window.location.pathname.includes('/materi/');
  if (isSubfolder) {
    document.querySelectorAll('#sidebar-menu a[data-path]').forEach(link => {
      const dataPath = link.getAttribute('data-path');
      if (dataPath) {
        const clean = dataPath.startsWith('/') ? dataPath.substring(1) : dataPath;
        link.setAttribute('href', '../' + clean);
      }
    });
  }

  initLayoutInteractivity();
  setupSpaRouter();

  // Trigger profil di topbar
  window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url: window.location.href, initial: true } }));
});

// 4. Interaktivitas UI Layout (Responsive Sidebar)
function initLayoutInteractivity() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const desktopToggleBtn = document.getElementById('sidebar-toggle-desktop');

  if (!sidebar) return;

  const isDesktop = () => window.innerWidth >= 1024;

  function openSidebar() {
    sidebar.classList.add('sidebar-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleMobile() {
    sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
  }

  // --- Desktop collapse ---
  const COLLAPSE_KEY = 'bilbul_sidebar_collapsed';

  function applyCollapse(collapsed) {
    sidebar.classList.toggle('sidebar-collapsed', collapsed);
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch(_) {}
  }

  // Restore state dari localStorage
  if (isDesktop()) {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') applyCollapse(true);
    } catch(_) {}
  }

  // Hamburger (mobile & tablet)
  if (menuToggleBtn) menuToggleBtn.onclick = toggleMobile;

  // Desktop collapse toggle
  if (desktopToggleBtn) {
    desktopToggleBtn.onclick = () => applyCollapse(!sidebar.classList.contains('sidebar-collapsed'));
  }

  // Klik overlay → tutup drawer
  if (overlay) overlay.onclick = closeSidebar;

  // Resize ke desktop → bersihkan state mobile
  window.addEventListener('resize', () => {
    if (isDesktop()) { closeSidebar(); document.body.style.overflow = ''; }
  });

  // Swipe gesture (mobile)
  let tx = 0, ty = 0;
  document.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (isDesktop()) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0 && tx < 30) openSidebar();
    else if (dx < 0 && sidebar.classList.contains('sidebar-open')) closeSidebar();
  }, { passive: true });

  // Klik link → tutup drawer di mobile/tablet
  sidebar.addEventListener('click', e => {
    if (!isDesktop() && e.target.closest('a')) closeSidebar();
  });

  updateActiveSidebarLink(window.location.pathname);
}

// 5. Update link aktif di sidebar
function updateActiveSidebarLink(targetPath) {
  const menuLinks = document.querySelectorAll('#sidebar-menu a');
  const currentPath = targetPath || window.location.pathname;

  menuLinks.forEach(link => {
    const dataPath = link.getAttribute('data-path');
    let isActive = false;

    if (dataPath) {
      if (dataPath === '/dashboard.html' && (currentPath.endsWith('/dashboard.html') || currentPath.endsWith('dashboard.html'))) {
        isActive = true;
      } else if (dataPath === '/materi/' && currentPath.includes('/materi/')) {
        isActive = true;
      } else if (dataPath !== '/dashboard.html' && currentPath.includes(dataPath.replace(/^\//, ''))) {
        isActive = true;
      }
    }

    link.classList.toggle('active', isActive);

    // Fix href untuk subfolder
    const isSubfolder = window.location.pathname.includes('/materi/');
    if (dataPath) {
      const cleanPath = dataPath.startsWith('/') ? dataPath.substring(1) : dataPath;
      link.setAttribute('href', (isSubfolder ? '../' : './') + cleanPath);
    }
  });
}

// 6. CLIENT-SIDE SPA ROUTER
function setupSpaRouter() {
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    try {
      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;

      const targetPath = targetUrl.pathname;
      if (targetPath.includes('/admin/') || 
          targetPath.endsWith('/login.html') || 
          (targetPath.endsWith('/index.html') && !targetPath.includes('/materi/')) ||
          targetPath === '/' || 
          targetUrl.searchParams.has('logout')) {
        return;
      }

      e.preventDefault();

      // Tutup sidebar mobile saat navigasi
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar && window.innerWidth < 1024) {
        sidebar.classList.remove('sidebar-open');
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
      }

      spaNavigate(targetUrl.href, true);
    } catch (_) {}
  });

  window.addEventListener('popstate', () => {
    spaNavigate(window.location.href, false);
  });
}

/**
 * Navigasi SPA Halus tanpa reload browser
 */
async function spaNavigate(url, pushState = true) {
  const contentContainer = document.getElementById('app-content');
  if (!contentContainer) { window.location.href = url; return; }

  contentContainer.style.opacity = '0.35';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (doc.title) document.title = doc.title;

    let newContent = '';
    const pageContainer = doc.getElementById('page-container') || 
                         doc.getElementById('home-content') || 
                         doc.getElementById('app-content') || 
                         doc.querySelector('main');

    if (pageContainer) {
      pageContainer.style.display = 'block';
      newContent = pageContainer.innerHTML;
    } else {
      newContent = doc.body.innerHTML;
    }

    contentContainer.innerHTML = newContent;
    contentContainer.scrollTop = 0;

    if (pushState) history.pushState({ spa: true, url }, '', url);

    updateActiveSidebarLink(new URL(url, window.location.href).pathname);
    await executePageScripts(doc);

    window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url } }));

  } catch (err) {
    console.warn('Navigasi SPA dialihkan ke reload bawaan:', err);
    window.location.href = url;
  } finally {
    contentContainer.style.opacity = '1';
  }
}

// Eksekusi script dari halaman baru
async function executePageScripts(doc) {
  const scripts = doc.querySelectorAll('script');
  for (const oldScript of scripts) {
    const src = oldScript.getAttribute('src');
    if (src && (
      src.includes('tailwindcss') || 
      src.includes('font-awesome') || 
      src.includes('sweetalert2') || 
      src.includes('layout.js')
    )) continue;

    const newScript = document.createElement('script');
    if (oldScript.type) newScript.type = oldScript.type;
    
    if (src) {
      newScript.src = src;
      document.body.appendChild(newScript);
    } else if (oldScript.textContent.trim()) {
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      setTimeout(() => newScript.remove(), 100);
    }
  }
}

// Ekspos spaNavigate ke window
window.spaNavigate = spaNavigate;
