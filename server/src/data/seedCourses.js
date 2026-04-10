import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacySeed = JSON.parse(readFileSync(path.resolve(__dirname, './seedData.json'), 'utf8'));

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function createSections(day) {
  return [
    { label: 'DSA Focus', value: day.dsaFocus },
    { label: 'Java / Spring', value: day.javaSpring },
    { label: 'AWS / DevOps', value: day.awsDevOps },
    { label: 'React / Frontend', value: day.reactFrontend },
    { label: 'Architecture / Design', value: day.architectureDesign },
  ].filter((item) => item.value);
}

function transformLegacyRoadmap(seed) {
  const pdfDownload = seed.downloads.find((item) => item.type === 'pdf')?.url || '';
  const deckDownload = seed.downloads.find((item) => item.type === 'pptx')?.url || '';
  const trackerDownload = seed.downloads.find((item) => item.type === 'xlsx')?.url || '';

  return {
    slug: 'solution-architect-120-day-accelerator',
    title: '120-Day Solution Architect Accelerator',
    category: 'Architecture',
    level: 'Advanced',
    status: 'published',
    shortDescription: seed.hero.lead,
    tagline: seed.hero.strapTitle,
    durationDays: seed.weeks.reduce((sum, week) => sum + week.days.length, 0),
    brochure: {
      eyebrow: 'FLAGSHIP PROGRAM',
      headline: seed.hero.title,
      lead: seed.hero.lead,
      strapTitle: seed.hero.strapTitle,
      strapText: seed.hero.strapText,
      pdfUrl: pdfDownload,
      heroImageUrl: '/images/screen-1.png',
      chips: seed.hero.chips || [],
      audience: seed.introCards.find((item) => /who it is for/i.test(item.title))?.items || [],
      outcomes: seed.introCards.find((item) => /what you finish with/i.test(item.title))?.items || [],
      differentiators: seed.introCards.find((item) => /what makes this roadmap different/i.test(item.title))?.items || [],
      cadence: seed.introCards.find((item) => /execution cadence/i.test(item.title))?.items || [],
      timeline: seed.hero.timeline || [],
    },
    stats: seed.stats || [],
    downloads: [
      { title: 'Program brochure PDF', url: pdfDownload, type: 'pdf', description: 'Designed brochure for the curriculum path.' },
      { title: 'Editable brochure deck', url: deckDownload, type: 'pptx', description: 'PowerPoint version for customization.' },
      { title: 'Tracker workbook', url: trackerDownload, type: 'xlsx', description: 'Excel tracker, scorecards, and dashboards.' },
    ].filter((item) => item.url),
    weeks: seed.weeks.map((week) => ({
      weekNumber: week.weekNumber,
      phaseLabel: week.phaseLabel,
      title: week.title,
      summary: week.summary,
      accent: week.accent,
      deliverables: week.deliverables || [],
      days: week.days.map((day) => ({
        dayNumber: day.dayNumber,
        dayType: day.dayType,
        hours: day.hours,
        title: day.primaryDeliverable || day.architectureDesign || `Day ${day.dayNumber}`,
        objective: day.architectureDesign,
        sections: createSections(day),
        primaryDeliverable: day.primaryDeliverable,
        materials: [],
        tags: (day.searchText || '')
          .split(/[,|]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
        searchText: day.searchText,
      })),
    })),
    featuredScreens: ['/images/screen-1.png', '/images/screen-2.png', '/images/screen-3.png'],
  };
}

const awsBootcamp = {
  slug: 'aws-architecture-bootcamp',
  title: 'AWS Architecture Bootcamp',
  category: 'Cloud',
  level: 'Intermediate',
  status: 'draft',
  shortDescription: 'A reusable sample course showing how the portal supports multiple programs, brochures, downloads, and day-grid materials.',
  tagline: 'Launch and manage cloud-focused curricula with the same module.',
  durationDays: 15,
  brochure: {
    eyebrow: 'SAMPLE COURSE',
    headline: 'AWS Architecture Bootcamp',
    lead: 'Use this as a second course template: shorter duration, different focus, same reusable module.',
    strapTitle: 'Publish once. Track daily. Report live.',
    strapText: 'Admins can edit brochure copy, attach downloadable materials, and assign this course to learners independently of other programs.',
    pdfUrl: '',
    heroImageUrl: '/images/screen-2.png',
    chips: ['AWS', 'Networking', 'Storage', 'Security'],
    audience: ['Developers moving into cloud architecture.', 'Teams needing a shorter course module.'],
    outcomes: ['VPC design fluency', 'Storage decisions', 'Secure deployment patterns'],
    differentiators: ['Uses the same reusable admin module as every other course.'],
    cadence: ['Five short study days and one review day every week.'],
    timeline: [
      { phase: 'Days 1-5', title: 'Core AWS', description: 'Identity, compute, and networking.' },
      { phase: 'Days 6-10', title: 'Data & Security', description: 'Storage, databases, and protection.' },
      { phase: 'Days 11-15', title: 'Ops & Review', description: 'Monitoring, cost, and final review.' },
    ],
  },
  stats: [
    { value: '15', label: 'days' },
    { value: '3', label: 'phases' },
    { value: '1', label: 'final design review' },
  ],
  downloads: [],
  featuredScreens: ['/images/screen-2.png'],
  weeks: [
    {
      weekNumber: 1,
      phaseLabel: 'Phase 1: Core AWS',
      title: 'Identity, networking, and compute foundations',
      summary: 'Build the base of any AWS architecture.',
      accent: '#2e6ca5',
      deliverables: ['IAM note', 'VPC diagram', 'EC2 deployment'],
      days: [
        {
          dayNumber: 1,
          dayType: 'Weekday',
          hours: '5h',
          title: 'AWS account foundations',
          objective: 'Set up accounts, MFA, billing, and IAM basics.',
          sections: [
            { label: 'Concepts', value: 'AWS global infrastructure, regions, accounts, MFA.' },
            { label: 'Hands-on', value: 'Create account guardrails and IAM roles.' },
            { label: 'Design Lens', value: 'Shared responsibility and landing zone thinking.' },
          ],
          primaryDeliverable: 'Secure starter AWS account',
          materials: [],
          tags: ['iam', 'mfa', 'accounts'],
          searchText: 'iam mfa accounts landing zone aws foundations',
        },
      ],
    },
  ],
};

export function getSeedCourses() {
  const flagship = transformLegacyRoadmap(legacySeed);
  flagship.id = flagship.slug;
  awsBootcamp.id = awsBootcamp.slug;
  return [flagship, awsBootcamp].map((course) => ({
    ...course,
    id: course.id || course.slug || toSlug(course.title),
  }));
}
