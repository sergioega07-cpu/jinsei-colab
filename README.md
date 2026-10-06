# JINSEI × Niebla

Landing de **preventa** de cafés Niebla vía **JINSEI colab** (cooperación / colaboración).  
No es el sitio oficial de Niebla Coffee.

Repo: `sergioega07-cpu/jinsei-colab`  
Pages: https://sergioega07-cpu.github.io/jinsei-colab/

## Qué incluye

- Branding **JINSEI × Niebla**; estética mística Niebla (oscuro, etiquetas, orígenes).
- Dos cafés: **Espantapájaros** y **Vampiros**, 250 g · **$12.000**.
- Carrito → pedido por WhatsApp a Sergio (`+56951774751`), sin pago en línea.
- Instagram de corroboración: [@niebla_coffee](https://www.instagram.com/niebla_coffee/).

## Logo JINSEI

Paleta (línea de ropa JINSEI, poleras acid-wash): fondo espresso/moca `#241c16`–`#2e241c` con textura acid-wash, marfil `#efe6d2` para texto, títulos arena→marfil, **arena** `#beac8a` como acento principal (botones, nav activa, bordes, precios), **denim lavado** `#4b5470` como secundario (tags/chips), moca `#5f4c3c` / `#6c5947` para tarjetas y bandas.

Logo real en `assets/`: versión arena/bronce `*-sand.*` (en uso), además de `*-silver.*` y crema (sin sufijo). SVG vectorizado + PNG/WebP en alta, fondo transparente:

- `jinsei-js.*`: monograma JS (portada).
- `jinsei-wordmark.*`: wordmark horizontal JÎṄSËÎ (header).
- `jinsei-wordmark-stacked.*`, `jinsei-lockup.*`: variantes apilada y monograma + wordmark.
- `jinsei-icon.svg`, `favicon-32.png`, `apple-touch-icon.png`: favicon (JS arena sobre moca).

## Barista Corner (rama del hub JINSEI)

`barista-corner/` → https://sergioega07-cpu.github.io/jinsei-colab/barista-corner/  
Sección general (sin subcategorías). Usa `../styles.css` (tokens, fondo, nav) + `barista.css`; productos en el arreglo `PRODUCTS` de `barista-corner/barista.js` (agregar un producto = agregar una entrada; si no hay precio confirmado, omitir `precio`). Fotos en `assets/barista/` (webp). Primer producto: Prestina → https://sergioega07-cpu.github.io/prestina/.  
La raíz (`index.html`, × Niebla) no enlaza aún a Barista Corner.

## Inicio (portada del hub JINSEI, en vista previa)

`inicio/` → https://sergioega07-cpu.github.io/jinsei-colab/inicio/  
Monograma JS + wordmark y cuatro puertas: × Niebla (`../`), Barista Corner (`../barista-corner/`), Lab y Ropa (Pronto, sin enlace). `../styles.css` + `inicio.css` (prefijo `hb-`) + `inicio.js`. Aún no enlazada desde la raíz ni desde Barista Corner.

## Archivos

`index.html`, `styles.css`, `app.js`, `assets/` (labels, emblemas, logo, OG).

## Local

Abre `/workspace/bob/niebla-preventa/site/index.html` o sirve la carpeta `site/`.
