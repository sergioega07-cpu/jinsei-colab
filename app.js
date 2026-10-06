/* ==========================================================================
   JINSEI × Niebla — Preventa (JS mínimo)
   Menú móvil, nav de ramas, carrito → WhatsApp (sin pago / sin Sheets).
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

  /* ---------- Fondo: ciclo de color (bosque → espresso → vino → denim → petróleo) ----------
     Un temporizador pasa la clase .on al velo siguiente cada 3,2 s; la transición CSS de 1,6 s funde los tonos
     (ciclo completo 16 s). Corre siempre, incluso con «reducir movimiento» (es solo color, sin desplazamiento)
     y no depende de @keyframes, que iOS puede ralentizar o suspender en modo de bajo consumo. */
  (() => {
    const tint = document.querySelector(".tint");
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
    const lines = ["Hola JINSEI, quiero reservar este pedido de la preventa:"];
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
      a.href = waLink("Hola JINSEI, vengo desde la preventa web.");
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
  const howtoRoot = $("#howto");
  const howtoHint = $("#howto-hint");
  const howtoBody = $(".howto__body");
  function howtoIsOpen() { return !!howtoPop && !howtoPop.hidden && !closing; }
  const howtoMorph = $(".howto__morph");
  const howtoCloud = $(".howto__cloud");
  const canMorph = !reduceMotion && !!howtoPop && typeof howtoPop.animate === "function" && !!howtoCloud;
  if (canMorph) howtoRoot?.classList.add("howto--morph");
  let morphAnims = [];
  let cloudRect = null;
  let closing = false;
  function stopMorph() { morphAnims.forEach((a) => a.cancel()); morphAnims = []; }
  // Nube → hoja (o al revés): la hoja parte con el tamaño y la posición de la nube y crece hasta su lugar
  function morph(open) {
    stopMorph();
    const pr = howtoPop.getBoundingClientRect();
    const fr = cloudRect || howtoCloud.getBoundingClientRect();
    if (!pr.width || !pr.height) return null;
    const small = {
      transform: `translate(${fr.left - pr.left}px, ${fr.top - pr.top}px) scale(${Math.max(fr.width / pr.width, .04)}, ${Math.max(fr.height / pr.height, .04)})`,
      borderRadius: "50%",
    };
    const big = { transform: "translate(0px, 0px) scale(1, 1)", borderRadius: getComputedStyle(howtoPop).borderRadius };
    const opts = open
      ? { duration: 620, easing: "cubic-bezier(.45, .05, .25, 1)", fill: "both" }
      : { duration: 380, easing: "cubic-bezier(.55, 0, .7, .4)", fill: "both" };
    howtoPop.style.transformOrigin = "0 0";
    const a = howtoPop.animate(open ? [small, big] : [big, small], opts);
    morphAnims = [a];
    if (howtoMorph) {
      morphAnims.push(howtoMorph.animate(open
        ? [{ opacity: 1 }, { opacity: 1, offset: .4 }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1, offset: .55 }, { opacity: 1 }], opts));
    }
    return a;
  }
  function openHowto() {
    if (!howtoPop || !howtoBtn) return;
    closing = false;
    if (canMorph) cloudRect = howtoCloud.getBoundingClientRect(); // antes de que la nube se oculte (móvil)
    howtoPop.hidden = false;
    howtoBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("howto-open");
    howtoHint?.classList.remove("is-on");
    if (canMorph) { const a = morph(true); if (a) a.onfinish = () => { if (!closing) stopMorph(); }; }
  }
  function closeHowto({ restoreFocus = false } = {}) {
    if (!howtoPop || !howtoBtn || closing) return;
    const finish = () => {
      closing = false;
      stopMorph();
      howtoPop.hidden = true;
      document.body.classList.remove("howto-open");
    };
    howtoBtn.setAttribute("aria-expanded", "false");
    if (restoreFocus) howtoBtn.focus({ preventScroll: true });
    const a = canMorph && !howtoPop.hidden ? morph(false) : null;
    if (!a) return finish();
    closing = true;
    a.onfinish = () => { if (closing) finish(); };
  }
  howtoBtn?.addEventListener("click", () => (howtoIsOpen() ? closeHowto() : openHowto()));
  $("#howto-close")?.addEventListener("click", () => closeHowto({ restoreFocus: true }));
  document.addEventListener("click", (e) => {
    if (howtoIsOpen() && !e.target.closest("#howto")) closeHowto();
  });
  // Paso 3: «Ver cafés» cierra la nube y baja a Café (el ancla hace el scroll)
  $$("[data-close-howto]").forEach((el) => el.addEventListener("click", () => closeHowto()));

  // Pista «¿Primera vez? Toca aquí»: una vez por sesión, ~3 s después de cargar, se oculta sola
  const HINT_KEY = "jinsei-howto-hint-v1";
  let hintSeen = false;
  try { hintSeen = sessionStorage.getItem(HINT_KEY) === "1"; } catch (_) {}
  if (howtoHint && !hintSeen) {
    setTimeout(() => {
      if (howtoIsOpen() || menuIsOpen() || document.body.classList.contains("cart-open")) return;
      howtoHint.classList.add("is-on");
      try { sessionStorage.setItem(HINT_KEY, "1"); } catch (_) {}
      setTimeout(() => howtoHint.classList.remove("is-on"), 5000);
    }, 3000);
  }
  howtoHint?.addEventListener("click", () => openHowto());

  // Scroll: la nube se inclina / rebota y deja una breve estela de chispas (sin reduced motion)
  if (!reduceMotion && howtoRoot && howtoBody && howtoBtn) {
    let lastY = window.scrollY, settleT = 0, lastTrail = 0;
    const spawnTrail = (dir) => {
      const sp = document.createElement("span");
      sp.className = "howto__trail";
      sp.setAttribute("aria-hidden", "true");
      sp.textContent = Math.random() < 0.5 ? "✦" : "✧";
      const w = howtoBtn.offsetWidth, h = howtoBtn.offsetHeight;
      sp.style.left = Math.round(w * (0.18 + Math.random() * 0.64)) + "px";
      sp.style.top = Math.round(dir > 0 ? h * 0.78 : h * 0.12) + "px";
      sp.style.setProperty("--tx", Math.round((Math.random() - 0.5) * 28) + "px");
      sp.style.setProperty("--ty", Math.round(dir * (22 + Math.random() * 20)) + "px");
      sp.style.setProperty("--s", (0.55 + Math.random() * 0.35).toFixed(2) + "rem");
      sp.addEventListener("animationend", () => sp.remove());
      howtoRoot.appendChild(sp);
    };
    window.addEventListener("scroll", () => {
      const y = window.scrollY, dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) < 2 || howtoIsOpen()) return;
      const dir = dy > 0 ? 1 : -1;
      howtoBody.style.setProperty("--tilt", dir * -4 + "deg");
      howtoBody.style.setProperty("--bob", dir * -4 + "px");
      clearTimeout(settleT);
      settleT = setTimeout(() => {
        howtoBody.style.setProperty("--tilt", "0deg");
        howtoBody.style.setProperty("--bob", "0px");
      }, 160);
      const now = performance.now();
      if (now - lastTrail > 110 && howtoRoot.querySelectorAll(".howto__trail").length < 8) {
        lastTrail = now;
        spawnTrail(dir);
      }
    }, { passive: true });
  }

  /* ---------- Nav con fondo al hacer scroll ---------- */
  const nav = $("#nav");
  const onScroll = () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // La nav muestra las ramas JINSEI (× Niebla activa fija); ya no hay enlaces a secciones ni scroll-spy.

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
