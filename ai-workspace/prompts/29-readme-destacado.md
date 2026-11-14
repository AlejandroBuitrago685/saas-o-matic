# 29 · «Lo más destacable» en el README y la etiqueta de la entrega

Prompt literal de la sesión de cierre (2026-11-14), enviado tras fusionar la PR #23.

## Mensaje 1

Antes de recolocar v1.0.0, un último cambio en una PR pequeña: un bloque «Lo más destacable» en el README, justo después de las capturas, con 6 o 7 líneas de una frase, cada una con su enlace al documento o al fichero que lo demuestra: negocio exacto (céntimos enteros, un redondeo, vectores de prueba), tests (la cifra de la medición vigente del clon limpio, los e2e con Playwright, el 100 % de cobertura obligatoria del dominio y la trazabilidad), CI (11 checks obligatorios, Node 22/24/26, Linux, Windows y macOS, audit), seguridad (OWASP API Top 10 con modelo de amenazas, CSP estricta sin unsafe-inline, límite de peticiones con IP real, RFC 9457, logs sin datos personales, contenedores sin root y de solo lectura), calidad del código (TypeScript estricto, ESLint con límites de tamaño y fronteras entre capas, hooks y revisor), accesibilidad (axe, teclado, 360 px) y despliegue (Docker Compose y demo en un VPS privado tras Cloudflare con las imágenes que probó el CI). Nada que no sea verdad: la cobertura obligatoria es solo la del dominio. Las cifras no se escriben a mano: un test en tools/ comprueba que coinciden con su fuente (la última medición del diario y trace-tests), como hace el recorrido. Ningún detalle del servidor.

Con el CI en verde, pídeme el merge. Después, recoloca v1.0.0 sobre ese merge, con las cifras de la medición vigente en la release y la línea de las conversaciones, pidiéndome confirmación antes de borrar.
