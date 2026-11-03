export const profile = {
  name: 'Muhammad Hamza Khan',
  short: 'M.HAMZA',
  role: 'Software Engineer · Full-Stack',
  email: 'hamza.best81@gmail.com',
  phone: '+92-333-3317050',
  phoneHref: 'tel:+923333317050',
  location: 'Pakistan · Remote',
  githubUser: 'Hamzakhan381',
  links: {
    github: 'https://github.com/Hamzakhan381',
    linkedin: 'https://www.linkedin.com/in/hamza-khan-674116278/',
    instagram: 'https://www.instagram.com/hamza_khan17050',
    resume: '/resume.html',
  },
}

export const nav = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const

export const stack = ['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', '.NET', 'SQL', 'Tailwind CSS', 'Three.js', 'Docker']

export const about = {
  intro:
    "I'm a Software Engineering student at Air University, Multan, and I love building scalable, high-performance systems. My focus is backend architecture, database design, and full-stack development: turning complex problems into clean, efficient solutions.",
  body:
    'I build structured, secure applications with Python, Node.js, SQL and .NET. From banking management systems to full-stack web platforms, I engineer software that is reliable, optimized, and built for growth.',
  goal: 'My goal is not just to write code, but to design systems that endure, scale, and deliver real-world impact.',
  stats: [
    { value: '3+', label: 'Years building' },
    { value: '3', label: 'Roles held' },
    { value: '6', label: 'Disciplines' },
  ],
}

export const career = [
  {
    role: 'Web Developer',
    org: 'Arch Technologies',
    period: 'Dec 2025 – Present',
    text: 'Designing and delivering scalable web solutions for real clients: modern React and Next.js frontends, optimized backend performance, and measurable growth in client digital presence.',
  },
  {
    role: 'Internship Trainee',
    org: 'SPS, Inc.',
    period: 'Oct 2025 – Jan 2026',
    text: 'Hands-on exposure to enterprise software workflows: structured team sprints, codebase maintenance, and productivity work that bridged academic knowledge and professional engineering.',
  },
  {
    role: 'Founder & Technical Writer',
    org: 'BlogWithHamza',
    period: 'Mar 2025 – Oct 2025',
    text: 'Founded and grew a technical blog that simplifies backend systems, database design, and software architecture, with in-depth guides that earned a loyal readership of engineers.',
  },
]

export type ServiceIcon = 'code' | 'diagram' | 'design' | 'cloud' | 'database' | 'network'

export const services: { title: string; text: string; icon: ServiceIcon }[] = [
  {
    title: 'Full-Stack Development',
    icon: 'code',
    text: 'Complete, scalable web applications from front to back, with seamless integration between intuitive interfaces and powerful backend systems.',
  },
  {
    title: 'Software Design & Architecture',
    icon: 'diagram',
    text: 'Scalable, maintainable and secure architectures with proper SDD documentation, built to be portable, interoperable and future-ready.',
  },
  {
    title: 'UI/UX & Design',
    icon: 'design',
    text: 'Turning raw ideas into intuitive experiences: seamless user journeys, elegant wireframes, and modern aesthetics.',
  },
  {
    title: 'Cloud & DevOps',
    icon: 'cloud',
    text: 'Automated deployments, managed cloud infrastructure, and reliable delivery pipelines with modern DevOps practice.',
  },
  {
    title: 'Data Engineering',
    icon: 'database',
    text: 'Data pipelines, ETL systems, and analytics-ready architectures that keep business data clean, accessible and actionable.',
  },
  {
    title: 'Network Engineering',
    icon: 'network',
    text: 'Reliable network infrastructure: configuration, security and optimization for high availability and efficient data flow.',
  },
]
