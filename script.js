// делаем placeholder доступным глобально для IIFE
const svgPlaceholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
       <rect width="100%" height="100%" fill="#f6f7f6"/>
       <g fill="#9aa09a" font-family="system-ui,Segoe UI,Roboto,Helvetica,Arial" font-size="36">
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Bild nicht vorhanden</text>
       </g>
     </svg>`
  );

document.addEventListener("DOMContentLoaded", function () {
  const galleryItems = document.querySelectorAll(".gallery-item");
  galleryItems.forEach((img) => {
    img.style.opacity = "0";
    img.addEventListener("load", function () {
      this.style.opacity = "1";
    });
    img.addEventListener("error", function () {
      if (this.src !== svgPlaceholder) this.src = svgPlaceholder;
      else this.style.opacity = "1";
    });
    if (img.complete && img.naturalWidth !== 0) img.style.opacity = "1";
  });
});

// Мини‑лайтбокс: создаём overlay с крестиком, центрируем контент
(function () {
  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  if (!galleryCards.length) return;

  const items = galleryCards.map((btn) => {
    const img = btn.querySelector("img");
    return {
      full: btn.dataset.full || (img && img.src) || svgPlaceholder,
      thumb: img && img.src,
      alt: (img && img.alt) || "Foto",
    };
  });

  let overlay = null;
  let currentIndex = 0;
  let imgEl = null;

  function openAt(index) {
    currentIndex = index;
    overlay = document.createElement("div");
    overlay.className = "ltb-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="ltb-wrap" aria-label="${items[index].alt}">
        <button class="ltb-close" aria-label="Schließen" title="Schließen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="ltb-nav ltb-prev" aria-label="Vorheriges" title="Vorheriges">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <img src="${svgPlaceholder}" alt="${items[index].alt}" class="ltb-img" />

        <button class="ltb-nav ltb-next" aria-label="Nächstes" title="Nächstes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    imgEl = overlay.querySelector(".ltb-img");
    const closeBtn = overlay.querySelector(".ltb-close");
    const prevBtn = overlay.querySelector(".ltb-prev");
    const nextBtn = overlay.querySelector(".ltb-next");

    // обработчики
    closeBtn.addEventListener("click", closeOverlay);
    prevBtn.addEventListener("click", showPrev);
    nextBtn.addEventListener("click", showNext);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });
    document.addEventListener("keydown", onKey);

    // swipe / drag
    let startX = null;
    let pointerId = null;
    let moved = false;

    overlay.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      pointerId = e.pointerId;
      moved = false;
      overlay.setPointerCapture(pointerId);
      imgEl.style.transition = ""; // отключаем transition на время перетаскивания
    });

    overlay.addEventListener("pointermove", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      imgEl.style.transform = `translateX(${dx}px)`;
    });

    overlay.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      overlay.releasePointerCapture(pointerId);
      const dx = e.clientX - startX;
      imgEl.style.transition = "transform 0.22s ease";
      if (Math.abs(dx) > 60) {
        if (dx < 0) showNext();
        else showPrev();
      } else {
        imgEl.style.transform = ""; // вернуться в центр
      }
      startX = null;
      pointerId = null;
    });

    // загрузка первого изображения и предзагрузка соседей
    loadIndex(currentIndex);
  }

  function loadIndex(index) {
    if (!imgEl) return;
    imgEl.style.opacity = "0";
    imgEl.style.transform = "";
    const src = items[index].full || items[index].thumb || svgPlaceholder;
    const pre = new Image();
    pre.onload = () => {
      imgEl.src = pre.src;
      imgEl.alt = items[index].alt;
      imgEl.style.opacity = "1";
      preloadNeighbors(index);
    };
    pre.onerror = () => {
      imgEl.src = items[index].thumb || svgPlaceholder;
      imgEl.style.opacity = "1";
    };
    pre.src = src;
  }

  function preloadNeighbors(index) {
    if (items.length < 2) return;
    const next = (index + 1) % items.length;
    const prev = (index - 1 + items.length) % items.length;
    [items[next].full, items[prev].full].forEach((s) => {
      if (s) {
        const p = new Image();
        p.src = s;
      }
    });
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % items.length;
    loadIndex(currentIndex);
  }
  function showPrev() {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    loadIndex(currentIndex);
  }

  function onKey(e) {
    if (e.key === "Escape") closeOverlay();
    if (e.key === "ArrowRight") showNext();
    if (e.key === "ArrowLeft") showPrev();
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    imgEl = null;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  // открытие по клику на карточку
  galleryCards.forEach((btn, i) => {
    btn.addEventListener("click", () => openAt(i));
  });
})();
