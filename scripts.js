// ====== Mobile menu ======
(function(){
  const btn = document.getElementById('hamburger');
  const panel = document.getElementById('slideMenu');
  const bg = document.getElementById('slideMenuBg');
  if(!btn || !panel || !bg) return;
  const open = () => { panel.hidden = false; bg.hidden = false; btn.setAttribute('aria-expanded','true'); };
  const close = () => { panel.hidden = true; bg.hidden = true; btn.setAttribute('aria-expanded','false'); };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  bg.addEventListener('click', close);
  panel.querySelectorAll('a,button').forEach(el => el.addEventListener('click', close));
})();

// ====== Slider ======
(function(){
  const slidesEl = document.getElementById('slides');
  const dotsEl = document.getElementById('dots');
  if(!slidesEl || !dotsEl) return;
  const slides = Array.from(slidesEl.children);
  let i = 0; let lock = false;

  function go(n){
    if(lock) return;
    i = (n + slides.length) % slides.length;
    slidesEl.style.transform = `translateX(${-i*100}%)`;
    dotsEl.querySelectorAll('span').forEach((d,idx)=>d.classList.toggle('active', idx===i));
  }
  window.prevSlide = function(){ go(i-1); };
  window.nextSlide = function(){ go(i+1); };

  // dots
  slides.forEach((_,idx)=>{
    const d = document.createElement('span');
    d.addEventListener('click',()=>go(idx));
    dotsEl.appendChild(d);
  });
  go(0);
})();

// ====== Event cards: date text fill + modal ======
(function(){
  const grid = document.getElementById('showsGrid');
  if(!grid) return;

  function formatDateParts(d){
    const date = new Date(d);
    const month = date.toLocaleString('en-GB',{month:'short'}).toUpperCase();
    const day = String(date.getDate()).padStart(2,'0');
    const weekday = date.toLocaleString('en-GB',{weekday:'short'}).toUpperCase();
    return {month,day,weekday};
  }

  // Fill date chips
  grid.querySelectorAll('.event-card').forEach(card=>{
    const dateStr = card.getAttribute('data-event-date');
    if(dateStr){
      const {month,day,weekday} = formatDateParts(dateStr);
      card.querySelector('.event-month').textContent = month;
      card.querySelector('.event-day').textContent = day;
      card.querySelector('.event-weekday').textContent = weekday;
    }
  });

  // Modal handling
  const modal = document.getElementById('event-modal');
  const body = document.getElementById('event-modal-body');
  const closeBtn = document.getElementById('event-modal-close');
  const openModal = html => { body.innerHTML = html; modal.hidden = false; };
  const closeModal = () => { modal.hidden = true; body.innerHTML = ''; };
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

  function tpl(card){
    const title = card.getAttribute('data-title')||'';
    const time = card.getAttribute('data-time')||'';
    const price = card.getAttribute('data-price')||'';
    const location = card.getAttribute('data-location')||'';
    const map = card.getAttribute('data-map')||'#';
    const img = card.getAttribute('data-image')||'';
    const desc = card.getAttribute('data-description')||'';
    const id = 'TBC-' + (title.replace(/[^a-z0-9]+/gi,'-').toLowerCase());

    return `
      <img class="event-modal-image" alt="${title}" src="${img}"/>
      <div class="event-modal-inner">
        <h3 class="event-modal-headline" id="eventModalTitle">${title}</h3>
        <div class="event-modal-meta">
          <span class="event-time event-pill">
            <svg aria-hidden="true" class="event-icon" fill="none" height="18" viewBox="0 0 20 20" width="18">
              <circle cx="10" cy="10" r="9" stroke="#421c52" stroke-width="2"></circle>
              <path d="M10 5V10L13 12" stroke="#000" stroke-linecap="round" stroke-width="2"></path>
            </svg>
            ${time}
          </span>
          <span class="event-price event-pill">
            <svg aria-hidden="true" class="event-icon" fill="none" height="18" viewBox="0 0 20 20" width="18">
              <path d="M4 10h12" stroke="#000" stroke-width="2"></path>
            </svg>
            ${price}
          </span>
          <span class="event-location event-pill">
            <svg aria-hidden="true" class="event-icon" fill="none" height="18" viewBox="0 0 20 20" width="18">
              <path d="M10 19C10 19 16 12.6863 16 8.5C16 5.46243 13.5376 3 10.5 3C7.46243 3 5 5.46243 5 8.5C5 12.6863 10 19 10 19Z" stroke="#000" stroke-width="2"></path>
              <circle cx="10.5" cy="8.5" r="2" stroke="#421c52" stroke-width="2"></circle>
            </svg>
            <a href="${map}" target="_blank" rel="noopener">${location}</a>
          </span>
        </div>

        <p class="event-modal-description" id="modalDesc">${desc}</p>
        <button class="show-more-btn" id="showMoreBtn" type="button">Show more</button>

        <div class="event-cta-wrap">
          <button class="event-cta snipcart-add-item"
            data-item-id="${id}"
            data-item-name="${title}"
            data-item-price="${price.replace(/[^0-9.]/g,'') || 0}"
            data-item-url="/"
            data-item-description="${desc}">
            GET TICKETS
          </button>
        </div>
      </div>
    `;
  }

  // Open modal from card or its CTA
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.event-card');
    if(!card) return;
    // If clicked target is the CTA or the card body, open modal
    if(e.target.classList.contains('event-cta') || e.target === card || e.target.closest('.event-info')){
      openModal(tpl(card));
      // show more toggle
      const descEl = document.getElementById('modalDesc');
      const btn = document.getElementById('showMoreBtn');
      if(descEl && btn){
        btn.addEventListener('click', ()=>{
          descEl.classList.toggle('expanded');
          btn.textContent = descEl.classList.contains('expanded') ? 'Show less' : 'Show more';
        });
      }
    }
  });
})();

// ====== Date filter (Flatpickr range) ======
(function(){
  const input = document.getElementById('event-range');
  const grid = document.getElementById('showsGrid');
  const empty = document.getElementById('noEvents');
  const showAll = document.getElementById('show-all-dates');
  if(!input || !grid || !empty || !window.flatpickr) return;

  function within(dateStr, a, b){
    const d = new Date(dateStr).setHours(0,0,0,0);
    return (!a || d >= a) && (!b || d <= b);
  }

  function filter(a, b){
    let any = false;
    grid.querySelectorAll('.event-card').forEach(card=>{
      const d = card.getAttribute('data-event-date');
      const ok = within(d, a, b);
      card.style.display = ok ? '' : 'none';
      any = any || ok;
    });
    empty.hidden = any;
  }

  const fp = flatpickr(input, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    onChange: (sel)=>{
      const [start, end] = sel;
      const a = start ? new Date(start).setHours(0,0,0,0) : null;
      const b = end ? new Date(end).setHours(0,0,0,0) : a;
      filter(a,b);
    }
  });

  showAll.addEventListener('click', ()=>{
    input.value = '';
    filter(null, null);
  });

  // initial state
  filter(null, null);
})();

// ====== Footer "Back to top" link behavior ======
(function(){
  const link = document.getElementById('footerNavLink');
  const back = document.getElementById('footerBack');
  const arrow = document.getElementById('footerArrow');
  if(!link || !back || !arrow) return;
  function onScroll(){
    const scrolled = window.scrollY > 500;
    back.style.display = scrolled ? 'inline' : 'none';
    arrow.style.display = scrolled ? 'none' : 'inline';
    link.setAttribute('href', scrolled ? '#top' : '#shows');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

// ====== Cart badge + color sync (white when 0, yellow when >0) ======
(() => {
  const desktopBtn  = document.getElementById('cartButton');
  const desktopCnt  = document.getElementById('cartCount');
  const mobileBtn   = document.getElementById('cartButtonMobile');
  const mobileCnt   = document.getElementById('cartCountMobile');

  function applyState(btn, cnt){
    if (!btn || !cnt) return;
    const n = parseInt((cnt.textContent || '0').replace(/[^0-9]/g,''), 10) || 0;
    // Toggle yellow state and show/hide badge via CSS
    btn.classList.toggle('has-items', n > 0);
    // Update accessible label
    const label = `Open cart (${n} item${n===1?'':'s'})`;
    btn.setAttribute('aria-label', label);
  }

  const obsCfg = { characterData: true, childList: true, subtree: true };

  if (desktopCnt) {
    new MutationObserver(() => applyState(desktopBtn, desktopCnt)).observe(desktopCnt, obsCfg);
  }
  if (mobileCnt) {
    new MutationObserver(() => applyState(mobileBtn, mobileCnt)).observe(mobileCnt, obsCfg);
  }

  // Initial paint + on Snipcart ready
  applyState(desktopBtn, desktopCnt);
  applyState(mobileBtn, mobileCnt);
  window.addEventListener('snipcart.ready', () => {
    applyState(desktopBtn, desktopCnt);
    applyState(mobileBtn, mobileCnt);
  });
})();