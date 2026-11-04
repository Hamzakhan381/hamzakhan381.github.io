import { education, home, profile } from '../content'
import type { CodeLine, Token } from '../components/CodeWindow'

const STACK_IN_CODE = 4

const str = (value: string): Token => ({ text: `'${value}'`, kind: 'str' })
const field = (key: string, value: Token[]): CodeLine => [{ text: '  ' }, { text: key, kind: 'key' }, { text: ': ' }, ...value, { text: ',' }]
const list = (values: string[]): Token[] => [
  { text: '[' },
  ...values.flatMap((v, i) => (i ? [{ text: ', ' }, str(v)] : [str(v)])),
  { text: ']' },
]

const name = profile.firstName.toLowerCase()
const school = education[0]

/** File name the profile code is shown under, e.g. "hamza.ts". */
export const profileFile = `${name}.ts`

/** The profile as a TypeScript object: shown in the About page's editor and on the Home page's laptop screen. */
export const profileCode: CodeLine[] = [
  [{ text: `// ${profileFile}`, kind: 'com' }],
  [{ text: 'import', kind: 'kw' }, { text: ' type ' }, { text: '{ Engineer }', kind: 'type' }, { text: ' from ' }, str('./humans')],
  [],
  [{ text: 'export const', kind: 'kw' }, { text: ` ${name}` }, { text: ': ' }, { text: 'Engineer', kind: 'type' }, { text: ' = {' }],
  field('name', [str(profile.name)]),
  field('role', [str(profile.role)]),
  field('based', [str(profile.location)]),
  ...(school ? [field('studying', [str(`${school.degree} @ ${school.school}`)])] : []),
  field('focus', list(profile.titles)),
  field('stack', list(home.stack.slice(0, STACK_IN_CODE))),
  field('openToWork', [{ text: String(profile.availability.open), kind: 'bool' }]),
  [{ text: '}' }],
]
