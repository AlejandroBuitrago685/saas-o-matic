# ADR-006 · Búsqueda con columna normalizada y `LIKE` con escape

- **Estado:** propuesta (D-59) · **Fecha:** 2026-11-12

## Contexto

La búsqueda debe ser parcial y no distinguir mayúsculas ni acentos (D-27; AC-29 exige que `fonía` encuentre
«Telefonía»). El `LIKE` de SQLite solo ignora mayúsculas en ASCII y el driver no trae ICU (RT-08). Los comodines
tienen que tratarse como literales (AC-31).

## Decisión

- Columna `company_name_search`, calculada al dar de alta con `normalizeForSearch` de `domain` (NFD, sin marcas
  diacríticas, en minúsculas).
- La consulta normaliza `q` con la misma función y busca con `LIKE '%…%' ESCAPE '!'`, escapando `!`, `%` y `_`.
- El identificador fiscal se busca normalizado sobre `tax_id`.
- Índice `(company_name_search, id)` para el listado ordenado sin búsqueda.

## Alternativas

- **FTS5 con tokenizador `trigram`:** encuentra subcadenas con índice, pero hay que mantener una tabla virtual
  sincronizada con triggers. Con el volumen medido (8,5 ms con 100 000 clientes) no compensa. Queda como evolución.
- **Función SQL propia** registrada en el driver (`db.function`): normaliza en cada consulta sin guardar una columna
  extra, pero obliga a escanear y aplicar la función a cada fila, y ata el esquema al driver.
- **Extensión ICU:** no viene con el driver; complica la instalación (RT-06).

## Consecuencias

- La misma función normaliza al guardar y al buscar, así que no hay discrepancias entre ambos.
- La búsqueda con texto siempre escanea la tabla: medido y aceptable a esta escala ([`../04-base-de-datos.md`](../04-base-de-datos.md) §3).
- «Ñ» se busca y se ordena como «N».
