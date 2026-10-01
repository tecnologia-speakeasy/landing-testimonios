import { z } from 'zod';

/**
 * Lectura y validación de variables de entorno. SOLO servidor: este módulo
 * nunca debe importarse desde código que se envíe al navegador.
 *
 * Las variables se leen con acceso estático a `import.meta.env` (así las inyecta
 * Vite en dev y en el bundle SSR) con respaldo en `process.env`, que es de donde
 * vienen en Vercel en tiempo de ejecución.
 */
const crudas: Record<string, string | undefined> = {
  PGHOST: import.meta.env.PGHOST ?? process.env.PGHOST,
  PGPORT: import.meta.env.PGPORT ?? process.env.PGPORT,
  PGUSER: import.meta.env.PGUSER ?? process.env.PGUSER,
  PGPASSWORD: import.meta.env.PGPASSWORD ?? process.env.PGPASSWORD,
  PGDATABASE: import.meta.env.PGDATABASE ?? process.env.PGDATABASE,
  PGSCHEMA: import.meta.env.PGSCHEMA ?? process.env.PGSCHEMA,
  PGSSL: import.meta.env.PGSSL ?? process.env.PGSSL,
  PGPOOL_MAX: import.meta.env.PGPOOL_MAX ?? process.env.PGPOOL_MAX,
};

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
  PGPOOL_MAX: z.coerce.number().int().positive().default(3),
});

let cache: z.infer<typeof esquemaDb> | null = null;

/** PostgreSQL: conexión por host. Se valida una sola vez y se cachea. */
export function envDb(): z.infer<typeof esquemaDb> {
  if (cache) return cache;

  // Las vacías se tratan como ausentes para que apliquen los valores por defecto.
  const limpias = Object.fromEntries(
    Object.entries(crudas).filter(([, valor]) => valor !== undefined && valor !== ''),
  );

  const resultado = esquemaDb.safeParse(limpias);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new ErrorConfiguracion(
      `Faltan o son inválidas las variables de entorno de PostgreSQL:\n${detalle}\n` +
        'Revisa tu .env.local (o las variables del proyecto en Vercel) tomando .env.example como referencia.',
    );
  }

  cache = resultado.data;
  return cache;
}
