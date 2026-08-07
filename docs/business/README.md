# Comercial

Lo que rodea a la venta del producto, no a su construcción. La parte técnica
vive en `docs/superpowers/`.

| Fichero | Qué es |
|---|---|
| `2026-08-07-proposta-comercial.html` | La propuesta que se envía al cliente. Autocontenida: sin CSS, fuentes ni scripts externos. Se abre en el navegador tal cual. |

| `2026-08-07-missatges-contacte.md` | El correo y el mensaje de Instagram que acompañan a la propuesta. |

La propuesta es un único fichero HTML con las dos versiones de idioma dentro y
un selector. Es la **fuente de la verdad**: si cambian los precios, se cambian
aquí y se vuelve a publicar. No hay copia en Markdown a propósito, porque una
copia se desincroniza y acabas enviando el precio viejo.

Publicada como artefacto en:
<https://claude.ai/code/artifact/ae374f80-3acd-4720-9e75-9edb53963966>

Para republicar sobre ese mismo enlace hay que pasar la URL explícitamente; si
no, se crea uno nuevo y el que ya has enviado se queda con el precio viejo.

Dos cosas del fichero que parecen errores y no lo son, no las «arregles»:

- **No tiene `<!DOCTYPE>`, `<html>`, `<head>` ni `<body>`.** El publicador los
  envuelve él. Si se los añades, se duplican.
- **Sí tiene `<meta charset="utf-8">`**, aunque el publicador ya la pone. Está
  para que el fichero abierto en local no destroce los acentos catalanes.

## El cliente

**Activitats Comercials Andorranes, S.A.U.** — la sociedad que opera E.Leclerc
en Andorra.

| | |
|---|---|
| Registro | 5022, Llibre B-I, Foli 181 |
| Domicilio | Av. Meritxell 93, AD500 Andorra la Vella |
| Correo público | `eleclercdiguim@gmail.com` |
| Teléfono | +376 822 377 |
| Instagram | [@eleclercandorra](https://www.instagram.com/eleclercandorra/) |

Cuatro centros: Hiper Andorra (Andorra la Vella), y Express en La Massana,
Sant Julià de Lòria y Escaldes.

No usar `dpdhiper@gmail.com`: es el buzón del delegado de protección de datos,
para ejercer derechos sobre datos personales. Una propuesta comercial ahí es
canal equivocado.

## Precios

Verificados contra el mercado andorrano el 2026-08-07. Sin IGI.

| Modalidad | Importe |
|---|---|
| Piloto, 90 días, un centro | 1.900 € |
| Licencia | 3.200 € + 340 €/mes |
| Compra con código y 3 meses de soporte | 8.500 € |

El razonamiento, por si hay que renegociar: **como «digitalizar la tarjeta»
esto vale poco**, porque la parte difícil —firmar los pases con el certificado
de Apple— está alquilada a walletwallet.dev por 39 $/mes y cualquiera que haga
diligencia lo verá. **Como canal de marketing vale bastante más**, porque un
pase de Wallet empuja avisos a la pantalla de bloqueo sin app y admite hasta
diez geovallas. Ahí está el margen, y es fase 2.

Se abre con el piloto porque es la cifra que no necesita comité, y porque mete
dentro. El objetivo del primer contacto es **una reunión de quince minutos**,
no cerrar precio.

## Lo que sostiene la propuesta

El pase generado se escaneó correctamente en una caja de E.Leclerc el
2026-08-07. Es el argumento central y el único que diferencia esto de una idea.
Detalle en la sección «Riesgo principal» de
`docs/superpowers/specs/2026-08-06-leclerc-fidelity-card-design.md`.

## Lo que está declarado por delante

Dos cosas incómodas que la propuesta dice ella misma, en vez de esperar a que
las descubra el cliente:

1. **El certificado de Apple no es nuestro.** Lo aporta walletwallet.dev. La
   fase siguiente sería migrar a la cuenta de Apple Developer del cliente.
2. **La demo pública usa su marca sin autorización.** Su nombre, su logotipo y
   sus colores, en `leclerc-fidelity-card.vercel.app`. La propuesta se
   compromete a retirarla el mismo día si lo piden. Hay que poder cumplirlo.

## Pendiente

- [ ] Rellenar nombre y teléfono. Están marcados en la propuesta con la clase
      `.todo` (azul, subrayado discontinuo) y entre corchetes en los mensajes.
- [ ] Compartir el artefacto para obtener enlace público, y pegarlo en el hueco
      que los dos mensajes reservan para él.
- [ ] Enviar. El correo está como borrador en Gmail, sin enviar.

## Si esto avanza

Geovallas y notificaciones a la pantalla de bloqueo **no están construidas**.
La propuesta las presenta explícitamente como fase 2 y sin presupuestar. No
prometerlas como hechas.
