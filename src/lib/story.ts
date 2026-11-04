/**
 * Where the About page's scroll story is. Each chapter section writes its index, how far through it you are, and
 * where its top edge sits on screen (a fraction of the screen height); the 3D scene reads this every frame to pick
 * the particle portrait's shape, and on phones to keep it in the space above the current chapter's heading.
 */
export const story = { chapter: 0, local: 0, top: 0 }

export function resetStory() {
  story.chapter = 0
  story.local = 0
  story.top = 0
}
