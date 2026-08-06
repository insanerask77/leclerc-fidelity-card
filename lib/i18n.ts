export const LOCALES = ['ca', 'es', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ca';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export type Dictionary = {
  /** Textos que van dentro del pase de monedero. */
  pass: {
    title: string;
    nameLabel: string;
  };
  /** Textos de la interfaz web. */
  ui: {
    appTitle: string;
    tagline: string;
    scanTitle: string;
    scanHint: string;
    usePhoto: string;
    useManual: string;
    manualLabel: string;
    manualHint: string;
    torch: string;
    nameTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    continue: string;
    back: string;
    generating: string;
    readyTitle: string;
    readySubtitle: string;
    addApple: string;
    addGoogle: string;
    desktopQr: string;
    confirmSuspicious: string;
    confirmYes: string;
    confirmNo: string;
    errorCamera: string;
    errorDecode: string;
    errorNetwork: string;
    errorTooShort: string;
    errorInvalid: string;
    retry: string;
  };
};

const ca: Dictionary = {
  pass: { title: 'Targeta de fidelitat', nameLabel: 'Nom' },
  ui: {
    appTitle: 'Targeta de fidelitat',
    tagline: 'Porta la teva targeta al mòbil',
    scanTitle: 'Escaneja la teva targeta',
    scanHint: 'Enquadra el codi de barres dins del marc',
    usePhoto: 'Fer una foto',
    useManual: 'Introduir el número a mà',
    manualLabel: 'Número de la targeta',
    manualHint: 'És el número imprès sota el codi de barres',
    torch: 'Llanterna',
    nameTitle: 'Com et dius?',
    nameLabel: 'Nom',
    namePlaceholder: 'El teu nom',
    continue: 'Continuar',
    back: 'Enrere',
    generating: 'Creant la targeta…',
    readyTitle: 'Ja la tens!',
    readySubtitle: 'Afegeix-la al moneder del teu mòbil',
    addApple: 'Afegir a Apple Wallet',
    addGoogle: 'Guardar a Google Wallet',
    desktopQr: 'Escaneja aquest codi amb el mòbil per continuar-hi',
    confirmSuspicious: 'El número sembla massa curt. És correcte?',
    confirmYes: 'Sí, és correcte',
    confirmNo: 'No, tornar a escanejar',
    errorCamera: 'No podem accedir a la càmera. Fes una foto o escriu el número.',
    errorDecode: 'No hem pogut llegir el codi. Prova amb més llum o escriu el número.',
    errorNetwork: 'No hem pogut crear la targeta. Torna-ho a provar.',
    errorTooShort: 'El número és massa curt.',
    errorInvalid: 'Aquest número no és vàlid.',
    retry: 'Tornar a provar',
  },
};

const es: Dictionary = {
  pass: { title: 'Tarjeta de fidelización', nameLabel: 'Nombre' },
  ui: {
    appTitle: 'Tarjeta de fidelización',
    tagline: 'Lleva tu tarjeta en el móvil',
    scanTitle: 'Escanea tu tarjeta',
    scanHint: 'Encuadra el código de barras dentro del marco',
    usePhoto: 'Hacer una foto',
    useManual: 'Introducir el número a mano',
    manualLabel: 'Número de la tarjeta',
    manualHint: 'Es el número impreso bajo el código de barras',
    torch: 'Linterna',
    nameTitle: '¿Cómo te llamas?',
    nameLabel: 'Nombre',
    namePlaceholder: 'Tu nombre',
    continue: 'Continuar',
    back: 'Atrás',
    generating: 'Creando la tarjeta…',
    readyTitle: '¡Ya la tienes!',
    readySubtitle: 'Añádela al monedero de tu móvil',
    addApple: 'Añadir a Apple Wallet',
    addGoogle: 'Guardar en Google Wallet',
    desktopQr: 'Escanea este código con el móvil para continuar allí',
    confirmSuspicious: 'El número parece demasiado corto. ¿Es correcto?',
    confirmYes: 'Sí, es correcto',
    confirmNo: 'No, volver a escanear',
    errorCamera: 'No podemos acceder a la cámara. Haz una foto o escribe el número.',
    errorDecode: 'No hemos podido leer el código. Prueba con más luz o escribe el número.',
    errorNetwork: 'No hemos podido crear la tarjeta. Inténtalo de nuevo.',
    errorTooShort: 'El número es demasiado corto.',
    errorInvalid: 'Este número no es válido.',
    retry: 'Volver a intentar',
  },
};

const fr: Dictionary = {
  pass: { title: 'Carte de fidélité', nameLabel: 'Nom' },
  ui: {
    appTitle: 'Carte de fidélité',
    tagline: 'Emportez votre carte sur votre mobile',
    scanTitle: 'Scannez votre carte',
    scanHint: 'Cadrez le code-barres dans le cadre',
    usePhoto: 'Prendre une photo',
    useManual: 'Saisir le numéro manuellement',
    manualLabel: 'Numéro de la carte',
    manualHint: 'C’est le numéro imprimé sous le code-barres',
    torch: 'Lampe',
    nameTitle: 'Comment vous appelez-vous ?',
    nameLabel: 'Nom',
    namePlaceholder: 'Votre nom',
    continue: 'Continuer',
    back: 'Retour',
    generating: 'Création de la carte…',
    readyTitle: 'C’est prêt !',
    readySubtitle: 'Ajoutez-la au portefeuille de votre mobile',
    addApple: 'Ajouter à Apple Wallet',
    addGoogle: 'Enregistrer dans Google Wallet',
    desktopQr: 'Scannez ce code avec votre mobile pour continuer',
    confirmSuspicious: 'Le numéro semble trop court. Est-il correct ?',
    confirmYes: 'Oui, c’est correct',
    confirmNo: 'Non, scanner à nouveau',
    errorCamera: 'Accès à la caméra impossible. Prenez une photo ou saisissez le numéro.',
    errorDecode: 'Code illisible. Essayez avec plus de lumière ou saisissez le numéro.',
    errorNetwork: 'Impossible de créer la carte. Réessayez.',
    errorTooShort: 'Le numéro est trop court.',
    errorInvalid: 'Ce numéro n’est pas valide.',
    retry: 'Réessayer',
  },
};

const en: Dictionary = {
  pass: { title: 'Loyalty card', nameLabel: 'Name' },
  ui: {
    appTitle: 'Loyalty card',
    tagline: 'Carry your card on your phone',
    scanTitle: 'Scan your card',
    scanHint: 'Line the barcode up inside the frame',
    usePhoto: 'Take a photo',
    useManual: 'Enter the number manually',
    manualLabel: 'Card number',
    manualHint: 'It is the number printed under the barcode',
    torch: 'Torch',
    nameTitle: 'What is your name?',
    nameLabel: 'Name',
    namePlaceholder: 'Your name',
    continue: 'Continue',
    back: 'Back',
    generating: 'Creating your card…',
    readyTitle: 'All set!',
    readySubtitle: 'Add it to your phone’s wallet',
    addApple: 'Add to Apple Wallet',
    addGoogle: 'Save to Google Wallet',
    desktopQr: 'Scan this code with your phone to carry on there',
    confirmSuspicious: 'That number looks too short. Is it right?',
    confirmYes: 'Yes, that is right',
    confirmNo: 'No, scan again',
    errorCamera: 'We cannot reach the camera. Take a photo or type the number.',
    errorDecode: 'We could not read the code. Try more light, or type the number.',
    errorNetwork: 'We could not create your card. Please try again.',
    errorTooShort: 'That number is too short.',
    errorInvalid: 'That number is not valid.',
    retry: 'Try again',
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { ca, es, fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
