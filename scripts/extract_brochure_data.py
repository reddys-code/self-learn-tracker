import json
import re
import base64
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path('/mnt/data/solution-architect-mern-app')
HTML_PATH = Path('/mnt/data/solution_architect_120_day_animated_brochure.html')
ASSETS_DIR = ROOT / 'server' / 'public' / 'images'
DATA_DIR = ROOT / 'server' / 'src' / 'data'
DOWNLOADS_DIR = ROOT / 'server' / 'public' / 'downloads'
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

html = HTML_PATH.read_text(encoding='utf-8')
soup = BeautifulSoup(html, 'html.parser')

# Copy download artifacts
for src in [
    Path('/mnt/data/solution_architect_120_day_tracker_workbook.xlsx'),
    Path('/mnt/data/solution_architect_120_day_brochure.pptx'),
    Path('/mnt/data/pdf_out/solution_architect_120_day_brochure.pdf'),
]:
    if src.exists():
        (DOWNLOADS_DIR / src.name).write_bytes(src.read_bytes())

# Extract embedded screen images
image_filenames = []
for i, card in enumerate(soup.select('.screen-card'), start=1):
    img = card.select_one('img')
    src = img['src']
    m = re.match(r'data:image/(png|jpeg|jpg);base64,(.*)', src, re.S)
    if not m:
        continue
    ext = 'png' if m.group(1) == 'png' else 'jpg'
    data = base64.b64decode(m.group(2))
    filename = f'screen-{i}.{ext}'
    (ASSETS_DIR / filename).write_bytes(data)
    image_filenames.append(filename)

# Hero stats from stat cards
stats = []
for card in soup.select('.stat-card'):
    strong = card.select_one('strong')
    label = card.select_one('span')
    if strong and label:
        stats.append({
            'value': strong.get_text(' ', strip=True),
            'label': label.get_text(' ', strip=True)
        })

# Intro cards
intro_cards = []
for card in soup.select('.info-card'):
    title = card.select_one('h3').get_text(' ', strip=True)
    items = [li.get_text(' ', strip=True) for li in card.select('li')]
    intro_cards.append({'title': title, 'items': items})

# Hero timeline cards
hero_timeline = []
for card in soup.select('.timeline-card'):
    hero_timeline.append({
        'phase': card.select_one('span').get_text(' ', strip=True),
        'title': card.select_one('h4').get_text(' ', strip=True),
        'description': card.select_one('p').get_text(' ', strip=True),
    })

# Phase cards
phases = []
phase_color_map = {
    'var(--phase1)': '#2e6ca5',
    'var(--phase2)': '#1aa9a1',
    'var(--phase3)': '#f0b13b',
    'var(--phase4)': '#e64b67',
}
for idx, card in enumerate(soup.select('.phase-card'), start=1):
    style = card.get('style', '')
    accent = '#2e6ca5'
    for key, val in phase_color_map.items():
        if key in style:
            accent = val
            break
    topline = card.select('.phase-topline span')
    stats_nodes = card.select('.phase-stats div')
    phase = {
        'id': f'phase-{idx}',
        'name': card.select_one('h3').get_text(' ', strip=True),
        'days': topline[0].get_text(' ', strip=True) if len(topline) > 0 else '',
        'weeks': topline[1].get_text(' ', strip=True) if len(topline) > 1 else '',
        'description': card.select_one('p').get_text(' ', strip=True),
        'metrics': [],
        'outcome': card.select_one('.phase-outcome').get_text(' ', strip=True),
        'accent': accent,
    }
    for stat in stats_nodes:
        phase['metrics'].append({
            'value': stat.select_one('strong').get_text(' ', strip=True),
            'label': stat.select_one('span').get_text(' ', strip=True),
        })
    phases.append(phase)

# Checkpoints
checkpoints = []
for card in soup.select('.checkpoint-card'):
    checkpoints.append({
        'day': card.select_one('.checkpoint-day').get_text(' ', strip=True),
        'title': card.select_one('h4').get_text(' ', strip=True),
        'description': card.select_one('p').get_text(' ', strip=True),
    })

# Weeks and days
weeks = []
for card in soup.select('.week-card'):
    summary = card.select_one('summary')
    week_pill = summary.select_one('.week-pill').get_text(' ', strip=True)
    week_number = int(re.search(r'(\d+)', week_pill).group(1))
    phase_label = card.get('data-phase', '')
    accent_style = summary.get('style', '')
    accent = '#2e6ca5'
    for key, val in phase_color_map.items():
        if key in accent_style:
            accent = val
            break
    title = summary.select_one('h3').get_text(' ', strip=True)
    desc = summary.select_one('p').get_text(' ', strip=True)
    deliverables = [x.get_text(' ', strip=True) for x in card.select('.mini-badge')]
    days = []
    for d in card.select('.day-card'):
        day_num = int(re.search(r'(\d+)', d.select_one('.day-num').get_text(' ', strip=True)).group(1))
        day_type = d.select_one('.day-meta').get_text(' ', strip=True)
        hours = d.select_one('.hours-pill').get_text(' ', strip=True)
        fields = {}
        for block in d.select('.day-grid > div'):
            label = block.select_one('label').get_text(' ', strip=True)
            value = block.select_one('p').get_text(' ', strip=True)
            fields[label] = value
        days.append({
            'dayNumber': day_num,
            'dayType': day_type,
            'hours': hours,
            'dsaFocus': fields.get('DSA', ''),
            'javaSpring': fields.get('Java / Spring', ''),
            'awsDevOps': fields.get('AWS / DevOps', ''),
            'reactFrontend': fields.get('React / Frontend', ''),
            'architectureDesign': fields.get('Architecture / Design', ''),
            'primaryDeliverable': fields.get('Primary deliverable', ''),
            'searchText': d.get('data-search', ''),
        })
    weeks.append({
        'weekNumber': week_number,
        'phaseLabel': phase_label,
        'title': title,
        'summary': desc,
        'deliverables': deliverables,
        'days': days,
        'accent': accent,
    })

# Artifacts
artifacts = []
for card in soup.select('.artifact-card'):
    artifact = {
        'week': card.select_one('.artifact-week').get_text(' ', strip=True),
        'day': card.select_one('.artifact-day').get_text(' ', strip=True),
        'title': card.select_one('h4').get_text(' ', strip=True),
        'description': card.select('p')[0].get_text(' ', strip=True),
        'dependency': card.select_one('.artifact-dep').get_text(' ', strip=True),
    }
    artifacts.append(artifact)

# Screens / gallery
screens = []
for idx, card in enumerate(soup.select('.screen-card'), start=1):
    screens.append({
        'title': card.select_one('h4').get_text(' ', strip=True),
        'description': card.select_one('p').get_text(' ', strip=True),
        'image': f'/images/{image_filenames[idx-1]}' if idx-1 < len(image_filenames) else '',
    })

# Design sprint cards
sprints = []
for card in soup.select('.sprint-card'):
    sprints.append({
        'title': card.select_one('h4').get_text(' ', strip=True),
        'description': card.select_one('p').get_text(' ', strip=True),
    })

# Downloads
downloads = [
    {
        'label': 'Tracker workbook',
        'description': 'Execution tracker with scorecards, dashboards, concepts, and weekly review sheets.',
        'url': '/downloads/solution_architect_120_day_tracker_workbook.xlsx',
        'type': 'xlsx',
    },
    {
        'label': 'PDF brochure',
        'description': 'Designed 8-page brochure version of the curriculum path and value proposition.',
        'url': '/downloads/solution_architect_120_day_brochure.pdf',
        'type': 'pdf',
    },
    {
        'label': 'Editable PPTX brochure',
        'description': 'PowerPoint source for customizing the brochure design and messaging.',
        'url': '/downloads/solution_architect_120_day_brochure.pptx',
        'type': 'pptx',
    },
]

# Simple hero copy from page content
hero_eyebrow = soup.select_one('.eyebrow').get_text(' ', strip=True)
hero_title = soup.select_one('.hero h1').get_text(' ', strip=True)
hero_lead = soup.select_one('.hero p.lead').get_text(' ', strip=True)
hero_chips = [c.get_text(' ', strip=True) for c in soup.select('.hero .chip-row .chip')]
hero_strap_title = soup.select_one('.hero-strap h2').get_text(' ', strip=True)
hero_strap_text = soup.select_one('.hero-strap p').get_text(' ', strip=True)

payload = {
    'slug': 'solution-architect-120-day',
    'title': soup.title.get_text(' ', strip=True),
    'description': soup.select_one('meta[name="description"]').get('content', ''),
    'hero': {
        'eyebrow': hero_eyebrow,
        'title': hero_title,
        'lead': hero_lead,
        'chips': hero_chips,
        'strapTitle': hero_strap_title,
        'strapText': hero_strap_text,
        'timeline': hero_timeline,
    },
    'stats': stats,
    'introCards': intro_cards,
    'phases': phases,
    'checkpoints': checkpoints,
    'weeks': weeks,
    'artifacts': artifacts,
    'screens': screens,
    'designSprints': sprints,
    'downloads': downloads,
}

(DATA_DIR / 'seedData.json').write_text(json.dumps(payload, indent=2), encoding='utf-8')
print('Wrote seedData.json with', len(weeks), 'weeks and', sum(len(w['days']) for w in weeks), 'days')
