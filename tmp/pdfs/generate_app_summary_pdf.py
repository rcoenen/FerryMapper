from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

out_path = "output/pdf/ferrymapper-app-summary.pdf"

c = canvas.Canvas(out_path, pagesize=letter)
width, height = letter

left = 54
right = width - 54
y = height - 50

TITLE = "FerryMapperNYC - App Summary"

sections = [
    ("What it is", [
        "FerryMapperNYC is a lightweight NYC Ferry trip planner built as a no-framework web app.",
        "It plans routes across active ferry lines using GTFS schedules, including transfer-aware options.",
    ]),
    ("Who it's for", [
        "Primary persona: NYC ferry riders and commuters who need transfer-capable trip planning.",
    ]),
    ("What it does", [
        "Plans routes between ferry stops across multiple lines.",
        "Uses schedule-aware trip matching from GTFS departure/arrival times.",
        "Returns Earlier, Requested, and Later trip options.",
        "Supports both Depart at and Arrive by trip modes.",
        "Shows interactive map routes, stop popups, and route highlighting.",
        "Persists date/time and trip mode in localStorage.",
        "Generates shareable links for selected routes.",
    ]),
    ("How it works (repo-evidenced architecture)", [
        "UI layer: index.html + styles.css + app.js in browser; Leaflet loaded from CDN.",
        "Data pipeline service: prepare-data.mjs downloads NYC Ferry GTFS, parses CSV files,",
        "builds stops/routes/graph/service calendars/schedules, writes data/ferry-data.json.",
        "Routing engine (client): app.js runs bounded 0/1/2 BFS over graph to find candidate topologies",
        "and resolves each leg to real departures via schedule lookups and service-date checks.",
        "Map/render service: Leaflet renders route polylines, markers, style switching, and overlays.",
        "State + sharing: localStorage stores form/time-format state; URL params support route sharing.",
        "Dedicated backend API/service: Not found in repo.",
        "Data flow: GTFS feed -> prepare-data.mjs -> data/ferry-data.json -> app.js router/scheduler -> UI/map.",
    ]),
    ("How to run (minimal)", [
        "1) npm install",
        "2) npm run prepare-data",
        "3) npm start",
        "4) Open the local URL served by `npx serve .`",
    ]),
]

# Title
c.setFillColor(HexColor("#0f172a"))
c.setFont("Helvetica-Bold", 18)
c.drawString(left, y, TITLE)
y -= 24

c.setStrokeColor(HexColor("#cbd5e1"))
c.setLineWidth(1)
c.line(left, y, right, y)
y -= 14

heading_font = "Helvetica-Bold"
body_font = "Helvetica"
heading_size = 12
body_size = 10
line_gap = 3

for heading, lines in sections:
    c.setFont(heading_font, heading_size)
    c.setFillColor(HexColor("#111827"))
    c.drawString(left, y, heading)
    y -= heading_size + 4

    c.setFont(body_font, body_size)
    c.setFillColor(HexColor("#1f2937"))

    for i, line in enumerate(lines):
        bullet = "- "
        text = bullet + line
        c.drawString(left + 8, y, text)
        y -= body_size + line_gap

    y -= 7

c.save()
print(out_path)
