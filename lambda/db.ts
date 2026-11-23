import pg from 'pg';
import { envDb } from './env';

/**
 * Ejecuta una consulta con una conexión propia que se cierra al terminar.
 *
 * En Lambda no conviene un pool: entre una petición y otra AWS congela la
 * instancia, y las conexiones que quedan abiertas se cortan o se quedan
 * ocupando espacio en la base (que comparten varias landings). Abrir una por
 * envío del formulario cuesta unos milisegundos y no deja nada colgado.
 */
export async function consultar<T extends pg.QueryResultRow = pg.QueryResultRow>(
  texto: string,
  valores: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const env = envDb();

  const cliente = new pg.Client({
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    // La tabla vive en su propio esquema (`testimonios`), separada de las de
    // los otros proyectos que comparten la base. Así las consultas no llevan el
    // prefijo a cuestas.
    options: `-c search_path=${env.PGSCHEMA},public`,
    // Los proveedores gestionados y los servidores propios con certificado
    // autofirmado no pasan la validación por defecto de Node.
    ssl: env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10_000,
  });

  // Sin este listener, un error de red en la conexión tumba la instancia.
  cliente.on('error', (error) => {
    console.error('[db] error en la conexión:', error);
  });

  await cliente.connect();
  try {
    return await cliente.query<T>(texto, valores as unknown[]);
  } finally {
    await cliente.end().catch(() => {});
  }
}
