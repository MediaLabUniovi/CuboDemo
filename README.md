# CuboDemo

Aplicación web en tiempo real que muestra imágenes de forma dinámica en función de mensajes recibidos desde dispositivos externos, sin necesidad de recargar la página.

## ¿Cómo funciona?

Un dispositivo externo (sensor, aplicación PHP, etc.) envía un `POST` a la API con el nombre de la imagen y, opcionalmente, la MAC del dispositivo. La pantalla que tiene CuboDemo abierta actualiza la imagen automáticamente en menos de un segundo.

```
Sensor / PHP  →  POST /api/update  →  Redis (Vercel KV)
                                           ↓
                          Browser polling cada 800ms
                                           ↓
                              Imagen actualizada ✓
```

## API

### Actualizar imagen

```http
POST /api/update
Content-Type: application/json

{
  "image": "e3.png",
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

El campo `mac` es opcional. La imagen debe existir en la carpeta `public/`.

### Consultar estado actual

```http
GET /api/state
```

Devuelve el estado actual, la lista de MACs vistas y sus aliases.

## Interfaz

- **Panel izquierdo (2/3):** imagen activa en pantalla completa.
- **Panel derecho (1/3):** historial de cambios con miniatura, alias del dispositivo y hora.
- **Menú ≡ (esquina superior derecha):** gestión de dispositivos.

### Gestión de dispositivos (MACs)

- **Política por defecto:** permite bloquear o permitir todos los dispositivos de entrada con un solo botón.
- **Excepciones por dispositivo:** cada MAC tiene un checkbox para invertir la política por defecto.
- **Alias:** cada dispositivo puede tener un nombre descriptivo, guardado en Redis y visible desde cualquier navegador.
- **Añadir MAC manual:** permite pre-configurar un dispositivo antes de que envíe su primer mensaje.
- **Eliminar:** borra el dispositivo y su alias del servidor.

## Despliegue en Vercel

### 1. Variables de entorno necesarias

| Variable | Descripción |
|---|---|
| `KV_REST_API_URL` | URL de la base de datos Vercel KV (Upstash) |
| `KV_REST_API_TOKEN` | Token de la base de datos |
| `AUTH_PASSWORD` | Contraseña para acceder a la app |
| `AUTH_SECRET` | String aleatorio para firmar la cookie de sesión |

### 2. Base de datos

Crear una base de datos **KV (Upstash Redis)** en Vercel → Storage y vincularla al proyecto. Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` se añaden automáticamente.

### 3. Imágenes

Colocar las imágenes en la carpeta `public/` con el nombre que se enviará en el campo `image` del POST.

## Desarrollo local

```bash
cp .env.local.example .env.local
# Rellenar las variables con los valores de Vercel KV
npm install
npm run dev
```

Sin las variables de entorno configuradas, la app funciona con estado en memoria (se pierde al reiniciar el servidor).

## Integración con PHP

```php
$cubo_url = "https://tu-app.vercel.app/api/update";
$cubo_data = json_encode([
    'image' => 'e' . $emocion . '.png',
    'mac'   => $mac_sensor,
]);
$cubo_ctx = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $cubo_data,
        'timeout' => 3,
    ]
]);
@file_get_contents($cubo_url, false, $cubo_ctx);
```

## Stack

- [Next.js 15](https://nextjs.org/) — framework React con App Router
- [Vercel KV](https://vercel.com/storage/kv) (Upstash Redis) — estado compartido entre instancias serverless
- [Vercel](https://vercel.com/) — despliegue y hosting
