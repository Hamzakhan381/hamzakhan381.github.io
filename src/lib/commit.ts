const HASH_LENGTH = 7
const HASH_SEED = 7
const HASH_MULTIPLIER = 31
const HEX = 16

/** Short, stable pseudo commit hash for decoration, derived from the text. */
export const fakeHash = (text: string) =>
  Array.from(text)
    .reduce((h, ch) => (h * HASH_MULTIPLIER + ch.charCodeAt(0)) >>> 0, HASH_SEED)
    .toString(HEX)
    .padStart(HASH_LENGTH, '0')
    .slice(0, HASH_LENGTH)

/** Branch-style slug: "SPS, Inc." → "sps-inc". */
export const branchSlug = (text: string) => text.toLowerCase().split(' ').filter(Boolean).join('-').replaceAll(',', '').replaceAll('.', '')
