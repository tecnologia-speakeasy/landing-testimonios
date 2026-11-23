import { MENSAJE_CORREO_INVALIDO, correoValido } from '@/lib/correo';
import { componerE164, paisPorIso, problemaTelefono } from '@/lib/telefono';
import { consultar } from './db';
import { json, type Respuesta } from './http';

/** Largo máximo del nombre; el formulario no deja escribir más. */
const MAXIMO_CARACTERES_NOMBRE = 120;

/**
 * Registra al estudiante que quiere contar su testimonio: nombre, correo y
 * teléfono.
 *
 * - El correo se recorta, se exige que tenga forma de correo (ver
 *   `@/lib/correo`) y se pasa a minúsculas. Si ya existe, se actualizan sus
 *   datos: quien vuelve a enviar el formulario suele estar corrigiendo algo.
 * - El teléfono llega sin indicativo, con el país aparte; se valida con las
 *   reglas de ese país y se guarda en formato E.164 (ver `@/lib/telefono`).
 *
 * Las reglas son las mismas que aplica el formulario, pero se repiten aquí
 * porque cualquiera puede llamar a la API sin pasar por la página.
 */
export async function registrarEstudiante(cuerpo: unknown): Promise<Respuesta> {
  const datos = cuerpo as
    | { nombre?: unknown; email?: unknown; pais?: unknown; telefono?: unknown }
    | null;
  const nombre = String(datos?.nombre ?? '').trim().replace(/\s+/g, ' ');
  const email = String(datos?.email ?? '').trim().toLowerCase();
  const pais = paisPorIso(String(datos?.pais ?? ''));
  const telefono = String(datos?.telefono ?? '').trim();

  if (nombre === '' || email === '' || telefono === '') {
    return json({ ok: false, error: 'Escribe tu nombre, tu correo y tu teléfono.' }, 400);
  }

  if (nombre.length > MAXIMO_CARACTERES_NOMBRE) {
    return json(
      { ok: false, error: `El nombre puede tener hasta ${MAXIMO_CARACTERES_NOMBRE} caracteres.` },
      400,
    );
  }

  if (!correoValido(email)) {
    return json({ ok: false, error: MENSAJE_CORREO_INVALIDO }, 400);
  }

  if (!pais) {
    return json({ ok: false, error: 'Elige el país de tu teléfono.' }, 400);
  }

  const problema = problemaTelefono(pais, telefono);
  if (problema) {
    return json({ ok: false, error: `El teléfono ${problema}.` }, 400);
  }

  await consultar(
    `INSERT INTO estudiantes (nombre, email, pais, telefono)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       nombre         = EXCLUDED.nombre,
       pais           = EXCLUDED.pais,
       telefono       = EXCLUDED.telefono,
       actualizado_en = NOW()`,
    [nombre, email, pais.iso, componerE164(pais, telefono)],
  );

  return json({ ok: true });
}
