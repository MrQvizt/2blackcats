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

    // Ensure unique Snipcart ID and fully populate Snipcart attributes
    const btn = $(".snipcart-add-item", card);
    if (btn) {
      // Title from data-title or visible heading
      const title = (card.getAttribute("data-title") || $(".event-title", card)?.textContent || "Event").trim();

      // ISO date from data-event-date
      const iso = (card.getAttribute("data-event-date") || "").trim();

      // Build slug and unique id (changes if title or date changes)
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const dateKey = iso.replaceAll("-", ""); // e.g. 20250905
      const uniqueId = slug && dateKey ? `${slug}-${dateKey}` : (slug || `event-${Math.random().toString(36).slice(2)}`);

      // Name
      btn.setAttribute("data-item-name", title);

      // ID
      btn.setAttribute("data-item-id", uniqueId);

      // Price (strip currency symbols, keep digits and dot)
      const rawPrice = (card.getAttribute("data-price") || "").trim();
      const numeric = rawPrice.replace(/[^0-9.]/g, "");
      if (numeric) btn.setAttribute("data-item-price", numeric);

      // URL — use current page with a per-item hash so it's unique + same-origin
      try {
        const path = location.pathname || "/";
        btn.setAttribute("data-item-url", `${path}#${uniqueId}`);
      } catch {}

      // Description — helpful summary for the cart
      const time = (card.getAttribute("data-time") || "").trim();
      const loc  = (card.getAttribute("data-location") || "").trim();
      const d    = iso ? new Date(iso + "T12:00:00") : null;
      const MONTHS_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const pretty = (d && !isNaN(d)) ? `${d.getUTCDate()} ${MONTHS_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}` : iso;

      const bits = [
        title,
        pretty ? `| ${pretty}` : "",
        time ? `| ${time}` : "",
        loc ? `| ${loc}` : ""
      ].filter(Boolean).join(" ");
      btn.setAttribute("data-item-description", bits);

      // Quantity — default to 2 unless explicitly provided
      if (!btn.getAttribute("data-item-quantity")) {
        btn.setAttribute("data-item-quantity", "2");
      }

      // ARIA
      btn.setAttribute("aria-label", `Get tickets for ${title}${pretty ? ` on ${pretty}` : ""}${loc ? ` at ${loc}` : ""}`);
    }
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

// === Date range picker + filter (idempotent) ===============================
(() => {
  const input   = document.getElementById('event-range');
  const grid    = document.getElementById('showsGrid');
  const cards   = grid ? Array.from(grid.querySelectorAll('.event-card')) : [];
  const noMsg   = document.getElementById('noEvents');
  const showAll = document.getElementById('show-all-dates');

  if (!input || !cards.length) return;

  // Helper: show/hide by yyyy-mm-dd
  function filterByRange(start, end) {
    let shown = 0;
    const today = new Date().toISOString().split("T")[0];
    cards.forEach(card => {
      const d = card.getAttribute('data-event-date'); // yyyy-mm-dd
      const notPast = d >= today;
      const inRange = (!start || d >= start) && (!end || d <= end);
      const keep = notPast && inRange;
      card.style.display = keep ? '' : 'none';
      if (keep) shown++;
    });
    if (noMsg) noMsg.hidden = shown !== 0;
  }

  // Flatpickr init
  if (typeof flatpickr === 'function') {
    flatpickr(input, {
      mode: 'range',
      dateFormat: 'Y-m-d',
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

  // “Show All” button
// Compute today's date as YYYY-MM-DD once
const today = new Date().toISOString().split("T")[0];

// Core range check used by your filter (keep this single definition)
const inRange = (d, start, end) =>
  (!start || d >= start) && (!end || d <= end);

// “Show All” button — show items from today onward (>= today)
if (showAll) {
  showAll.addEventListener('click', () => {
    // Clear any text filter
    if (input) input.value = '';

    // Apply range: start = today, end = null  -> d >= today
    filterByRange(today, null);
  });
}

  // initial state
  filterByRange(null, null);
})();
