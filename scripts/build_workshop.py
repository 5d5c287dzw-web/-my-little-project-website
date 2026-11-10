"""Generate the private My Workshop preview pages from one shared layout.

These pages contain concept content only. The Cloudflare Pages middleware checks
the production Clerk session and the owner role before serving any /workshop path.
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "/workshop/"
PROJECT = BASE + "projects/lp-031/"
STAGES = [
    {
        "title": "Meet the components and check your kit",
        "intro": "Get familiar with the proposed parts before beginning any build.",
        "before": "A draft component checklist, a clear work area and a place to record questions.",
        "overview": [
            "Compare the parts you have with the supplier's confirmed inventory when one is available.",
            "Identify the chassis, wheels, motor assemblies, controller board and power components by their labels.",
            "Set aside unidentified or damaged parts for review rather than attempting to connect them.",
        ],
        "needed": ["Confirmed bill of materials and component photographs", "Parts-identification diagram", "Supplier-specific safety information"],
        "questions": [("What if a component is missing?", "Keep the packaging and check the confirmed inventory before requesting a replacement."), ("What if two components look similar?", "Check printed markings or manufacturer part numbers; do not assume electrical interchangeability.")],
    },
    {
        "title": "Assemble the chassis and wheels",
        "intro": "Explore the proposed mechanical layout of the buggy.",
        "before": "A draft mechanical parts inventory and the manufacturer's approved assembly notes.",
        "overview": [
            "Identify the front and rear of the chassis and the intended wheel positions.",
            "Review how wheel supports, axles and motor mounts are intended to align.",
            "Before final assembly, check that moving parts have adequate clearance according to the verified design.",
        ],
        "needed": ["Verified fastener sizes and torque guidance", "Dimensioned chassis drawing", "Photographs of the approved wheel assembly"],
        "questions": [("What if a wheel rubs?", "Do not force it. Compare alignment and clearances with the approved design once available."), ("What if a fastener does not fit?", "Stop and check its specification; forcing it may damage a printed or threaded part.")],
    },
    {
        "title": "Fit the motors and electronics",
        "intro": "Understand the intended roles of the drive system and electronics.",
        "before": "Manufacturer datasheets and a reviewed wiring plan; no live electrical assembly instructions are provided yet.",
        "overview": [
            "Identify which components are motors, motor drivers, control boards and power sources.",
            "Read the rated voltages, polarity markings and current requirements on approved datasheets.",
            "Wait for a verified wiring diagram and electrical safety review before connecting power.",
        ],
        "needed": ["Verified wiring diagram and pinout", "Approved battery and charging guidance", "Motor-driver compatibility checks"],
        "questions": [("Can I wire the motor directly to the board?", "Not without a verified circuit. A motor may require a suitable driver and protection."), ("Can I connect a battery to test it?", "Not until battery chemistry, polarity, voltage and protection have been reviewed.")],
    },
    {
        "title": "Prepare the wireless controller",
        "intro": "Explore how a remote controller could communicate with the buggy.",
        "before": "Approved controller documentation and a verified pairing procedure.",
        "overview": [
            "Identify the proposed controller and receiver hardware in the project plan.",
            "Review the manufacturer's pairing, channel and failsafe concepts.",
            "Wait for an approved test procedure before energising or operating a prototype.",
        ],
        "needed": ["Confirmed controller and receiver model", "Approved pairing procedure", "Failsafe and loss-of-signal test plan"],
        "questions": [("What if the controller does not pair?", "Check the approved pairing instructions and compatible firmware versions."), ("Why is failsafe important?", "A lost radio link should not leave the vehicle driving uncontrolled.")],
    },
    {
        "title": "Test, troubleshoot and experiment",
        "intro": "Plan controlled testing and future improvements.",
        "before": "A completed mechanical and electrical safety checklist and an approved test environment.",
        "overview": [
            "Prepare a checklist covering mechanical clearance, wiring inspection and power ratings.",
            "Define what a successful low-speed test should demonstrate before attempting one.",
            "Record observed issues and proposed improvements for the next prototype revision.",
        ],
        "needed": ["Verified commissioning checklist", "Test acceptance criteria", "Troubleshooting log and revision history"],
        "questions": [("What if the buggy behaves unexpectedly?", "Stop the test safely and review the approved electrical and control checks."), ("What could I improve next?", "Consider reliability, ease of assembly and serviceability before performance upgrades.")],
    },
]


def stage_url(number):
    return PROJECT + f"stages/{number:02d}/"


def navigation(active):
    items = [
        ("home", BASE, "◫", "Overview"),
        ("garage", BASE + "garage/", "◇", "Project Garage"),
        ("project", PROJECT, "✳", "RC Buggy journey"),
        ("prints", BASE + "prints/", "▦", "3D Print Library"),
    ]
    return "".join(f'<a class="nav-item{" active" if key == active else ""}" href="{url}"{" aria-current=\"page\"" if key == active else ""}>{icon} <span>{label}</span></a>' for key, url, icon, label in items)


def page(title, eyebrow, description, content, active="home", stage=None):
    stage_attr = f' data-stage="{stage}"' if stage is not None else ""
    return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#194e43"><title>{escape(title)} · My Little Project</title><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/workshop.css?v=20261110-1"></head>
<body data-workshop-view="{active}"{stage_attr}><a class="skip-link" href="#main">Skip to content</a><div class="shell"><aside class="sidebar"><a class="brand" href="/"><span class="mark">m<span>✦</span></span><span>my little<br><strong>project.</strong></span></a><div class="workspace-chip"><span class="live-dot"></span> My Workshop <small>PRIVATE PREVIEW</small></div><p class="nav-label">EXPLORE THE WORKSHOP</p><nav aria-label="Workshop sections">{navigation(active)}</nav><div class="sidebar-bottom"><p>This is an owner preview. Demo progress does not confirm a purchase or grant access to kit files.</p><a href="/account/">Account →</a><a href="/admin/">Admin Desk →</a><a href="/">Shop home →</a></div></aside><div class="main-column"><header class="topbar"><span>My Little Project <b>/</b> My Workshop <b>/</b> {escape(title)}</span><a href="/account/">Account →</a></header><main id="main" class="content"><div class="page-heading"><div><span class="eyebrow">{escape(eyebrow)}</span><h1>{escape(title)}<span>.</span></h1><p>{escape(description)}</p></div><span class="preview-badge">OWNER PREVIEW · NO PURCHASES</span></div><div class="notice" id="save-status" role="status">Loading your private demo progress…</div>{content}</main></div></div><script src="/assets/workshop.js?v=20261110-1" defer></script></body></html>
'''


def progress(label="RC Buggy journey"):
    return f'''<div class="progress-card"><div class="progress-top"><span class="eyebrow">{label.upper()}</span><strong data-progress>0%</strong></div><progress max="5" value="0" data-progress-bar aria-label="{label} reviewed stages">0 of 5</progress><p data-count>0 of 5 draft stages reviewed</p></div>'''


def start():
    return '<div class="start-panel" data-start-panel hidden><p>Add the RC Buggy prototype to your private demo Workshop to save which draft stages you have reviewed.</p><button class="button primary start-demo" type="button">Add RC Buggy demo →</button></div>'


def list_stages(interactive=False):
    rows = []
    for number, info in enumerate(STAGES, 1):
        link = f'<a href="{stage_url(number)}">Read draft stage →</a>'
        control = f'<button class="button secondary stage-toggle" data-stage="{number}" type="button" aria-pressed="false" disabled>Mark reviewed</button>' if interactive else ""
        rows.append(f'<li class="stage-row"><span class="stage-number">{number:02d}</span><div><strong>{escape(info["title"])}</strong><p>{escape(info["intro"])}</p>{link}</div>{control}</li>')
    return '<ol class="stage-list">' + "".join(rows) + '</ol>'


def home():
    body = f'''<section class="hero"><div><span class="hero-kicker">FROM IDEA TO BUILD</span><h2>A place for every<br><em>little discovery.</em></h2><p>Explore the RC Buggy build journey, review its draft stages and see where project guides and printable parts will live.</p><a class="button light" href="{PROJECT}">Open the RC Buggy journey →</a></div><div class="hero-card" aria-hidden="true">IDEA<br>→ MAKE<br>→ EXPLORE <span>✳</span></div></section><div class="metric-grid"><div><span>DEMO PROJECT</span><strong>01</strong><small>Little RC Buggy</small></div><div><span>STAGES REVIEWED</span><strong data-stage-count>0 / 5</strong><small>Saved to your account</small></div><div><span>CONCEPT PARTS</span><strong>04</strong><small>No files or orders yet</small></div></div><div class="two-panels"><section class="panel"><span class="eyebrow">ON YOUR WORKBENCH</span><h2>Little RC Buggy</h2><p>A solder-free family build in development. Explore the five proposed stages without treating these outlines as verified instructions.</p>{progress()}{start()}<a class="text-link" href="{PROJECT}">View the project workspace →</a></section><section class="panel"><span class="eyebrow">KEEP EXPLORING</span><h2>What will live here</h2><div class="feature-links"><a href="{BASE}garage/"><strong>Project Garage</strong><span>Saved demo projects and progress →</span></a><a href="{BASE}prints/"><strong>3D Print Library</strong><span>Concept replacements and upgrades →</span></a><a href="/projects/"><strong>Shop projects</strong><span>Flight Radar, RC Buggy and more →</span></a></div></section></div><div class="caution"><strong>Development preview.</strong> No purchase has been verified, and the stage outlines are not build or electrical safety instructions. Checkout and downloadable files remain unavailable.</div>'''
    return page("My Workshop", "YOUR DIGITAL WORKBENCH", "Your projects, build journeys and maker resources in one place.", body)


def garage():
    body = f'''<section class="panel"><span class="eyebrow">SAVED DEMO PROJECTS</span><h2>On your bench</h2><p>The RC Buggy journey can be added for testing. Its stage markers are private to your production account and do not represent ownership of a purchased kit.</p><div class="project-card" data-project-card hidden><div><span class="pill">LP-031 · PROTOTYPE</span><h3>Little RC Buggy</h3><p>A proposed five-stage family build.</p></div>{progress()}<a class="button primary" href="{PROJECT}">Resume journey →</a></div><div class="empty-project" data-empty-project hidden><p>No demo projects saved yet.</p>{start()}</div></section><section class="panel spaced"><span class="eyebrow">FUTURE GARAGE</span><h2>Built to keep projects going</h2><div class="feature-grid"><div><strong>Replacement parts</strong><p>Find tested parts by kit revision.</p></div><div><strong>Upgrades</strong><p>Try new challenges with the same kit.</p></div><div><strong>Guides</strong><p>Return to verified instructions when ready.</p></div><div><strong>Compatibility</strong><p>Match parts and files to hardware revisions.</p></div></div></section>'''
    return page("Project Garage", "YOUR SAVED PROJECTS", "A future home for kits, progress, parts and upgrades.", body, "garage")


def prints():
    parts = [
        ("replacement", "Buggy wheel bracket", "LP-031", "LP031-BRACKET"),
        ("upgrade", "Buggy body shell", "LP-031", "LP031-SHELL"),
        ("enclosure", "Flight Radar enclosure", "LP-001", "LP001-CASE"),
        ("upgrade", "Buggy sensor mount", "LP-031", "LP031-SENSOR"),
    ]
    cards = "".join(f'<article class="panel print-card" data-kind="{kind}"><span class="pill">{kind.upper()} · CONCEPT</span><h2>{name}</h2><p>{project} · proposed part {sku}</p><small>No validated 3D file or order is available.</small></article>' for kind, name, project, sku in parts)
    filters = "".join(f'<button type="button" class="filter-button" data-filter="{kind}" aria-pressed="{str(kind == "all").lower()}">{label}</button>' for kind, label in [("all", "All parts"), ("replacement", "Replacements"), ("upgrade", "Upgrades"), ("enclosure", "Enclosures")])
    body = f'''<div class="caution"><strong>Concept library.</strong> These proposed parts have not passed compatibility, material, safety or licence checks. No STL, 3MF or STEP files can be downloaded or purchased.</div><div class="filters" role="group" aria-label="Filter concept parts">{filters}</div><p class="result-count" id="print-count" role="status">4 concept parts shown</p><div class="print-grid">{cards}</div><section class="panel spaced"><h2>Every approved print will need</h2><p>Kit and revision compatibility, material and orientation guidance, assembly notes, creator attribution and licence terms before any file or ready-printed part is offered.</p></section>'''
    return page("3D Print Library", "PARTS & POSSIBILITIES", "Explore proposed replacements, enclosures and upgrades.", body, "prints")


def project():
    body = f'''<div class="two-panels project-layout"><section class="panel"><span class="eyebrow">LP-031 · SOLDER-FREE FIRST</span><h2>Five draft stages</h2><p>Track which planning outlines you have reviewed. Marking a stage does not mean the physical kit has been built.</p>{progress()}{start()}{list_stages(True)}</section><aside class="panel"><span class="eyebrow">PROJECT RESOURCES</span><h2>Coming together</h2><div class="feature-links"><div><strong>Build guide</strong><span>Draft outlines only</span></div><div><strong>Video lessons</strong><span>In preparation</span></div><div><strong>Code & wiring</strong><span>Awaiting validation</span></div><a href="{BASE}prints/"><strong>Concept 3D parts</strong><span>Browse the print library →</span></a></div><div class="caution"><strong>Planning notes only.</strong> No verified wiring, battery or operation instructions are provided here.</div></aside></div>'''
    return page("Little RC Buggy", "YOUR PROJECT JOURNEY", "A private preview of the family build experience.", body, "project")


def stage(number, info):
    prev = f'<a href="{stage_url(number - 1)}">← Previous stage</a>' if number > 1 else ""
    next_stage = f'<a href="{stage_url(number + 1)}">Next stage →</a>' if number < len(STAGES) else ""
    questions = "".join(f'<div><strong>{escape(q)}</strong><p>{escape(a)}</p></div>' for q, a in info["questions"])
    body = f'''<nav class="stage-travel" aria-label="Build journey"><a href="{PROJECT}">← All stages</a>{prev}{next_stage}</nav><div class="caution"><strong>Learning preview only.</strong> This planning outline is not a verified assembly guide. Do not use it to wire, power or operate a real kit.</div><div class="two-panels project-layout"><article class="panel"><span class="eyebrow">STAGE {number:02d} OF 05 · DRAFT</span><h2>{escape(info["title"])}</h2><p>{escape(info["intro"])}</p><h3>Before you begin</h3><p>{escape(info["before"])}</p><h3>Stage overview</h3><ol class="content-list">{"".join(f'<li>{escape(item)}</li>' for item in info["overview"])}</ol><div class="review-stage"><p>Mark this draft stage as reviewed in your private demo progress.</p>{start()}<button class="button secondary stage-toggle" data-stage="{number}" type="button" aria-pressed="false" disabled>Mark reviewed</button></div></article><aside class="panel"><span class="eyebrow">STILL NEEDED</span><h2>Before this becomes a guide</h2><ul class="content-list">{"".join(f'<li>{escape(item)}</li>' for item in info["needed"])}</ul><h3>Questions to resolve</h3><div class="questions">{questions}</div></aside></div>'''
    return page(f"Stage {number:02d}: {info['title']}", "RC BUGGY · BUILD JOURNEY", info["intro"], body, "project", number)


def sign_in():
    body = '<section class="panel"><h2>Your account lives on the main site</h2><p>Sign-in now uses the production My Little Project account. The private Workshop preview is available to the owner account while it is being developed.</p><a class="button primary" href="/account/?next=%2Fworkshop%2F">Open account →</a></section>'
    return page("Workshop sign-in", "ACCOUNT", "One account for the shop and private workspaces.", body)


PAGES = [
    ("workshop/index.html", home()),
    ("workshop/garage/index.html", garage()),
    ("workshop/prints/index.html", prints()),
    ("workshop/projects/lp-031/index.html", project()),
    ("workshop/sign-in/index.html", sign_in()),
]
PAGES.extend((f"workshop/projects/lp-031/stages/{number:02d}/index.html", stage(number, info)) for number, info in enumerate(STAGES, 1))
for name, content in PAGES:
    path = ROOT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(name)
