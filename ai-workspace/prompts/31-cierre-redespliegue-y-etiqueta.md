# 31 · Cierre tras el rediseño: conversaciones, redespliegue y etiqueta

Prompt literal (2026-11-15), en la misma sesión que el 30, después de fusionar la PR #25.

## Mensaje 1

La PR #25 está fusionada y el CI de main y Pages están en verde. Sigue con el cierre, en este orden:

1) Añade a ai-workspace/conversaciones/ esta conversación y la de la sesión de cierre (conversaciones y README), con scripts/conversaciones y el fichero privado, con la autocomprobación y el test de privacidad en verde. PR pequeña; el merge me lo pides con el CI en verde.

2) Después de ese merge, propónme volver a desplegar la demo con la imagen de ese commit (08-despliegue §4.4). Tienes mi aprobación para hacerlo cuando me enseñes los comandos: pull y up -d --wait --force-recreate, sin tocar nada más del servidor. Después, compruébala en vivo: el aviso, las tres vistas a 1280 y 360 px y la consola sin errores.

3) Por último, recoloca v1.0.0 sobre ese mismo commit y actualiza la release con las cifras vigentes. Pídeme confirmación antes de borrar la etiqueta.
