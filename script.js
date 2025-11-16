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

// Мини-лайтбокс: создаём overlay с крестиком, центрируем контент
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
  let isAnimating = false; // флаг для предотвращения множественных переключений

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

    // swipe / drag - универсальная версия для touch и mouse
    let startX = null;
    let startY = null;
    let isDragging = false;

    // Функция начала касания/клика
    function handleStart(x, y) {
      if (isAnimating) return;
      startX = x;
      startY = y;
      isDragging = false;
    }

    // Функция окончания касания/клика
    function handleEnd(x, y) {
      if (startX === null || isAnimating) return;

      const dx = x - startX;
      const dy = y - startY;

      // Проверяем что это горизонтальный свайп
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) {
          // Свайп влево - следующее фото
          showNext();
        } else {
          // Свайп вправо - предыдущее фото
          showPrev();
        }
      }

      startX = null;
      startY = null;
      isDragging = false;
    }

    // Touch events для мобильных
    imgEl.addEventListener(
      "touchstart",
      (e) => {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );

    imgEl.addEventListener(
      "touchend",
      (e) => {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      },
      { passive: true }
    );

    // Mouse events для десктопа (как запасной вариант)
    imgEl.addEventListener("mousedown", (e) => {
      handleStart(e.clientX, e.clientY);
      isDragging = true;
    });

    imgEl.addEventListener("mouseup", (e) => {
      if (isDragging) {
        handleEnd(e.clientX, e.clientY);
      }
    });

    imgEl.addEventListener("mouseleave", () => {
      startX = null;
      startY = null;
      isDragging = false;
    });

    // загрузка первого изображения и предзагрузка соседей
    loadIndex(currentIndex, 0); // 0 = без анимации при открытии
  }

  function loadIndex(index, direction) {
    if (!imgEl) return;

    // Если direction не передан, вычисляем его
    if (direction === undefined) {
      direction = index > currentIndex ? 1 : index < currentIndex ? -1 : 0;
    }

    isAnimating = true;

    // Если это первая загрузка (direction = 0), просто показываем без анимации
    if (direction === 0) {
      imgEl.style.transition = "opacity 0.3s ease";
      imgEl.style.opacity = "0";

      const src = items[index].full || items[index].thumb || svgPlaceholder;
      const pre = new Image();

      pre.onload = () => {
        imgEl.src = pre.src;
        imgEl.alt = items[index].alt;
        imgEl.style.opacity = "1";
        isAnimating = false;
        preloadNeighbors(index);
      };

      pre.onerror = () => {
        imgEl.src = items[index].thumb || svgPlaceholder;
        imgEl.style.opacity = "1";
        isAnimating = false;
      };

      pre.src = src;
      return;
    }

    // Анимация выхода старого изображения
    imgEl.style.transition = "opacity 0.35s ease, transform 0.35s ease";
    imgEl.style.opacity = "0";
    imgEl.style.transform = `translateX(${-30 * direction}px)`;

    const src = items[index].full || items[index].thumb || svgPlaceholder;
    const pre = new Image();

    pre.onload = () => {
      // Небольшая задержка для плавности
      setTimeout(() => {
        imgEl.src = pre.src;
        imgEl.alt = items[index].alt;

        // Начинаем с противоположной стороны
        imgEl.style.transform = `translateX(${30 * direction}px)`;

        // Анимация входа нового изображения
        requestAnimationFrame(() => {
          imgEl.style.opacity = "1";
          imgEl.style.transform = "translateX(0)";

          // Снимаем блокировку после завершения анимации
          setTimeout(() => {
            isAnimating = false;
          }, 350);
        });

        preloadNeighbors(index);
      }, 150);
    };

    pre.onerror = () => {
      setTimeout(() => {
        imgEl.src = items[index].thumb || svgPlaceholder;
        imgEl.style.opacity = "1";
        imgEl.style.transform = "translateX(0)";
        isAnimating = false;
      }, 150);
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
    if (isAnimating) return;
    const newIndex = (currentIndex + 1) % items.length;
    loadIndex(newIndex, 1); // 1 = вправо
    currentIndex = newIndex;
  }

  function showPrev() {
    if (isAnimating) return;
    const newIndex = (currentIndex - 1 + items.length) % items.length;
    loadIndex(newIndex, -1); // -1 = влево
    currentIndex = newIndex;
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
    isAnimating = false;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  // открытие по клику на карточку
  galleryCards.forEach((btn, i) => {
    btn.addEventListener("click", () => openAt(i));
  });
})();
