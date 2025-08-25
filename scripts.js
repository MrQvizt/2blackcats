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


// === Snipcart cart badge in header =======================================
(() => {
  const link = document.getElementById('site-cart-link');
  if (!link) return;
  const badge = link.querySelector('.cart-badge');

  function update(count){
    if (!badge) return;
    badge.textContent = count;
    badge.hidden = !(count > 0);
    link.hidden = !(count > 0);
  }

  function setup(){
    try {
      // Snipcart v3 store subscription
      const initState = window.Snipcart?.store?.getState?.();
      if (initState) {
        const initial = initState.cart?.items?.count || 0;
        update(initial);
        window.Snipcart.store.subscribe((state) => {
          const c = state.cart?.items?.count || 0;
          update(c);
        });
        return;
      }
    } catch(_) {}

    // Fallback: listen to add/remove events
    if (window.Snipcart?.events) {
      let c = 0;
      update(c);
      window.Snipcart.events.on('item.added', () => update(++c));
      window.Snipcart.events.on('item.removed', () => update(Math.max(0, --c)));
      window.Snipcart.events.on('cart.confirmed', () => update(0));
    }
  }

  if (window.Snipcart?.store) setup();
  else document.addEventListener('snipcart.ready', setup);
})();


// === Snipcart robust autopop & click-safety ==============================
(() => {
  function generateId(title, iso){
    const slug = (title || 'Event').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    return slug && iso ? `${slug}-${iso.replaceAll('-','')}` : slug || `event-${Math.random().toString(36).slice(2)}`;
  }
  function fill(btn, card){
    const title = (card.getAttribute('data-title') || card.querySelector('.event-title')?.textContent || 'Event').trim();
    const iso   = (card.getAttribute('data-event-date') || '').trim();
    const price = (card.getAttribute('data-price') || '').replace(/[^0-9.]/g,'');
    const time  = (card.getAttribute('data-time') || '').trim();
    const loc   = (card.getAttribute('data-location') || '').trim();
    const uid   = generateId(title, iso);

    if (!btn.getAttribute('data-item-id'))    btn.setAttribute('data-item-id', uid);
    if (!btn.getAttribute('data-item-name'))  btn.setAttribute('data-item-name', title);
    if (!btn.getAttribute('data-item-price') && price) btn.setAttribute('data-item-price', price);
    if (!btn.getAttribute('data-item-url'))   btn.setAttribute('data-item-url', (location.origin || '') + (location.pathname || '/') + '#' + uid);
    if (!btn.getAttribute('data-item-quantity')) btn.setAttribute('data-item-quantity','2');

    if (!btn.getAttribute('data-item-description')) {
      let pretty = '';
      if (iso) { const d = new Date(iso + 'T12:00:00'); const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; if (!isNaN(d)) pretty = `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
      const desc = [title, pretty && `| ${pretty}`, time && `| ${time}`, loc && `| ${loc}`].filter(Boolean).join(' ');
      if (desc) btn.setAttribute('data-item-description', desc);
    }
  }

  // On load fill once
  document.querySelectorAll('.event-card').forEach(card => {
    const btn = card.querySelector('.snipcart-add-item');
    if (btn) fill(btn, card);
  });

  // On click ensure attrs exist, then let Snipcart handle it
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.snipcart-add-item');
    if (!btn) return;
    const card = btn.closest('.event-card');
    if (card) fill(btn, card);
  });
})();
// ========================================================================

