/**
 * Lo mínimo de la petición que entrega la URL de la Lambda (Function URL,
 * formato 2.0). Ver https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
 */
export interface Evento {
  rawPath: string;
  requestContext: { http: { method: string } };
  body?: string;
  isBase64Encoded?: boolean;
}

export interface Respuesta {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Respuesta JSON. Los permisos de CORS no se ponen aquí: los agrega la URL de
 * la Lambda según su configuración, y repetirlos haría que el navegador
 * rechazara la respuesta.
 */
export function json(datos: unknown, estado = 200): Respuesta {
  return {
    statusCode: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(datos),
  };
}

/** El cuerpo de la petición como JSON; `undefined` si no es JSON válido. */
export function leerJson(evento: Evento): unknown {
  if (!evento.body) return undefined;
  const texto = evento.isBase64Encoded
    ? Buffer.from(evento.body, 'base64').toString('utf8')
    : evento.body;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}
