document.addEventListener('DOMContentLoaded', async () => {
  // 1. Set up the basic layout shell if not present
  if (!document.getElementById('app-layout')) {
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="app-layout">
        <aside class="sidebar" id="app-sidebar"></aside>
        <div class="main-wrapper">
          <header class="topbar" id="app-topbar"></header>
          <main class="page-content" id="app-content">
            ${originalContent}
          </main>
          <footer class="app-footer" id="app-footer"></footer>
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
      sidebar.classList.toggle('active');
    });
  }

  // Highlight active menu item
  const currentPath = window.location.pathname;
  const menuLinks = document.querySelectorAll('#sidebar-menu a');
  
  menuLinks.forEach(link => {
    // Basic matching for active state
    if (currentPath.includes(link.getAttribute('data-path'))) {
      link.classList.add('active');
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
