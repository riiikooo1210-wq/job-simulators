from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "scenes"
W, H = 1280, 720


PALETTE = {
    "paper": "#f3ead9",
    "ink": "#222222",
    "muted": "#6f6a60",
    "teal": "#3a7666",
    "mint": "#b9d8cd",
    "sky": "#9ebfc1",
    "rust": "#c86b4a",
    "gold": "#d9ad5b",
    "green": "#5a8f70",
    "red": "#b94a45",
    "blue": "#4d75a4",
    "white": "#fffaf0",
    "shadow": "#171717",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


F_TITLE = font(48, True)
F_H2 = font(28, True)
F_BODY = font(23)
F_SMALL = font(18)
F_TINY = font(15)


def line(draw: ImageDraw.ImageDraw, points, fill=PALETTE["ink"], width=3):
    draw.line(points, fill=fill, width=width, joint="curve")


def rect(draw: ImageDraw.ImageDraw, xy, fill, outline=PALETTE["ink"], width=3, radius=12):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def label(draw: ImageDraw.ImageDraw, xy, text: str, fnt=F_SMALL, fill=PALETTE["ink"], max_chars=34, leading=1.2):
    x, y = xy
    for part in "\n".join(wrap(text, max_chars)).splitlines():
        draw.text((x, y), part, font=fnt, fill=fill)
        y += int(fnt.size * leading)


def base(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), PALETTE["sky"])
    d = ImageDraw.Draw(img)
    rect(d, (58, 52, W - 58, H - 52), PALETTE["paper"], width=4, radius=18)
    d.rectangle((58, 52, W - 58, 128), fill=PALETTE["paper"], outline=PALETTE["ink"], width=4)
    d.text((92, 76), title, font=F_H2, fill=PALETTE["ink"])
    d.text((92, 110), "Northstar Legal · emerging companies and venture financing", font=F_TINY, fill=PALETTE["muted"])
    return img, d


def laptop(d: ImageDraw.ImageDraw, x: int, y: int, w: int = 610, h: int = 360, screen="#f7efe1"):
    rect(d, (x, y, x + w, y + h), "#313c42", width=3, radius=24)
    rect(d, (x + 24, y + 24, x + w - 24, y + h - 46), screen, width=2, radius=10)
    d.rounded_rectangle((x - 38, y + h - 8, x + w + 38, y + h + 42), radius=18, fill="#c9c2b5", outline=PALETTE["ink"], width=3)
    d.rectangle((x + w // 2 - 66, y + h - 8, x + w // 2 + 66, y + h + 14), fill="#a9a195", outline=PALETTE["ink"], width=2)


def sticky(d, x, y, text, fill=PALETTE["gold"], w=170, h=96):
    rect(d, (x, y, x + w, y + h), fill, width=3, radius=6)
    label(d, (x + 14, y + 14), text, F_TINY, max_chars=18)


def doc_panel(d, xy, title, rows, accent=PALETTE["teal"]):
    x1, y1, x2, y2 = xy
    rect(d, xy, PALETTE["white"], width=3, radius=10)
    d.rectangle((x1, y1, x2, y1 + 46), fill=accent, outline=PALETTE["ink"], width=3)
    d.text((x1 + 18, y1 + 13), title, font=F_SMALL, fill=PALETTE["white"])
    y = y1 + 66
    max_chars = max(18, int((x2 - x1 - 66) / 9.5))
    for row in rows:
        d.rounded_rectangle((x1 + 18, y, x2 - 18, y + 42), radius=6, fill="#f7efe1", outline="#4d453d", width=1)
        label(d, (x1 + 30, y + 9), row, F_TINY, max_chars=max_chars, leading=1.08)
        y += 54


def draw_intro():
    img, d = base("Seed Financing Day")
    laptop(d, 342, 174, 596, 346)
    sx, sy = 382, 214
    doc_panel(d, (sx, sy, sx + 250, sy + 245), "Closing checklist", ["Board consent: signature missing", "SAFE conversion: confirm math", "IP assignment: founder follow-up"], PALETTE["teal"])
    doc_panel(d, (sx + 280, sy, sx + 515, sy + 245), "Deal notes", ["11:30 founder call", "Escalate blockers", "Annotate call notes"], PALETTE["blue"])
    sticky(d, 168, 232, "Do not overstate closing readiness", PALETTE["gold"])
    sticky(d, 930, 360, "Partner wants crisp status", PALETTE["mint"])
    d.ellipse((176, 468, 238, 530), fill="#8c5b3e", outline=PALETTE["ink"], width=3)
    d.rectangle((198, 530, 216, 600), fill="#6b4933", outline=PALETTE["ink"], width=3)
    d.text((420, 568), "Junior associate workspace: precise, calm, time-sensitive.", font=F_SMALL, fill=PALETTE["muted"])
    return img


def draw_briefing():
    img, d = base("Morning Briefing")
    laptop(d, 170, 180, 660, 350)
    doc_panel(d, (218, 226, 782, 466), "Email from Maya Chen", ["Need 2:00 PM status for LumenLoop seed financing.", "Confirm consent, cap table, SAFE conversion, IP docs.", "Call founder if anything is unclear."], PALETTE["blue"])
    doc_panel(d, (858, 170, 1115, 515), "Calendar", ["9:15 checklist pass", "11:30 founder call", "2:00 partner update"], PALETTE["teal"])
    sticky(d, 870, 542, "Use issue labels, not legal conclusions", PALETTE["gold"], 240, 84)
    return img


def draw_first_move():
    img, d = base("First Move")
    laptop(d, 135, 170, 740, 370)
    doc_panel(d, (180, 216, 508, 466), "Open items", ["Board consent unsigned", "Cap table mismatch", "SAFE conversion unclear", "IP assignment missing"], PALETTE["red"])
    doc_panel(d, (538, 216, 824, 466), "Good junior move", ["Check source docs first", "Sort by closing risk", "Ask targeted questions", "Send senior a concise update"], PALETTE["green"])
    sticky(d, 925, 212, "Avoid asking every question at once", PALETTE["gold"], 240, 96)
    sticky(d, 925, 342, "Avoid saying 'all fine' before diligence", PALETTE["mint"], 240, 96)
    return img


def draw_redirect_questions():
    img, d = base("Redirect: Question Dump")
    laptop(d, 110, 170, 610, 360)
    for i, text in enumerate(["Who signs?", "What docs?", "Cap table?", "SAFE?", "IP?", "When close?"]):
        sticky(d, 160 + (i % 3) * 162, 220 + (i // 3) * 126, text, [PALETTE["gold"], PALETTE["mint"], "#e2c4b5"][i % 3], 134, 82)
    doc_panel(d, (770, 182, 1110, 522), "Better framing", ["Owner", "Document", "Status", "Closing risk", "Exact ask"], PALETTE["teal"])
    d.text((775, 552), "Turn noise into a checklist before involving the client.", font=F_SMALL, fill=PALETTE["muted"])
    return img


def draw_redirect_polish():
    img, d = base("Redirect: Add Precision")
    doc_panel(d, (160, 178, 725, 548), "Checklist draft", ["Board consent: unsigned by Rivera", "Cap table: 38,000-share variance", "SAFE conversion: confirm discount treatment", "IP assignment: missing advisor exhibit"], PALETTE["teal"])
    for x, y in [(648, 262), (648, 316), (648, 370), (648, 424)]:
        d.ellipse((x, y, x + 24, y + 24), fill=PALETTE["red"], outline=PALETTE["ink"], width=2)
        d.text((x + 8, y + 3), "!", font=F_TINY, fill=PALETTE["white"])
    doc_panel(d, (780, 204, 1100, 500), "Senior feedback", ["Name the source document.", "Separate blocker from same-day clear.", "Ask only what the founder can answer."], PALETTE["blue"])
    return img


def draw_redirect_overclaim():
    img, d = base("Redirect: Do Not Overclaim")
    doc_panel(d, (150, 185, 650, 508), "Premature external draft", ["Everything should be fine to close.", "We are just waiting on signatures.", "No major issues from our review."], PALETTE["red"])
    line(d, [(172, 284), (622, 284)], PALETTE["red"], 5)
    line(d, [(172, 338), (604, 338)], PALETTE["red"], 5)
    doc_panel(d, (728, 185, 1120, 508), "Safer update", ["Three items need confirmation.", "Board consent is the blocking item.", "Cap table and IP docs need source checks."], PALETTE["green"])
    return img


def draw_closing_checklist():
    img, d = base("Closing Checklist")
    laptop(d, 118, 158, 820, 400)
    x1, y1 = 166, 212
    rect(d, (x1, y1, x1 + 725, y1 + 280), PALETTE["white"], width=3, radius=8)
    headers = ["Item", "Status", "Owner", "Risk", "Next action"]
    colw = [185, 110, 110, 105, 205]
    x = x1
    for i, h in enumerate(headers):
        d.rectangle((x, y1, x + colw[i], y1 + 42), fill=PALETTE["teal"], outline=PALETTE["ink"], width=2)
        d.text((x + 10, y1 + 12), h, font=F_TINY, fill=PALETTE["white"])
        x += colw[i]
    rows = [
        ["Board consent", "Unsigned", "Rivera", "Blocker", "Request signature"],
        ["Cap table", "Mismatch", "Founder", "High", "Ask for export"],
        ["IP assignment", "Missing", "Ops", "Medium", "Locate exhibit"],
    ]
    for r, row in enumerate(rows):
        x = x1
        y = y1 + 42 + r * 54
        for i, cell in enumerate(row):
            d.rectangle((x, y, x + colw[i], y + 54), fill="#f9f0df", outline="#564b41", width=1)
            label(d, (x + 8, y + 12), cell, F_TINY, max_chars=18)
            x += colw[i]
    sticky(d, 972, 218, "A junior associate owns clarity, not final legal judgment", PALETTE["gold"], 220, 112)
    sticky(d, 972, 370, "Every ask should map to a closing item", PALETTE["mint"], 220, 112)
    return img


def draw_issue_triage():
    img, d = base("Issue Triage")
    rect(d, (188, 178, 795, 542), PALETTE["white"], width=4, radius=12)
    d.line((492, 178, 492, 542), fill=PALETTE["ink"], width=3)
    d.line((188, 360, 795, 360), fill=PALETTE["ink"], width=3)
    labels = [("BLOCKER", 218, 206, PALETTE["red"]), ("SAME-DAY CLEAR", 520, 206, PALETTE["gold"]), ("TRACK", 218, 388, PALETTE["blue"]), ("DEFER", 520, 388, PALETTE["mint"])]
    for txt, x, y, color in labels:
        d.text((x, y), txt, font=F_SMALL, fill=color)
    sticky(d, 260, 260, "Board consent unsigned", PALETTE["red"], 190, 72)
    sticky(d, 548, 260, "Cap table export", PALETTE["gold"], 170, 72)
    sticky(d, 244, 440, "IP assignment", PALETTE["blue"], 170, 72)
    sticky(d, 548, 440, "Press quote", PALETTE["mint"], 170, 72)
    d.text((860, 242), "Prioritize by closing impact,\nnot by loudness.", font=F_H2, fill=PALETTE["ink"])
    d.text((860, 346), "The realistic task is triage:\nescalate blockers, clear what\ncan be cleared today, and\navoid taking partner-level\npositions.", font=F_SMALL, fill=PALETTE["muted"])
    return img


def draw_founder_call():
    img, d = base("Founder Call")
    laptop(d, 165, 158, 800, 420, "#26323a")
    rect(d, (210, 212, 550, 420), "#f0d0b8", width=3, radius=12)
    d.ellipse((344, 248, 416, 320), fill="#8c5b3e", outline=PALETTE["ink"], width=3)
    d.rectangle((318, 320, 442, 390), fill=PALETTE["blue"], outline=PALETTE["ink"], width=3)
    d.text((300, 392), "Arjun Rao · Founder", font=F_TINY, fill=PALETTE["ink"])
    rect(d, (584, 212, 906, 420), "#c8d6d0", width=3, radius=12)
    d.ellipse((704, 252, 770, 318), fill="#5e4238", outline=PALETTE["ink"], width=3)
    d.rectangle((678, 318, 798, 388), fill=PALETTE["teal"], outline=PALETTE["ink"], width=3)
    d.text((676, 392), "Maya Chen · Senior", font=F_TINY, fill=PALETTE["ink"])
    doc_panel(d, (982, 188, 1160, 528), "Call notes", ["Ask for facts", "Do not promise close", "Confirm source docs"], PALETTE["teal"])
    return img


def draw_issue_list():
    img, d = base("Annotated Checklist")
    doc_panel(d, (170, 160, 825, 560), "Post-call comments for Maya", ["Checklist row: board consent signature package.", "Comment: founder confirmed same-day signature timing.", "Checklist row: cap table / SAFE backup.", "Comment: still need backup before senior review."], PALETTE["teal"])
    laptop(d, 860, 220, 230, 190)
    d.text((892, 268), "Data room", font=F_SMALL, fill=PALETTE["ink"])
    d.rectangle((896, 314, 1052, 340), fill=PALETTE["gold"], outline=PALETTE["ink"], width=2)
    d.rectangle((896, 354, 1052, 380), fill=PALETTE["mint"], outline=PALETTE["ink"], width=2)
    return img


def draw_slack():
    img, d = base("Senior Slack Update")
    rect(d, (172, 160, 1018, 560), "#f7f7f7", width=4, radius=16)
    d.rectangle((172, 160, 364, 560), fill="#4a315f", outline=PALETTE["ink"], width=3)
    d.text((204, 198), "Northstar", font=F_H2, fill=PALETTE["white"])
    d.text((204, 250), "# ecvc-closing", font=F_SMALL, fill="#dbcce6")
    messages = [
        ("Maya", "What are the blockers, same-day clears, and client asks?"),
        ("You", "Blocker: Rivera consent signature. Same-day clear: cap table export. Client ask: updated export + IP exhibit."),
        ("Maya", "Good. Keep it source-tied and I will review before client send."),
    ]
    y = 198
    for name, text in messages:
        d.ellipse((410, y, 450, y + 40), fill=PALETTE["gold"] if name == "You" else PALETTE["teal"], outline=PALETTE["ink"], width=2)
        d.text((468, y), name, font=F_SMALL, fill=PALETTE["ink"])
        label(d, (468, y + 28), text, F_TINY, max_chars=68)
        y += 104
    return img


def draw_grading():
    img, d = base("Review Desk")
    laptop(d, 168, 158, 730, 390)
    doc_panel(d, (214, 206, 846, 492), "Work product ready for review", ["Checklist updated", "Issue triage justified", "Founder call notes captured", "Checklist comments added", "Maya review points clear"], PALETTE["green"])
    sticky(d, 934, 214, "Assessment checks judgment, precision, escalation, and tone", PALETTE["gold"], 245, 120)
    sticky(d, 934, 382, "Gemini key enables final coaching feedback", PALETTE["mint"], 245, 104)
    return img


def draw_final():
    img, d = base("Final Report")
    rect(d, (178, 150, 1020, 566), PALETTE["white"], width=4, radius=16)
    d.text((224, 194), "Junior Associate Performance Snapshot", font=F_H2, fill=PALETTE["ink"])
    categories = [("Legal judgment", 82, PALETTE["green"]), ("Issue spotting", 78, PALETTE["gold"]), ("Client communication", 86, PALETTE["green"]), ("Escalation", 80, PALETTE["blue"])]
    y = 258
    for label_text, pct, color in categories:
        d.text((224, y), label_text, font=F_SMALL, fill=PALETTE["ink"])
        d.rounded_rectangle((500, y + 2, 888, y + 24), radius=11, fill="#e6ddcf", outline=PALETTE["ink"], width=2)
        d.rounded_rectangle((500, y + 2, 500 + int(3.88 * pct), y + 24), radius=11, fill=color)
        d.text((908, y - 2), f"{pct}", font=F_SMALL, fill=PALETTE["ink"])
        y += 68
    d.text((224, 526), "Use the report to see where your legal workflow became partner-ready.", font=F_SMALL, fill=PALETTE["muted"])
    return img


DRAWERS = {
    "intro.png": draw_intro,
    "briefing_morning.png": draw_briefing,
    "first_move.png": draw_first_move,
    "redirect_questions.png": draw_redirect_questions,
    "redirect_polish.png": draw_redirect_polish,
    "redirect_overclaim.png": draw_redirect_overclaim,
    "closing_checklist.png": draw_closing_checklist,
    "issue_triage.png": draw_issue_triage,
    "founder_call.png": draw_founder_call,
    "issue_list.png": draw_issue_list,
    "grading.png": draw_grading,
    "final_report.png": draw_final,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, drawer in DRAWERS.items():
        drawer().save(OUT / filename, quality=95)
        print(f"wrote {OUT / filename}")


if __name__ == "__main__":
    main()
