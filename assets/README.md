# Assets de marca

Este directorio necesita dos ficheros que **no están en el repositorio**:

- `logo.png`  — logo E.Leclerc, 160×160, RGBA
- `icon.png`  — icono E.Leclerc, 120×120, RGBA

Son los dos que van en `logoURL` e `iconURL` de la llamada a walletwallet.dev,
allí como data URI. `lib/brand.ts` los lee de aquí en tiempo de arranque y los
convierte a data URI, de modo que no haya base64 gigante en el código fuente.

## Cómo obtenerlos

Están embebidos como `data:image/png;base64,...` en el curl original del
proyecto. Para extraerlos:

```bash
# pega solo la parte que va después de "base64," entre las comillas
echo 'iVBORw0KGgoAAAANSUhEUgAAAKAAAA...' | base64 -d > assets/logo.png
echo 'iVBORw0KGgoAAAANSUhEUgAAAHgAAA...' | base64 -d > assets/icon.png
```

Verifica que son correctos antes de seguir:

```bash
file assets/logo.png assets/icon.png   # debe decir "PNG image data, 160 x 160" y "120 x 120"
ls -l assets/*.png                     # varios KB cada uno, no unos pocos cientos de bytes
```

Un fichero de ~200 bytes significa que el base64 se cortó al copiarlo.
