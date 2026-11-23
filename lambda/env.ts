import { z } from 'zod';

/**
 * Variables de entorno de la Lambda (Configuration → Environment variables en
 * la consola de AWS). Para probar en local se toman de `.env.local`.
 */

/** Error de configuración; se distingue de los errores de negocio. */
export class ErrorConfiguracion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConfiguracion';
  }
}

const esquemaDb = z.object({
  PGHOST: z.string().min(1, 'Falta PGHOST'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().min(1, 'Falta PGUSER'),
  PGPASSWORD: z.string().default(''),
  PGDATABASE: z.string().min(1, 'Falta PGDATABASE'),
  /** Esquema donde vive la tabla de testimonios, aislada del resto de la base. */
  PGSCHEMA: z
    .string()
    .regex(/^[a-z_][a-z0-9_]*$/i, 'PGSCHEMA solo admite letras, números y guiones bajos')
    .default('testimonios'),
  PGSSL: z.enum(['require', 'disable']).default('require'),
});

let cache: z.infer<typeof esquemaDb> | null = null;

/** PostgreSQL: conexión por host. Se valida una sola vez y se cachea. */
export function envDb(): z.infer<typeof esquemaDb> {
  if (cache) return cache;

  // Las vacías se tratan como ausentes para que apliquen los valores por defecto.
  const limpias = Object.fromEntries(
    Object.entries(process.env).filter(([, valor]) => valor !== undefined && valor !== ''),
  );

  const resultado = esquemaDb.safeParse(limpias);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new ErrorConfiguracion(
      `Faltan o son inválidas las variables de entorno de PostgreSQL:\n${detalle}\n` +
        'Revisa las variables de la Lambda en la consola de AWS, tomando .env.example como referencia.',
    );
  }

  cache = resultado.data;
  return cache;
}
