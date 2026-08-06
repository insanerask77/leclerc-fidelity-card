# ⚠️ ESTOS ASSETS SON PROVISIONALES

`logo.png` y `icon.png` **NO son la marca de E.Leclerc**. Son placeholders
generados a propósito con un damero magenta y amarillo, para que sea imposible
publicarlos por error creyendo que son el logo bueno.

Existen solo para desbloquear el desarrollo: `lib/brand.ts` los lee del disco,
así que el código y los tests funcionan con ellos y sustituirlos **no requiere
tocar ni una línea de código**.

## Cómo poner los buenos

Los reales están embebidos como `data:image/png;base64,...` en el curl original
del proyecto (campos `logoURL` e `iconURL`). Copia lo que va después de
`base64,` y ejecuta:

```bash
echo 'iVBORw0KGgoAAAANSUhEUgAAAKAAAA...' | base64 -d > assets/logo.png
echo 'iVBORw0KGgoAAAANSUhEUgAAAHgAAA...' | base64 -d > assets/icon.png
```

Comprueba que salieron bien antes de seguir:

```bash
file assets/*.png    # 160x160 y 120x120, PNG RGBA
ls -l assets/*.png   # varios KB cada uno
npm test             # lib/pass-payload.test.ts debe seguir en verde
```

Un fichero de ~200 bytes significa que el base64 se cortó al copiarlo.

## Antes de publicar

Sustituir estos dos ficheros es un **requisito bloqueante**. Está recogido en la
lista de «Antes de publicar» del README.
