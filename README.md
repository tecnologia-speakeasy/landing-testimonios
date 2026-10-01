# Landing de testimonios — Speak Easy

Página para que los estudiantes de Speak Easy que quieran contar su testimonio
dejen sus datos (nombre, correo y teléfono) y el equipo les escriba para
coordinar la grabación.

- **Astro 7** desplegado en **Vercel**: la landing es estática y solo
  `/api/estudiante` corre en servidor
- **Tailwind CSS 4**, diseño móvil primero (dos columnas a partir de 1024px)
- **PostgreSQL** con el paquete `pg` (sin ORM) y migraciones en SQL plano
- Misma base de datos que `landing-referidos`, pero en su propio esquema: `testimonios`

Diseño: Figma · [LANDING-TESTIMONIO](https://www.figma.com/design/mhpkVVVGa0tvPMxLMtR3uE/LANDING-TESTIMONIO?node-id=4-11)
(solo desktop, 1920x1080; la versión móvil sigue el patrón de landing-referidos).

---

## Cómo funciona

1. El estudiante escribe su **nombre**, su **correo** y su **teléfono**. El
   indicativo se elige en un buscador de países (Colombia por defecto), el
   mismo de `landing-referidos`; si pega un número con "+57…", el indicativo
   pasa solo al selector.
2. El formulario revisa los datos antes de enviar (correo con forma de correo,
   teléfono con los dígitos del país) y `POST /api/estudiante` los vuelve a
   revisar.
3. Se guarda en `estudiantes` por correo (recortado y en minúsculas). Si el
   correo ya existía, se actualizan el nombre y el teléfono en lugar de
   duplicar el registro.

## Base de datos

```
testimonios.estudiantes   id, nombre, email (único), pais, telefono, creado_en, actualizado_en
```

- `pais`: código ISO del indicativo (`co`, `mx`…); el `+1` y otros los
  comparten varios países.
- `telefono`: formato E.164, con el indicativo (`+573001234567`).

Consulta rápida:

```sql
SELECT nombre, email, telefono, creado_en
FROM testimonios.estudiantes
ORDER BY creado_en DESC;
```

## Puesta en marcha

```sh
npm install
cp .env.example .env.local     # y rellenar los datos de PostgreSQL
npm run migrate                # crea el esquema `testimonios` y su tabla si faltan
npm run dev
```

En Vercel hay que cargar las mismas variables de `.env.example` en
*Settings → Environment Variables*.

### Windows con Smart App Control

Si `npm run dev` falla con *"Cannot find native binding"*, no es un problema de
npm: Smart App Control bloquea el compilador nativo de Astro. Se soluciona con
la versión WebAssembly del compilador, que Astro usa sola cuando la nativa no
carga (hay que repetirlo después de cada `npm install`):

```sh
npm install --no-save --force @astrojs/compiler-binding-wasm32-wasi@<versión de @astrojs/compiler-binding>
```

## Imágenes

Todas están en `src/assets/` y Astro las copia (o las optimiza) en el build:

- `munecos-videollamada.png`: la ilustración, en el tamaño original de Figma
  (1847x1487). Astro genera dos WebP (412 y 824 px de ancho, para pantallas
  normales y retina).
- `trama-fondo.webp`: la trama de líneas del fondo. Es el PNG original pasado a
  WebP **sin pérdida** (mismos píxeles, menos de la mitad de peso). El
  original trae las líneas en morado; el CSS las pinta en blanco, como se ven en
  Figma.
- `halo-1.svg`, `halo-2.svg`: los halos morados del fondo, exportados de Figma.
- `icono-telefono.svg`, `icono-colgar.svg`: los íconos que van sobre los
  círculos blancos de la ilustración.

## Estructura

```
db/migrations/001_init.sql        Tabla estudiantes
scripts/migrate.mjs               Aplica las migraciones pendientes (npm run migrate)
scripts/gen-countries.mjs         Regenera la lista de países y sus banderas
src/lib/env.ts                    Validación de variables de entorno (zod)
src/lib/db.ts                     Pool de PostgreSQL (singleton)
src/lib/correo.ts                 Formato del correo
src/lib/telefono.ts               Reglas del teléfono por país y formato E.164
src/lib/countries.ts              Países e indicativos (generado)
src/lib/selector-pais.ts          Estado del selector de indicativo
src/layouts/Layout.astro          <head> común: favicon, precarga de fuente
src/styles/global.css             Fuente, tokens del diseño, fondo y tarjeta
src/components/SelectorPais.astro Botón con la bandera y el indicativo
src/components/DialogoPaises.astro  Buscador de países
src/pages/index.astro             La landing con el formulario
src/pages/api/estudiante.ts       Guarda los datos del estudiante
```
