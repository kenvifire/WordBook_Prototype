# Piloto: solo B1-B2 y audio "Coming soon"

Todos los cambios están en la página de inicio (las pantallas de la app ya usan solo B1 y B2).

## Quitar A1 y A2
- Descripción para buscadores: "from A1 to B2" pasa a "at B1 or B2 level".
- Etiqueta superior: "Stories for A1 – B2 learners" pasa a "Stories for B1 – B2 learners".
- Paso 1: "A1, A2, B1 or B2" pasa a "B1 or B2".
- Sección de niveles: se quitan las tarjetas A1 y A2. El título pasa a "One story. Two levels." y quedan las tarjetas B1 y B2, más anchas (2 columnas).
- Ejemplo "Today's words · A2" pasa a "Today's words · B1".
- Pregunta frecuente: "A1, A2, B1 or B2" pasa a "B1 or B2".

## Audio con "Coming soon"
- Se crea una etiqueta pequeña y reutilizable "Coming soon" (texto guardado en el archivo de textos).
- "Tap a word to hear it." se cambia a "Tap a word to see what it means. Listening is coming soon." con la etiqueta al lado.
- "Listen while you read" lleva la etiqueta "Coming soon" al lado.

## Detalles técnicos
- Nuevo `ComingSoonBadge` en `src/components/wb/badge.tsx` (usa tokens existentes, por ejemplo bg-mint text-ink).
- `copy.common.comingSoon = "Coming soon"` en `src/content/copy.ts`; se corrige el comentario "(A2-B1)" que no se muestra (se deja, es nivel del texto, no de usuario).
- Solo se edita `src/routes/index.tsx`, `badge.tsx` y `copy.ts`.
