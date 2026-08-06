# Targeta de fidelitat E.Leclerc — Disseny

Data: 2026-08-06

## Problema

Els clients d'E. Leclerc Andorra porten una targeta de fidelització física. Volem
que puguin passar-la al moneder del mòbil (Apple Wallet / Google Wallet) sense
anar a taulell i sense instal·lar res.

L'usuari aporta tres coses: el seu nom, el codi de barres de la targeta física, i
res més. En surt un pas de moneder afegit al telèfon.

## Abast

Dins d'abast:

- Captura del codi de barres amb càmera, foto o teclat.
- Generació del pas via l'API de walletwallet.dev.
- Lliurament immediat a Apple Wallet i Google Wallet.
- Interfície en català, castellà, francès i anglès.

Fora d'abast (explícitament, per YAGNI):

- Comptes d'usuari, sessions, base de dades.
- Enviament per correu electrònic.
- Panell d'administració, estadístiques, exportacions.
- Actualització o revocació de passos ja emesos.
- Alta de targetes noves (l'usuari ha de tenir ja la targeta física).

## Restriccions descobertes

Verificades contra l'API real el 2026-08-06:

1. `POST https://api.walletwallet.dev/api/passes` retorna
   `{serialNumber, applePass, googleSaveUrl, shareUrl}`. El camp `applePass` és
   el fitxer `.pkpass` **ja signat**, en base64 (~7,4 KB). No cal signar res
   nosaltres, ni cap certificat d'Apple, ni cap base de dades.
2. `barcodeFormat` **només accepta `QR`, `PDF417`, `Aztec` i `Code128`**. No
   accepta `EAN13`. Aquesta és la restricció més important del projecte.
3. L'API demana com a mínim un de `title`, `primaryFields` o `logoText`.
4. `shareUrl` és una pàgina allotjada per walletwallet.dev, en anglès i amb la
   seva marca, que ofereix els dos botons de moneder.

## Risc principal

Si les targetes físiques d'E. Leclerc Andorra són EAN-13 —habitual al comerç—
haurem de reemetre els mateixos dígits com a **Code128**, perquè l'API no admet
EAN-13. La majoria de lectors de caixa retornen la mateixa cadena de dígits amb
totes dues simbologies, però no tots: alguns TPV estan configurats per acceptar
només EAN.

**Aquest risc no es pot tancar des del codi.** Cal validar-lo generant un pas
amb una targeta real i escanejant-lo a una caixa abans de publicar l'app. Si el
TPV el rebutja, l'única sortida és que walletwallet.dev afegeixi EAN-13, o
canviar de proveïdor de passos.

## Arquitectura

Next.js (App Router) desplegat a Vercel. Sense estat: cap dada personal es desa
enlloc, ni al servidor ni al navegador més enllà de la sessió.

```
Navegador                        Servidor (Vercel)          walletwallet.dev
─────────                        ─────────────────          ────────────────
1. Escaneja amb ZXing
   la imatge no surt mai
   del dispositiu
2. POST /api/pass          ──▶   valida entrada
   {name, value, format,          afegeix clau + marca ──▶  crea el pas
    locale}                                            ◀──  {applePass,
                           ◀──   {googleSaveUrl,             googleSaveUrl,
                                  applePass, shareUrl}       shareUrl}
3. Apple: form POST        ──▶   /api/download
   (navegació completa)           retorna binari amb
                                  application/vnd.apple.pkpass
                                  → iOS obre Wallet
   Google: enllaç directe a googleSaveUrl
```

### Per què un `form` POST per a Apple

iOS només obre Wallet si la navegació retorna un cos amb
`Content-Type: application/vnd.apple.pkpass`. Descarregar-lo des d'un `blob:`
al client no és fiable a Safari. Un `<form method="POST">` ocult que envia el
base64 a `/api/download` i provoca una navegació completa sí que ho és, i manté
el sistema sense estat: no cal desar el pas entre peticions.

### Mòduls

| Fitxer | Responsabilitat | Depèn de |
|---|---|---|
| `lib/barcode.ts` | Normalitza el resultat de l'escaneig a `{value, format}` vàlid per a l'API. Mapa EAN-13/EAN-8/UPC/Code39/ITF → `Code128`. Valida longitud i caràcters. **Pur, sense DOM.** | res |
| `lib/pass-payload.ts` | Construeix el cos JSON del pas: marca, colors, camps, idioma. **Pur.** | `lib/brand.ts`, `lib/i18n.ts` |
| `lib/i18n.ts` | Diccionaris ca/es/fr/en per a la interfície i per als camps del pas. | res |
| `lib/brand.ts` | Els dos PNG en base64 (logo i icona) i els colors. **Només servidor.** | res |
| `app/api/pass/route.ts` | Valida l'entrada, crida walletwallet amb la clau de l'entorn, retorna només el necessari. | `lib/pass-payload.ts` |
| `app/api/download/route.ts` | Retorna el `.pkpass` binari amb capçaleres correctes. | res |
| `components/Scanner.tsx` | Càmera en viu, foto i entrada manual. ZXing carregat en diferit. | `lib/barcode.ts` |
| `components/PassPreview.tsx` | Vista prèvia de com quedarà la targeta. | `lib/i18n.ts` |
| `app/[locale]/page.tsx` | Orquestra les tres passes. | tot l'anterior |

Tota la lògica que pot fallar silenciosament viu als dos mòduls purs
(`barcode.ts`, `pass-payload.ts`), que es proven sense navegador ni xarxa.

## Flux d'usuari

Una sola pàgina, tres passes.

**1. Escanejar.** La càmera s'obre de seguida amb un marc guia i botó de
llanterna. En detectar un codi: vibració curta i avanç automàtic. A sota, dos
enllaços discrets: «Fer una foto» i «Introduir el número a mà».

**2. Nom.** Un únic camp de text, màxim 40 caràcters (el que cap a la targeta).
A sota, vista prèvia en viu del pas.

**3. Llest.** Botó «Afegir a Apple Wallet» a iOS, «Guardar a Google Wallet» a
Android, tots dos si no es pot detectar. A escriptori, a més, un QR cap a
`shareUrl` per passar al mòbil.

El selector d'idioma és visible sempre a la capçalera.

## Gestió d'errors

Cap error deixa l'usuari sense sortida.

| Situació | Comportament |
|---|---|
| Permís de càmera denegat | Passa directament a foto/manual, sense missatge alarmant |
| No hi ha càmera (escriptori) | Comença en mode manual |
| 15 s sense detectar res | Suggereix l'entrada manual sense interrompre l'escaneig |
| La foto no es pot descodificar | Reintenta un cop amb escala de grisos i més contrast; si falla, manual |
| Codi sospitós (< 6 caràcters, o caràcters no imprimibles) | Demana confirmació abans de generar |
| L'API falla o no respon | Missatge clar i botó de reintentar; el nom i el codi es conserven |
| `barcodeFormat` no suportat | Ja no pot passar: `lib/barcode.ts` només emet formats vàlids |

## Seguretat i privadesa

- La clau viu a `WALLETWALLET_API_KEY`, només al servidor. Mai s'envia al
  navegador.
- **La clau `ww_live_<REDACTADA>` s'ha compartit per xat i
  s'ha de considerar compromesa. Cal rotar-la abans de publicar.**
- La foto de la targeta no surt mai del dispositiu: es descodifica al navegador.
- No es desa cap nom, ni cap número de targeta, ni cap registre. El servidor és
  un intermediari sense memòria.
- `/api/pass` limita la mida del cos i valida tots els camps abans de reenviar
  res a tercers.

## Proves

- **Unitàries (Vitest)** sobre `lib/barcode.ts`: mapatge de formats, validació
  de longitud, rebuig de caràcters invàlids, casos límit (EAN-13 amb dígit de
  control, cadena buida, espais).
- **Unitàries** sobre `lib/pass-payload.ts`: el cos generat conté sempre un dels
  camps obligatoris de l'API, els quatre idiomes produeixen etiquetes correctes,
  el format sempre és un dels quatre acceptats.
- **Ruta API** amb `fetch` simulat: entrada invàlida → 400; error de tercers →
  502 amb missatge útil; èxit → només els camps esperats.
- **Manual**, abans de publicar: escaneig real a iPhone i a Android, afegir a
  tots dos moneders, i **escanejar el pas resultant a una caixa d'E. Leclerc**
  per tancar el risc de la simbologia.

## Criteris d'èxit

1. Un client amb la targeta física a la mà té el pas al moneder en menys d'un
   minut, sense ajuda.
2. El pas escaneja correctament a la caixa.
3. Cap dada personal queda desada enlloc.
4. Funciona a iOS Safari i a Android Chrome, els dos navegadors que importen.
