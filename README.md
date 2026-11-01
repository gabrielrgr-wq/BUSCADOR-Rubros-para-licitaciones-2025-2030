# 🔎 Buscador de rubros · Licitaciones 2025-2030

Dashboard interactivo para consultar la **Definición de los rubros para licitaciones 2025-2030**
(Intendencia de Canelones · Dirección General de Obras · Oficina Técnica de Canelones, febrero 2025).

Se escribe una palabra (o una frase, o el número de un rubro) y el buscador devuelve:

- la **respuesta más acertada** (el pasaje del documento que mejor responde),
- el **rubro**, su **unidad** y su **grupo**,
- la **referencia** (rubro + página) con enlace directo al PDF en esa página y botón para copiarla,
- otros resultados relacionados, el **texto completo** del rubro y los rubros que menciona.

## Características

- 119 rubros del listado + 3 secciones de especificaciones generales (mezcla asfáltica, hormigones, recaudos gráficos), 77 páginas.
- Búsqueda tolerante a **tildes, mayúsculas y plurales**; entiende sinónimos (caño ↔ alcantarilla, concreto ↔ hormigón, cartel ↔ señal, vereda ↔ acera…).
- Búsqueda por **código**: `103`, `7a`, `OT-12`.
- Preguntas de **pago/medición** (“cuánto se paga el bacheo”) destacan el párrafo de medición y pago.
- Filtros por grupo, unidad y ámbito; pestaña **Catálogo** con todos los rubros.
- Enlaces compartibles: `…/index.html#q=bacheo`.
- Sugerencias mientras se escribe, **temas para explorar** con un toque y búsqueda que baja sola a los resultados (también en celular).
- Diseño responsive (panel de detalle tipo “hoja inferior” en móvil), tema claro/oscuro, accesible por teclado (`Esc` cierra el detalle, flechas navegan las sugerencias).
- **Sin dependencias ni servidor**: HTML + CSS + JS. Funciona incluso abriendo `index.html` directamente.

## Estructura

```
index.html                 Interfaz
buscador-standalone.html   Versión de UN solo archivo (todo incrustado): ábrala desde cualquier visor o envíela por correo
assets/styles.css          Estilos
assets/app.js              Motor de búsqueda (BM25 + sinónimos) e interfaz
data/rubros.js             Datos que carga la página (generado)
data/rubros.json           Mismos datos en JSON (reutilizables)
docs/…2025-2030.pdf        Documento original (destino de los enlaces “Abrir PDF”)
scripts/build_data.py      Regenera data/ a partir del PDF
```

## Publicarlo en GitHub Pages

```bash
git init
git add .
git commit -m "Buscador de rubros licitaciones 2025-2030"
git branch -M main
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

Luego, en GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.**
En un minuto el sitio queda en `https://<usuario>.github.io/<repositorio>/`.

## Actualizar los datos (si cambia el PDF)

Requiere Python 3 y `pdftotext` (`poppler-utils`).

```bash
cp NuevoDocumento.pdf docs/Definicion_de_los_rubros_licitaciones_2025-2030.pdf
python3 scripts/build_data.py   # regenera data/ y buscador-standalone.html
```

> Si el nuevo documento cambia el formato de los títulos, puede ser necesario ajustar las expresiones regulares de `scripts/build_data.py`.

## Notas

- El texto fue extraído automáticamente del PDF. **Ante cualquier duda rige el documento original** (use el botón “Abrir PDF”).
- El rubro **240** (Cabezales prefabricados de hormigón simple según plano) figura en el listado del índice, pero el documento no incluye su definición; el buscador lo indica.
- Los rubros agrupados en el documento (OT-04 a OT-07, OT-12 a OT-14, OT-15 a OT-17, OT-19 a OT-23) comparten el mismo texto.
