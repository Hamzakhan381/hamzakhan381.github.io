export const profile = {
  name: 'Muhammad Hamza Khan',
  first: 'Hamza',
  role: 'Software Engineer · Full-Stack',
  email: 'hamza.best81@gmail.com',
  phone: '+92-333-3317050',
  phoneHref: 'tel:+923333317050',
  location: 'Multan, Pakistan · Remote',
  githubUser: 'Hamzakhan381',
  links: {
    github: 'https://github.com/Hamzakhan381',
    linkedin: 'https://www.linkedin.com/in/hamza-khan-674116278/',
    instagram: 'https://www.instagram.com/hamza_khan17050',
  },
}

export const stack = ['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', '.NET', 'SQL', 'Flutter', 'Three.js', 'Figma']

export const explore = [
  { to: '/about', label: 'About', text: 'Who I am, where I have worked, and the skills I bring.' },
  { to: '/services', label: 'Services', text: 'Six disciplines, from full-stack builds to network engineering.' },
  { to: '/projects', label: 'Projects', text: 'Live repositories from GitHub plus case studies.' },
  { to: '/cv', label: 'CV', text: 'A printable one-page CV you can save as PDF.' },
] as const

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

export const services: { title: string; text: string; icon: ServiceIcon; tags: string[] }[] = [
  {
    title: 'Full-Stack Development',
    icon: 'code',
    text: 'Complete, scalable web applications from front to back, with seamless integration between intuitive interfaces and powerful backend systems.',
    tags: ['React', 'Node.js', 'REST APIs'],
  },
  {
    title: 'Software Design & Architecture',
    icon: 'diagram',
    text: 'Scalable, maintainable and secure architectures with proper SDD documentation, built to be portable, interoperable and future-ready.',
    tags: ['SDD', 'Patterns', 'Security'],
  },
  {
    title: 'UI/UX & Design',
    icon: 'design',
    text: 'Turning raw ideas into intuitive experiences: seamless user journeys, elegant wireframes, and modern aesthetics.',
    tags: ['Figma', 'Wireframes', 'Prototypes'],
  },
  {
    title: 'Cloud & DevOps',
    icon: 'cloud',
    text: 'Automated deployments, managed cloud infrastructure, and reliable delivery pipelines with modern DevOps practice.',
    tags: ['CI/CD', 'Docker', 'GitHub Actions'],
  },
  {
    title: 'Data Engineering',
    icon: 'database',
    text: 'Data pipelines, ETL systems, and analytics-ready architectures that keep business data clean, accessible and actionable.',
    tags: ['SQL Server', 'MongoDB', 'ETL'],
  },
  {
    title: 'Network Engineering',
    icon: 'network',
    text: 'Reliable network infrastructure: configuration, security and optimization for high availability and efficient data flow.',
    tags: ['Configuration', 'Security', 'Availability'],
  },
]

export const process = [
  { title: 'Discover', text: 'Requirements, stakeholders and constraints, written down before any code.' },
  { title: 'Design', text: 'Architecture, data model and wireframes that the whole team can review.' },
  { title: 'Build', text: 'Small, tested increments with clean, documented code.' },
  { title: 'Ship', text: 'Automated deploys, monitoring, and a handover that sticks.' },
]

export const caseStudies = [
  {
    title: 'TowGo',
    subtitle: 'Vehicle breakdown assistance platform',
    kind: 'Team project · Software Engineering & UI/UX',
    text: 'Gathered stakeholder requirements and wrote the SRS, then designed personas, user journeys, wireframes and high-fidelity Figma interfaces for three role-based experiences: user, driver and admin.',
    tags: ['Figma', 'Wireframing', 'Prototyping', 'SDLC'],
  },
  {
    title: 'Automated Car Parking',
    subtitle: 'Parking flow and slot management prototype',
    kind: 'Academic project · Software Engineering',
    text: 'Designed and built a prototype system to optimize parking flow and slot management, contributing workflow logic, implementation and testing with a focus on real-world usability.',
    tags: ['System Design', 'Workflow Logic', 'Testing'],
  },
]

/** Content of the printable CV, kept identical to the previous resume page. */
export const cv = {
  summary:
    'Motivated Software Engineering student with a strong foundation in programming, database systems, and problem-solving. Passionate about building efficient, user-friendly applications and continuously improving technical skills. Seeking opportunities to apply knowledge in real-world software development.',
  experience: [
    {
      org: 'Atch Technologies',
      place: 'Multan, Pakistan',
      role: 'Web Development Intern',
      period: '2025',
      points: [
        'Assisted in developing responsive web applications using modern web technologies',
        'Gained hands-on experience in frontend and backend integration',
        'Collaborated with team members to improve user interface and functionality',
      ],
    },
    {
      org: 'SPSS Technologies',
      place: 'Multan, Pakistan',
      role: 'Web Development Intern',
      period: '2025',
      points: [
        'Contributed to web development projects, focusing on clean and maintainable code',
        'Worked with databases and basic backend logic',
        'Strengthened understanding of real-world software development practices',
      ],
    },
  ],
  projects: [
    {
      name: 'TowGo — Vehicle Breakdown Assistance Platform',
      stack: 'Figma, Wireframing, Prototyping, SDLC',
      kind: 'Team Project',
      role: 'Software Engineering & UI/UX Designer',
      points: [
        'Gathered stakeholder requirements and wrote an SRS to define core features, user flows, and system scope for the mobile application.',
        'Designed personas, user journeys, low-fidelity wireframes, and high-fidelity Figma interfaces for 3 role-based experiences: user, driver, and admin.',
      ],
    },
    {
      name: 'Automated Car Parking System',
      stack: 'System Design, Workflow Logic, Team Collaboration',
      kind: 'Academic Project',
      role: 'Software Engineering Team Project',
      points: [
        'Designed and developed a prototype automated car parking system to optimize parking flow and slot management.',
        'Contributed to workflow logic, implementation, and testing with focus on efficiency and real-world usability.',
      ],
    },
  ],
  skills: [
    { label: 'Languages', items: ['C++', 'Python', 'JavaScript', 'PHP', 'HTML5', 'CSS', 'Dart'] },
    { label: 'Frameworks', items: ['Flutter', 'Android Studio'] },
    {
      label: 'Databases',
      items: ['Microsoft SQL Server', 'MongoDB', 'Database Design & Normalization', 'Query Writing (SQL)'],
    },
    {
      label: 'Concepts',
      items: [
        'OOP',
        'Software Design & Architecture',
        'Requirements Engineering',
        'SQA',
        'Data Structures & Algorithms',
        'Problem Solving',
        'System Thinking',
        'Agile Fundamentals',
        'API Basics',
      ],
    },
    {
      label: 'Tools',
      items: ['Git & GitHub', 'Figma (UI/UX)', 'VS Code', 'Visual Studio', 'Cursor', 'Kiro', 'Claude Code'],
    },
  ],
  education: {
    school: 'Air University, Multan',
    place: 'Multan, Pakistan',
    degree: 'Bachelor of Science in Software Engineering',
    detail: 'GPA: 3.4 / 4.0 · Expected Graduation: 2024 – 2028',
  },
}
