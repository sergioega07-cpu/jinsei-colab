/* ==========================================================================
   JINSEI × Niebla — Preventa (JS mínimo)
   Menú móvil, nav de ramas, carrito → WhatsApp (sin pago).
   El listado de cafés, textos, stock e imágenes se leen de la misma planilla
   publicada que Niebla; los precios propios de JINSEI se mantienen.
   Si la planilla no carga, se usa el catálogo local de esta página.
   ========================================================================== */
(() => {
  "use strict";

  const WA_NUMBER = "56951774751";
  const CART_KEY = "jinsei-niebla-carrito-v1";
  const NAME_KEY = "jinsei-niebla-nombre-v1";
  // Catálogo de la preventa. stock: SI/NO/poco stock (también acepta números viejos: > 0 = hay).
  const F = (formato, precio, stock) => ({ formato, precio, stock: hasStock(stock), low: isLowStock(stock) });
  function normStock(v) {
    return String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function isLowStock(v) { return /^(poco stock|poco)$/.test(normStock(v)); }
  function hasStock(v) {
    const t = normStock(v);
    if (!t || /^(no|sin stock|agotado|0+)$/.test(t)) return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10) > 0 ? 1 : 0;
    return /^(si|s|yes|hay|con stock|disponible|x|poco stock|poco)$/.test(t) ? 1 : 0;
  }
  const CATALOG = {
    espantapajaros: { id: "espantapajaros", nombre: "Espantapájaros", formatos: [F("250 g", 12000, "NO")] },
    "espantapajaros-gabriela": { id: "espantapajaros-gabriela", nombre: "Espantapájaros Gabriela", formatos: [F("250 g", 12500, "SI"), F("1 kg", 42000, "SI")] },
    "espantapajaros-huila": { id: "espantapajaros-huila", nombre: "Espantapájaros Huila", formatos: [F("250 g", 11500, "NO"), F("1 kg", 39000, "NO")] },
    vampiros: { id: "vampiros", nombre: "Vampiros", formatos: [F("250 g", 12000, "poco stock")] },
    "los-duendes": { id: "los-duendes", nombre: "Los Duendes", formatos: [F("250 g", 12000, "SI"), F("1 kg", 39000, "SI")] },
    "los-tres-brujos": { id: "los-tres-brujos", nombre: "Los Tres Brujos", formatos: [F("200 g", 19000, "SI")] },
    "jinete-sin-cabeza": { id: "jinete-sin-cabeza", nombre: "El Jinete sin Cabeza", formatos: [F("100 g", 27000, "SI")] },
    "drip-coffee": { id: "drip-coffee", nombre: "Drip Coffee", formatos: [F("unidad", 2500, "SI")] },
  };
  const findFmt = (id, formato) => CATALOG[id]?.formatos.find((f) => f.formato === formato);
  const inStock = (p) => p.formatos.some((f) => f.stock);
  const canSell = (f) => !!(f && f.stock && !f.precioPendiente && f.precio > 0);

  // Precios de JINSEI (se conservan). No se copian los de Niebla ni se inventan.
  const JINSEI_PRICES = {};
  for (const p of Object.values(CATALOG)) {
    JINSEI_PRICES[p.id] = Object.fromEntries(p.formatos.map((f) => [f.formato, f.precio]));
  }
  const DRIP_ID = "drip-coffee";
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR3q6EliurFneCq_EGOYeC24JWwfwXeNEB3nK0h0StznvtLdKEsoLL2iW-ts4K6KXtlrzdmt6tdstM5/pub?gid=356496886&single=true&output=csv";
  const NIEBLA_ORIGIN = "https://nieblacoffee.cl/";
  // Ids de Niebla → ids de JINSEI, solo cuando no coinciden.
  const NIEBLA_ID_TO_JINSEI = { gabriela: "espantapajaros-gabriela", huila: "espantapajaros-huila" };
  const LABEL_BY_NIEBLA_ID = { gabriela: "espantapajaros-gabriela", huila: "huila-2026-11" };
  const isHidden = (v) => /^(no|false|0|n)$/i.test(String(v || "").trim());
  const normKey = (v) => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function grams(f) {
    const m = String(f).toLowerCase().replace(",", ".").match(/([\d.]+)\s*(kg|g)/);
    return m ? parseFloat(m[1]) * (m[2] === "kg" ? 1000 : 1) : 1e9;
  }
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", i = 0, q = false;
    text = String(text).replace(/^\uFEFF/, "");
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    const nonEmpty = rows.filter((r) => r.some((v) => String(v).trim() !== ""));
    if (!nonEmpty.length) return [];
    const head = nonEmpty[0].map((h) => h.trim().toLowerCase());
    return nonEmpty.slice(1).map((r) => Object.fromEntries(head.map((h, k) => [h, (r[k] ?? "").trim()])));
  }
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return res.text();
  }
  function jinseiIdFor(row) {
    if (NIEBLA_ID_TO_JINSEI[row.id]) return NIEBLA_ID_TO_JINSEI[row.id];
    if (row.id && row.id !== DRIP_ID) return row.id;
    const want = normKey(row.nombre);
    return Object.values(CATALOG).find((p) => p.id !== DRIP_ID && normKey(p.nombre) === want)?.id || row.id;
  }
  function labelSrc(nieblaId, imagenUrl) {
    const raw = String(imagenUrl || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const path = raw || `assets/labels/${LABEL_BY_NIEBLA_ID[nieblaId] || nieblaId}.webp`;
    return NIEBLA_ORIGIN + path.replace(/^\//, "");
  }
  function localLabelSrc(nieblaId, jid, imagenUrl) {
    const file = String(imagenUrl || "").trim().split("/").pop() || `${LABEL_BY_NIEBLA_ID[nieblaId] || jid || nieblaId}.webp`;
    return `../assets/labels/${file}`;
  }
  function applyNieblaRows(rows) {
    const map = new Map();
    for (const r of rows) {
      if (!r.id || isHidden(r.visible)) continue;
      const id = jinseiIdFor(r);
      if (!id || id === DRIP_ID) continue;
      if (!map.has(id)) {
        map.set(id, {
          id,
          nieblaId: r.id,
          nombre: r.nombre,
          origen: r.origen,
          categoria: r.categoria,
          proceso: r.proceso,
          altura: r.altura,
          variedad: r.variedad,
          descripcion: r.descripcion,
          notas: (r.notas_sabor || "").split(/[,;·]/).map((s) => s.trim()).filter(Boolean),
          imagen: labelSrc(r.id, r.imagen_url),
          imagenLocal: localLabelSrc(r.id, id, r.imagen_url),
          formatos: [],
        });
      }
      const p = map.get(id);
      const precio = JINSEI_PRICES[id]?.[r.formato];
      const hasPrecio = Number.isFinite(Number(precio)) && Number(precio) > 0;
      p.formatos.push({
        formato: r.formato || "Único",
        precio: hasPrecio ? Number(precio) : 0,
        precioPendiente: !hasPrecio,
        stock: hasStock(r.stock),
        low: isLowStock(r.stock),
      });
    }
    for (const p of map.values()) p.formatos.sort((a, b) => grams(a.formato) - grams(b.formato));
    const drip = CATALOG[DRIP_ID];
    for (const id of Object.keys(CATALOG)) {
      if (id !== DRIP_ID) delete CATALOG[id];
    }
    const order = [];
    for (const p of map.values()) {
      CATALOG[p.id] = p;
      order.push(p.id);
    }
    if (drip) CATALOG[DRIP_ID] = drip;
    return order;
  }

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
  /* La hoja guarda el precio por transferencia; el precio normal (tarjeta, link de pago Mercado Pago) es +3,2% redondeado hacia arriba a la centena. */
  const normal = (n) => Math.ceil((Number(n) || 0) * 1.032 / 100) * 100;
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
  const MAX_QTY = 20;
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter((i) => i && typeof i.id === "string")
      .map((i) => ({ ...i, formato: i.formato || "250 g", qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1)) }));
  } catch {
    cart = [];
  }
  const saveCart = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private */ }
  };

  const cartTotal = () => cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const cartTotalNormal = () => cart.reduce((s, i) => s + normal(i.precio) * i.qty, 0);
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(id, formato) {
    const p = CATALOG[id];
    const f = findFmt(id, formato);
    if (!p || !canSell(f)) return;
    const key = id + "|" + formato;
    const it = cart.find((i) => i.key === key);
    if (it) { if (it.qty >= MAX_QTY) { toast(`Máximo ${MAX_QTY} por café en la preventa`); return; } it.qty++; }
    else cart.push({ key, id: p.id, nombre: p.nombre, formato, precio: f.precio, qty: 1 });
    saveCart();
    renderCart();
    toast(`Agregado: ${p.nombre} ${formato}`);
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
      lines.push(`- ${i.qty}× ${i.nombre} ${i.formato} — ${clp(normal(i.precio) * i.qty)} (transferencia ${clp(i.precio * i.qty)})`);
    }
    lines.push(`Total precio normal (tarjeta, link de pago): ${clp(cartTotalNormal())}`);
    lines.push(`Total con descuento por transferencia: ${clp(cartTotal())}`);
    if (name) lines.push(`Nombre: ${name}`);
    return lines.join("\n");
  }

  function renderCart() {
    const list = $("#cart-items");
    if (!list) return;
    list.innerHTML = cart
      .map(
        (i) => `<li class="cart-item" data-key="${esc(i.key)}">
        <div><p class="cart-item__name">${esc(i.nombre)}</p><p class="cart-item__opt">${esc(i.formato)} · ${clp(normal(i.precio))} c/u · transferencia ${clp(i.precio)}</p></div>
        <div class="cart-item__price">${clp(normal(i.precio) * i.qty)}</div>
        <div class="cart-item__row">
          <div class="qty"><button type="button" data-q="-1" aria-label="Quitar uno">−</button><output aria-live="polite">${esc(i.qty)}</output><button type="button" data-q="1" aria-label="Agregar uno" ${i.qty >= MAX_QTY ? "disabled" : ""}>+</button></div>
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
    if (total) total.textContent = clp(cartTotalNormal());
    const totalT = $("#cart-total-transfer");
    if (totalT) totalT.textContent = clp(cartTotal());
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

  function sanitizeCart() {
    cart = cart
      .filter((i) => i && typeof i.id === "string" && Object.prototype.hasOwnProperty.call(CATALOG, i.id))
      .map((i) => ({ ...i, formato: i.formato || "250 g" }))
      .filter((i) => canSell(findFmt(i.id, i.formato)))
      .map((i) => ({
        ...i,
        key: i.id + "|" + i.formato,
        nombre: CATALOG[i.id].nombre,
        precio: findFmt(i.id, i.formato).precio,
        qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1)),
      }));
    saveCart();
  }

  function metaHTML(p) {
    const rows = [
      p.proceso && ["Proceso", p.proceso],
      p.altura && ["Altura", p.altura],
      p.variedad && ["Variedad", p.variedad],
    ].filter(Boolean);
    if (!rows.length) return "";
    return `<dl class="product__meta">${rows.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join("")}</dl>`;
  }
  function notesHTML(p) {
    if (!p.notas || !p.notas.length) return "";
    return `<ul class="notes" aria-label="Notas de sabor">${p.notas.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
  }
  function cardHTML(p) {
    return `<article class="card product reveal is-in" data-id="${esc(p.id)}" data-from="niebla">
      <div class="product__media product__media--label">
        <img src="${esc(p.imagen)}" data-fallback="${esc(p.imagenLocal || "")}" alt="Etiqueta ${esc(p.nombre)}" width="480" height="576" loading="lazy" decoding="async">
        <div class="product__badges">
          <span class="badge" data-role="stock">Preventa</span>
        </div>
      </div>
      <div class="product__body">
        <p class="product__origin">${esc(p.origen || "")}</p>
        <h3 class="product__name">${esc(p.nombre)}</h3>
        ${metaHTML(p)}
        ${notesHTML(p)}
        ${p.descripcion ? `<p class="product__desc">${esc(p.descripcion)}</p>` : ""}
        <div class="product__buy" data-buy="${esc(p.id)}"></div>
      </div>
    </article>`;
  }
  function renderNieblaProducts(order) {
    const root = $(".products");
    if (!root) return;
    const drip = root.querySelector(`.product[data-id="${DRIP_ID}"]`);
    $$(".product", root).forEach((el) => { if (el.dataset.id !== DRIP_ID) el.remove(); });
    const html = order.map((id) => cardHTML(CATALOG[id])).join("");
    if (drip) drip.insertAdjacentHTML("beforebegin", html);
    else root.insertAdjacentHTML("beforeend", html);
    $$(".product.reveal", root).forEach((el) => el.classList.add("is-in"));
    $$(".product[data-from='niebla'] img[data-fallback]", root).forEach((img) => {
      img.addEventListener("error", () => {
        const fb = img.getAttribute("data-fallback");
        if (!fb) return;
        try {
          if (img.src !== new URL(fb, location.href).href) img.src = fb;
        } catch {
          img.src = fb;
        }
      }, { once: true });
    });
  }

  /* ---------- Tarjetas: formato, precio y stock (Con stock / Poco stock / Sin stock) ---------- */
  const painters = [];
  function bindBuyBoxes(scope = document) {
    $$("[data-buy]", scope).forEach((box) => {
      if (box.dataset.bound === "1") return;
      box.dataset.bound = "1";
      const pId = box.dataset.buy;
      const card = box.closest(".product");
      let sel = 0;
      const paint = () => {
        const p = CATALOG[pId];
        if (!p) return;
        card?.classList.toggle("is-out", !inStock(p));
        if (sel >= p.formatos.length) sel = 0;
        const firstOk = p.formatos.findIndex((f) => f.stock);
        if (firstOk >= 0 && !p.formatos[sel]?.stock) sel = firstOk;
        const f = p.formatos[sel];
        if (!f) return;
        const badge = card?.querySelector('[data-role="stock"]');
        if (badge) {
          const label = !f.stock ? "Sin stock" : f.low ? "Poco stock" : "Con stock";
          badge.textContent = label;
          badge.className = "badge " + (!f.stock ? "badge--out" : f.low ? "badge--low" : "badge--ok");
        }
        const priceBlock = f.precioPendiente
          ? `<p class="price">Precio por confirmar<small>${esc(f.formato)}</small></p>`
          : `<p class="price">${clp(normal(f.precio))}<small>${esc(f.formato)}</small><small>Por transferencia: ${clp(f.precio)}</small></p>`;
        const btnLabel = !f.stock ? "Sin stock" : f.precioPendiente ? "Precio por confirmar" : "Agregar al pedido";
        box.innerHTML = `
        ${p.formatos.length > 1 ? `<div class="fmt" role="group" aria-label="Formato">${p.formatos.map((fo, i) => `<button type="button" data-i="${i}" aria-pressed="${i === sel}" ${fo.stock ? "" : 'class="is-out" title="Sin stock"'}>${esc(fo.formato)}</button>`).join("")}</div>` : ""}
        ${priceBlock}
        <button type="button" class="btn btn--primary" data-add ${canSell(f) ? "" : "disabled"}>${btnLabel}</button>`;
      };
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-i]");
        if (b) { sel = +b.dataset.i; paint(); return; }
        if (e.target.closest("[data-add]")) addToCart(pId, CATALOG[pId]?.formatos[sel]?.formato);
      });
      painters.push(paint);
      paint();
    });
  }
  function paintCatalog() {
    painters.forEach((fn) => fn());
    const root = $(".products");
    if (!root) return;
    $$(".product.is-out", root).forEach((c) => root.appendChild(c));
  }

  $("#cart-items")?.addEventListener("click", (e) => {
    const li = e.target.closest(".cart-item");
    if (!li) return;
    const it = cart.find((i) => i.key === li.dataset.key);
    if (!it) return;
    if (e.target.closest("[data-remove]")) cart = cart.filter((i) => i !== it);
    const q = e.target.closest("[data-q]");
    if (q) {
      if (+q.dataset.q > 0 && it.qty >= MAX_QTY) { toast(`Máximo ${MAX_QTY} por café en la preventa`); return; }
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
  async function boot() {
    try {
      const rows = parseCSV(await fetchText(SHEET_CSV_URL));
      const order = applyNieblaRows(rows);
      if (!order.length) throw new Error("planilla vacía");
      renderNieblaProducts(order);
    } catch (e) {
      console.warn("[JINSEI] No se pudo leer el catálogo de Niebla; se mantiene el catálogo local.", e);
    }
    bindBuyBoxes(document);
    sanitizeCart();
    renderCart();
    paintCatalog();
    observeReveals();
  }
  boot();
})();
