"""Render the public, pre-launch My Little Project storefront.

Cloudflare Pages serves the generated HTML at the repository root, without a build step.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
DOMAIN = "https://mylittleproject.co.uk"

PROJECTS = [
    {
        "slug": "little-flight-radar", "id": "LP-001", "name": "Little Flight Radar",
        "category": "Electronics & discovery", "art": "radar", "badge": "Prototype in development",
        "short": "Build a round-screen aircraft tracker and discover what's flying above you.",
        "intro": "A little window into a very big sky. We're prototyping a hands-on aircraft tracking build that brings real-world signals, a display and a good question together.",
        "tagline": "Look up. Build something brilliant.",
        "features": [
            ("Build the display", "Put the pieces together and see how a receiver, controller and screen become a working project."),
            ("Explore the sky", "Discover aircraft around you and turn an everyday glance upward into a new question."),
            ("Learn as you go", "Get to know the signals and simple electronics behind the experience, one step at a time."),
        ],
        "bench": "The ADS-B receiver, round display, enclosure and beginner-friendly instructions are being tested. Reception will depend on location and the final kit design. The exact parts, price and release date are still to be confirmed.",
        "audience": "A shared build for curious families and first-time makers who want to see technology connect with the world outside.",
    },
    {
        "slug": "little-rc-buggy", "id": "LP-031", "name": "Little RC Buggy",
        "category": "Robotics & RC", "art": "buggy", "badge": "Prototype in development",
        "short": "Put together a small robot car, take control, and make it move your way.",
        "intro": "Start with parts on the table. Finish with a buggy you built together. We're developing a hands-on RC project that makes the mechanics and electronics part of the fun.",
        "tagline": "Build it. Drive it. Discover it.",
        "features": [
            ("Build the buggy", "See how the chassis, wheels, motors and electronics come together to make motion."),
            ("Take the wheel", "We're testing an ESP32 handheld controller and a phone control option for the final experience."),
            ("Make it yours", "Experiment, troubleshoot and try a new idea after the first drive."),
        ],
        "bench": "The solder-free assembly approach, parts list, control options and build guide are being prototyped. Final contents, price and launch timing are not yet confirmed.",
        "audience": "Made for a child and grown-up to tackle side by side, and for curious first-time builders who like to see how things move.",
    },
    {
        "slug": "build-and-race-twin-pack", "id": "LP-036", "name": "Build & Race Twin Pack",
        "category": "Build-together bundle", "art": "twin", "badge": "Concept in development",
        "short": "Two buggy builds, two controllers, and plenty of room for friendly competition.",
        "intro": "Double the building, then line them up for a race. This planned bundle brings two Little RC Buggy builds together for families who want to make and play as a team.",
        "tagline": "Two builds. Twice the fun.",
        "features": [
            ("Build side by side", "Follow the same project together, compare your approaches and help each other through the tricky bits."),
            ("Take control", "The concept includes two buggies and two handheld controllers, subject to prototype testing."),
            ("Race and experiment", "Try a course, make an adjustment and see what changes on the next run."),
        ],
        "bench": "This is a bundle concept built around the Little RC Buggy prototype. Kit contents, controller design, price and availability depend on the single buggy build being validated first.",
        "audience": "An optional larger build for siblings, friends or two generations who want to make and race together.",
    },
    {
        "slug": "little-ai-rover", "id": "LP-041", "name": "Little AI Rover",
        "category": "Robotics & coding", "art": "robot", "badge": "Prototype concept",
        "short": "Build a family rover, then explore driving, sensors and an optional vision-AI idea.",
        "intro": "A robot project with room to grow. We're exploring a solder-free rover that starts with building and coding, then adds sensors and a carefully tested AI vision option.",
        "tagline": "Build a rover. Teach it what to do.",
        "features": [
            ("Build it together", "Explore a shared rover platform designed around approachable assembly and clear, step-by-step support."),
            ("Code what happens next", "Try driving and sensor challenges. Line following and obstacle avoidance are planned coding activities, not artificial intelligence."),
            ("Explore a vision idea", "A higher edition could use a family phone, tablet or computer to recognise selected objects and send a command to the rover. This needs a working prototype before it can be promised."),
        ],
        "bench": "This is an early product concept. We have not selected the controller, confirmed the bill of materials, built the vision feature or tested privacy, safety, durability and the family guide. Prices below are planning ranges only, not confirmed retail prices.",
        "audience": "A child and grown-up who want to build a small robot, learn how its code works and add new challenges over time.",
        "editions": [
            ("Build & Drive", "£29.99–£39.99 target", "A solder-free rover for driving and beginner coding. The controller and all required parts must be costed as part of the kit."),
            ("Smart Explorer", "£49.99–£69.99 target", "An expanded sensor edition with guided line-following and obstacle-avoidance challenges. These are programmed behaviours, not AI."),
            ("AI Vision Rover", "£89.99–£129.99+ target", "A proposed premium edition using a phone, tablet or computer for object recognition. Device compatibility, processing method and privacy need a proof of concept."),
        ],
    },
]

def head(title, description, path="/"):
    url = DOMAIN + path
    return f'''<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#194e43">
  <meta name="description" content="{escape(description, quote=True)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="My Little Project">
  <meta property="og:title" content="{escape(title, quote=True)}">
  <meta property="og:description" content="{escape(description, quote=True)}">
  <meta property="og:url" content="{url}">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/site.css">
  <title>{escape(title)}</title>
</head>'''

def header(active=""):
    return f'''<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="announcement"><span class="sparkle">✳</span> A small shop for big discoveries <span class="announcement-divider">·</span> New kits are in development <span class="sparkle">✳</span></div>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="My Little Project home"><span class="brand-mark" aria-hidden="true"><span class="mark-stem">m</span><span class="mark-star">✦</span></span><span class="brand-type">my little<br><strong>project</strong><span class="brand-period">.</span></span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu"><span></span><span></span><span></span></button>
    <nav id="primary-nav" class="primary-nav" aria-label="Primary navigation">
      <a class="{'current' if active=='projects' else ''}" href="/projects/">Explore projects</a>
      <a href="/#how-it-works">How it works</a>
      <a class="{'current' if active=='about' else ''}" href="/about/">Our story</a>
      <a class="nav-cta" href="/#updates">Get launch updates <span aria-hidden="true">→</span></a>
    </nav>
  </div>
</header>'''

def footer():
    return '''<footer class="site-footer"><div class="container footer-main">
  <div><a class="footer-brand" href="/">my little project<span>.</span></a><p>Little projects. Big memories.<br>Made for curious minds and time well spent together.</p></div>
  <div><h2>Explore</h2><a href="/projects/">All projects</a><a href="/projects/little-flight-radar/">Little Flight Radar</a><a href="/projects/little-rc-buggy/">Little RC Buggy</a><a href="/about/">Our story</a></div>
  <div><h2>Stay in the loop</h2><a href="/#updates">Launch updates</a><a href="/creators/">For creators</a><a href="mailto:hello@mylittleproject.co.uk">Say hello</a><a href="/privacy-policy/">Privacy policy</a></div>
  <div class="footer-stamp" aria-hidden="true">made<br><em>together</em><span>✳</span></div>
</div><div class="container footer-bottom"><span>© <span id="year">2026</span> My Little Project. Built with curiosity in the UK.</span><span>Build. Learn. Create.</span></div></footer>
<script src="/assets/site.js" defer></script>
</body></html>'''

def art(kind, extra=""):
    description = {"radar": "a round flight radar display", "buggy": "a build-your-own RC buggy", "twin": "two RC buggies and controllers", "robot": "a small family-built robot rover"}.get(kind, "a family STEM project")
    return f'<div class="project-art art-{kind} {extra}"><span class="art-grid" aria-hidden="true"></span><img src="/assets/{kind}.svg" alt="Concept illustration of {description}" loading="lazy"><span class="art-corner">MLP / MAKE 01</span></div>'

def card(p, featured=False):
    path = f'/projects/{p["slug"]}/'
    return f'''<article class="project-card {'featured-card' if featured else ''}" data-shop-id="{p['id']}">
      <a class="card-art-link" href="{path}" aria-label="Explore {p['name']}">{art(p['art'])}</a>
      <div class="card-content"><div class="card-meta"><span>{p['id']} / {p['category']}</span><span class="status-dot">{p['badge']}</span></div>
      <h3><a href="{path}">{p['name']}</a></h3><p>{p['short']}</p>
      <a class="text-link" href="{path}">Explore the project <span aria-hidden="true">→</span></a></div>
    </article>'''

def signup():
    return '''<section class="signup-section" id="updates"><div class="container signup-layout">
  <div class="signup-copy"><span class="eyebrow light"><span class="eyebrow-line"></span> THE GOOD STUFF, FIRST</span><h2>Be first to<br><em>build.</em></h2><p>Follow the prototypes, get behind-the-scenes notes and hear when the first kits are ready.</p><div class="signup-small"><span>✳</span> Thoughtful updates, not inbox clutter.</div></div>
  <div class="signup-form-card"><div class="form-kicker">JOIN THE BUILD CREW <span>→</span></div><h3>Curiosity looks good on you.</h3><p>Sign up for launch news from My Little Project.</p><div class="ml-embedded" data-form="SNDM4W"></div><small>By subscribing, you agree to receive our emails. Unsubscribe anytime. Read our <a href="/privacy-policy/">privacy policy</a>.</small></div>
</div></section>
<script>(function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[]).push(arguments);},l=d.createElement(e),l.async=1,l.src=u,n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n);})(window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');ml('account','2743003');</script>'''

def home():
    return head("My Little Project | Build-together electronics & STEM kits", "Solder-free DIY electronics and STEM projects in development for curious families. Discover Little Flight Radar, Little RC Buggy and more.") + header() + f'''<main id="main">
<section class="hero"><div class="container hero-layout"><div class="hero-copy"><span class="eyebrow hero-eyebrow"><span class="eyebrow-line"></span> FOR THE CURIOUS & THE HANDS-ON</span><h1>Little projects.<br><em>Big memories.</em></h1><p>Thoughtful, build-together electronics and STEM kits for the curious kid in all of us. Get stuck in, figure it out and make something you're proud to say you built.</p><div class="hero-actions"><a class="button button-yellow" href="/projects/">Explore our projects <span aria-hidden="true">→</span></a><a class="button button-ghost" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div><div class="hero-note"><span>✳</span> Solder-free first <i></i> Core kits planned under £40</div></div>
<div class="hero-visual" aria-label="Illustrations of the Little RC Buggy and Flight Radar projects" role="img"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><span class="hero-scribble">make<br>something<br><em>amazing!</em></span><div class="hero-radar"><img src="/assets/radar.svg" alt=""></div><div class="hero-buggy"><img src="/assets/buggy.svg" alt=""></div><div class="hero-ticket">01 / LET'S MAKE IT <span>✦</span></div><div class="hero-caption">IDEA → BUILD → WOW</div></div></div><div class="hero-scroll container"><span>SCROLL TO EXPLORE</span><span>↓</span></div></section>
<section class="values-strip"><div class="container values-grid"><div><span class="value-icon">✳</span><span><strong>Solder-free first</strong><small>Designed for first-time makers</small></span></div><div><span class="value-icon">→</span><span><strong>Make it together</strong><small>Quality time with a purpose</small></span></div><div><span class="value-icon">◎</span><span><strong>Learn by doing</strong><small>Real skills, real discoveries</small></span></div><div><span class="value-icon">£</span><span><strong>Within reach</strong><small>Core kits targeted under £40</small></span></div></div></section>
<section class="section projects-section" id="projects"><div class="container"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE WORKBENCH</span><h2>Good things are<br><em>in the making.</em></h2></div><div class="heading-aside"><p>Our first ideas are becoming real projects. We're testing the parts, the instructions and the fun before anything goes on sale.</p><a class="text-link" href="/projects/">See all projects <span aria-hidden="true">→</span></a></div></div><div class="card-grid">{''.join(card(p) for p in PROJECTS)}</div><p class="section-footnote">Illustrations show project concepts. Final kit contents, pricing and launch dates are being confirmed.</p></div></section>
<section class="feature-section"><div class="container feature-layout"><div class="feature-visual"><div class="feature-paper"><span>FIELD NOTES / NO. 001</span><div class="paper-radar"><img src="/assets/radar.svg" alt="Concept illustration of the Little Flight Radar"></div><strong>What’s flying<br>overhead?</strong><small>look up / tune in / discover</small></div><div class="feature-label">FROM THE WORKBENCH <span>→</span></div></div><div class="feature-copy"><span class="eyebrow"><span class="eyebrow-line"></span> START WITH A QUESTION</span><h2>What if we<br><em>made it ourselves?</em></h2><p>That’s where the best projects begin. The Little Flight Radar is an early build in progress: a round-screen aircraft tracker made to turn signals in the sky into a hands-on discovery at home.</p><div class="feature-bullets"><span><b>01</b> Build the pieces</span><span><b>02</b> See it come to life</span><span><b>03</b> Keep exploring</span></div><a class="button button-dark" href="/projects/little-flight-radar/">Meet Little Flight Radar <span aria-hidden="true">→</span></a></div></div></section>
<section class="section how-section" id="how-it-works"><div class="container"><div class="section-heading compact"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE LITTLE PROJECT WAY</span><h2>Made for the <em>“we did it!”</em> moment.</h2></div></div><div class="steps-grid"><div class="step-card"><span>01 / START</span><div class="step-icon">◇</div><h3>Pick a project</h3><p>Find a build that sparks a question. Our early kits are being designed with beginners and families in mind.</p></div><div class="step-card"><span>02 / MAKE</span><div class="step-icon">✳</div><h3>Build it together</h3><p>Follow a clear route from the first component to that satisfying moment when it comes to life.</p></div><div class="step-card"><span>03 / EXPLORE</span><div class="step-icon">→</div><h3>See where it goes</h3><p>Play, test, tweak and learn something new. The build is the beginning of the adventure.</p></div></div></div></section>
<section class="range-section"><div class="container range-layout"><div><span class="eyebrow light"><span class="eyebrow-line"></span> MORE IDEAS ON THE TABLE</span><h2>A whole world of<br><em>little projects.</em></h2><p>We're working toward a varied catalogue of 30+ projects over time. First come the builds we can prototype properly; other ideas stay in research until they're ready to earn a place.</p><a class="button button-outline-light" href="/projects/">Explore the workbench <span aria-hidden="true">→</span></a></div><div class="range-list"><div><span>01</span><strong>Electronics & coding</strong><small>First prototypes</small></div><div><span>02</span><strong>Robotics & RC</strong><small>First prototypes</small></div><div><span>03</span><strong>Miniature engineering</strong><small>In research</small></div><div><span>04</span><strong>Models & discovery</strong><small>In research</small></div></div></div></section>
{signup()}
<section class="closing-note"><div class="container"><span>✳</span><p>Because the best way to learn something new<br>is to <em>make something together.</em></p><a class="text-link" href="/about/">Get to know us <span aria-hidden="true">→</span></a></div></section>
</main><script src="/assets/public-catalogue.js" defer></script>''' + footer()

def projects_page():
    return head("Explore Projects | My Little Project", "Explore family build-together DIY electronics and STEM kit concepts in development, including Little Flight Radar, Little RC Buggy and Little AI Rover.", "/projects/") + header("projects") + f'''<main id="main"><section class="subhero"><div class="container subhero-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE PROJECT WORKBENCH</span><h1>Find your next<br><em>little adventure.</em></h1><p>From the sky above to a rover on the living room floor, our family build-together projects are taking shape. Take a look at what's on the bench.</p></div><div class="subhero-stamp" aria-hidden="true">build<br>learn<br><em>create ✳</em></div></div></section>
<section class="section listing-section"><div class="container"><div class="list-title"><span class="eyebrow"><span class="eyebrow-line"></span> FIRST UP</span><p>These are projects in development, not products currently for sale.</p></div><div class="card-grid">{''.join(card(p) for p in PROJECTS)}</div></div></section>
<section class="section" id="catalogue-preview" hidden><div class="container"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-line"></span> NEW FROM THE WORKBENCH</span><h2>More ideas<br><em>taking shape.</em></h2></div><p class="section-side">These are public previews from our evolving catalogue. Kit details and launch dates are still being tested.</p></div><div class="card-grid" id="catalogue-grid"></div></div></section>
<section class="idea-section"><div class="container idea-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> A LITTLE FURTHER AHEAD</span><h2>Ideas worth<br><em>exploring.</em></h2><p>We're researching miniature mechanisms, model builds, science and more. We want each idea to make sense for a first-time builder before it becomes a kit.</p></div><div class="idea-tags"><span>Miniature engineering <b>Research</b></span><span>Model building <b>Research</b></span><span>Science & discovery <b>Research</b></span><span>3D printed parts <b>Research</b></span></div></div></section>{signup()}<script src="/assets/public-catalogue.js" defer></script></main>''' + footer()

def project_page(p):
    path = f'/projects/{p["slug"]}/'
    features = ''.join(f'<div class="feature-item"><span>0{i}</span><h3>{title}</h3><p>{copy}</p></div>' for i,(title,copy) in enumerate(p['features'],1))
    next_p = PROJECTS[(PROJECTS.index(p)+1)%len(PROJECTS)]
    editions = ''
    if p.get("editions"):
        editions = '<section class="section rover-editions" id="editions"><div class="container"><div class="section-heading compact"><div><span class="eyebrow"><span class="eyebrow-line"></span> THREE WAYS TO BUILD</span><h2>Start small.<br><em>Add more when ready.</em></h2></div><p class="section-side">Early price targets only. No edition is available to order; kit contents and costs have not been validated.</p></div><div class="rover-edition-grid">' + ''.join(f'<article class="rover-edition"><span class="edition-stage">PROTOTYPE IDEA / 0{i}</span><h3>{title}</h3><strong>{price}</strong><p>{copy}</p><span class="edition-note">Not for sale · awaiting prototype and BOM</span></article>' for i,(title,price,copy) in enumerate(p['editions'],1)) + '</div><p class="rover-ai-note"><strong>Our AI promise:</strong> sensor routines like line following are programmed behaviours, not AI. We will only call the premium idea AI after a working object-recognition demo, compatible device list and privacy approach are confirmed.</p></div></section>'
    return head(f"{p['name']} | My Little Project", f"{p['short']} An upcoming hands-on family project from My Little Project.", path) + header("projects") + f'''<main id="main" data-shop-slug="{p['slug']}"><section class="detail-hero"><div class="container"><a class="back-link" href="/projects/">← All projects</a><div class="detail-layout"><div class="detail-copy"><span class="eyebrow"><span class="eyebrow-line"></span> {p['id']} / {p['category'].upper()}</span><h1 id="shop-title">{p['name']}<span>.</span></h1><p class="detail-tagline">{p['tagline']}</p><p class="detail-intro" id="shop-description">{p['intro']}</p><div class="detail-actions"><a class="button button-dark" href="#updates">Get launch updates <span aria-hidden="true">→</span></a><a class="text-link" href="#inside">Explore the idea <span aria-hidden="true">↓</span></a></div><div class="detail-status"><span class="status-dot">{p['badge']}</span><span>Final kit details are being tested</span></div></div><div class="detail-art-wrap">{art(p['art'])}<span class="detail-art-note">PROJECT CONCEPT / {p['id']}</span></div></div></div></section>
<section class="section detail-features" id="inside"><div class="container"><div class="section-heading compact"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE IDEA</span><h2>Build it. <em>Make it yours.</em></h2></div><p class="section-side">Every detail is being refined around the experience of building and discovering together.</p></div><div class="detail-feature-grid">{features}</div></div></section>{editions}
<section class="bench-section"><div class="container bench-layout"><div class="bench-symbol">✳</div><div><span class="eyebrow light"><span class="eyebrow-line"></span> HONESTLY, IT'S STILL ON THE BENCH</span><h2>What we're<br><em>working through.</em></h2></div><div><p>{p['bench']}</p><div class="bench-divider"></div><strong>Who is it for?</strong><p>{p['audience']}</p></div></div></section>
<section class="section next-project"><div class="container next-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> KEEP EXPLORING</span><h2>More to make,<br><em>more to discover.</em></h2></div><a href="/projects/{next_p['slug']}/" class="next-card"><span>UP NEXT / {next_p['id']}</span><strong>{next_p['name']}</strong><span class="next-arrow" aria-hidden="true">→</span></a></div></section>{signup()}<script src="/assets/public-catalogue.js" defer></script></main>''' + footer()

def about():
    return head("Our Story | My Little Project", "Meet My Little Project, a UK project brand developing hands-on, build-together DIY electronics and STEM kits for curious families.", "/about/") + header("about") + '''<main id="main"><section class="subhero about-hero"><div class="container subhero-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> HELLO, WE'RE MY LITTLE PROJECT</span><h1>Little projects.<br><em>Big memories.</em></h1><p>We're here for the afternoons when a question becomes a project, and a project becomes a memory you keep talking about.</p></div><div class="about-doodle" aria-hidden="true"><span>start with<br>curiosity</span><b>✳</b><i>make something<br>together →</i></div></div></section>
<section class="section story-section"><div class="container story-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE REASON WE'RE HERE</span><h2>Made for the<br><em>moment it clicks.</em></h2></div><div class="story-prose"><p class="large">My Little Project started with a simple thought: what if we made more time to make things together?</p><p>We're a UK, dad-founded project brand working on hands-on kits that invite curious kids and grown-ups to try something new side by side. Our early ideas bring electronics, robotics and discovery into an approachable build.</p><p>We want the steps to feel achievable, the learning to happen naturally and the finished project to be something you're excited to show someone else. Solder-free builds and affordable core kits are the direction we're designing for as we test our first prototypes.</p><a class="text-link" href="/projects/">See what's on the bench <span aria-hidden="true">→</span></a></div></div></section>
<section class="section principles-section"><div class="container"><div class="section-heading compact"><div><span class="eyebrow"><span class="eyebrow-line"></span> WHAT GUIDES US</span><h2>Curiosity, with <em>both hands in.</em></h2></div></div><div class="steps-grid"><div class="step-card"><span>01 / MAKE</span><div class="step-icon">✳</div><h3>Hands-on first</h3><p>We want you to build the thing, understand the pieces and feel proud of the result.</p></div><div class="step-card"><span>02 / DISCOVER</span><div class="step-icon">◎</div><h3>Curiosity welcome</h3><p>A kit can start with instructions and end with a hundred new questions.</p></div><div class="step-card"><span>03 / TOGETHER</span><div class="step-icon">♡</div><h3>Make memories</h3><p>The best part is often who sat beside you when you figured it out.</p></div></div></div></section>''' + signup() + '''</main>''' + footer()

def creators_page():
    return head("For Creators | My Little Project", "A curated creator programme in development for original family build-together DIY electronics and STEM project ideas.", "/creators/") + header() + '''<main id="main"><section class="subhero"><div class="container subhero-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> THE CREATOR PROGRAMME</span><h1>Got a little project<br><em>worth sharing?</em></h1><p>We're exploring a curated home for makers who dream up brilliant build-together projects. The programme is still taking shape.</p><a class="button button-dark" href="mailto:hello@mylittleproject.co.uk?subject=Creator%20programme%20interest">Tell us your idea →</a></div><div class="subhero-stamp" aria-hidden="true">imagine<br>make<br><em>share ✳</em></div></div></section><section class="section"><div class="container"><div class="section-heading compact"><div><span class="eyebrow"><span class="eyebrow-line"></span> A THOUGHTFUL PATH</span><h2>From idea to <em>something real.</em></h2></div></div><div class="steps-grid"><div class="step-card"><span>01 / DESIGN</span><div class="step-icon">◇</div><h3>Bring your idea</h3><p>Capture the prototype, the parts and what makes it a rewarding family build.</p></div><div class="step-card"><span>02 / DEVELOP</span><div class="step-icon">✳</div><h3>Shape the kit</h3><p>We would review feasibility, safety, build guidance, rights and costs together.</p></div><div class="step-card"><span>03 / SHARE</span><div class="step-icon">→</div><h3>Agree the next step</h3><p>Only approved projects with separate written terms could progress toward a marketplace.</p></div></div></div></section><section class="idea-section"><div class="container idea-layout"><div><span class="eyebrow"><span class="eyebrow-line"></span> PILOT WORKSPACE</span><h2>A place for<br><em>your next build.</em></h2><p>Creator Studio is a private development workspace for approved makers. It can save project drafts, guide notes and submissions for internal review. File uploads, royalties and public sales are not connected yet.</p><a class="button button-dark" href="/studio/">Approved creators: sign in →</a></div><div class="idea-tags"><span>Project drafts <b>Private</b></span><span>Guide and parts notes <b>Private</b></span><span>Review feedback <b>Private</b></span><span>Marketplace sales <b>Later</b></span></div></div></section></main>''' + footer()

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content + "\n", encoding="utf-8")

write("index.html", home())
write("projects/index.html", projects_page())
for project in PROJECTS:
    write(f"projects/{project['slug']}/index.html", project_page(project))
write("about/index.html", about())
write("creators/index.html", creators_page())
