# 23 · Arreglo del e2e inestable de AC-91 (antes de P11)

Llegó durante el plan de P11 (prompt 24), después de que Claude inspeccionara el VPS y avisara de que el puerto 80 no
respondía.

## Mensaje 1

El puerto 80 ya está abierto: el fallo era una errata en el cortafuegos de Hostinger (la regla decía 89 en vez de 80). A través de Cloudflare ya responde. Compruébalo tú también antes de emitir el certificado.

Antes de P11: el CI de main está en rojo tras el merge de la PR #15. El e2e de AC-91 (simulator.spec.ts:101, «the slider jumped over 10», recibió 15) pasó en la PR y falló en main con el mismo código, así que es inestable. Casi seguro que se pulsa Inicio antes de que el slider esté listo, ahora que arranca en 15. Arréglalo en una PR aparte: espera a que el slider esté listo y comprueba que tras Inicio vale 1 antes de subir con las flechas. Revisa también si otros e2e suponen el valor inicial. Ejecútalo varias veces seguidas (--repeat-each) para demostrar que ya no falla. Cuando esté fusionado y main en verde, sigue con el plan de P11.

## Mensaje 2

(Aprobación del plan en la interfaz de modo plan, sin texto.)
