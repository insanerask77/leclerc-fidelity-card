import type { NormalizedBarcode } from './barcode';
import { type Locale, getDictionary } from './i18n';
import {
  BRAND_COLOR,
  COLOR_PRESET,
  ORG_NAME,
  LOGO_TEXT,
  logoDataUri,
  iconDataUri,
  stripDataUri,
} from './brand';

/** Lo que cabe en el campo secundario del pase sin que se corte visualmente. */
export const MAX_NAME_LENGTH = 40;

export type PassInput = {
  name: string;
  barcode: NormalizedBarcode;
  locale: Locale;
};

export function buildPassPayload(input: PassInput): Record<string, unknown> {
  const dict = getDictionary(input.locale);
  const name = input.name.trim().slice(0, MAX_NAME_LENGTH);

  return {
    barcodeValue: input.barcode.value,
    barcodeFormat: input.barcode.format,
    logoText: LOGO_TEXT,
    organizationName: ORG_NAME,
    colorPreset: COLOR_PRESET,
    color: BRAND_COLOR,
    logoURL: logoDataUri(),
    iconURL: iconDataUri(),
    stripURL: stripDataUri(),
    primaryFields: [{ value: dict.pass.title }],
    secondaryFields: [{ label: dict.pass.nameLabel, value: name }],
    backFields: [{ label: 'Notifications', value: ' ', changeMessage: '%@' }],
  };
}
