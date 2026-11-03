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

export type Layer = { name: string; tagline: string; text: string; tech: string[] }
export type TerminalStep = { cmd: string; out: string[] }
export type Stat = { value: number; suffix: string; label: string }
export type Testimonial = { quote: string; name: string; role: string }

export type Home = {
  hero: Hero
  marquee: string[]
  layers: SectionHead & { accent: string; items: Layer[] }
  terminal: SectionHead & { host: string; session: TerminalStep[] }
  featured: SectionHead & { slugs: string[] }
  stackSphere: SectionHead & { lead: string }
  stats: Stat[]
  testimonials: Testimonial[]
}

export type Certification = { name: string; issuer: string; date: string; href?: string }

export type About = {
  hero: Hero
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

export type Projects = { hero: Hero; categories: string[]; items: Project[] }
export type Contact = {
  hero: Hero
  formTitle: string
  subjects: string[]
  messageLimit: number
  sent: { title: string; text: string }
  /** Lines for the 3D developer on the contact page: speech bubbles and the floating terminal. */
  desk: { hello: string; typing: string; sent: string; status: string[]; sentStatus: string }
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
