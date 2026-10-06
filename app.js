/* ==========================================================================
   JINSEI × Niebla — Preventa (JS mínimo)
   Menú móvil, nav activa, carrito → WhatsApp (sin pago / sin Sheets).
   ========================================================================== */
(() => {
  "use strict";

  const WA_NUMBER = "56951774751";
  const CART_KEY = "jinsei-niebla-carrito-v1";
  const NAME_KEY = "jinsei-niebla-nombre-v1";
  const FORMATO = "250 g";
  const PRECIO = 12000;

  const CATALOG = {
    espantapajaros: { id: "espantapajaros", nombre: "Espantapájaros" },
    vampiros: { id: "vampiros", nombre: "Vampiros" },
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clp = (n) => "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const waLink = (text) =>
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text).replace(/[()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())}`;

  /* ---------- Marca / año ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- WhatsApp genéricos ---------- */
  $$(".js-wa").forEach((a) => {
    const msg = a.getAttribute("data-wa");
    if (msg) a.href = waLink(msg);
  });

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("is-on"), 2200);
  }

  /* ---------- Carrito ---------- */
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter((i) => CATALOG[i.id]);
  } catch {
    cart = [];
  }
  const saveCart = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private */ }
  };

  const cartTotal = () => cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(id) {
    const p = CATALOG[id];
    if (!p) return;
    const key = id;
    const it = cart.find((i) => i.key === key);
    if (it) it.qty++;
    else cart.push({ key, id: p.id, nombre: p.nombre, formato: FORMATO, precio: PRECIO, qty: 1 });
    saveCart();
    renderCart();
    toast(`Agregado: ${p.nombre} ${FORMATO}`);
    const fab = $("#cart-open");
    if (fab) {
      fab.classList.remove("bump");
      void fab.offsetWidth;
      fab.classList.add("bump");
    }
  }

  function buildOrderMessage() {
    const name = ($("#cart-name")?.value || "").trim();
    const lines = ["Hola JINSEI × Niebla, quiero reservar este pedido de la preventa:"];
    for (const i of cart) {
      lines.push(`- ${i.qty}× ${i.nombre} ${i.formato} — ${clp(i.precio * i.qty)}`);
    }
    lines.push(`Total: ${clp(cartTotal())}`);
    if (name) lines.push(`Nombre: ${name}`);
    return lines.join("\n");
  }

  function renderCart() {
    const list = $("#cart-items");
    if (!list) return;
    list.innerHTML = cart
      .map(
        (i) => `<li class="cart-item" data-key="${esc(i.key)}">
        <div><p class="cart-item__name">${esc(i.nombre)}</p><p class="cart-item__opt">${esc(i.formato)} · ${clp(i.precio)} c/u</p></div>
        <div class="cart-item__price">${clp(i.precio * i.qty)}</div>
        <div class="cart-item__row">
          <div class="qty"><button type="button" data-q="-1" aria-label="Quitar uno">−</button><output aria-live="polite">${i.qty}</output><button type="button" data-q="1" aria-label="Agregar uno">+</button></div>
          <button type="button" class="cart-item__remove" data-remove>Eliminar</button>
        </div>
      </li>`
      )
      .join("");
    const n = cartCount();
    const empty = $("#cart-empty");
    const foot = $("#cart-foot");
    if (empty) empty.hidden = n > 0;
    if (foot) foot.hidden = n === 0;
    const total = $("#cart-total");
    if (total) total.textContent = clp(cartTotal());
    const count = $("#cart-count");
    if (count) {
      count.hidden = n === 0;
      count.textContent = String(n);
    }
    const fab = $("#cart-open");
    if (fab) fab.setAttribute("aria-label", n ? `Abrir pedido (${n})` : "Abrir pedido");
    updateSendLink();
  }

  function updateSendLink() {
    const a = $("#cart-send");
    if (!a) return;
    if (!cart.length) {
      a.href = waLink("Hola JINSEI × Niebla, vengo desde la preventa web.");
      a.setAttribute("aria-disabled", "true");
      return;
    }
    a.removeAttribute("aria-disabled");
    a.href = waLink(buildOrderMessage());
  }

  $$("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.getAttribute("data-add")));
  });

  $("#cart-items")?.addEventListener("click", (e) => {
    const li = e.target.closest(".cart-item");
    if (!li) return;
    const it = cart.find((i) => i.key === li.dataset.key);
    if (!it) return;
    if (e.target.closest("[data-remove]")) cart = cart.filter((i) => i !== it);
    const q = e.target.closest("[data-q]");
    if (q) {
      it.qty += +q.dataset.q;
      if (it.qty <= 0) cart = cart.filter((i) => i !== it);
    }
    saveCart();
    renderCart();
  });

  const nameInput = $("#cart-name");
  if (nameInput) {
    try { nameInput.value = localStorage.getItem(NAME_KEY) || ""; } catch { /* */ }
    nameInput.addEventListener("input", () => {
      try { localStorage.setItem(NAME_KEY, nameInput.value); } catch { /* */ }
      updateSendLink();
    });
  }

  $("#cart-send")?.addEventListener("click", (e) => {
    if (!cart.length) {
      e.preventDefault();
      return;
    }
    e.currentTarget.href = waLink(buildOrderMessage());
  });

  /* Abrir / cerrar pedido */
  const drawer = $("#cart");
  const backdrop = $("#cart-backdrop");
  const fab = $("#cart-open");
  let lastFocus = null;

  function openCart() {
    if (!drawer || !backdrop || !fab) return;
    if (menuIsOpen()) closeMenu({ restoreFocus: false });
    closeHowto();
    lastFocus = document.activeElement;
    $("#toast")?.classList.remove("is-on");
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    drawer.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("cart-open");
    setTimeout(() => $("#cart-close")?.focus({ preventScroll: true }), 50);
  }

  function closeCart() {
    if (!drawer || !backdrop || !fab) return;
    backdrop.classList.remove("is-open");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cart-open");
    setTimeout(() => {
      if (!drawer.classList.contains("is-open")) backdrop.hidden = true;
    }, 450);
    lastFocus?.focus?.({ preventScroll: true });
  }

  fab?.addEventListener("click", openCart);
  $("#cart-close")?.addEventListener("click", closeCart);
  backdrop?.addEventListener("click", closeCart);
  $$("[data-close-cart]").forEach((a) => a.addEventListener("click", closeCart));

  /* ---------- Menú móvil ---------- */
  const menu = $("#menu");
  const menuToggle = $("#menu-toggle");
  const BG_SELECTORS = "main, .footer, .cart-fab, .howto, .skip";
  let menuT;

  function menuIsOpen() {
    return !!menu?.classList.contains("is-open");
  }
  function setInert(on) {
    $$(BG_SELECTORS).forEach((el) => {
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }
  function openMenu() {
    if (!menu || !menuToggle) return;
    if (drawer?.classList.contains("is-open")) closeCart();
    clearTimeout(menuT);
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú");
    document.body.classList.add("menu-open");
    setInert(true);
    setTimeout(
      () => ($(".menu__list a.is-active", menu) || $(".menu__list a", menu))?.focus({ preventScroll: true }),
      reduceMotion ? 0 : 120
    );
  }
  function closeMenu({ restoreFocus = true } = {}) {
    if (!menu || !menuToggle) return;
    menu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    document.body.classList.remove("menu-open");
    setInert(false);
    menuT = setTimeout(() => {
      if (!menu.classList.contains("is-open")) menu.hidden = true;
    }, 550);
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }

  menuToggle?.addEventListener("click", () => (menuIsOpen() ? closeMenu() : openMenu()));
  menu?.querySelector("[data-close-menu]")?.addEventListener("click", () => closeMenu());
  $$(".menu__list a, .nav__links a").forEach((a) => {
    a.addEventListener("click", () => {
      if (menuIsOpen()) closeMenu({ restoreFocus: false });
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (howtoIsOpen()) closeHowto();
    else if (drawer?.classList.contains("is-open")) closeCart();
    else if (menuIsOpen()) closeMenu();
  });

  /* ---------- Cómo pedir (nube flotante) ---------- */
  const howtoBtn = $("#howto-open");
  const howtoPop = $("#howto-pop");
  function howtoIsOpen() { return !!howtoPop && !howtoPop.hidden; }
  function openHowto() {
    if (!howtoPop || !howtoBtn) return;
    howtoPop.hidden = false;
    howtoBtn.setAttribute("aria-expanded", "true");
  }
  function closeHowto({ restoreFocus = false } = {}) {
    if (!howtoPop || !howtoBtn) return;
    howtoPop.hidden = true;
    howtoBtn.setAttribute("aria-expanded", "false");
    if (restoreFocus) howtoBtn.focus({ preventScroll: true });
  }
  howtoBtn?.addEventListener("click", () => (howtoIsOpen() ? closeHowto() : openHowto()));
  $("#howto-close")?.addEventListener("click", () => closeHowto({ restoreFocus: true }));
  document.addEventListener("click", (e) => {
    if (howtoIsOpen() && !e.target.closest("#howto")) closeHowto();
  });

  /* ---------- Nav scrolled + activa ---------- */
  const nav = $("#nav");
  const onScroll = () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const sections = ["portada", "colab", "tostador", "cafe"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function setActiveNav(id) {
    $$("[data-nav]").forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === id);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveNav(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.2, 0.5, 1] }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Reveal ---------- */
  function observeReveals(root = document) {
    const els = $$(".reveal", root);
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }
  observeReveals();

  /* boot */
  renderCart();
})();
