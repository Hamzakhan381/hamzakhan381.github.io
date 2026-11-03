export const HALF = 0.5
export const DOUBLE = 2
export const TAU = Math.PI * DOUBLE
export const HALF_PI = Math.PI * HALF
export const MS_PER_SECOND = 1000
export const DECIMAL_RADIX = 10

export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 0 at the edges, 1 when `x` sits exactly on `centre`, falling off linearly over `width`. */
export const peak = (x: number, centre: number, width: number) => clamp(1 - Math.abs(x - centre) / width, 0, 1)
