// ==========================================================
// LAYOUT ENGINE & CLIENT-SIDE SPA ROUTER
// Media Pembelajaran Operasi Campuran Bilangan Bulat
// ==========================================================

// ---- SIDEBAR HTML SISWA (Premium Design) ----
const SIDEBAR_HTML = `
<div class="sb-brand">
  <div class="sb-logo">
    <i class="fa-solid fa-calculator"></i>
  </div>
  <div class="sb-brand-info">
    <span class="sb-brand-name">BilBul</span>
    <span class="sb-brand-sub">Matematika Kelas VII</span>
  </div>
</div>

<nav class="sb-nav" id="sidebar-menu-wrap">

  <ul id="sidebar-menu">
    <li>
      <a href="./dashboard.html" data-path="/dashboard.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-house"></i></span>
        <span class="sb-text">Beranda</span>
      </a>
    </li>
    <li>
      <a href="./petunjuk.html" data-path="/petunjuk.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-circle-info"></i></span>
        <span class="sb-text">Petunjuk</span>
      </a>
    </li>
    <li>
      <a href="./tes-awal.html" data-path="/tes-awal.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-clipboard-list"></i></span>
        <span class="sb-text">Tes Awal</span>
      </a>
    </li>
  </ul>


  <ul id="sidebar-menu-belajar">
    <li>
      <a href="./materi/index.html" data-path="/materi/" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-book-open"></i></span>
        <span class="sb-text">Materi</span>
      </a>
    </li>
    <li>
      <a href="./latihan.html" data-path="/latihan.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-pen-to-square"></i></span>
        <span class="sb-text">Latihan</span>
      </a>
    </li>
    <li>
      <a href="./soal-cerita.html" data-path="/soal-cerita.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-comment-dots"></i></span>
        <span class="sb-text">Soal Cerita</span>
      </a>
    </li>
    <li>
      <a href="./game.html" data-path="/game.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-gamepad"></i></span>
        <span class="sb-text">Game Edukasi</span>
      </a>
    </li>
    <li>
      <a href="./kuis.html" data-path="/kuis.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-stopwatch"></i></span>
        <span class="sb-text">Kuis Akhir</span>
      </a>
    </li>
  </ul>


  <ul id="sidebar-menu-progres">
    <li>
      <a href="./hasil.html" data-path="/hasil.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-chart-line"></i></span>
        <span class="sb-text">Hasil Belajar</span>
      </a>
    </li>
    <li>
      <a href="./pencapaian.html" data-path="/pencapaian.html" class="sb-link">
        <span class="sb-icon"><i class="fa-solid fa-trophy"></i></span>
        <span class="sb-text">Pencapaian</span>
      </a>
    </li>
  </ul>
</nav>
`;

// ---- TOPBAR HTML SISWA ----
const TOPBAR_HTML = `
<div class="tb-inner">
  <div class="tb-left">
    <button id="menu-toggle-btn" class="tb-hamburger" aria-label="Buka menu">
      <i class="fa-solid fa-bars"></i>
    </button>
    <span class="tb-title-mobile">BilBul</span>
    <span class="tb-greeting">Selamat datang di Media Pembelajaran Interaktif!</span>
  </div>
  <div class="tb-right">
    <div id="realtime-clock-student" class="tb-clock" style="display: none;"></div>
    <div id="student-profile" class="tb-profile"></div>
  </div>
</div>
`;

const FOOTER_HTML = `
<div style="text-align:center;font-size:0.78rem;color:#94a3b8;padding:0.5rem 0;">
  &copy; 2024 Media Pembelajaran Operasi Campuran Bilangan Bulat &mdash; Kelas VII SMP
</div>
`;

// ---- ALL-IN-ONE CSS (injected once, no conflicts) ----
function injectLayoutStyles() {
  if (document.getElementById('sb-layout-styles')) return;
  const el = document.createElement('style');
  el.id = 'sb-layout-styles';
  el.textContent = `
    /* ============ RESET & BASE ============ */
    #app-layout { display:flex; height:100vh; overflow:hidden; position:relative; background:#f8fafc; }

    /* ============ SIDEBAR WRAPPER ============ */
    #app-sidebar {
      width: 240px;
      flex-shrink: 0;
      background: white;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 40;
      transition: width 0.3s cubic-bezier(.4,0,.2,1), transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s;
    }

    /* ============ BRAND HEADER ============ */
    .sb-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 14px;
      height: 64px;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
      overflow: hidden;
    }
    .sb-logo {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 15px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .sb-brand-info {
      display: flex; flex-direction: column;
      overflow: hidden; white-space: nowrap;
      transition: opacity 0.25s;
      min-width: 0; flex: 1;
    }
    .sb-brand-name {
      font-size: 1rem; font-weight: 800;
      background: linear-gradient(to right, #2563eb, #4f46e5);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      line-height: 1.2;
    }
    .sb-brand-sub {
      font-size: 0.6rem; font-weight: 600;
      color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;
    }

    /* ============ NAV ============ */
    .sb-nav {
      flex: 1; overflow-y: auto; padding: 12px 10px 16px;
      scrollbar-width: none;
    }
    .sb-nav::-webkit-scrollbar { display: none; }
    .sb-nav ul { list-style: none; margin: 0; padding: 0; }

    .sb-section-label {
      font-size: 0.6rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: #cbd5e1; padding: 12px 10px 4px;
      white-space: nowrap; overflow: hidden;
      transition: opacity 0.2s, height 0.3s;
    }

    /* ============ NAV LINKS ============ */
    .sb-link {
      display: flex; align-items: center; gap: 12px;
      padding: 9px 14px;
      border-radius: 10px;
      color: #64748b; text-decoration: none;
      font-size: 0.875rem; font-weight: 500;
      transition: all 0.2s ease;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      position: relative;
    }
    .sb-link:hover {
      color: #0f172a;
    }
    .sb-link.active {
      color: #2563eb; 
      font-weight: 700;
    }
    .sb-icon {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px;
      font-size: 1rem;
      flex-shrink: 0;
      background: transparent;
      color: #94a3b8;
      transition: all 0.2s ease;
    }
    .sb-link:hover .sb-icon { color: #64748b; }
    .sb-link.active .sb-icon { 
      background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
      color: white; 
      box-shadow: 0 4px 10px rgba(37,99,235,0.3);
    }
    .sb-text { overflow: hidden; transition: opacity 0.2s, width 0.3s; }

    /* ============ COLLAPSED STATE (Desktop) ============ */
    @media (min-width: 1024px) {
      /* Sidebar collapsed: icon-only mode when width < 80px */
      #app-sidebar.sb-collapsed { width: 64px !important; }
      #app-sidebar.sb-collapsed .sb-brand-info { opacity:0; pointer-events:none; }
      #app-sidebar.sb-collapsed .sb-section-label { opacity:0; height:0; padding:0; pointer-events:none; }
      #app-sidebar.sb-collapsed .sb-text { opacity:0; width:0; pointer-events:none; }


      /* Tooltip on hover when collapsed */
      #app-sidebar.sb-collapsed .sb-link::after {
        content: attr(data-label);
        position: absolute; left: 70px;
        background: #1e293b; color: white;
        padding: 5px 12px; border-radius: 8px;
        font-size: 0.8rem; font-weight: 500;
        white-space: nowrap; pointer-events: none;
        opacity: 0; z-index: 200;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transition: opacity 0.15s;
        border: 1px solid #334155;
      }
      #app-sidebar.sb-collapsed .sb-link:hover::after { opacity: 1; }
    }

    /* ============ HAMBURGER BUTTON ============ */
    .tb-hamburger {
      display: flex;
      width: 36px; height: 36px; border-radius: 9px;
      background: #f1f5f9; border: 1px solid #e2e8f0;
      color: #475569; cursor: pointer;
      align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0;
      font-size: 1rem;
    }
    .tb-hamburger:hover { background:#2563eb; color:white; border-color:#2563eb; }

    /* ============ TOPBAR ============ */
    .tb-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 100%; padding: 0 1.25rem;
    }
    .tb-left { display: flex; align-items: center; gap: 10px; }
    .tb-greeting { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .tb-title-mobile { font-size: 0.9rem; font-weight: 800; color: #1e293b; display: none; }
    .tb-right { display: flex; align-items: center; gap: 16px; }
    .tb-clock { 
      align-items: center; gap: 8px;
      padding: 6px 12px; background: #f8fafc; 
      border-radius: 8px; font-size: 0.75rem; 
      color: #475569; font-weight: 600;
      border: 1px solid #e2e8f0;
    }
    .tb-profile { display: flex; align-items: center; gap: 8px; }

    /* ============ OVERLAY ============ */
    #sidebar-overlay {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0.5);
      backdrop-filter: blur(3px);
      z-index: 30; opacity: 0; pointer-events: none;
      transition: opacity 0.3s;
    }
    #sidebar-overlay.active { opacity:1; pointer-events:auto; }

    /* ============ TABLET (768-1023px) ============ */
    @media (min-width: 768px) and (max-width: 1023px) {
      .sb-collapse-btn { display: none !important; }
      .tb-hamburger { display: flex !important; }
      .tb-greeting { display: none; }
      .tb-title-mobile { display: block; }
      #app-sidebar {
        position: fixed !important; top:0; left:0; height:100% !important;
        transform: translateX(-100%); box-shadow: none;
      }
      #app-sidebar.sb-open { transform:translateX(0); box-shadow: 12px 0 40px rgba(0,0,0,0.15); }
    }

    @media (max-width: 767px) {
      .sb-collapse-btn { display: none !important; }
      .tb-hamburger { display: flex !important; }
      .tb-greeting { display: none; }
      .tb-clock { display: none !important; }
      .tb-title-mobile { display: block; }
      #app-sidebar {
        position: fixed !important; top:0; left:0; height:100% !important;
        width: 260px !important; transform: translateX(-100%); box-shadow: none;
      }
      #app-sidebar.sb-open { transform:translateX(0); box-shadow: 12px 0 40px rgba(0,0,0,0.2); }
      #app-content { padding: 1rem !important; }
    }

    /* ============ MAIN AREA ============ */
    #app-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
    #app-content { flex:1; overflow-y:auto; padding:2rem; transition:opacity 0.15s; }
    @media (max-width:1023px) { #app-content { padding: 1.25rem; } }
    @media (max-width:767px)  { #app-content { padding: 1rem; } }
  `;
  document.head.appendChild(el);
}

// Tambahkan data-label untuk tooltip collapsed
function addTooltipLabels() {
  document.querySelectorAll('.sb-link').forEach(link => {
    const text = link.querySelector('.sb-text');
    if (text) link.setAttribute('data-label', text.textContent.trim());
  });
}

// 1. Auto-inject SweetAlert2 jika belum tersedia
(function ensureSweetAlert() {
  if (typeof window.Swal === 'undefined' && !document.querySelector('script[src*="sweetalert2"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(script);
  }
  const origAlert = window.alert;
  window.alert = function (message) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: 'Pemberitahuan', text: String(message), icon: 'info',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'rounded-2xl shadow-xl font-sans', confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm' }
      });
    }
    return origAlert(message);
  };
})();

// 2. Cegah BFCache
window.addEventListener('pageshow', (event) => {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' || path.endsWith('/login.html') || path.includes('/admin/')) return;
  if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
    const cached = localStorage.getItem('math_current_user');
    if (!cached) {
      const isMateri = path.includes('/materi/');
      window.location.replace(isMateri ? '../login.html?logout=true' : 'login.html?logout=true');
    }
  }
});

// 3. Layout Initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.noLayout === 'true' ||
      document.getElementById('no-app-layout') ||
      window.location.pathname.includes('/admin/') ||
      window.location.pathname.endsWith('/login.html')) return;

  injectLayoutStyles();

  if (!document.getElementById('app-layout')) {
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="app-layout">
        <div id="sidebar-overlay"></div>
        <aside id="app-sidebar">${SIDEBAR_HTML}</aside>
        <div id="app-main">
          <header id="app-topbar" style="height:64px;flex-shrink:0;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);position:sticky;top:0;z-index:10;">
            ${TOPBAR_HTML}
          </header>
          <main id="app-content">${originalContent}</main>
          <footer id="app-footer" style="flex-shrink:0;background:white;border-top:1px solid #f1f5f9;">${FOOTER_HTML}</footer>
        </div>
      </div>
    `;
    const hiddenWrap = document.querySelector('#app-content #page-container, #app-content #home-content');
    if (hiddenWrap) hiddenWrap.style.display = 'block';
  }

  addTooltipLabels();
  fixSubfolderLinks();
  initLayoutInteractivity();
  setupSpaRouter();

  window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url: window.location.href, initial: true } }));
});

// Fix href untuk subfolder /materi/
function fixSubfolderLinks() {
  const isSubfolder = window.location.pathname.includes('/materi/');
  document.querySelectorAll('.sb-link[data-path]').forEach(link => {
    const p = link.getAttribute('data-path');
    if (!p) return;
    const clean = p.startsWith('/') ? p.substring(1) : p;
    link.setAttribute('href', (isSubfolder ? '../' : './') + clean);
  });
}

// 4. Responsive Sidebar Interactivity
function initLayoutInteractivity() {
  const sidebar   = document.getElementById('app-sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('menu-toggle-btn');
  if (!sidebar) return;

  const isDesktop = () => window.innerWidth >= 1024;

  function openDrawer() {
    sidebar.classList.add('sb-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    sidebar.classList.remove('sb-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger) {
    hamburger.onclick = () => {
      if (isDesktop()) {
        const DEF_W = 240;
        const MIN_W = 64;
        const isCollapsed = sidebar.classList.contains('sb-collapsed');
        if (isCollapsed) {
          sidebar.style.width = DEF_W + 'px';
          sidebar.classList.remove('sb-collapsed');
        } else {
          sidebar.style.width = MIN_W + 'px';
          sidebar.classList.add('sb-collapsed');
        }
        try { localStorage.setItem('bilbul_sidebar_width', sidebar.offsetWidth); } catch(_) {}
      } else {
        sidebar.classList.contains('sb-open') ? closeDrawer() : openDrawer();
      }
    };
  }
  if (overlay) overlay.onclick = closeDrawer;

  window.addEventListener('resize', () => { if (isDesktop()) { closeDrawer(); document.body.style.overflow = ''; } });

  let tx = 0, ty = 0;
  document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (isDesktop()) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0 && tx < 30) openDrawer();
    else if (dx < 0 && sidebar.classList.contains('sb-open')) closeDrawer();
  }, { passive: true });

  sidebar.addEventListener('click', e => { if (!isDesktop() && e.target.closest('a')) closeDrawer(); });

  // --- Realtime Clock ---
  function updateStudentClock() {
    const clockEl = document.getElementById('realtime-clock-student');
    if (!clockEl) return;
    const now = new Date();
    const dateOpts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const timeOpts = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateStr = now.toLocaleDateString('id-ID', dateOpts);
    const timeStr = now.toLocaleTimeString('id-ID', timeOpts).replace(/\./g, ':');
    clockEl.innerHTML = `<i class="fa-solid fa-clock text-blue-500"></i><span>${dateStr} - ${timeStr}</span>`;
    clockEl.style.display = 'flex';
  }
  updateStudentClock();
  setInterval(updateStudentClock, 1000);

  updateActiveSidebarLink(window.location.pathname);
}


// 5. Active link
function updateActiveSidebarLink(targetPath) {
  const currentPath = targetPath || window.location.pathname;
  const isSubfolder = currentPath.includes('/materi/');

  document.querySelectorAll('.sb-link').forEach(link => {
    const dataPath = link.getAttribute('data-path');
    let isActive = false;
    if (dataPath) {
      if (dataPath === '/dashboard.html' && (currentPath.endsWith('/dashboard.html') || currentPath.endsWith('dashboard.html'))) isActive = true;
      else if (dataPath === '/materi/' && currentPath.includes('/materi/')) isActive = true;
      else if (dataPath !== '/dashboard.html' && currentPath.includes(dataPath.replace(/^\//, ''))) isActive = true;
    }
    link.classList.toggle('active', isActive);

    if (dataPath) {
      const clean = dataPath.startsWith('/') ? dataPath.substring(1) : dataPath;
      link.setAttribute('href', (isSubfolder ? '../' : './') + clean);
    }
  });
}

// 6. SPA Router
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
      const tp = targetUrl.pathname;
      if (tp.includes('/admin/') || tp.endsWith('/login.html') || (tp.endsWith('/index.html') && !tp.includes('/materi/')) || tp === '/' || targetUrl.searchParams.has('logout')) return;
      e.preventDefault();
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar && window.innerWidth < 1024) {
        sidebar.classList.remove('sb-open');
        const ov = document.getElementById('sidebar-overlay');
        if (ov) ov.classList.remove('active');
        document.body.style.overflow = '';
      }
      spaNavigate(targetUrl.href, true);
    } catch (_) {}
  });
  window.addEventListener('popstate', () => spaNavigate(window.location.href, false));
}

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
    const pageContainer = doc.getElementById('page-container') || doc.getElementById('home-content') || doc.getElementById('app-content') || doc.querySelector('main');
    let newContent = '';
    if (pageContainer) { pageContainer.style.display = 'block'; newContent = pageContainer.innerHTML; }
    else { newContent = doc.body.innerHTML; }
    contentContainer.innerHTML = newContent;
    contentContainer.scrollTop = 0;
    if (pushState) history.pushState({ spa: true, url }, '', url);
    updateActiveSidebarLink(new URL(url, window.location.href).pathname);
    await executePageScripts(doc);
    window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url } }));
  } catch (err) {
    console.warn('SPA fallback to reload:', err);
    window.location.href = url;
  } finally {
    contentContainer.style.opacity = '1';
  }
}

async function executePageScripts(doc) {
  const scripts = doc.querySelectorAll('script');
  for (const oldScript of scripts) {
    const src = oldScript.getAttribute('src');
    if (src && (src.includes('tailwindcss') || src.includes('font-awesome') || src.includes('sweetalert2') || src.includes('layout.js'))) continue;
    const newScript = document.createElement('script');
    if (oldScript.type) newScript.type = oldScript.type;
    if (src) { newScript.src = src; document.body.appendChild(newScript); }
    else if (oldScript.textContent.trim()) {
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      setTimeout(() => newScript.remove(), 100);
    }
  }
}

window.spaNavigate = spaNavigate;
