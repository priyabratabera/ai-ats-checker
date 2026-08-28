/**
 * Curated multi-word skill/role phrases the keyword extractor treats as a single
 * unit instead of splitting into unigrams (so "machine learning" scores as one
 * concept, not "machine" + "learning").
 */
export const KNOWN_PHRASES: string[] = [
  "machine learning", "deep learning", "natural language processing",
  "computer vision", "data analysis", "data science", "data engineering",
  "data visualization", "data modeling", "data governance",
  "project management", "product management", "program management",
  "product design", "user experience", "user interface", "ui design",
  "graphic design", "team leadership", "people management", "team management",
  "cross-functional collaboration", "stakeholder management",
  "customer relationship management", "customer success", "customer support",
  "business development", "business analysis", "financial analysis",
  "financial modeling", "risk management", "supply chain management",
  "quality assurance", "quality control", "continuous integration",
  "continuous deployment", "continuous delivery", "version control",
  "agile methodology", "scrum master", "release management",
  "software development", "software engineering", "web development",
  "mobile development", "full stack development", "front end development",
  "back end development", "cloud computing", "cloud architecture",
  "system architecture", "infrastructure as code", "site reliability engineering",
  "network security", "information security", "penetration testing",
  "incident response", "identity and access management",
  "search engine optimization", "search engine marketing",
  "content marketing", "digital marketing", "email marketing",
  "social media marketing", "brand management", "market research",
  "public speaking", "technical writing", "api design", "rest api",
  "microservices architecture", "object oriented programming",
  "test driven development", "unit testing", "performance optimization",
  "database design", "database administration", "data pipeline",
  "extract transform load", "key performance indicators",
  "return on investment", "go to market strategy", "revenue growth",
  "sales strategy", "account management", "vendor management",
  "budget management", "process improvement", "change management",
  "human resources", "talent acquisition", "employee relations",
  "performance management", "compensation and benefits",
];

/** Canonical term -> alternate spellings / abbreviations that should count as the same concept. */
export const SYNONYMS: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  python: ["py"],
  golang: ["go"],
  "c sharp": ["c#", "csharp"],
  "c plus plus": ["c++", "cpp"],
  "node.js": ["nodejs", "node"],
  "react.js": ["react", "reactjs"],
  "vue.js": ["vue", "vuejs"],
  "next.js": ["nextjs"],
  postgresql: ["postgres"],
  mongodb: ["mongo"],
  kubernetes: ["k8s"],
  aws: ["amazon web services"],
  gcp: ["google cloud platform", "google cloud"],
  azure: ["microsoft azure"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "natural language processing": ["nlp"],
  "user experience": ["ux"],
  "user interface": ["ui"],
  seo: ["search engine optimization"],
  sem: ["search engine marketing"],
  ci: ["continuous integration"],
  "continuous deployment": ["cd", "continuous delivery"],
  rest: ["representational state transfer", "restful"],
  api: ["application programming interface", "application programming interfaces", "apis"],
  sql: ["structured query language"],
  oop: ["object oriented programming"],
  crm: ["customer relationship management"],
  kpi: ["key performance indicators", "kpis"],
  roi: ["return on investment"],
  pmp: ["project management professional"],
  etl: ["extract transform load"],
  sdk: ["software development kit"],
  qa: ["quality assurance"],
  sre: ["site reliability engineering"],
  iam: ["identity and access management"],
  erp: ["enterprise resource planning"],
  hr: ["human resources"],
  ceo: ["chief executive officer"],
  cto: ["chief technology officer"],
  b2b: ["business to business"],
  b2c: ["business to consumer"],
  saas: ["software as a service"],
  tdd: ["test driven development"],
  bdd: ["behavior driven development"],
  sla: ["service level agreement"],
};

/** Reverse index: alt spelling -> canonical term, built once at module load. */
export const SYNONYM_LOOKUP: Map<string, string> = new Map();
for (const [canonical, alts] of Object.entries(SYNONYMS)) {
  for (const alt of alts) {
    SYNONYM_LOOKUP.set(alt.toLowerCase(), canonical);
  }
}

export function canonicalize(term: string): string {
  const lower = term.toLowerCase().trim();
  return SYNONYM_LOOKUP.get(lower) ?? lower;
}

export const STRONG_VERB_SUGGESTIONS: Record<string, string[]> = {
  "responsible for": ["Led", "Managed", "Owned"],
  "duties included": ["Delivered", "Executed", "Drove"],
  "worked on": ["Built", "Developed", "Shipped"],
  "helped with": ["Contributed to", "Supported", "Drove"],
  "in charge of": ["Directed", "Oversaw", "Led"],
  "tasked with": ["Spearheaded", "Delivered", "Owned"],
  "assisted with": ["Partnered on", "Supported", "Enabled"],
  "involved in": ["Drove", "Contributed to", "Partnered on"],
  "participated in": ["Contributed to", "Collaborated on", "Drove"],
};

export const SECTION_HEADERS: Record<string, string[]> = {
  summary: ["summary", "professional summary", "profile", "objective", "career objective"],
  experience: [
    "experience", "work experience", "professional experience",
    "employment history", "work history", "career history",
  ],
  education: ["education", "academic background", "academic history"],
  skills: ["skills", "technical skills", "core competencies", "key skills", "competencies"],
  projects: ["projects", "key projects", "selected projects"],
  certifications: ["certifications", "licenses & certifications", "certificates"],
};
