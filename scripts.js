/* Utility selectors */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* -------------------------
   Event cards (weekday, title+tagline block, price chip, modal, snipcart IDs)
------------------------- */
(() => {
  const grid  = $("#showsGrid");
  const cards = $$(".event-card", grid);
  const weekdayShort = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

  cards.forEach(card => {
    /* ---------- Weekday badge from ISO date ---------- */
    const iso  = card.getAttribute("data-event-date");
    const wdEl = $(".event-weekday", card);
    if (iso && wdEl) {
      const d = new Date(iso + "T12:00:00");
      if (!isNaN(d)) wdEl.textContent = weekdayShort[d.getUTCDay()];
    }

    
    /* ---------- Month/Day from ISO date (non-breaking) ---------- */
    (function(){
      const moEl = $(".event-month", card);
      const dyEl = $(".event-day", card);
      if (!iso || (!moEl && !dyEl)) return;
      const dd = new Date(iso + "T12:00:00"); // noon avoids TZ drift
      if (isNaN(dd)) return;
      const MONTHS_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      if (moEl) moEl.textContent = MONTHS_ABBR[dd.getMonth()];  // local month
      if (dyEl) dyEl.textContent = String(dd.getDate());        // local day
    })();
/* ---------- Title + Tagline grouped in a compact heading block ---------- */
    const infoEl  = $(".event-info", card);
    const titleEl = $(".event-title", card);
    const metaEl  = $(".event-meta", card);
    if (!infoEl || !titleEl || !metaEl) return;

    // Create a dedicated wrapper so tagline always hugs the title
    let heading = $(".event-heading", infoEl);
    if (!heading) {
      heading = document.createElement("div");
      heading.className = "event-heading";
      infoEl.insertBefore(heading, metaEl);      // place heading above pills
      heading.appendChild(titleEl);              // move title into heading
    } else if (titleEl.parentElement !== heading) {
      heading.insertBefore(titleEl, heading.firstChild);
    }

 // ----- Tagline: move existing one into the heading; create only if missing -----
let taglineEl = card.querySelector(".event-tagline"); // may already exist in your HTML
const tagText = (card.getAttribute("data-tagline") || "").trim();

if (taglineEl) {
  // Ensure the tagline sits right under the title inside the heading wrapper
  if (taglineEl.parentElement !== heading) {
    taglineEl.remove();
    heading.appendChild(taglineEl);
  } else if (heading.lastElementChild !== taglineEl) {
    // if it's inside heading but not last, move it to be under the title
    taglineEl.remove();
    heading.appendChild(taglineEl);
  }
  // If a data-tagline is provided, sync the text (optional)
  if (tagText) taglineEl.textContent = tagText;
} else if (tagText) {
  // No existing tagline in HTML — create one from data-tagline
  taglineEl = document.createElement("p");
  taglineEl.className = "event-tagline";
  taglineEl.textContent = tagText;
  heading.appendChild(taglineEl);
}

    /* ---------- Price pill inserted after time, before venue ---------- */
    const priceRaw = (card.getAttribute("data-price") || "").trim(); // e.g. "€18"
    if (priceRaw) {
      let priceChip = $(".event-price.event-pill", card);
      if (!priceChip) {
        priceChip = document.createElement("span");
        priceChip.className = "event-price event-pill";
        priceChip.innerHTML = `
          <svg class="event-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M11.2 2H7.5a2 2 0 0 0-2 2v3.7c0 .53.21 1.04.59 1.41l6.8 6.8a1.5 1.5 0 0 0 2.12 0l3-3a1.5 1.5 0 0 0 0-2.12l-6.8-6.8A2 2 0 0 0 11.2 2Z" stroke="#000" stroke-width="2" stroke-linejoin="round"></path>
            <circle cx="8.6" cy="5.6" r="1.2" stroke="#421c52" stroke-width="2"></circle>
          </svg>
          <span class="event-amount"></span>
        `;
        // place after time pill (first), before location pill
        const timePill = $(".event-time", metaEl);
        const locPill  = $(".event-location", metaEl);
        if (timePill) timePill.insertAdjacentElement("afterend", priceChip);
        else if (locPill) metaEl.insertBefore(priceChip, locPill);
        else metaEl.appendChild(priceChip);
      }
      const amountEl = $(".event-amount", priceChip);
      if (amountEl) amountEl.textContent = priceRaw;
    }

    /* ---------- Accessibility + Snipcart sync ---------- */
    const title = (card.getAttribute("data-title") || titleEl?.textContent || "Event").trim();
    const date  = card.getAttribute("data-date") || "";
    const time  = card.getAttribute("data-time") || "";
    const loc   = card.getAttribute("data-location") || "";

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    const ariaBits = [title, date && `on ${date}`, time && `at ${time}`, loc && `in ${loc}`].filter(Boolean).join(" ");
    card.setAttribute("aria-label", `View details: ${ariaBits}`);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });

    // Ensure unique Snipcart ID and sync numeric price
    const btn = $(".snipcart-add-item", card);
    if (btn) {
      let id = btn.getAttribute("data-item-id");
      if (!id) {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
        const dateKey = (iso || "").replaceAll("-", "");
        btn.setAttribute("data-item-id", `${slug}-${dateKey}` || `event-${Math.random().toString(36).slice(2)}`);
      }
      if (priceRaw) {
        const numeric = priceRaw.replace(/[^0-9.]/g, "");
        if (numeric) btn.setAttribute("data-item-price", numeric);
      }
      btn.setAttribute("aria-label", `Get tickets for ${title}${date ? ` on ${date}` : ""}${loc ? ` at ${loc}` : ""}`);
    }
  
    // === Minimal Snipcart autopop (fill only if missing) =================
    (function(){
      const btn = $(".snipcart-add-item", card);
      if (!btn) return;

      // Source data
      const title = (card.getAttribute("data-title") || $(".event-title", card)?.textContent || "Event").trim();
      const iso   = (card.getAttribute("data-event-date") || "").trim();
      const price = (card.getAttribute("data-price") || "").trim();
      const time  = (card.getAttribute("data-time") || "").trim();
      const loc   = (card.getAttribute("data-location") || "").trim();

      // Build unique id from title + date (changes if either changes)
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const dateKey = iso ? iso.replaceAll("-", "") : "";
      const uid = (slug && dateKey) ? `${slug}-${dateKey}` : (slug || `event-${Math.random().toString(36).slice(2)}`);

      // Fill only if missing (keeps any manual overrides / visuals intact)
      if (!btn.getAttribute("data-item-id"))    btn.setAttribute("data-item-id", uid);
      if (!btn.getAttribute("data-item-name"))  btn.setAttribute("data-item-name", title);

      const numeric = price.replace(/[^0-9.]/g, "");
      if (!btn.getAttribute("data-item-price") && numeric) btn.setAttribute("data-item-price", numeric);

      if (!btn.getAttribute("data-item-url")) {
        try { btn.setAttribute("data-item-url", location.pathname || "/"); } catch {}
      }

      if (!btn.getAttribute("data-item-description")) {
        let pretty = "";
        if (iso) {
          const d = new Date(iso + "T12:00:00");
          const M = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
          if (!isNaN(d)) pretty = `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        }
        const desc = [title, pretty && `| ${pretty}`, time && `| ${time}`, loc && `| ${loc}`].filter(Boolean).join(" ");
        if (desc) btn.setAttribute("data-item-description", desc);
      }

      if (!btn.getAttribute("data-item-quantity")) btn.setAttribute("data-item-quantity", "2");
    })();
    // =====================================================================
});

  /* ---------- Modal handling ---------- */
  const modal      = $("#event-modal");
  const modalBody  = $("#event-modal-body");
  const modalClose = $("#event-modal-close");

  function openModal(html) {
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#event-modal-close")?.focus();
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
  }

  modalClose?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // Open modal on card click (but not when CTA is clicked)
  cards.forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".snipcart-add-item")) return;

      const title = card.getAttribute("data-title") || $(".event-title", card)?.textContent?.trim() || "Event";
      const image = card.getAttribute("data-image");
      const desc  = card.getAttribute("data-description") || "Amazing night awaits!";
      const date  = card.getAttribute("data-date") || "";
      const time  = card.getAttribute("data-time") || "";
      const loc   = card.getAttribute("data-location") || "";
      const map   = card.getAttribute("data-map") || "";
      const iso   = card.getAttribute("data-event-date") || "";
      const price = (card.getAttribute("data-price") || "").trim();
/* Build a safe Google Maps embed URL (works across browsers) */
let mapEmbed = "";
if (map) {
  try {
    const u = new URL(map, window.location.href);
    const host = u.hostname;

    if (host.includes("google.com") && u.pathname.includes("/maps")) {
      // Convert normal maps URL to embeddable
      if (!u.searchParams.get("output")) u.searchParams.set("output", "embed");
      mapEmbed = u.toString();
    } else if (host.includes("maps.app") || host.includes("goo.gl")) {
      // Short links aren't embeddable; build from location text
      if (loc) mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`;
    } else {
      // Non-Google URL (venue site etc.) → try from location text
      if (loc) mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`;
    }
  } catch (e) {
    if (loc) mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`;
  }
}


    const html = `
  <div class="event-modal-inner">
    <img class="event-modal-image" src="${image || ""}" alt="${title}" />

    <div class="event-modal-header">
      <h3 id="eventModalTitle" class="event-modal-headline">${title}</h3>
      <button class="event-modal-close" id="event-modal-close" aria-label="Close">&times;</button>
    </div>

    <!-- Meta pills (Row 1: time + price, Row 2: location) -->
    <div class="event-modal-meta">
      ${time ? `
        <span class="event-time event-pill" aria-label="Start time ${time}">
          <svg class="event-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="9" stroke="#421c52" stroke-width="2"></circle>
            <path d="M10 5V10L13 12" stroke="#000" stroke-width="2" stroke-linecap="round"></path>
          </svg>
          ${time}
        </span>` : ""}

      ${price ? `
        <span class="event-price event-pill" aria-label="Ticket price ${price}">
          <svg class="event-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M11.2 2H7.5a2 2 0 0 0-2 2v3.7c0 .53.21 1.04.59 1.41l6.8 6.8a1.5 1.5 0 0 0 2.12 0l3-3a1.5 1.5 0 0 0 0-2.12l-6.8-6.8A2 2 0 0 0 11.2 2Z" stroke="#000" stroke-width="2" stroke-linejoin="round"></path>
            <circle cx="8.6" cy="5.6" r="1.2" stroke="#421c52" stroke-width="2"></circle>
          </svg>
          ${price}
        </span>` : ""}

      <!-- Location goes last so we can push it to a new row with CSS -->
      ${loc ? `
        <span class="event-location event-pill" aria-label="Venue ${loc}">
          <svg class="event-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 19C10 19 16 12.6863 16 8.5C16 5.46243 13.5376 3 10.5 3C7.46243 3 5 5.46243 5 8.5C5 12.6863 10 19 10 19Z" stroke="#000" stroke-width="2"></path>
            <circle cx="10.5" cy="8.5" r="2" stroke="#421c52" stroke-width="2"></circle>
          </svg>
          ${map ? `<a href="${map}" target="_blank" rel="noopener">${loc}</a>` : `${loc}`}
        </span>` : ""}
    </div>

    <p class="event-modal-description" id="eventDesc">${desc}</p>
    <button class="show-more-btn" id="showMoreBtn" aria-expanded="false">Show more</button>

   ${
  mapEmbed
    ? `<iframe class="event-modal-map" src="${mapEmbed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" aria-label="Map for ${title}"></iframe>`
    : (loc
        ? `<a class="event-open-map" href="${map || `https://www.google.com/maps?q=${encodeURIComponent(loc)}`}" target="_blank" rel="noopener" aria-label="Open map for ${loc}">
             <span class="event-pill">
               <svg class="event-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                 <path d="M10 19C10 19 16 12.6863 16 8.5C16 5.46243 13.5376 3 10.5 3C7.46243 3 5 5.46243 5 8.5C5 12.6863 10 19 10 19Z" stroke="#000" stroke-width="2"></path>
                 <circle cx="10.5" cy="8.5" r="2" stroke="#421c52" stroke-width="2"></circle>
               </svg>
               Open in Maps
             </span>
           </a>`
        : ""
      )
}


    <div class="event-cta-wrap">
      <button
        class="event-cta snipcart-add-item"
        ${price ? `data-item-price="${price.replace(/[^0-9.]/g,'')}"` : `data-item-price="18"`}
        data-item-id="${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${(iso || "").replaceAll('-','')}"
        data-item-name="${title}"
        data-item-url="/"
        data-item-description="${[date,time,loc].filter(Boolean).join(' | ')}"
        data-item-quantity="1"
        aria-label="Get tickets for ${title}${date ? ` on ${date}` : ""}${loc ? ` at ${loc}` : ""}"
      >
        GET TICKETS
      </button>
    </div>
  </div>
`;


      openModal(html);

      $("#event-modal-close")?.addEventListener("click", closeModal);

      const descEl = $("#eventDesc");
      const btn = $("#showMoreBtn");
      if (descEl && btn) {
        const isLong = descEl.textContent.length > 220;
        if (!isLong) btn.style.display = "none";
        btn.addEventListener("click", () => {
          const expanded = descEl.classList.toggle("expanded");
          btn.setAttribute("aria-expanded", expanded ? "true" : "false");
          btn.textContent = expanded ? "Show less" : "Show more";
        });
      }
    });
  });
})();

// === Date range picker + filter (today forward only) ======================
(() => {
  const input   = document.getElementById('event-range');
  const grid    = document.getElementById('showsGrid');
  const cards   = grid ? Array.from(grid.querySelectorAll('.event-card')) : [];
  const noMsg   = document.getElementById('noEvents');
  const showAll = document.getElementById('show-all-dates');

  if (!input || !cards.length) return;

  // Compute today's date once (YYYY-MM-DD)
  const TODAY = new Date().toISOString().split('T')[0];

  // Helper: show/hide by yyyy-mm-dd
  function filterByRange(start, end) {
    let shown = 0;
    cards.forEach(card => {
      const d = card.getAttribute('data-event-date') || ''; // yyyy-mm-dd
      const notPast = d >= TODAY;                            // block past events
      const inRange = (!start || d >= start) && (!end || d <= end);
      const keep = notPast && inRange;
      card.style.display = keep ? '' : 'none';
      if (keep) shown++;
    });
    if (noMsg) noMsg.hidden = shown !== 0;
  }

  // Flatpickr init — only allow selecting from today onward
  if (typeof flatpickr === 'function') {
    flatpickr(input, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      minDate: 'today',              // disallow past dates in the picker
      // Optional: make it nice to read in the input
      altInput: true,
      altFormat: 'j M Y',
      onClose: (selectedDates, _str, fp) => {
        if (selectedDates.length === 2) {
          // normalise to yyyy-mm-dd
          const [s, e] = selectedDates.map(d => fp.formatDate(d, 'Y-m-d'));
          filterByRange(s, e);
        }
      }
    });
  }

  // “Show All” — show everything from today onward (>= TODAY)
  if (showAll) {
    showAll.addEventListener('click', () => {
      input.value = '';
      filterByRange(TODAY, null);
    });
  }

  // initial state: show upcoming (>= today)
  filterByRange(null, null);
})();


// === Ensure event cards are sorted by date (soonest upcoming first) =======
(() => {
  const grid  = document.getElementById('showsGrid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.event-card'));
  if (!cards.length) return;

  // Sort by ISO YYYY-MM-DD ascending so the nearest upcoming date appears first
  cards.sort((a, b) => {
    const da = a.getAttribute('data-event-date') || '';
    const db = b.getAttribute('data-event-date') || '';
    return da.localeCompare(db); // earliest -> latest
  });

  // Re-append in order (this moves existing nodes without breaking listeners)
  const frag = document.createDocumentFragment();
  cards.forEach(card => frag.appendChild(card));
  grid.appendChild(frag);
})();

// === Cart badge + color sync (white when 0, yellow when >0) ===============
(() => {
  const desktopBtn  = document.getElementById('cartButton');
  const desktopCnt  = document.getElementById('cartCount');
  const mobileBtn   = document.getElementById('cartButtonMobile');
  const mobileCnt   = document.getElementById('cartCountMobile');

  function applyState(btn, cnt){
    if (!btn || !cnt) return;
    const n = parseInt((cnt.textContent || '0').replace(/[^0-9]/g,''), 10) || 0;
    btn.classList.toggle('has-items', n > 0);
    const label = `Open cart (${n} item${n===1?'':'s'})`;
    btn.setAttribute('aria-label', label);
  }

  // Observe Snipcart-driven updates to the .snipcart-items-count span(s)
  const obsCfg = { characterData: true, childList: true, subtree: true };
  const observers = [];
  if (desktopCnt) {
    const mo = new MutationObserver(() => applyState(desktopBtn, desktopCnt));
    mo.observe(desktopCnt, obsCfg);
    observers.push(mo);
  }
  if (mobileCnt) {
    const mo = new MutationObserver(() => applyState(mobileBtn, mobileCnt));
    mo.observe(mobileCnt, obsCfg);
    observers.push(mo);
  }

  // Initial paint
  applyState(desktopBtn, desktopCnt);
  applyState(mobileBtn, mobileCnt);

  // Also hook into Snipcart lifecycle if available to force a refresh
  window.addEventListener('snipcart.ready', () => {
    applyState(desktopBtn, desktopCnt);
    applyState(mobileBtn, mobileCnt);
  });
})();
// instagram-carousel.js
// Turns your Instagram grid into a carousel only when there are > 4 cards.
// Shows exactly 4 at a time (handled by CSS) and moves ONE card per click.

(function () {
  // CHANGE THIS if your grid container uses a different class:
  const GRID_SELECTOR = '.insta-embed-grid';
  const MIN_FOR_CAROUSEL = 5; // keep grid if 4 or fewer

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.insta-card'));
  if (cards.length < MIN_FOR_CAROUSEL) return; // keep your original grid

  // --- Build carousel shell
  const carousel = document.createElement('div');
  carousel.className = 'insta-carousel';

  const track = document.createElement('div');
  track.className = 'insta-track';
  track.setAttribute('role', 'region');
  track.setAttribute('aria-label', 'Instagram gallery');
  track.tabIndex = 0; // allow keyboard arrows

  // Move cards into the track
  cards.forEach(card => track.appendChild(card));

  // --- Create nav buttons
  const mkBtn = (dir, label, pathD) => {
    const btn = document.createElement('button');
    btn.className = `insta-nav ${dir}`;
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="${pathD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>`;
    return btn;
  };

  const prevBtn = mkBtn('prev', 'Previous post', 'M15 6l-6 6 6 6');
  const nextBtn = mkBtn('next', 'Next post',     'M9 6l6 6-6 6');

  // Replace grid with carousel
  grid.replaceWith(carousel);
  carousel.appendChild(track);
  carousel.appendChild(prevBtn);
  carousel.appendChild(nextBtn);

  // --- Navigation: move ONE card per step
  const oneStep = () => {
    const first = track.querySelector('.insta-card');
    if (!first) return 0;
    const rect = first.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    return rect.width + gap;
  };

  const scrollOne = (dir = 1) => {
    const step = oneStep();
    if (step <= 0) return;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  prevBtn.addEventListener('click', () => scrollOne(-1));
  nextBtn.addEventListener('click', () => scrollOne(1));

  // --- Edge-state for buttons
  const updateNav = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 1);
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = track.scrollLeft >= maxScroll;
  };
  track.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', () => {
    // snap to nearest card after resize so buttons are accurate
    const step = oneStep();
    if (step > 0) {
      const idx = Math.round(track.scrollLeft / step);
      track.scrollLeft = idx * step;
    }
    updateNav();
  });
  requestAnimationFrame(updateNav);

  // --- Keyboard support
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollOne(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollOne(-1); }
  });

  // --- Re-process Instagram embeds after moving nodes
  const reprocess = () => {
    try {
      if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
      }
    } catch (_) {}
  };
  reprocess();
  setTimeout(reprocess, 600);
})();
// === Pink footer bar: step-through nav + back-to-top ===
(() => {
  const link   = document.getElementById('footerNavLink');
  const arrow  = document.getElementById('footerArrow');
  const backTx = document.getElementById('footerBack');

  if (!link || !arrow || !backTx) return;

  // The three stops in order
const steps = ['shows', 'instagramstop', 'partners'];

  // keep simple state on the element
  link.dataset.stepIndex = '0';      // 0=Shows, 1=Instagram, 2=Partners
  link.dataset.mode = 'down';        // 'down' or 'top'

  const headerEl = document.querySelector('.header');

  function headerOffsetPx() {
    // Try CSS var --menu-height first, fall back to actual header height
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--menu-height').trim();
    if (cssVal.endsWith('px')) return parseFloat(cssVal) || (headerEl?.offsetHeight || 0);
    if (cssVal.endsWith('vh')) return window.innerHeight * (parseFloat(cssVal) / 100);
    return headerEl?.offsetHeight || 0;
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - headerOffsetPx() - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function setUI(mode) {
    // mode: 'down' shows arrow; 'top' shows "BACK TO TOP"
    if (mode === 'top') {
      arrow.style.display = 'none';
      backTx.style.display = 'inline';
      link.dataset.mode = 'top';
    } else {
      backTx.style.display = 'none';
      arrow.style.display = 'inline';
      link.dataset.mode = 'down';
    }
  }

  function nearBottom() {
    // within 2px of absolute bottom
    return Math.ceil(window.scrollY + window.innerHeight) >= (document.documentElement.scrollHeight - 2);
  }

  // Click behavior
  link.addEventListener('click', (e) => {
    e.preventDefault();

    if (link.dataset.mode === 'top') {
      // Go to top, reset cycle
      window.scrollTo({ top: 0, behavior: 'smooth' });
      link.dataset.stepIndex = '0';
      setUI('down');
      return;
    }

    // Step through sections
    let idx = parseInt(link.dataset.stepIndex || '0', 10);
    const targetId = steps[Math.min(idx, steps.length - 1)];
    scrollToSection(targetId);

    // Advance index; once we’ve sent you to Partners, show "BACK TO TOP"
    if (idx < steps.length - 1) {
      link.dataset.stepIndex = String(idx + 1);
    } else {
      setUI('top');
    }
  });

  // Also track manual scrolling: if you manually reach bottom, switch to "BACK TO TOP"
  function onScroll() {
    if (nearBottom()) {
      setUI('top');
    } else if (link.dataset.mode === 'top') {
      // If you've moved away from the very bottom, restore arrow unless we just finished the cycle
      // (leaves the index where it was so the next click restarts from shows)
      setUI('down');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial state
  setUI('down');
})();


document.addEventListener('DOMContentLoaded', () => {
  const pageUrl = "https://yourdomain.com/"; // always homepage

  // helpers
  const slugify = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const normalizePrice = (raw) => {
    const cleaned = String(raw || '').replace(/[^\d.,]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n.toFixed(2) : null;
  };

  // ---- 1) Auto-wire each .event-card to Snipcart
  document.querySelectorAll('.event-card').forEach((card, idx) => {
    const btn = card.querySelector('.snipcart-add-item');
    if (!btn) return;

    const title = (card.dataset.title || `Event #${idx + 1}`).trim();
    const price = normalizePrice(card.dataset.price);
    if (!price) {
      console.warn('[Snipcart] Missing/invalid price on card:', card);
      return;
    }

    const img = card.dataset.image || '';
    const date = card.dataset.eventDate || card.dataset.date || '';
    const itemId = `${slugify(title)}-${date || idx}`;

    // Required
    btn.setAttribute('data-item-id', itemId);
    btn.setAttribute('data-item-name', title);
    btn.setAttribute('data-item-price', price);
    btn.setAttribute('data-item-url', pageUrl);

    // Recommended
    if (img) btn.setAttribute('data-item-image', img);

    const tagline = (card.dataset.tagline || '').trim();
    if (tagline) {
      btn.setAttribute('data-item-description', tagline);
      // mirror to show in sidebar cart too
      btn.setAttribute('data-item-custom1-name', ' ');
      btn.setAttribute('data-item-custom1-value', tagline);
      btn.setAttribute('data-item-custom1-readonly', 'true');
    }

    // Start at 2 tickets (no max cap)
    btn.setAttribute('data-item-quantity', '2');
  });

  // ---- 2) Prevent duplicates: if item already in cart, just open the cart
  const whenSnipcartReady = (fn) => {
    if (window.Snipcart && window.Snipcart.store) return fn();
    document.addEventListener('snipcart.ready', fn, { once: true });
  };

  whenSnipcartReady(() => {
    const getCartItems = () => (window.Snipcart.store.getState().cart.items || []);
    const hasItem = (productId) =>
      getCartItems().some((i) => i.id === productId || i.productId === productId);

    const openCart = () => {
      try {
        window.Snipcart.api.theme.cart.open(); // v3
      } catch {
        document.querySelector('.snipcart-checkout')?.click(); // fallback
      }
    };

    document.querySelectorAll('.snipcart-add-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-item-id');
        if (!id) return;
        if (hasItem(id)) {
          // Already in cart: don't add more, just open cart
          e.preventDefault();
          e.stopPropagation();
          openCart();
        }
        // Else: let Snipcart handle the add with quantity=2 (no cap in cart)
      });
    });
  });
});
  });
});




