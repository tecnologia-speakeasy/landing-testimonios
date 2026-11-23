// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // La landing es 100 % estática: el build deja en dist/ el HTML, el CSS y las
  // imágenes, y Amplify los sirve tal cual. El formulario se guarda a través de
  // la API de las landings, que es una Lambda aparte (carpeta lambda/).
  output: 'static',
  env: {
    schema: {
      // URL de la Lambda `api-landings`. Queda escrita en la página al compilar;
      // para apuntar a otra se define PUBLIC_API_URL en .env.local o en Amplify.
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        default: 'https://65y2irllblvwk5s7f6gpqxy3mi0bxjzv.lambda-url.us-east-2.on.aws',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
