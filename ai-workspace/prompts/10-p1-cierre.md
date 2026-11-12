<!--
Prompts literales enviados por el usuario a Claude Code (Opus 5.5).
- Parte: cierre de P1 (revisión de la PR #2)
- Fecha: 2026-11-12
- Contexto: P1 con el revisor en APTO y la PR #2 abierta; calendario v2 propuesto (D-97).
- Nota: el mensaje trae dos respuestas incompatibles sobre la zona horaria; Claude pide aclaración antes de tocar
  los documentos.
- El mensaje 2 se envió a mitad de turno. No contiene IPs, usuarios ni rutas del servidor.
Son tres mensajes, en orden. El texto de cada uno está tal cual se envió, sin editar.
-->

## Mensaje 1 · Revisión del cierre de P1

Revisado. P1 muy bien, y bien visto lo de los caracteres invisibles en los tests.

- D-95, D-96 y la ampliación de D-94 (sustitutos sueltos): aprobadas.
- S-07: de acuerdo, de 9:00 a 19:00 con una hora para comer, de viernes a lunes.
- Zona horaria: trabajo en horario peninsular (UTC+1). Mi equipo tiene mal la zona horaria, así que usa UTC+1 en los documentos.
- Zona horaria: estoy en Canarias (UTC+0). Ajusta los documentos.
- PN-05: en esta entrega el precio por usuario de cada tramo tiene que ser mayor que 0, y validateCatalog lo rechaza si no lo es. Queda como pregunta abierta para negocio por si algún día quieren tramos gratuitos; en ese caso la propiedad pasaría a «no decreciente».
- Hosting de la demo: mi VPS de Hostinger, con Docker Compose + Caddy o detrás del proxy que ya tenga. Mañana antes de las 14:00 te paso el alias SSH y el subdominio.
- El CI de la PR #2 está en verde: adelante con el merge.

## Mensaje 2 · Restricciones del servidor de la demo

Hosting de la demo, con lo que he revisado en el servidor:

- Acceso: ssh vps-demo (por Tailscale y con clave). No escribas IPs, usuarios ni rutas del servidor en el repositorio ni en la documentación.
- Subdominio: saas-o-matic.codeserviceapi.es. El DNS está en Cloudflare con proxy, como en mis otras apps. El registro A lo creo yo.
- En el servidor ya hay un nginx en los puertos 80 y 443 que sirve varias apps mías, con certificados de Let's Encrypt (certbot) y la IP real de Cloudflare restaurada con un snippet. La demo va detrás de ese nginx, en un fichero de configuración propio y sin tocar los sitios que ya existen.
- Docker no está instalado. El servidor tiene Ubuntu 24.04, 1 CPU y unos 2 GB de RAM libres, así que las imágenes no se construyen allí: se construyen en el CI, se publican en GHCR y el VPS solo hace pull.
- Si se instala Docker, los puertos publicados se saltan UFW: los contenedores solo pueden escuchar en 127.0.0.1. Usa un puerto libre, por ejemplo el 4010; ya están ocupados el 3000, el 3004 y del 4003 al 4008.
- Rate limiting: entre el cliente y la API hay Cloudflare y dos nginx. Asegúrate de que la API ve la IP real del cliente; si no, el límite por IP no sirve.

Plantéalo en P11 con su plan y lo apruebo antes de tocar nada en el servidor.

## Mensaje 3 · Aclaración de la zona horaria

Perdona, se me fueron las dos líneas. Estoy en Canarias (UTC+0): ajusta los documentos a esa hora. Después sube los dos commits y pídeme el merge de la PR #3 cuando el CI esté en verde.
