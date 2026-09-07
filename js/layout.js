// ==========================================================
// LAYOUT ENGINE & CLIENT-SIDE SPA ROUTER
// Media Pembelajaran Operasi Campuran Bilangan Bulat
// ==========================================================

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

// Helper: Tentukan root path aplikasi ('./' atau '../')
function getAppBasePath() {
  return window.location.pathname.includes('/materi/') ? '../' : './';
}

// 3. Layout Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  // Lewati jika halaman ditandai bebas layout, login, admin, atau landing promosi index.html
  if (document.body.dataset.noLayout === 'true' || 
      document.getElementById('no-app-layout') ||
      window.location.pathname.includes('/admin/') ||
      window.location.pathname.endsWith('/login.html')) {
    return;
  }

  // Bangun shell layout satu kali
  if (!document.getElementById('app-layout')) {
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="app-layout" class="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800" style="position:relative;">
        <!-- Overlay untuk mobile/tablet -->
        <div id="sidebar-overlay"></div>
        
        <!-- Sidebar -->
        <aside id="app-sidebar" class="border-r border-slate-200 bg-white"></aside>
        
        <!-- Main Area -->
        <div id="app-main" class="flex-1 flex flex-col min-w-0 relative overflow-hidden">
          <!-- Topbar -->
          <header id="app-topbar" class="h-16 flex-shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-10"></header>
          
          <!-- Konten Dinamis -->
          <main id="app-content" class="flex-1 overflow-y-auto relative transition-opacity duration-150">
            ${originalContent}
          </main>
          
          <!-- Footer -->
          <footer id="app-footer" class="flex-shrink-0 bg-white border-t border-slate-200 p-4"></footer>
        </div>
      </div>
    `;

    // Pastikan container halaman awal langsung tampil tanpa tersembunyi
    const hiddenWrap = document.querySelector('#app-content #page-container, #app-content #home-content');
    if (hiddenWrap) {
      hiddenWrap.style.display = 'block';
    }
  }

  // Muat komponen partials (sidebar, topbar, footer) satu kali
  const basePath = getAppBasePath();
  try {
    const [sidebarRes, topbarRes, footerRes] = await Promise.all([
      fetch(`${basePath}components/sidebar.html`),
      fetch(`${basePath}components/topbar.html`),
      fetch(`${basePath}components/footer.html`)
    ]);

    if (sidebarRes.ok) document.getElementById('app-sidebar').innerHTML = await sidebarRes.text();
    if (topbarRes.ok) document.getElementById('app-topbar').innerHTML = await topbarRes.text();
    if (footerRes.ok) document.getElementById('app-footer').innerHTML = await footerRes.text();

    initLayoutInteractivity();
    setupSpaRouter();

    // Trigger profil di topbar jika modul main.js tersedia
    window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url: window.location.href, initial: true } }));
  } catch (error) {
    console.error('Error loading layout components:', error);
  }
});

// 4. Interaktivitas UI Layout (Responsive Sidebar)
function initLayoutInteractivity() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const desktopToggleBtn = document.getElementById('sidebar-toggle-desktop');

  if (!sidebar) return;

  // --- Helper: apakah ini layar desktop? ---
  const isDesktop = () => window.innerWidth >= 1024;

  // --- Buka/Tutup sidebar (mobile & tablet) ---
  function openSidebar() {
    sidebar.classList.add('sidebar-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // cegah scroll body saat drawer terbuka
  }

  function closeSidebar() {
    sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleSidebarMobile() {
    if (sidebar.classList.contains('sidebar-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // --- Collapse/Expand sidebar (desktop only) ---
  const COLLAPSE_KEY = 'bilbul_sidebar_collapsed';

  function applyDesktopCollapse(collapsed) {
    if (collapsed) {
      sidebar.classList.add('sidebar-collapsed');
    } else {
      sidebar.classList.remove('sidebar-collapsed');
    }
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch(_) {}
  }

  function toggleDesktopSidebar() {
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
    applyDesktopCollapse(!isCollapsed);
  }

  // Restore state dari localStorage
  if (isDesktop()) {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '1') applyDesktopCollapse(true);
    } catch(_) {}
  }

  // --- Event Listeners ---

  // Hamburger (mobile & tablet)
  if (menuToggleBtn) {
    menuToggleBtn.onclick = toggleSidebarMobile;
  }

  // Collapse toggle (desktop)
  if (desktopToggleBtn) {
    desktopToggleBtn.onclick = toggleDesktopSidebar;
  }

  // Klik overlay untuk tutup drawer
  if (overlay) {
    overlay.onclick = closeSidebar;
  }

  // Tutup sidebar saat resize ke desktop
  window.addEventListener('resize', () => {
    if (isDesktop()) {
      closeSidebar(); // bersihkan state mobile
      document.body.style.overflow = '';
    }
  });

  // === Swipe gesture untuk mobile (geser kiri untuk tutup, kanan untuk buka) ===
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (isDesktop()) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Pastikan swipe lebih horizontal daripada vertikal
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx > 0 && touchStartX < 30) {
      // Swipe dari tepi kiri ke kanan: buka sidebar
      openSidebar();
    } else if (dx < 0 && sidebar.classList.contains('sidebar-open')) {
      // Swipe kanan ke kiri saat sidebar terbuka: tutup
      closeSidebar();
    }
  }, { passive: true });

  // Tutup sidebar saat link di-klik (mobile/tablet)
  sidebar.addEventListener('click', (e) => {
    if (!isDesktop() && e.target.closest('a')) {
      closeSidebar();
    }
  });

  updateActiveSidebarLink(window.location.pathname);
}

// 5. Update status link aktif di sidebar tanpa me-reload DOM
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
      } else if (dataPath !== '/dashboard.html' && currentPath.includes(dataPath)) {
        isActive = true;
      }
    }

    // Gunakan CSS class 'active' dari style.css (bukan Tailwind utilities)
    if (isActive) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }

    // Koreksi href relatif terhadap kedalaman folder aktif saat ini
    const isSubfolder = window.location.pathname.includes('/materi/');
    if (dataPath) {
      const cleanPath = dataPath.startsWith('/') ? dataPath.substring(1) : dataPath;
      if (isSubfolder) {
        link.setAttribute('href', '../' + cleanPath);
      } else {
        link.setAttribute('href', './' + cleanPath);
      }
    }
  });
}

// 6. CLIENT-SIDE SPA ROUTER
function setupSpaRouter() {
  // Tangkap seluruh klik link internal
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    // Abaikan jika ada atribut prevent atau modifier keys
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Cek domain
    try {
      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;

      // Pengecualian halaman yang TIDAK boleh di-SPA (harus hard reload / beda tata letak):
      // - Halaman admin (/admin/)
      // - Halaman login (login.html)
      // - Landing page luar (index.html di root)
      const targetPath = targetUrl.pathname;
      if (targetPath.includes('/admin/') || 
          targetPath.endsWith('/login.html') || 
          (targetPath.endsWith('/index.html') && !targetPath.includes('/materi/')) ||
          targetPath === '/' || 
          targetUrl.searchParams.has('logout')) {
        return; // Biarkan browser membuka secara normal
      }

      // Ini adalah route belajar siswa: jalankan navigasi SPA!
      e.preventDefault();

      // Tutup sidebar mobile jika sedang terbuka
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar && !sidebar.classList.contains('hidden') && window.innerWidth < 768) {
        sidebar.classList.add('hidden');
      }

      spaNavigate(targetUrl.href, true);
    } catch (_) {
      // Jika URL parsing gagal, biarkan aksi bawaan
    }
  });

  // Tangani tombol Back / Forward browser
  window.addEventListener('popstate', () => {
    spaNavigate(window.location.href, false);
  });
}

/**
 * Navigasi SPA Halus tanpa reload browser
 * @param {string} url - URL tujuan
 * @param {boolean} pushState - Apakah menyimpan ke browser history
 */
async function spaNavigate(url, pushState = true) {
  const contentContainer = document.getElementById('app-content');
  if (!contentContainer) {
    window.location.href = url;
    return;
  }

  // Efek transisi halus (fade out)
  contentContainer.style.opacity = '0.35';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Update judul halaman di tab browser
    if (doc.title) {
      document.title = doc.title;
    }

    // Ekstrak konten baru
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

    // Ganti konten
    contentContainer.innerHTML = newContent;
    contentContainer.scrollTop = 0;

    // Update browser history
    if (pushState) {
      history.pushState({ spa: true, url }, '', url);
    }

    // Update active menu link
    updateActiveSidebarLink(new URL(url, window.location.href).pathname);

    // Eksekusi skrip yang relevan dari halaman baru
    await executePageScripts(doc);

    // Kirim event bahwa navigasi SPA selesai
    window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url } }));

  } catch (err) {
    console.warn('Navigasi SPA dialihkan ke reload bawaan:', err);
    window.location.href = url;
  } finally {
    // Fade in kembali
    contentContainer.style.opacity = '1';
  }
}

// Mengeksekusi script inline atau script khusus dari halaman yang baru dimuat
async function executePageScripts(doc) {
  const scripts = doc.querySelectorAll('script');
  for (const oldScript of scripts) {
    const src = oldScript.getAttribute('src');
    
    // Lewati library global yang sudah aktif agar tidak me-reload berulang kali
    if (src && (
      src.includes('tailwindcss') || 
      src.includes('font-awesome') || 
      src.includes('sweetalert2') || 
      src.includes('layout.js')
    )) {
      continue;
    }

    const newScript = document.createElement('script');
    if (oldScript.type) newScript.type = oldScript.type;
    
    if (src) {
      // Script eksternal unik
      newScript.src = src;
      document.body.appendChild(newScript);
    } else if (oldScript.textContent.trim()) {
      // Script inline
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      // Bersihkan setelah dieksekusi agar DOM tetap bersih
      setTimeout(() => newScript.remove(), 100);
    }
  }
}

// Ekspos spaNavigate ke window
window.spaNavigate = spaNavigate;
