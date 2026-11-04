/**
 * Every word on the site comes from the JSON files in this folder. Edit those, not the pages.
 * The types below are checked at build time, so a missing or misspelled field fails `npm run build`
 * instead of silently breaking a page. Sections with an empty list are hidden automatically.
 */
import profileJson from './profile.json'
import homeJson from './home.json'
import aboutJson from './about.json'
import experienceJson from './experience.json'
import educationJson from './education.json'
import skillsJson from './skills.json'
import servicesJson from './services.json'
import projectsJson from './projects.json'
import contactJson from './contact.json'
import cvJson from './cv.json'

export type IconKey = 'code' | 'diagram' | 'design' | 'cloud' | 'database' | 'network' | 'github' | 'linkedin' | 'instagram'

export type Hero = { eyebrow: string; lines: string[]; accentLine: number; lead: string }
export type SectionHead = { eyebrow: string; title: string }
export type Social = { label: string; icon: IconKey; href: string; handle: string }

export type Profile = {
  name: string
  shortName: string
  firstName: string
  initials: string
  role: string
  titles: string[]
  location: string
  timezone: string
  /** IANA zone used for the live local-time clock in the footer, e.g. "Asia/Karachi". */
  timeZoneId: string
  workMode: string
  email: string
  phone: string
  phoneHref: string
  githubUser: string
  availability: { open: boolean; label: string; detail: string; responseTime: string }
  photo: { small: string; large: string; alt: string }
  socials: Social[]
}

export type TerminalStep = { cmd: string; out: string[] }
export type Stat = { value: number; suffix: string; label: string }
export type Testimonial = { quote: string; name: string; role: string }
/** A section heading with an accent phrase after the title, e.g. "git log" + "--career". */
export type AccentHead = SectionHead & { accent: string }

/** The Home page is one scroll journey: intro, about, experience, projects and a closing call to action. */
export type Home = {
  /** The intro: terminal lines in the corner, a one-line pitch and the "scroll to enter" hint. */
  hero: { hud: string[]; lead: string; hint: string }
  /** Main technologies, shown in the profile code on the laptop screen and the About page. */
  stack: string[]
  /** Words in [brackets] light up in the accent colour as the paragraph reveals. */
  about: AccentHead & { text: string }
  /** `welcome` is printed when a visitor clicks into the terminal; the commands live in src/lib/shell.ts. */
  terminal: { welcome: string; host: string; hint: string; session: TerminalStep[] }
  stats: Stat[]
  log: AccentHead & { lead: string }
  featured: AccentHead & { lead: string; slugs: string[] }
  /** The closing section: a big headline and a terminal prompt that leads to the contact page. */
  finale: AccentHead & { prompt: string; cta: string }
  testimonials: Testimonial[]
  /** Speech bubble of the developer in the first-visit intro (the intro itself is drawn in index.html). */
  boot: { hello: string; line: string }
}

export type Certification = { name: string; issuer: string; date: string; href?: string }

/** The words printed on the About page's 3D dev pass, on each of its faces. */
export type PassText = {
  kicker: string
  serial: string
  role: string
  access: string
  available: string
  busy: string
  branch: string
  back: string
  jobKicker: string
  worksAt: string
  workedAt: string
  /** The word in a job's period that marks it as current ("Dec 2025 – Present"). */
  present: string
  studentKicker: string
  studiesAt: string
  stackKicker: string
  stackTitle: string
  /** Counted words under the stack and principles faces' headers ("12 tools", "06 rules"). */
  toolsUnit: string
  rulesUnit: string
  principlesKicker: string
  nowKicker: string
  labels: { role: string; period: string; degree: string }
  github: string
  flipBack: string
}

/**
 * The About page is a scroll story in chapters, beside a 3D dev pass of Hamza's that flips to a new face for each one.
 * `story` holds the intro lines and the headings of the chapters that don't have their own block below.
 */
export type About = {
  story: {
    welcome: string
    name: string
    tagline: string
    status: string
    hint: string
    /** Shown on devices with a mouse, next to the dev pass. */
    interact: string
    pass: PassText
    who: AccentHead & { lead: string }
    experience: AccentHead & { lead: string }
    skills: AccentHead
    outro: AccentHead & { lead: string; cta: string }
  }
  bio: string[]
  highlights: { value: string; label: string }[]
  principles: SectionHead & { items: { title: string; text: string }[] }
  now: SectionHead & { items: { label: string; text: string }[] }
  certifications: Certification[]
}

export type Job = {
  role: string
  org: string
  period: string
  type: string
  summary: string
  highlights: string[]
  stack: string[]
}

export type Education = { school: string; degree: string; period: string; location: string; detail: string; focus: string[] }
export type Skills = { groups: { label: string; items: { name: string; level: number }[] }[]; tools: string[] }

export type Service = {
  id: string
  title: string
  short: string
  icon: IconKey
  summary: string
  deliverables: string[]
  stack: string[]
}

export type Services = {
  hero: Hero
  items: Service[]
  process: SectionHead & { items: { title: string; text: string }[] }
  engagements: SectionHead & { items: { title: string; text: string; points: string[] }[] }
  faq: SectionHead & { items: { q: string; a: string }[] }
}

export type Project = {
  slug: string
  title: string
  subtitle: string
  category: string
  featured: boolean
  summary: string
  highlights: string[]
  stack: string[]
  links: { github?: string; live?: string }
}

/** `ringHint` is added to the hero lead on wide screens, where the live repos sit on a draggable ring. */
export type Projects = {
  hero: Hero
  ringHint: string
  caseStudies: AccentHead
  categories: string[]
  items: Project[]
}
export type Contact = {
  hero: Hero
  formTitle: string
  subjects: string[]
  messageLimit: number
  sent: { title: string; text: string }
  /** Lines for the 3D developer on the contact page: speech bubbles and the floating terminal. */
  desk: { hello: string; typing: string; sent: string; status: string[]; sentStatus: string; quips: string[]; duck: string }
}

export type CV = {
  hero: Hero
  contactLine: string[]
  summary: string
  experience: { org: string; place: string; role: string; period: string; points: string[] }[]
  projects: { name: string; stack: string; kind: string; role: string; points: string[] }[]
  skills: { label: string; items: string[] }[]
  education: { school: string; place: string; degree: string; detail: string }
  quickFacts: { label: string; value: string }[]
}

export const profile: Profile = profileJson as Profile
export const home: Home = homeJson
export const about: About = aboutJson
export const experience: Job[] = experienceJson
export const education: Education[] = educationJson
export const skills: Skills = skillsJson
export const services: Services = servicesJson as Services
export const projects: Projects = projectsJson
export const contact: Contact = contactJson
export const cv: CV = cvJson

export const projectBySlug = (slug: string) => projects.items.find((p) => p.slug === slug)
