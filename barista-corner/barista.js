/* ==========================================================================
   JINSEI · Barista Corner (JS mínimo)
   Fondo tint, menú móvil, WhatsApp y grilla de productos desde PRODUCTS.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- Productos ----------
     Agregar un producto = agregar una entrada aquí (la grilla se centra sola con 1 a 4 tarjetas).
     Solo datos reales: si no hay precio confirmado, omitir «precio» y no se muestra.
     img: ruta relativa a esta página; ancho/alto reales del archivo (evitan saltos de diseño). */
  const PRODUCTS = [
    {
      id: "prestina",
      nombre: "Prestina",
      marca: "Wacaco",
      desc: "Prensa de viaje: el ritual completo en un solo cuerpo.",
      precio: 50000,
      img: "../assets/barista/prestina.webp",
      w: 661,
      h: 546,
      alt: "Prestina de Wacaco: prensa y taza en un solo cuerpo, con su cuchara dosificadora",
      url: "https://sergioega07-cpu.github.io/prestina/",
      cta: "Ver Prestina",
    },
  ];

  const WA_NUMBER = "56951774751";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clp = (n) => "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const safeUrl = (u) => {
    try {
      const x = new URL(u, location.href);
      return x.protocol === "https:" || x.origin === location.origin ? x.href : "#";
    } catch { return "#"; }
  };

  /* ---------- Fondo: ciclo de color (igual que la página raíz) ----------
     Cada 3,2 s pasa la clase .on al velo siguiente; la transición CSS de 1,6 s funde los tonos.
     Corre también con «reducir movimiento»: es solo color, sin desplazamiento. */
  (() => {
    const tint = $(".tint");
    const layers = tint ? Array.from(tint.children) : [];
    if (layers.length < 2) return;
    let k = 0;
    layers[0].classList.add("on");
    tint.classList.add("tint--js");
    setInterval(() => {
      layers[k].classList.remove("on");
      k = (k + 1) % layers.length;
      layers[k].classList.add("on");
    }, 3200);
  })();

  /* ---------- Grilla ---------- */
  const grid = $("#bc-grid");
  if (grid) {
    grid.innerHTML = PRODUCTS.map((p) => {
      return `<li class="card bc-card" data-id="${esc(p.id)}">
        <a class="bc-card__media" href="${esc(safeUrl(p.url))}" tabindex="-1" aria-hidden="true">
          <img src="${esc(p.img)}" alt="${esc(p.alt || p.nombre)}" width="${+p.w || ""}" height="${+p.h || ""}" loading="lazy" decoding="async">
        </a>
        <div class="bc-card__body">
          ${p.marca ? `<p class="bc-card__brand">${esc(p.marca)}</p>` : ""}
          <h2 class="bc-card__name">${esc(p.nombre)}</h2>
          <p class="bc-card__desc">${esc(p.desc)}</p>
          <div class="bc-card__foot">
            ${p.precio ? `<p class="bc-card__price">${clp(p.precio)}<small>CLP</small></p>` : ""}
            <a class="btn btn--primary bc-card__cta" href="${esc(safeUrl(p.url))}">${esc(p.cta || "Ver " + p.nombre)} <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </li>`;
    }).join("");
    grid.dataset.count = String(PRODUCTS.length);
  }

  /* ---------- Aparición suave (solo opacidad) ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));

  /* ---------- WhatsApp ---------- */
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  $$(".js-wa").forEach((a) => {
    const msg = a.getAttribute("data-wa");
    if (msg) a.href = waLink(msg);
  });

  /* ---------- Menú móvil (mismo comportamiento que la raíz) ---------- */
  const menu = $("#menu");
  const menuToggle = $("#menu-toggle");
  const BG = "main, .footer, .skip";
  let menuT;
  const menuIsOpen = () => !!menu?.classList.contains("is-open");
  const setInert = (on) => $$(BG).forEach((el) => (on ? el.setAttribute("inert", "") : el.removeAttribute("inert")));
  function openMenu() {
    if (!menu || !menuToggle) return;
    clearTimeout(menuT);
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú");
    document.body.classList.add("menu-open");
    setInert(true);
    setTimeout(() => ($(".menu__list a.is-active", menu) || $(".menu__list a", menu))?.focus({ preventScroll: true }), reduceMotion ? 0 : 120);
  }
  function closeMenu({ restoreFocus = true } = {}) {
    if (!menu || !menuToggle) return;
    menu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    document.body.classList.remove("menu-open");
    setInert(false);
    menuT = setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 550);
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }
  menuToggle?.addEventListener("click", () => (menuIsOpen() ? closeMenu() : openMenu()));
  menu?.querySelector("[data-close-menu]")?.addEventListener("click", () => closeMenu());
  $$(".menu__list a").forEach((a) => a.addEventListener("click", () => { if (menuIsOpen()) closeMenu({ restoreFocus: false }); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuIsOpen()) closeMenu(); });
  window.matchMedia("(min-width: 900px)").addEventListener?.("change", (m) => { if (m.matches && menuIsOpen()) closeMenu({ restoreFocus: false }); });

  /* ---------- Nav con fondo al hacer scroll ---------- */
  const nav = $("#nav");
  const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
