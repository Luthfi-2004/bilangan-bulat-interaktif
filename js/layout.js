document.addEventListener('DOMContentLoaded', async () => {
  // Lewati jika halaman menandai data-no-layout="true", atau halaman admin, login, dan landing page index.html
  if (document.body.dataset.noLayout === 'true' || 
      document.getElementById('no-app-layout') ||
      window.location.pathname.includes('/admin/') ||
      window.location.pathname.endsWith('/login.html')) {
    return;
  }

  // 1. Set up the basic layout shell if not present
  if (!document.getElementById('app-layout')) {
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="app-layout" class="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
        <aside id="app-sidebar" class="w-64 flex-shrink-0 border-r border-slate-200 bg-white hidden md:flex flex-col transition-all duration-300 z-20 absolute md:relative h-full"></aside>
        <div class="flex-1 flex flex-col w-full relative">
          <header id="app-topbar" class="h-16 flex-shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10"></header>
          <main id="app-content" class="flex-1 overflow-y-auto p-4 md:p-8 relative">
            ${originalContent}
          </main>
          <footer id="app-footer" class="flex-shrink-0 bg-white border-t border-slate-200 p-4"></footer>
        </div>
      </div>
    `;
  }

  // 2. Determine base path (to handle /materi/ vs / root paths)
  const isMateriSubfolder = window.location.pathname.includes('/materi/');
  const basePath = isMateriSubfolder ? '../' : './';

  // 3. Fetch Partials
  try {
    const [sidebarRes, topbarRes, footerRes] = await Promise.all([
      fetch(`${basePath}components/sidebar.html`),
      fetch(`${basePath}components/topbar.html`),
      fetch(`${basePath}components/footer.html`)
    ]);

    if (sidebarRes.ok) document.getElementById('app-sidebar').innerHTML = await sidebarRes.text();
    if (topbarRes.ok) document.getElementById('app-topbar').innerHTML = await topbarRes.text();
    if (footerRes.ok) document.getElementById('app-footer').innerHTML = await footerRes.text();

    // 4. Initialize layout interactivity
    initLayoutInteractivity();
    
  } catch (error) {
    console.error('Error loading layout components:', error);
  }
});

function initLayoutInteractivity() {
  // Toggle Sidebar for mobile
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const sidebar = document.getElementById('app-sidebar');
  
  if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }

  // Highlight active menu item
  const currentPath = window.location.pathname;
  const menuLinks = document.querySelectorAll('#sidebar-menu a');
  
  menuLinks.forEach(link => {
    // Basic matching for active state
    if (currentPath.includes(link.getAttribute('data-path'))) {
      link.classList.add('bg-blue-50', 'text-blue-600', 'font-semibold', 'border-r-4', 'border-blue-600');
      link.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-blue-600');
    }
    
    // Fix links for subfolders
    const isMateriSubfolder = window.location.pathname.includes('/materi/');
    if (isMateriSubfolder) {
      const originalHref = link.getAttribute('href');
      if (originalHref.startsWith('/')) {
         link.setAttribute('href', '..' + originalHref);
      }
    } else {
      const originalHref = link.getAttribute('href');
      if (originalHref.startsWith('/')) {
         link.setAttribute('href', '.' + originalHref);
      }
    }
  });
}
