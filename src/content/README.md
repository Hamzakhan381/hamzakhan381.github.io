# Editing the site content

Every word, project, job and link on the site lives in the JSON files in this folder. Edit
these; you never need to touch the page code. Run `npm run build` afterwards: if a field is
missing or misspelled, the build fails and tells you which one.

| File | What it controls |
| --- | --- |
| `profile.json` | Name, role, email, phone, location, availability badge, photo, social links |
| `home.json` | Home hero, tech marquee, the five architecture layers, terminal session, featured project slugs, stats, testimonials |
| `about.json` | About hero, bio paragraphs, highlight numbers, principles, "Right now", certifications |
| `experience.json` | Jobs shown in the git log (newest first); each one also draws a branch in the 3D git graph |
| `education.json` | Degrees and focus areas |
| `skills.json` | Skill bars (`level` is 0–100) and the tools list |
| `services.json` | Services (one rack unit each), process, ways to work together, FAQ |
| `projects.json` | Every project. `featured: true` puts it in the 3D depth gallery; `category` must be one of `categories` |
| `contact.json` | Contact hero, form title and topic chips |
| `cv.json` | Everything on the printable CV page |

Page titles and descriptions for search engines are in `src/lib/routes.json`.

## Things you can add later

- **Testimonials**: add `{ "quote": "...", "name": "...", "role": "..." }` to `testimonials` in `home.json`. The section appears automatically.
- **Certifications**: add `{ "name": "...", "issuer": "...", "date": "...", "href": "https://..." }` to `certifications` in `about.json`.
- **A project**: copy any entry in `projects.json`, give it a unique `slug`, and set `links.github` / `links.live` if it has them.
- **A job or service**: add an entry; the 3D git graph and server rack grow to match.

## Placeholders to check

Some details were written as reasonable defaults and should be confirmed:

- `skills.json` levels (the bar widths).
- `about.json` principles and `services.json` engagements, FAQ and deliverables.
- Company names: `experience.json` says "Arch Technologies" and "SPS, Inc.", while `cv.json` says "Atch Technologies" and "SPSS Technologies". Make them match.
