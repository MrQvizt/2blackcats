 // Hamburger toggle
    const hamburger = document.getElementById('hamburger');
    const slideMenu = document.getElementById('slideMenu');
    const slideMenuBg = document.getElementById('slideMenuBg');

    function openMenu() {
      slideMenu.classList.add('open');
      slideMenuBg.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      slideMenu.classList.remove('open');
      slideMenuBg.classList.remove('open');
      document.body.style.overflow = '';
    }
    hamburger.addEventListener('click', openMenu);
    hamburger.addEventListener('keydown', (e) => { if (e.key === 'Enter') openMenu(); });
    slideMenuBg.addEventListener('click', closeMenu);

    // Accessibility: ESC key closes menu
    document.addEventListener('keydown', function(e) {
      if ((slideMenu.classList.contains('open')) && (e.key === 'Escape')) closeMenu();
    });

    // Active link logic (highlights current section)
    function setActiveLink(selector) {
      document.querySelectorAll(selector).forEach(link => {
        link.classList.remove('active');
        if (window.location.hash && link.getAttribute('href') === window.location.hash) {
          link.classList.add('active');
        }
      });
    }
    // Call on load and hash change
    function updateActiveLinks() {
      setActiveLink('.nav-link');
      setActiveLink('.slide-menu .nav-link');
    }
    window.addEventListener('hashchange', updateActiveLinks);
    window.addEventListener('DOMContentLoaded', updateActiveLinks);