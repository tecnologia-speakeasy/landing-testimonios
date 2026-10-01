-- =============================================================================
-- 001_init — esquema inicial de la landing de testimonios Speak Easy
--
-- Las tablas se crean en el esquema indicado por PGSCHEMA (por defecto
-- `testimonios`); el script de migración lo crea si falta y fija el search_path
-- antes de ejecutar este archivo, por eso aquí van sin prefijo.
--
-- Todo es `IF NOT EXISTS`: correrlo sobre una base donde las tablas ya existen
-- no altera nada.
-- =============================================================================

-- Estudiantes que quieren contar su testimonio: los datos del formulario de la
-- landing para escribirles y coordinar la grabación. El correo es único: si
-- alguien vuelve a enviar el formulario, se actualizan sus datos en lugar de
-- quedar duplicado.
CREATE TABLE IF NOT EXISTS estudiantes (
  id              SERIAL      PRIMARY KEY,
  nombre          TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  -- País del indicativo (ISO 3166-1 alfa-2: 'co', 'mx'...). El +1, el +7 y
  -- otros los comparten varios países, así que el teléfono solo no lo dice.
  pais            TEXT        NOT NULL,
  -- Teléfono en formato E.164, con el indicativo: +573001234567.
  telefono        TEXT        NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
