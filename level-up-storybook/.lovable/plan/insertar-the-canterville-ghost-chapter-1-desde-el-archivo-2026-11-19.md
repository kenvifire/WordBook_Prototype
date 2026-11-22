# Insertar "The Canterville Ghost (Chapter 1)" desde el archivo

Única fuente: canterville_ch1_seed.json. No se reescribe ningún texto. No se cambia la base de datos.

## Qué se borra
- La historia de prueba **Alice in Wonderland** (id `alice`): sus 2 niveles, 6 partes, 120 tarjetas, sus traducciones (español, chino, polaco) y los datos de los alumnos que apuntan a ella (progreso de tarjetas, intentos del quiz y puertas por parte).
- Sherlock Holmes y The Jumping Frog no se tocan.

## Qué se inserta
- **stories** (1): id `canterville`, title, author, genre `funny`, blurb, source, license, pd_us, pd_mx, verified_by (vacío), content_note.
- **story_versions** (2): `canterville-B1` y `canterville-B2`, status `approved` (solo para pruebas), prompt_version `manual-fixture-v1`, reviewer vacío, change_log.
- **sections** (4): `canterville-B1-s1`, `-s2`, `canterville-B2-s1`, `-s2`, con position, text y grammar_tags (vacíos).
- **cards** (84): 20 + 20 (B1) y 22 + 22 (B2), con lemma, sense, definition, example. ids `canterville-B1-s1-c1`, etc., en el orden del archivo.
- Se ignoran: plot_beats, flags y _readme.

## Cosas que no encajan (decide tú)
1. **Número de partes:** el archivo tiene 2 partes por nivel (4 en total), no 4 por nivel. Encaja con tu "4 sections". Confírmalo.
2. **Qué historia sustituir:** asumo Alice (la primera historia sembrada). Si querías sustituir The Jumping Frog (también de humor), dímelo.
3. **Ids:** el archivo no trae ids. Los creo siguiendo el patrón actual (arriba).
4. **Título de las partes:** el archivo no trae título; la columna se queda vacía y la página de la historia mostrará solo "Part 1", "Part 2".
5. **confidence:** en el archivo es el texto `"draft"`, pero la columna espera un número. Propuesta: dejarla vacía.
6. **change_log:** en el archivo es una lista de 8 (B1) y 6 (B2) cambios; la columna es texto. Propuesta: guardar la lista tal cual como texto JSON, sin cambiar palabras.
7. **translation:** todas vacías. Las tarjetas de Canterville no tendrán traducciones (no hay español, chino ni polaco).
8. **pd_mx:** el archivo dice `true`, pero su propia licencia dice "Mexico: pending counsel check". Lo inserto como `true` porque es lo que dice el archivo; avísame si prefieres `false`.
9. **Tiempo de lectura:** el campo minutes no viene en el archivo; se deja vacío (la app ya lo calcula con 120 palabras por minuto: unos 10 min en B1 y 11 en B2).

## Cómo se ejecuta
Una sola operación de datos con un script generado a partir del archivo (los textos se copian byte a byte), y después compruebo los recuentos: 1 / 2 / 4 / 84.
