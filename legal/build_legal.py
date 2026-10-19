"""Build local HTML and structured content from the reviewed English text sources."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent
EN = ROOT / "en"
SLUGS = ("privacy-policy", "terms-of-service", "eula")
LABELS = ("Privacy Policy", "Terms of Service", "EULA")
STYLE = """
:root{color-scheme:light;--ink:#19232b;--muted:#53616b;--accent:#244f58;--line:#d5dfdf;--paper:#fff;--bg:#f4f7f6}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.72 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow-wrap:anywhere}
a{color:var(--accent);text-underline-offset:3px}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.wrap{max-width:900px;margin:auto;padding:42px 42px 70px;background:var(--paper);min-height:100vh}
nav{display:flex;flex-wrap:wrap;gap:10px 24px;padding-bottom:22px;border-bottom:1px solid var(--line);font-size:14px}
nav a[aria-current=page]{font-weight:700}header{margin:32px 0 28px}h1{font-size:clamp(28px,5.5vw,42px);line-height:1.18;letter-spacing:-.025em;margin:0 0 18px}
h2{font-size:23px;line-height:1.35;margin:38px 0 14px;letter-spacing:-.015em}p{margin:0 0 17px}
.meta,.status,footer{font-size:14px;color:var(--muted)}.status{font-weight:600}.contact{font-size:15px}
details{padding:16px 0;border-block:1px solid var(--line);margin:26px 0}summary{cursor:pointer;font-weight:600}
.toc{margin:12px 0 0;padding-left:23px}.toc li{margin:6px 0}ul{padding-left:25px;margin:10px 0 23px}li{padding-left:3px;margin-bottom:12px}
footer{margin-top:42px;border-top:1px solid var(--line);padding-top:20px}.documents{list-style:none;padding:0}.documents li{margin:20px 0}
@media(max-width:560px){.wrap{padding:24px 22px 44px}body{font-size:16px;line-height:1.75}h2{font-size:21px}nav{gap:8px 17px}header{margin-top:27px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body{background:white;font-size:11pt;line-height:1.5}.wrap{max-width:none;padding:0;min-height:0}nav,details,.download{display:none}h1{font-size:24pt}h2{font-size:15pt;break-after:avoid}p,li{widows:3;orphans:3}a{color:inherit;text-decoration:none}footer{font-size:9pt}}
"""

def link_text(text):
    escaped = escape(text, quote=False)
    escaped = escaped.replace("lunmi_user@gmail.com", '<a href="mailto:lunmi_user@gmail.com">lunmi_user@gmail.com</a>')
    return escaped.replace("reportaproblem.apple.com", '<a href="https://reportaproblem.apple.com/">reportaproblem.apple.com</a>')

def parse_source(slug):
    raw = (EN / f"{slug}.txt").read_text(encoding="utf-8")
    lines = raw.splitlines()
    sections = []
    current = None
    paragraph = []
    bullets = []

    def flush_paragraph():
        if paragraph:
            current["blocks"].append({"type": "paragraph", "text": " ".join(paragraph)})
            paragraph.clear()

    def flush_bullets():
        if bullets:
            current["blocks"].append({"type": "list", "items": list(bullets)})
            bullets.clear()

    for line in lines[3:]:
        if re.match(r"^\d+\. ", line):
            if current:
                flush_paragraph()
                flush_bullets()
            number, heading = line.split(". ", 1)
            current = {"id": f"section-{number}", "title": heading, "number": int(number), "blocks": []}
            sections.append(current)
        elif not line.strip():
            if current:
                flush_paragraph()
                # Blank lines do not split a single consecutive bullet list.
        elif line.startswith("- "):
            flush_paragraph()
            bullets.append(line[2:])
        else:
            if not current:
                raise ValueError(f"Unsectioned text: {slug}: {line}")
            flush_bullets()
            paragraph.append(line)
    flush_paragraph()
    flush_bullets()
    return {"slug": slug, "title": lines[0], "version": "1.0", "lastUpdated": "2026-10-16", "status": "review-draft", "notice": lines[2], "contactEmail": "lunmi_user@gmail.com", "minimumAge": 18, "sections": sections}

def navigation(current=None):
    return '<nav aria-label="Legal documents"><a href="index.html">Lunmi Legal</a>' + "".join(
        f'<a href="{slug}.html"' + (' aria-current="page"' if slug == current else '') + f'>{label}</a>'
        for slug, label in zip(SLUGS, LABELS)
    ) + '</nav>'

def page(title, body, lang="en"):
    return f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="{escape(title, quote=True)} — English review draft"><title>{escape(title)}</title><style>{STYLE}</style></head>
<body><div class="wrap">{body}</div></body></html>
'''

documents = [parse_source(slug) for slug in SLUGS]
for document in documents:
    slug = document["slug"]
    contents = '<details><summary>Contents</summary><ol class="toc">' + ''.join(
        f'<li><a href="#{section["id"]}">{escape(section["title"])}</a></li>'
        for section in document["sections"]
    ) + '</ol></details>'
    body = navigation(slug)
    body += f'<header><h1>{escape(document["title"])}</h1><p class="meta">Version 1.0 · Last updated October 16, 2026 · Ages 18 and older</p><p class="status">{escape(document["notice"])}</p><p class="contact">Contact: <a href="mailto:lunmi_user@gmail.com">lunmi_user@gmail.com</a></p></header>'
    body += contents + '<main id="main">'
    for section in document["sections"]:
        body += f'<section aria-labelledby="{section["id"]}"><h2 id="{section["id"]}">{section["number"]}. {escape(section["title"])}</h2>'
        for block in section["blocks"]:
            if block["type"] == "paragraph":
                body += f'<p>{link_text(block["text"])}</p>'
            else:
                body += '<ul>' + ''.join(f'<li>{link_text(item)}</li>' for item in block["items"]) + '</ul>'
        body += '</section>'
    body += f'</main><footer><p>Lunmi · English review draft · Contact: <a href="mailto:lunmi_user@gmail.com">lunmi_user@gmail.com</a></p><p class="download"><a href="{slug}.txt" download>Download plain text</a> · <a href="#main">Back to document</a></p></footer>'
    (EN / f"{slug}.html").write_text(page(document["title"], body), encoding="utf-8")

(EN / "legal-content.json").write_text(json.dumps({"app": "Lunmi", "language": "en", "status": "review-draft", "documents": documents}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

body = navigation()
body += '<main><header><h1>Lunmi Legal Documents</h1><p class="meta">English · Version 1.0 · October 16, 2026</p><p class="status">Review drafts. Verify the described practices and complete required developer details before publication.</p></header><p>These documents cover privacy, community conduct, social features, optional Lantern Coins, and the application software license. Lunmi is for people aged 18 or older.</p><ul class="documents">'
for document, label in zip(documents, LABELS):
    body += f'<li><a href="{document["slug"]}.html">{escape(document["title"])}</a><br><a href="{document["slug"]}.txt" download>Plain text</a> · {len(document["sections"])} sections</li>'
body += '</ul><p>Questions, safety reports, privacy requests, and appeals: <a href="mailto:lunmi_user@gmail.com">lunmi_user@gmail.com</a>.</p></main>'
(EN / "index.html").write_text(page("Lunmi Legal Documents", body), encoding="utf-8")

notes = (ROOT / "internal" / "PUBLICATION-NOTES.zh-CN.txt").read_text(encoding="utf-8")
paragraphs = notes.split("\n\n")
notes_body = '<main><h1>Lunmi 英文法律文档交付说明</h1><p class="status">内部使用，不属于面向用户的协议正文。</p>'
for paragraph in paragraphs[1:]:
    notes_body += '<p>' + '<br>'.join(escape(line) for line in paragraph.splitlines()) + '</p>'
notes_body += '</main>'
(ROOT / "internal" / "PUBLICATION-NOTES.zh-CN.html").write_text(page("Lunmi 英文法律文档交付说明", notes_body, "zh-CN"), encoding="utf-8")

class Validator(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.h1_count = 0
        self.external_resources = []
        self.text = []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h1":
            self.h1_count += 1
        if tag == "style":
            self.in_style = True
        if "id" in attrs:
            assert attrs["id"] not in self.ids, f"Duplicate ID: {attrs['id']}"
            self.ids.add(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag in ("script", "iframe", "img", "link"):
            self.external_resources.append((tag, attrs))

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if not self.in_style:
            self.text.append(data)

for html_file in [*EN.glob("*.html"), ROOT / "internal" / "PUBLICATION-NOTES.zh-CN.html"]:
    validator = Validator()
    validator.feed(html_file.read_text(encoding="utf-8"))
    assert validator.h1_count == 1, html_file
    assert not validator.external_resources, html_file
    for href in validator.links:
        if href.startswith("#"):
            assert href[1:] in validator.ids, (html_file, href)
        elif not re.match(r"^[a-z]+:", href):
            assert (html_file.parent / href).is_file(), (html_file, href)

for document in documents:
    headings = [s["number"] for s in document["sections"]]
    assert headings == list(range(1, len(headings) + 1)), document["slug"]
    plain_blocks = []
    for section in document["sections"]:
        assert section["blocks"], section
        for block in section["blocks"]:
            plain_blocks.extend([block["text"]] if block["type"] == "paragraph" else block["items"])
    validator = Validator()
    validator.feed((EN / f'{document["slug"]}.html').read_text(encoding="utf-8"))
    rendered_text = "".join(validator.text)
    for text in plain_blocks:
        assert text in rendered_text, (document["slug"], text[:80])
    source = (EN / f'{document["slug"]}.txt').read_text(encoding="utf-8")
    assert not re.search(r"17\s*(?:\+|years|or older)", source), document["slug"]
    assert not re.search(r"\[(?:TODO|TBD|INSERT|COMPANY|ADDRESS)", source), document["slug"]
    emails = set(re.findall(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", source))
    assert emails == {"lunmi_user@gmail.com"}, (document["slug"], emails)
    print(f'{document["slug"]}: {len(document["sections"])} sections, {len(source.split())} words, all text retained in HTML and JSON')

archive_path = ROOT / "Lunmi-English-Legal-Drafts-2026-10-16.zip"
with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted([*EN.glob("*"), * (ROOT / "internal").glob("*")]):
        if file.is_file():
            archive.write(file, arcname=str(file.relative_to(ROOT)))
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
print(f'Validated all HTML links, anchors, single titles, email consistency, section continuity, and archive integrity: {archive_path.name}')
