# Verde en respuestas correctas + traducciones de Canterville

## 1. Respuesta correcta en verde (quiz)
- Hoy la opción correcta se pinta con un tono menta pálido que casi no se nota.
- Añadir un color "verde éxito" a la paleta (token `success`, con buen contraste) y usarlo:
  - Opción correcta: fondo verde, borde verde más oscuro e icono de check.
  - Caja de mensaje "Correct": fondo verde claro con check.
  - Respuesta equivocada: sigue en rojo suave con icono X; la correcta también se muestra en verde.

## 2. Traducciones de la nueva lectura
- Las 84 tarjetas de "The Canterville Ghost" no tienen ninguna traducción.
- Añadir traducciones al español, chino y polaco para las 84 tarjetas (252 filas), traduciendo el significado de la palabra en su contexto.
- Sin cambios en la estructura de la base de datos; solo datos nuevos.
- Verificar que cada tarjeta tenga los 3 idiomas y probar en el navegador que "Show translation" las muestra.
- Recomendación: que un hablante nativo revise las traducciones.

## Detalles técnicos
- Token `--success` / `--success-foreground` en `src/styles.css`, registrado en `@theme`.
- Cambio solo en la clase `state` y el bloque `role="status"` de la ruta del quiz.
- Inserción en `card_translations (card_id, lang, translation)` para `es`, `zh`, `pl`.
