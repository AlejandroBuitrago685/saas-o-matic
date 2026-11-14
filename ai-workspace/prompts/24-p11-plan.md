# 24 · Plan de P11 (demo pública)

Literal, salvo los fragmentos marcados «[Omitido (D-175): …]»: datos del servidor que no deben quedar en un
repositorio público.

## Mensaje 1

Continuamos con SaaS-O-Matic en una sesión nueva. Antes de empezar, lee CLAUDE.md, ai-workspace/04-plan-implementacion.md y la nota de traspaso de ai-workspace/diario.md. No releas la especificación entera: consulta solo lo que necesites.

Seguimos con P11: la demo pública en mi VPS (D-47, D-99, D-105, D-113, D-130). Acceso con ssh vps-demo. Antes de planificar, inspecciona el servidor solo en modo lectura; no cambies nada hasta que apruebe el plan. Recordatorios:
- en el servidor ya hay un nginx con varias apps mías en producción: no toques sus sitios; la demo va en su propio fichero de configuración, con el include explícito del snippet de Cloudflare;
- el subdominio saas-o-matic.codeserviceapi.es ya apunta al VPS por Cloudflare (proxy activo); el certificado, con certbot, como el resto de sitios;
- Docker no está instalado; las imágenes se construyen en el CI, se publican en GHCR y el VPS solo hace pull;
- contenedores escuchando solo en 127.0.0.1:4010, TRUST_PROXY=loopback,172.30.0.1,172.30.0.10;
- DEMO_MODE con datos ficticios, aviso visible y reinicio diario;
- nunca escribas IPs, usuarios ni rutas del servidor en el repositorio.

Estoy en modo plan: preséntame el plan de P11.

## Mensaje 2 (respuestas a las preguntas del plan, en la interfaz)

- Certificado: «Reabrir el puerto 80».
- GHCR: «Paquetes públicos».
- Aviso de demo: «Arriba, sin cerrar».
- Docker: «Ubuntu».

## Mensaje 3

El aviso de que el puerto 80 ya estaba abierto y la petición de arreglar antes el e2e inestable de AC-91 están en
[`23-arreglo-e2e-ac91.md`](23-arreglo-e2e-ac91.md).

## Mensaje 4

(Aprobación del plan en la interfaz de modo plan, sin texto.)

## Mensaje 5

Plan aprobado. Apruebo D-169 a D-173. Puedes añadir el check demo a los obligatorios de main tras su primer verde.

[Omitido (D-175): una actualización sobre los certificados de otros sitios del servidor. No deja nada pendiente.]

[Omitido (D-175): dos recomendaciones de seguridad sobre el servidor.] … lo dejo para después de la entrega: anótalo en el diario como recomendación, fuera del alcance de la prueba.

## Mensaje 6

Acabo de fusionar la PR.

## Mensaje 7

I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.
