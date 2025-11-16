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
  const galleryCards = document.querySelectorAll(".gallery-card");
  if (!galleryCards.length) return;

  function createOverlay(imgSrc, alt) {
    const overlay = document.createElement("div");
    overlay.className = "ltb-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    // используем прозрачный .ltb-wrap и добавляем кнопку закрытия
    overlay.innerHTML = `
      <div class="ltb-wrap" aria-label="${alt}">
        <button class="ltb-close" aria-label="Schließen" title="Schließen">
          <!-- простой SVG крестик -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <img src="${imgSrc}" alt="${alt}" class="ltb-img" />
      </div>
    `;

    // закрываем при клике по фону (overlay), но не при клике по картинке/крестику
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });

    // кнопка закрытия
    const closeBtn = overlay.querySelector(".ltb-close");
    closeBtn.addEventListener("click", () => closeOverlay(overlay));

    return overlay;
  }

  function openLightboxWithPreload(src, fallbackSrc, alt) {
    const pre = new Image();
    pre.onload = () => {
      const overlay = createOverlay(pre.src, alt);
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", escClose);
    };
    pre.onerror = () => {
      // если не загрузился полный src — используем fallback или placeholder
      const altSrc = fallbackSrc || svgPlaceholder;
      const overlay = createOverlay(altSrc, alt);
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", escClose);
    };
    // если src пустой, прямо вызываем onerror через присвоение placeholder
    pre.src = src || svgPlaceholder;
  }

  function escClose(e) {
    if (e.key === "Escape") {
      const overlay = document.querySelector(".ltb-overlay");
      if (overlay) closeOverlay(overlay);
    }
  }

  function closeOverlay(overlay) {
    if (!overlay) return;
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", escClose);
  }

  galleryCards.forEach((btn) => {
    btn.addEventListener("click", () => {
      const imgEl = btn.querySelector("img");
      const full = btn.dataset.full || (imgEl && imgEl.src);
      const thumb = imgEl && imgEl.src;
      const alt = (imgEl && imgEl.alt) || "Foto";
      openLightboxWithPreload(
        full || thumb || svgPlaceholder,
        thumb || svgPlaceholder,
        alt
      );
    });
  });
})();
