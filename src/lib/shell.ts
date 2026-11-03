import { experience, profile, projects, skills } from '../content'
import routes from './routes.json'

/** One line of terminal output; `href` turns it into a link. */
export type OutLine = { text: string; href?: string; tone?: 'muted' | 'ok' | 'err' }

/** What commands may do to the page around the terminal. */
export type ShellContext = {
  navigate: (path: string) => void
  toggleTheme: () => void
  openProject: (slug: string) => void
  history: () => string[]
}

/** 'clear' asks the terminal to wipe the screen instead of printing. */
export type ShellResult = OutLine[] | 'clear'

type Command = { usage?: string; help?: string; complete?: () => string[]; run: (args: string[], ctx: ShellContext) => ShellResult }

const HELP_PAD = 17
const SLUG_PAD = 22
const SOCIAL_PAD = 11
const PERIOD_PAD = 20
const HISTORY_PAD = 3
const SUDO_REDIRECT_MS = 1400
const HIRE = 'hire hamza'

const say = (text: string, tone?: OutLine['tone']): OutLine => ({ text, tone })
const pages = routes.map((r) => ({ name: r.label.toLowerCase(), path: r.path }))
const HOME_ALIASES = ['~', '/', '..', 'home']

const findProject = (name: string) =>
  projects.items.find((p) => p.slug === name) ?? projects.items.find((p) => p.title.toLowerCase().startsWith(name))

const goTo = (path: string, ctx: ShellContext): OutLine[] => {
  ctx.navigate(path)
  return [say(`→ opening ${path}`, 'muted')]
}

const listProjects = (): OutLine[] => [
  ...projects.items.map((p) => say(`${p.slug.padEnd(SLUG_PAD)}${p.title} · ${p.category}`)),
  say('open <name> shows the full case study.', 'muted'),
]

const commands: Record<string, Command> = {
  help: {
    help: 'show this list',
    run: () => [
      ...Object.entries(commands)
        .filter(([, c]) => c.help)
        .map(([name, c]) => say(`${(c.usage ?? name).padEnd(HELP_PAD)}${c.help}`)),
      say('Tab completes, ↑ ↓ recall earlier commands, Ctrl+L clears.', 'muted'),
    ],
  },
  whoami: {
    help: "who's behind the keyboard",
    run: () => [say(`${profile.name}, ${profile.role}`), say(`${profile.titles.join(' · ')}`, 'muted'), say(`${profile.location} · ${profile.workMode}`, 'muted')],
  },
  skills: {
    help: 'languages, frameworks and tools',
    run: () => [...skills.groups.map((g) => say(`${g.label}: ${g.items.map((s) => s.name).join(', ')}`)), say(`Tools: ${skills.tools.join(', ')}`, 'muted')],
  },
  projects: { help: 'list my projects', run: listProjects },
  open: {
    usage: 'open <project>',
    help: 'case study for one project',
    complete: () => projects.items.map((p) => p.slug),
    run: ([name], ctx) => {
      if (!name) return [say('usage: open <project>   e.g. open cashup', 'err')]
      const project = findProject(name.toLowerCase())
      if (!project) return [say(`open: no project called "${name}". Type projects to list them.`, 'err')]
      ctx.openProject(project.slug)
      return [say(`→ opening ${project.title}`, 'ok')]
    },
  },
  git: {
    usage: 'git log',
    help: "where I've worked",
    complete: () => ['log', 'status'],
    run: ([sub]) => {
      if (sub === 'log') return experience.map((job) => say(`${job.period.padEnd(PERIOD_PAD)}${job.role} @ ${job.org}`))
      if (sub === 'status') return [say('On branch main. Your career is up to date with origin/ambition.'), say('nothing to commit, working tree clean', 'ok')]
      return [say('usage: git log | git status', 'err')]
    },
  },
  contact: {
    help: 'how to reach me',
    run: () => [
      { text: profile.email, href: `mailto:${profile.email}` },
      { text: profile.phone, href: profile.phoneHref },
      say(`${profile.availability.responseTime}. cd contact opens the form.`, 'muted'),
    ],
  },
  socials: {
    help: 'where to find me online',
    run: () => profile.socials.map((s) => ({ text: `${s.label.padEnd(SOCIAL_PAD)}${s.handle}`, href: s.href })),
  },
  cd: {
    usage: 'cd <page>',
    help: `go to a page (${pages.slice(1).map((p) => p.name).join(', ')})`,
    complete: () => pages.map((p) => p.name),
    run: ([target = '~'], ctx) => {
      if (HOME_ALIASES.includes(target)) return goTo('/', ctx)
      const name = target.split('/').filter(Boolean).join('/').toLowerCase()
      const page = pages.find((p) => p.name === name)
      return page ? goTo(page.path, ctx) : [say(`cd: no such page: ${target}`, 'err')]
    },
  },
  theme: {
    help: 'switch light / dark',
    run: (_, ctx) => {
      ctx.toggleTheme()
      return [say('→ theme switched', 'ok')]
    },
  },
  date: {
    help: 'my local time',
    run: () => [
      say(
        `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: profile.timeZoneId }).format(new Date())} in ${profile.location}`,
      ),
    ],
  },
  clear: { help: 'clear the screen', run: () => 'clear' },
  sudo: {
    usage: `sudo ${HIRE}`,
    help: 'you know you want to',
    run: (args, ctx) => {
      if (args.join(' ').toLowerCase() !== HIRE) return [say(`${profile.firstName.toLowerCase()} is not in the sudoers file. This incident will be reported.`, 'err')]
      window.setTimeout(() => ctx.navigate('/contact'), SUDO_REDIRECT_MS)
      return [say(`[sudo] password for recruiter: ••••••••`, 'muted'), say('✓ Access granted. Excellent decision.', 'ok'), say('→ opening the contact form…', 'muted')]
    },
  },
  // Unlisted extras for people who poke around.
  ls: { run: ([dir]) => (dir?.includes('projects') ? listProjects() : [say(`${pages.slice(1).map((p) => `${p.name}/`).join('  ')}  projects/`)]) },
  pwd: { run: () => [say(`/home/${profile.firstName.toLowerCase()}/portfolio`)] },
  echo: { run: (args) => [say(args.join(' '))] },
  history: { run: (_, ctx) => ctx.history().map((cmd, i) => say(`${String(i + 1).padStart(HISTORY_PAD)}  ${cmd}`)) },
  about: { run: (_, ctx) => goTo('/about', ctx) },
  cv: { run: (_, ctx) => goTo('/cv', ctx) },
  resume: { run: (_, ctx) => goTo('/cv', ctx) },
  services: { run: (_, ctx) => goTo('/services', ctx) },
  exit: { run: () => [say('logout? Not yet. Scroll on, or try contact.', 'muted')] },
}

/** Runs one line of input. Unknown commands get a friendly nudge rather than an error dump. */
export function runCommand(input: string, ctx: ShellContext): ShellResult {
  const [name = '', ...args] = input.trim().split(' ').filter(Boolean)
  const command = commands[name.toLowerCase()]
  if (!command) return [say(`command not found: ${name}. Type help to see what works.`, 'err')]
  return command.run(args, ctx)
}

const commonPrefix = (words: string[]) =>
  words.reduce((prefix, word) => {
    const cut = Array.from(prefix).findIndex((ch, i) => word[i] !== ch)
    return cut < 0 ? prefix : prefix.slice(0, cut)
  })

/** Tab completion for command names and their first argument; `options` lists ambiguous matches. */
export function complete(input: string): { value: string; options: string[] } {
  const parts = input.trimStart().split(' ')
  const word = parts[parts.length - 1].toLowerCase()
  const head = parts.slice(0, -1)
  const pool = head.length
    ? (commands[head[0].toLowerCase()]?.complete?.() ?? [])
    : Object.keys(commands).filter((name) => commands[name].help)
  const matches = pool.filter((option) => option.startsWith(word))
  if (!matches.length) return { value: input, options: [] }
  if (matches.length === 1) return { value: [...head, matches[0]].join(' ') + ' ', options: [] }
  return { value: [...head, commonPrefix(matches)].join(' '), options: matches }
}
