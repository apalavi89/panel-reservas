# Panel de Reservas

## Arrancar
1. Node.js 20.6 o superior.
2. `npm install`
3. `npm run dev` y abre http://localhost:8080

Sin claves verás reservas de ejemplo.

## Conectar tu Google Sheets (cuenta de servicio)
1. Entra en https://console.cloud.google.com y crea un proyecto.
2. "APIs y servicios" > "Biblioteca" > activa **Google Sheets API**.
3. "APIs y servicios" > "Credenciales" > "Crear credenciales" > **Cuenta de servicio**. Ponle un nombre y termina.
4. Abre la cuenta creada > pestaña "Claves" > "Agregar clave" > **JSON**. Se descarga un archivo.
5. En tu hoja de Google Sheets pulsa **Compartir** y añade el `client_email` del JSON como **Lector**.
6. Abre `.env` y copia:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = el `client_email`
   - `GOOGLE_PRIVATE_KEY` = el `private_key` (entre comillas, tal cual)
7. Para el servidor (Ctrl+C) y vuelve a lanzar `npm run dev`.

No subas el archivo `.env` a ningún sitio: contiene tu clave.
