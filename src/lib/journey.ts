/**
 * Where the Home page's scroll journey is. The page's scroll triggers write it and the 3D code portal reads it
 * every frame, the same way scrollState carries scroll and pointer data to the scene.
 *
 * - `dive`: 0→1 while you scroll from the intro into the laptop screen (the camera flies into the portal).
 * - `finale`: 0→1 as the closing "let's build" section arrives (the portal gathers again behind it).
 */
export const journey = { dive: 0, finale: 0 }

export function resetJourney() {
  journey.dive = 0
  journey.finale = 0
}
