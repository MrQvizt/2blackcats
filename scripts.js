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


// --- SLIDER LOGIC START ---
const slides = document.getElementById('slides');
const slider = document.getElementById('slider');
const slideElements = slides.children;
let currentIndex = 0;
let autoSlide = true;
let isTransitioning = false;
let interval;
const firstClone = slideElements[0].cloneNode(true);
slides.appendChild(firstClone);

function updateSlide(index) {
  isTransitioning = true;
  slides.style.transition = 'transform 0.6s ease';
  slides.style.transform = `translateX(-${index * 100}%)`;
  updateDots();
}
function nextSlide(manual = false) {
  if (isTransitioning) return;
  if (manual) autoSlide = false;
  currentIndex++;
  updateSlide(currentIndex);
}
function prevSlide() {
  if (isTransitioning) return;
  autoSlide = false;
  if (currentIndex === 0) {
    slides.style.transition = 'none';
    currentIndex = slideElements.length - 1;
    slides.style.transform = `translateX(-${currentIndex * 100}%)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentIndex--;
        updateSlide(currentIndex);
      });
    });
  } else {
    currentIndex--;
    updateSlide(currentIndex);
  }
}
slides.addEventListener('transitionend', () => {
  isTransitioning = false;
  if (currentIndex === slideElements.length - 1) {
    slides.style.transition = 'none';
    currentIndex = 0;
    slides.style.transform = `translateX(0%)`;
    updateDots();
  }
});
function startAutoSlide() {
  interval = setInterval(() => {
    if (autoSlide) nextSlide();
  }, 3000);
}
slider.addEventListener('mouseover', () => autoSlide = false);
slider.addEventListener('mouseout', () => autoSlide = true);
startAutoSlide();

// Create navigation dots
const dotsContainer = document.getElementById('dots');
for (let i = 0; i < slideElements.length - 1; i++) {
  const dot = document.createElement('span');
  dot.addEventListener('click', () => {
    autoSlide = false;
    currentIndex = i;
    updateSlide(currentIndex);
    updateDots();
  });
  dotsContainer.appendChild(dot);
}
function updateDots() {
  const dots = dotsContainer.children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.remove('active');
  }
  if (currentIndex === slideElements.length - 1) {
    dots[0].classList.add('active');
  } else {
    dots[currentIndex].classList.add('active');
  }
}
updateDots();
slides.addEventListener('transitionend', updateDots);

// Date picker filter
document.addEventListener('DOMContentLoaded', function() {
  const dateInput = document.getElementById('event-date-picker');
  const showAllBtn = document.getElementById('show-all-dates');
  const eventCards = document.querySelectorAll('.event-card');

  if (dateInput) {
    dateInput.addEventListener('change', function() {
      const pickedDate = this.value;
      eventCards.forEach(card => {
        const eventDate = card.getAttribute('data-event-date');
        if (eventDate === pickedDate) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  if (showAllBtn) {
    showAllBtn.addEventListener('click', function() {
      eventCards.forEach(card => card.style.display = '');
      dateInput.value = '';
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Helper: format date to "1 MAY"
  function formatSimple(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${day} ${month}`;
  }

  // Set up Flatpickr on #event-range
// Helper to always get "YYYY-MM-DD" from a JS Date, in local time
function getLocalDateString(date) {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Setup flatpickr (no time, date-only)
const fp = flatpickr("#event-range", {
    mode: "range",
    dateFormat: "Y-m-d",          // internal, for filtering!
    altInput: true,               // user sees pretty dates
    altFormat: "j M",             // 1 May
    allowInput: false,
altInputClass: "event-range-fancy flatpickr-input",
    clickOpens: true,
    closeOnSelect: false,
    enableTime: false,
    onClose: function(selectedDates, dateStr, instance) {
        if (selectedDates.length === 1) {
            instance.setDate([selectedDates[0], selectedDates[0]], true);
        }
    },
    onChange: function(selectedDates) {
        let [start, end] = selectedDates;
        if (start && !end) end = start;
        if (!start || !end) {
            document.querySelectorAll('.event-card').forEach(card => card.style.display = '');
            return;
        }
        const startStr = getLocalDateString(start);
        const endStr = getLocalDateString(end);
        document.querySelectorAll('.event-card').forEach(card => {
            const eventDateStr = card.getAttribute('data-event-date');
            if (eventDateStr >= startStr && eventDateStr <= endStr) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });



        // ---- Custom visual: Replace "to" with "-" and force UPPERCASE months ----
        if (fp.altInput.value.includes('to')) {
            fp.altInput.value = fp.altInput.value
                .replace('to', '-')
                .replace(/([A-Za-z]+)/g, m => m.toUpperCase());
        } else {
            fp.altInput.value = fp.altInput.value.replace(/([A-Za-z]+)/g, m => m.toUpperCase());
        }
    }
});

// "Show All" button (reset picker and all events)
document.getElementById('show-all-dates').addEventListener('click', function() {
    fp.clear();
    document.querySelectorAll('.event-card').forEach(card => card.style.display = '');
});

// Show All button logic
document.getElementById('show-all-dates').addEventListener('click', function() {
    document.getElementById('event-range')._flatpickr.clear();
    document.querySelectorAll('.event-card').forEach(card => card.style.display = '');
});




  // Filtering logic
function filterCards(selectedDates) {
  const cards = document.querySelectorAll('.event-card');
  if (!selectedDates || selectedDates.length === 0) {
    cards.forEach(card => card.style.display = "");
    return;
  }
  // Only allow 1 or 2 dates, anything else is a Flatpickr glitch
  if (selectedDates.length > 2) return;

  function toYMD(dateObj) {
    return dateObj.getUTCFullYear() + '-' +
      String(dateObj.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(dateObj.getUTCDate()).padStart(2, '0');
  }
  const fromStr = toYMD(selectedDates[0]);
  const toStr = (selectedDates.length === 2) ? toYMD(selectedDates[1]) : fromStr;

  console.log("Filtering from:", fromStr, "to:", toStr);

  cards.forEach(card => {
    const cardDateStr = card.getAttribute('data-event-date').trim();
    if (!cardDateStr) {
      card.style.display = "none";
      return;
    }
    // For single-day filter or exact match in a range
    if (cardDateStr >= fromStr && cardDateStr <= toStr) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}





  // "Show All" button resets filter and input
  document.getElementById('show-all-dates').addEventListener('click', function() {
    fp.clear();
    filterCards([]);
  });
});


function setSliderMargin() {
  var header = document.querySelector('.header');
  var slider = document.querySelector('.slider');
  if (header && slider) {
    slider.style.marginTop = header.offsetHeight + 'px';
  }
}
window.addEventListener('DOMContentLoaded', setSliderMargin);
window.addEventListener('resize', setSliderMargin);

