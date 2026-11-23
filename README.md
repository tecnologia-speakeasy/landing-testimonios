# Landing de testimonios — Speak Easy

Página para que los estudiantes de Speak Easy que quieran contar su testimonio
dejen sus datos (nombre, correo y teléfono) y el equipo les escriba para
coordinar la grabación.

- **Astro 7**, sitio 100 % estático publicado en **AWS Amplify**
- El formulario se guarda con la **API de las landings**, una **Lambda** de AWS
  (`api-landings`, código en `lambda/`)
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
   teléfono con los dígitos del país) y los envía a la Lambda
   (`POST /testimonios/estudiante`), que los vuelve a revisar con las mismas
   reglas (`src/lib/correo.ts` y `src/lib/telefono.ts`).
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

Ojo: en local el formulario también envía a la Lambda de producción (el CORS
permite `http://localhost:4321`), así que lo que se envíe queda en la base real.
Para apuntar a otra Lambda, define `PUBLIC_API_URL` en `.env.local`.

## Publicación

### La página (AWS Amplify)

`npm run build` deja el sitio en `dist/` y Amplify publica esa carpeta. No
necesita variables de entorno: la URL de la Lambda ya viene por defecto en
`astro.config.mjs` (se puede cambiar con `PUBLIC_API_URL`).

### La API (Lambda `api-landings`, región us-east-2)

Cada vez que cambie algo en `lambda/` o en las reglas de `src/lib`:

```sh
npm run build:lambda           # deja lambda/dist/api-landings.zip
```

y en la consola de Lambda: pestaña **Code** → **Upload from** → **.zip file**.

Configuración de la función (se hace una sola vez):

- Node.js 22.x, arm64, 256 MB, timeout de 15 s, fuera de VPC.
- Variables de entorno: las `PG*` de `.env.example`.
- **Function URL** con Auth type `NONE` y CORS: los dominios de la landing
  (el de Amplify y `http://localhost:4321`), método `POST`, header
  `content-type`.

Para sumar otra landing a la misma API: su ruta en `lambda/index.ts`, su
archivo al lado de `lambda/testimonios.ts` y su dominio en el CORS.

### Windows con Smart App Control

Si `npm run dev` falla con *"Cannot find native binding"*, no es un problema de
npm: Smart App Control bloquea el compilador nativo de Astro. Se soluciona con
la versión WebAssembly del compilador, que Astro usa sola cuando la nativa no
carga (hay que repetirlo después de cada `npm install`):

```sh
npm install --no-save --force @astrojs/compiler-binding-wasm32-wasi@<versión de @astrojs/compiler-binding>
```

## Imágenes

Las dos imágenes de la página están en `public/img/` y se sirven tal cual, sin
convertir ni recomprimir. Para cambiar una basta con reemplazar el archivo
manteniendo su nombre:

- `fondo-landing.png`: el fondo completo del diseño (trama, halos y degradados)
  en una sola imagen. Cubre la pantalla y queda fijo al desplazarse (ver
  `.fondo-pagina` en `src/styles/global.css`).
- `munecos.png`: la ilustración de la videollamada, con los íconos de llamada
  ya incluidos (412x332, el tamaño en que se muestra en desktop).

## Estructura

```
db/migrations/001_init.sql        Tabla estudiantes
scripts/migrate.mjs               Aplica las migraciones pendientes (npm run migrate)
scripts/gen-countries.mjs         Regenera la lista de países y sus banderas
scripts/build-lambda.mjs          Empaqueta la API en un .zip (npm run build:lambda)
lambda/index.ts                   Entrada de la Lambda: rutas de la API
lambda/testimonios.ts             Guarda los datos del estudiante
lambda/db.ts                      Conexión a PostgreSQL (una por petición)
lambda/env.ts                     Validación de variables de entorno (zod)
lambda/http.ts                    Petición y respuesta de la Function URL
src/lib/correo.ts                 Formato del correo (lo usan la página y la API)
src/lib/telefono.ts               Reglas del teléfono por país y formato E.164 (ídem)
src/lib/countries.ts              Países e indicativos (generado)
src/lib/selector-pais.ts          Estado del selector de indicativo
src/layouts/Layout.astro          <head> común: favicon, precarga de fuente
src/styles/global.css             Fuente, tokens del diseño, fondo y tarjeta
src/components/SelectorPais.astro Botón con la bandera y el indicativo
src/components/DialogoPaises.astro  Buscador de países
src/pages/index.astro             La landing con el formulario
```
