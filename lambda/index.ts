import { json, leerJson, type Evento, type Respuesta } from './http';
import { registrarEstudiante } from './testimonios';

/**
 * API de las landings de Speak Easy, publicada como Lambda (`api-landings`)
 * con su URL pública (Function URL). Las páginas son estáticas y le envían
 * los formularios.
 *
 * Cada ruta es "MÉTODO /landing/accion". Para sumar otra landing se agrega su
 * ruta aquí y su archivo al lado de `testimonios.ts`.
 *
 * Los permisos de CORS (qué dominios pueden llamarla) se configuran en la URL
 * de la Lambda, no en este código.
 */
const RUTAS: Record<string, (cuerpo: unknown) => Promise<Respuesta>> = {
  'POST /testimonios/estudiante': registrarEstudiante,
};

export async function handler(evento: Evento): Promise<Respuesta> {
  const ruta = RUTAS[`${evento.requestContext.http.method} ${evento.rawPath}`];
  if (!ruta) {
    return json({ ok: false, error: 'Ruta no encontrada.' }, 404);
  }

  const cuerpo = leerJson(evento);
  if (cuerpo === undefined) {
    return json({ ok: false, error: 'Petición inválida.' }, 400);
  }

  // Cualquier error inesperado (configuración inválida, caída de la base) se
  // registra en CloudWatch y se responde en JSON, que es lo que espera el formulario.
  try {
    return await ruta(cuerpo);
  } catch (error) {
    console.error(`[${evento.rawPath}] error no controlado:`, error);
    return json(
      { ok: false, error: 'No pudimos guardar tus datos. Inténtalo de nuevo en un momento.' },
      500,
    );
  }
}
