/**
 * All editable site content lives here.
 * Change text, links, projects and services in this one file.
 */

export const site = {
  name: "George Nnamdi",
  firstName: "George",
  brand: "Nexorah",
  role: "Bubble.io Developer",
  tagline: "No-code web apps, API integrations & automation",
  location: "Nigeria",
  timezone: "Africa/Lagos",
  timezoneLabel: "WAT (GMT+1)",
  email: "nexorahbuilds@gmail.com",
  whatsapp: "+2349069060835",
  whatsappLink: "https://wa.me/2349069060835",
  url: "https://nexorah.vercel.app",
  description:
    "George Nnamdi is a Bubble.io developer who designs and builds booking platforms, reservation systems and premium websites with custom API integrations.",
  socials: [
    {
      label: "Upwork",
      href: "https://www.upwork.com/freelancers/~016471b350631b7852?p=2100574249160871936",
    },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/george-nnamdi-0a83123b3/" },
    { label: "X (Twitter)", href: "https://x.com/George_nocode" },
    { label: "WhatsApp", href: "https://wa.me/2349069060835" },
  ],
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

export const hero = {
  titleTop: "Building Digital",
  rotatingWords: ["Experiences", "Web Apps", "Platforms", "Automations"],
  subtitle: "focused on providing outstanding services for my clients",
  intro:
    "George designs and builds modern digital experiences that turn ideas into compelling products, combining strategy, visual design, and web development to help businesses grow online.",
};

export type Project = {
  slug: string;
  title: string;
  client: string;
  short: string;
  category: "Booking System" | "Web App" | "Website";
  year: string;
  date: string;
  role: string;
  platform: string;
  stack: string[];
  image: string;
  imageAlt: string;
  accent: string;
  live: string;
  liveLabel: string;
  description: string;
  challenge: string;
  solution: string;
  features: { title: string; body: string }[];
  outcome: string;
  /** Two CSS crops of the main image used as detail shots in the case study */
  details: { position: string; zoom: number; caption: string }[];
};

export const projects: Project[] = [
  {
    slug: "sixt-car-rentals",
    title: "Sixt Car Rentals",
    client: "Sixt",
    short: "Car rental booking platform",
    category: "Booking System",
    year: "2025",
    date: "April 2025",
    role: "Sole developer: design, build & API integrations",
    platform: "Bubble.io",
    stack: ["Bubble.io", "REST APIs", "Payments", "Responsive UI"],
    image: "/images/sixt.webp",
    imageAlt: "Sixt car rental booking platform hero with a black BMW and Sixt One member rates",
    accent: "#FF6A00",
    live: "https://www.sixt.com/",
    liveLabel: "sixt.com",
    description:
      "Built a car rental booking platform for Sixt using Bubble.io as the sole developer handling design, build, and API integrations. Covers the full rental flow: browsing available vehicles by location and date, real time availability and pricing, a booking flow with pickup and drop off details, and secure checkout for payments and confirmations.",
    challenge:
      "Vehicle inventory, availability and bookings were tracked across separate systems. Customers needed a fast way to find the right car for a location and date, and the business needed one reliable source of truth behind every reservation.",
    solution:
      "A complete rental flow built in Bubble.io, with vehicle inventory, availability and booking data synced through API integrations. Customers search, compare, book and pay in one smooth journey, while the data stays accurate across every system.",
    features: [
      {
        title: "Search by location & date",
        body: "Browse available vehicles filtered by pickup location and rental dates.",
      },
      {
        title: "Real-time availability & pricing",
        body: "Prices and availability update live from the connected inventory.",
      },
      {
        title: "Guided booking flow",
        body: "Pickup and drop-off details captured step by step, with nothing missed.",
      },
      {
        title: "Secure checkout",
        body: "Payments and booking confirmations handled in one secure flow.",
      },
      {
        title: "API-synced data",
        body: "Inventory, availability and bookings stay in sync automatically, with no manual tracking.",
      },
    ],
    outcome:
      "One accurate source of truth for vehicles and bookings, replacing manual tracking across separate systems, and a booking journey that feels as premium as the cars.",
    details: [
      { position: "80% 55%", zoom: 1.9, caption: "Hero product shot with a premium, high-contrast look" },
      { position: "0% 88%", zoom: 2.4, caption: "Clear value props and a single, focused call to action" },
    ],
  },
  {
    slug: "sensei-reservations",
    title: "Sensei Reservations",
    client: "Sensei",
    short: "Full booking & reservation system",
    category: "Booking System",
    year: "2025",
    date: "October 2025",
    role: "Bubble.io developer: build & custom API integrations",
    platform: "Bubble.io",
    stack: ["Bubble.io", "Custom APIs", "Payments", "Calendar & availability"],
    image: "/images/sensei.webp",
    imageAlt: "Sensei luxury wellness retreat reservation page with guest quiz testimonial card",
    accent: "#4B1FA6",
    live: "https://sensei.com/retreats/lanai/curate-your-stay/",
    liveLabel: "sensei.com",
    description:
      "Built a full reservation system for Sensei, a luxury nature and wellness retreat brand, using Bubble.io with custom API integrations. Covers the full guest journey: a catalog of retreat experiences, a personalized quiz that matches guests to the right stay, live calendar and availability, and secure checkout handling deposits, payments, and confirmations.",
    challenge:
      "A luxury wellness brand needs its booking experience to feel as calm and editorial as the retreats themselves, without giving up the transactional power of deposits, payments, availability and confirmations.",
    solution:
      "A Bubble.io reservation system that keeps the premium, editorial feel of the brand on the surface while working as a fully transactional booking system underneath. Guest, availability and payment data stay synced through custom API integrations.",
    features: [
      {
        title: "Retreat experience catalog",
        body: "An editorial catalog of stays and experiences guests can explore.",
      },
      {
        title: "Personalized matching quiz",
        body: "A short quiz that matches each guest to the stay that fits their goals and pace.",
      },
      {
        title: "Live calendar & availability",
        body: "Real-time dates and capacity, so guests only see what they can book.",
      },
      {
        title: "Deposits & secure checkout",
        body: "Deposits, full payments and confirmations handled in one secure flow.",
      },
      {
        title: "Synced guest data",
        body: "Guest, availability and payment data kept in one accurate source of truth.",
      },
    ],
    outcome:
      "A reservation journey personalized from the very first click: premium on the front end, fully transactional underneath.",
    details: [
      { position: "95% 45%", zoom: 1.9, caption: "Quiz entry point: “Not sure where to begin?”" },
      { position: "0% 100%", zoom: 2.1, caption: "Editorial brand moments woven into the booking flow" },
    ],
  },
  {
    slug: "elysian-dubai-real-estate",
    title: "Elysian Dubai",
    client: "Elysian",
    short: "Premium real estate website",
    category: "Website",
    year: "2026",
    date: "January 2026",
    role: "Bubble developer: design to build",
    platform: "Bubble.io",
    stack: ["Bubble.io", "Custom UI", "Property search", "Responsive design"],
    image: "/images/elysian.webp",
    imageAlt: "Elysian Dubai real estate website hero with Burj Khalifa skyline at dusk and property search bar",
    accent: "#3FE0D0",
    live: "https://elysian.com/",
    liveLabel: "elysian.com",
    description:
      "Designed and developed a premium Dubai real estate website in Bubble, featuring a responsive hero section, custom UI, property search experience, smooth navigation, and conversion-focused design optimized for modern real estate brands.",
    challenge:
      "Luxury property buyers expect a high-end digital experience. The site had to look premium, stay fast and usable on every device, and guide visitors from browsing straight to enquiry.",
    solution:
      "As the Bubble developer, I turned the visual design into a responsive, polished web experience with a strong focus on usability, performance and conversion, from the cinematic hero to a property search that feels effortless.",
    features: [
      {
        title: "Cinematic responsive hero",
        body: "A full-bleed skyline hero that holds its impact from desktop to mobile.",
      },
      {
        title: "Property search experience",
        body: "Search by keyword, rent or buy, property type and location in one bar.",
      },
      {
        title: "Custom UI system",
        body: "Bespoke components that match the design pixel for pixel.",
      },
      {
        title: "Smooth navigation",
        body: "Clear menus for Off-Plan, Buy, Rent, Area Guides and more.",
      },
      {
        title: "Conversion-focused layout",
        body: "Trust signals and clear calls to action placed where decisions happen.",
      },
    ],
    outcome:
      "A premium real estate presence built for luxury properties: polished, responsive and designed to convert visitors into enquiries.",
    details: [
      { position: "50% 92%", zoom: 1.8, caption: "Unified property search: type, rent/buy and location" },
      { position: "0% 40%", zoom: 2, caption: "Bold headline hierarchy with a signature teal accent" },
    ],
  },
];

export const services = [
  {
    title: "Bubble.io Web Apps",
    body: "Full-stack web apps built in Bubble, from MVPs and SaaS products to marketplaces, booking engines and client portals. Designed properly, built to scale.",
    deliverables: ["MVPs & SaaS", "Booking & reservation systems", "Marketplaces", "Dashboards & portals"],
    tools: ["Bubble.io"],
  },
  {
    title: "API Integrations & Backends",
    body: "Connect your app to the tools you already use. Payments, calendars, inventory and third-party data, synced into one accurate source of truth.",
    deliverables: ["REST API connections", "Payment & checkout flows", "Xano backends", "Data sync & webhooks"],
    tools: ["Xano", "Bubble API Connector", "Airtable"],
  },
  {
    title: "Automation & AI Workflows",
    body: "Stop doing the same task twice. I automate repetitive work and add AI where it genuinely helps, from lead routing to AI voice-overs and agents.",
    deliverables: ["n8n workflows", "CRM & lead automation", "AI voice with ElevenLabs", "Reporting pipelines"],
    tools: ["n8n", "ElevenLabs", "Airtable"],
  },
  {
    title: "Websites & Landing Pages",
    body: "Fast, responsive websites that look premium and convert, built in Bubble or WordPress depending on what your business needs.",
    deliverables: ["Company websites", "Landing pages", "WordPress builds", "SEO-ready structure"],
    tools: ["WordPress", "Bubble.io"],
  },
  {
    title: "UI/UX & Visual Design",
    body: "Interfaces designed before they're built. Clear user flows, clean layouts and brand-ready visuals that make your product easy to use.",
    deliverables: ["Figma UI design", "User flows & wireframes", "Design systems", "Marketing graphics"],
    tools: ["Figma", "Canva"],
  },
  {
    title: "Workspace & Ops Systems",
    body: "Organised operations for growing teams. Notion wikis, Airtable databases and Asana boards set up so everyone knows what's next.",
    deliverables: ["Notion workspaces", "Airtable bases", "Asana project setup", "Team SOPs"],
    tools: ["Notion", "Airtable", "Asana"],
  },
];

export const tools = [
  { name: "Bubble.io", group: "Build", color: "#0205D3", note: "Full-stack no-code web apps" },
  { name: "Xano", group: "Build", color: "#3D5AFE", note: "Scalable backends & APIs" },
  { name: "WordPress", group: "Build", color: "#21759B", note: "Websites & content" },
  { name: "n8n", group: "Automate", color: "#EA4B71", note: "Workflow automation" },
  { name: "ElevenLabs", group: "Automate", color: "#111111", note: "AI voice & audio" },
  { name: "Airtable", group: "Automate", color: "#F7A600", note: "Databases & ops" },
  { name: "Figma", group: "Design", color: "#F24E1E", note: "UI/UX design" },
  { name: "Canva", group: "Design", color: "#00A8B5", note: "Brand visuals" },
  { name: "Notion", group: "Organise", color: "#111111", note: "Docs & wikis" },
  { name: "Asana", group: "Organise", color: "#F06A6A", note: "Project management" },
];

export const process = [
  {
    step: "01",
    title: "Discover",
    body: "We start with a call to understand your business, your users and what success looks like. You get a clear scope, timeline and quote.",
    points: ["Discovery call", "Scope & user flows", "Fixed quote"],
  },
  {
    step: "02",
    title: "Design",
    body: "I map the user journey and design the key screens in Figma, so you see exactly what you're getting before a single workflow is built.",
    points: ["Wireframes", "UI design in Figma", "Feedback rounds"],
  },
  {
    step: "03",
    title: "Build",
    body: "The app comes to life in Bubble with a clean database, reusable elements and API integrations. You get progress updates every step of the way.",
    points: ["Database & workflows", "API integrations", "Weekly updates"],
  },
  {
    step: "04",
    title: "Launch & Support",
    body: "We test on every device, go live on your domain, and I stay on hand to fix, improve and scale as your users grow.",
    points: ["QA & testing", "Launch & handover", "Ongoing support"],
  },
];

export const experience = [
  {
    period: "2025 — Present",
    role: "Founder & Lead Bubble.io Developer",
    org: "Nexorah",
    body: "Running a small no-code studio that designs and builds booking platforms, reservation systems and premium websites for brands worldwide.",
  },
  {
    period: "2024 — Present",
    role: "Freelance Bubble.io Developer",
    org: "Upwork & direct clients",
    body: "Shipping full-stack Bubble apps end to end: UI, database design, workflows, API integrations and checkout flows for clients across industries.",
  },
  {
    period: "2023 — 2024",
    role: "No-code & Automation Developer",
    org: "Independent projects",
    body: "Built automations with n8n and Airtable, set up Notion and Asana workspaces, and designed web experiences in Figma and WordPress.",
  },
];

export const stats = [
  { value: 10, suffix: "+", label: "Tools in my stack" },
  { value: 3, suffix: "", label: "Featured platforms shipped" },
  { value: 24, suffix: "h", label: "Average reply time" },
  { value: 100, suffix: "%", label: "Remote-ready, worldwide" },
];

/** Verified 5.0★ client reviews from Upwork (quotes copied as written) */
export const upworkRating = { score: "5.0", count: 5 };

export const testimonials = [
  {
    quote:
      "George has a deep understanding of Bubble.io, SaaS development, MVP development, no code application building, workflow optimization, and third party integrations. He communicated clearly, delivered milestones on schedule, and was proactive in solving challenges. If you're looking for a skilled Bubble.io developer who can turn ideas into high quality web applications, George is an easy recommendation. We look forward to working with him again.",
    project: "Bubble.io Expert Needed to Build a Wensi Inspired Platform",
    date: "Jul 2026",
    tags: ["Bubble.io", "No-Code Development", "Solution Oriented"],
  },
  {
    quote:
      "George delivered an outstanding Bubble.io application with excellent communication, attention to detail, and on time delivery. Everything worked perfectly, and the overall quality exceeded expectations. I highly recommend Georgie and would happily work with him again.",
    project: "Bubble.io SaaS Web App Developer Needed",
    date: "Jul 2026",
    tags: ["Bubble.io", "SaaS Development", "Reliable"],
  },
  {
    quote:
      "I would absolutely work with George again. He was professional, responsive, and delivered a high quality Bubble.io application that exceeded my expectations. Everything was completed on time, communication was excellent, and the final product worked flawlessly. I highly recommend George to anyone looking for a reliable Bubble.io developer.",
    project: "Bubble.io MVP & SaaS Web App",
    date: "Jul 2026",
    tags: ["Bubble.io", "SaaS", "Committed to Quality"],
  },
  {
    quote:
      "I had an excellent experience working with George. I ordered his Bubble.io web app development service, and he delivered exactly what I was hoping for and more.",
    project: "Bubble.io Developer to Build and Scale a Web App",
    date: "Feb 2026",
    tags: ["Reliable", "Clear Communicator", "Detail Oriented"],
  },
  {
    quote: "George communicates well, is flexible and always asks questions to make sure he's doing the job right.",
    project: "Mobile App Developer for Travel App",
    date: "Sep 2026",
    tags: ["Bubble.io", "Mobile App Development", "Clear Communicator"],
  },
];

export const faqs = [
  {
    q: "What is Bubble.io, and why build with it?",
    a: "Bubble is a visual, full-stack platform for building real web applications: database, logic, user accounts and integrations included. It lets me ship production-ready apps much faster than traditional code, which means lower costs and quicker launches for you.",
  },
  {
    q: "How long does a project usually take?",
    a: "A focused landing page or website usually takes 1–2 weeks. An MVP web app typically takes 3–6 weeks depending on features and integrations. You'll get a clear timeline before we start.",
  },
  {
    q: "Can you connect my app to the tools I already use?",
    a: "Yes. API integrations are a core part of what I do: payments, calendars, CRMs, Airtable, Xano backends and custom REST APIs, all synced into one accurate source of truth.",
  },
  {
    q: "Do you work with clients outside Nigeria?",
    a: "Absolutely. I work remotely with clients worldwide and keep communication clear and regular across time zones via email, WhatsApp, Slack or calls.",
  },
  {
    q: "What do you need from me to get started?",
    a: "A short description of your idea or problem, any designs or references you have, and your timeline and budget range. From there, we'll book a call and I'll put together a scope and quote.",
  },
  {
    q: "Do you offer support after launch?",
    a: "Yes. I stay on hand after launch for fixes, improvements and new features, so your product keeps growing with your users.",
  },
];
