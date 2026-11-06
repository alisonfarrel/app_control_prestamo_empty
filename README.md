# Mi Capital v1.7 - edición limpia para publicación

Aplicación PWA de gestión financiera local: préstamos con sistema francés y participación configurable, registro de cuotas y amortizaciones favoritas, bancos remunerados por tramos, optimización del ahorro, comparación de rentabilidad con o sin estimación de impuestos y descarga local de PDF de cada préstamo.

## Privacidad y arranque

- **No contiene préstamos, bancos, saldos, cuotas, nombres de titulares ni datos financieros precargados.**
- Una instalación nueva comienza con listas de préstamos y bancos vacías. Los valores de los formularios son plantillas genéricas, no datos personales.
- Los datos añadidos por el usuario se almacenan en IndexedDB en el navegador, no en GitHub.
- La generación del PDF es local, mediante el botón **Descargar PDF** de cada préstamo.
- Antes de actualizar o borrar datos, exportar una copia desde Ajustes.
- Si usas la misma URL/origen que una instalación anterior, **los datos locales anteriores continuarán apareciendo**: la nueva versión no borra IndexedDB. Para empezar desde cero, usa Ajustes > Borrar todos mis datos, tras guardar copia si la necesitas.

## Publicación pública segura

1. No hagas público un repositorio con versiones antiguas que contenían datos reales: **Git conserva el historial**.
2. Crea un repositorio **nuevo y vacío** para esta versión. No copies el directorio `.git` anterior.
3. Sube solo los archivos y carpetas de este ZIP y comprueba que no has añadido copias JSON, documentos hipotecarios, recibos ni otros datos privados.
4. Activa GitHub Pages desde la rama `main`, carpeta `/ (root)`. Abre su URL en Safari y selecciona Compartir > Añadir a pantalla de inicio.
5. GitHub Pages publica el código; la URL de la aplicación será accesible públicamente. No es un sistema de autenticación.

## Desarrollo local

Dentro de la carpeta descomprimida: `py -m http.server 8000` y abrir `http://localhost:8000`.
Pruebas: `node --test tests/*.test.mjs`.

No se incluye ningún expediente hipotecario ni PDF de ejemplo con importes reales.
