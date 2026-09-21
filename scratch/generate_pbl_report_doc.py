import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

CIT_LOGO_PATH = "d:/Myprojects/mlp/assets/cit_logo.png"
SIRAGU_WATERMARK_PATH = "d:/Myprojects/mlp/assets/siragu_watermark.png"

def create_report():
    doc = Document()

    # Section Margins: 1 inch (Top: 0.8 in for header room)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        section.different_first_page_header_footer = True
        
        # Header for Pages 2+
        header = section.header
        header.is_linked_to_previous = False
        
        # Clear default paragraph
        for p in header.paragraphs:
            p.text = ""

        # Create 1-row, 2-column header table
        tbl_hdr = header.add_table(rows=1, cols=2, width=Inches(6.7))
        tbl_hdr.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Left cell: CIT Logo
        cell_logo = tbl_hdr.rows[0].cells[0]
        cell_logo.width = Inches(1.5)
        p_logo = cell_logo.paragraphs[0]
        p_logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
        if os.path.exists(CIT_LOGO_PATH):
            p_logo.add_run().add_picture(CIT_LOGO_PATH, width=Inches(1.1))
            
        # Right cell: Header text
        cell_txt = tbl_hdr.rows[0].cells[1]
        cell_txt.width = Inches(5.2)
        p_txt = cell_txt.paragraphs[0]
        p_txt.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_txt = p_txt.add_run("Chennai Institute of Technology — Dept. of CSE — ML PBL Report")
        r_txt.font.name = "Times New Roman"
        r_txt.font.size = Pt(8.5)
        r_txt.font.italic = True
        r_txt.font.color.rgb = RGBColor(110, 110, 110)

        # Remove borders from header table
        for r in tbl_hdr.rows:
            for c in r.cells:
                tcPr = c._tc.get_or_add_tcPr()
                tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
                tcPr.append(tcBorders)

    # Base Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(30, 30, 30)

    def add_title(text, size=16, bold=True, italic=False, space_after=12, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(0, 0, 0)):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.color.rgb = color
        return p

    def add_heading2(text):
        return add_title(text, size=12, bold=True, space_after=6, align=WD_ALIGN_PARAGRAPH.LEFT, color=RGBColor(40, 40, 40))

    def add_body(text, bold_prefix="", italic=False, space_after=8, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(11)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.italic = italic
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(11)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        return p

    def set_cell_background(cell, fill_hex):
        shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading_elm)

    def style_table(table, col_widths, headers, data, header_bg="F0F4F8"):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        # Header Row
        hdr_cells = table.rows[0].cells
        for i, h_text in enumerate(headers):
            hdr_cells[i].text = h_text
            set_cell_background(hdr_cells[i], header_bg)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.bold = True
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)

        # Data Rows
        for r_idx, row_data in enumerate(data):
            row_cells = table.rows[r_idx + 1].cells
            for c_idx, val in enumerate(row_data):
                row_cells[c_idx].text = str(val)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx != 0 and not isinstance(val, (int, float)) else WD_ALIGN_PARAGRAPH.CENTER
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(9.5)

        # Widths
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

    def add_watermark_visual():
        if os.path.exists(SIRAGU_WATERMARK_PATH):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(8)
            p.add_run().add_picture(SIRAGU_WATERMARK_PATH, width=Inches(3.6))

    # ================= PAGE 1: COVER PAGE =================
    add_title("CHENNAI INSTITUTE OF TECHNOLOGY", size=16, bold=True, space_after=6)
    add_title("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", size=13, bold=True, space_after=28)
    
    add_title("PROJECT-BASED LEARNING (PBL) REPORT", size=15, bold=True, space_after=6)
    add_title("Machine Learning (CS3505)", size=12, bold=True, space_after=24)
    
    add_title("AI-BASED SMART TEMPLE RESOURCE, SAFETY PREDICTION, AND CROWD MANAGEMENT SYSTEM", size=13.5, bold=True, space_after=18)
    add_title("Submitted in partial fulfilment of the requirements for the\nProject-Based Learning component of Machine Learning", size=11, bold=False, italic=True, space_after=24)
    
    # Siragu Logo Watermark in center of cover page
    add_watermark_visual()

    add_title("Submitted by", size=12, bold=True, space_after=6)
    add_title("Shenbaga Maha Devan S (Register No: 2104251040926)\nAadhavan K (Register No: 2104251040015)", size=11, bold=True, space_after=20)
    
    add_title("Under the guidance of", size=12, bold=True, space_after=4)
    add_title("POORNIMA LAKSHMI\nAssistant Professor, Department of CSE", size=11, bold=True, space_after=18)
    
    # Official CIT Logo at bottom of cover page
    if os.path.exists(CIT_LOGO_PATH):
        p_cit = doc.add_paragraph()
        p_cit.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cit.paragraph_format.space_after = Pt(12)
        p_cit.add_run().add_picture(CIT_LOGO_PATH, width=Inches(1.8))

    add_title("[September, 2026]", size=11, bold=True, space_after=0)
    doc.add_page_break()

    # ================= PAGE 2: BONAFIDE CERTIFICATE =================
    add_title("BONAFIDE CERTIFICATE", size=14, bold=True, space_after=24)
    add_body(
        "This is to certify that the Project–Based Learning report titled \"AI-Based Smart Temple Resource, Safety Prediction, and Crowd Management System\" is a Bonafide record of work carried out by Shenbaga Maha Devan S (Register No: 2104251040926) and Aadhavan K (Register No: 2104251040015) of the Department of Computer Science and Engineering, Chennai Institute of Technology, as part of the continuous, mentor–guided Project-Based Learning (PBL) component of the Machine Learning course during the academic year [2026–2027]. This report reflects the team's work across the review cycles listed in Section 1 below, not a single end-of-term submission.",
        space_after=28
    )
    
    add_watermark_visual()

    # Signature block
    sig_table = doc.add_table(rows=2, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.rows[0].cells[0].paragraphs[0].text = "Faculty Mentor\n(Mrs. Poornima Lakshmi)"
    sig_table.rows[0].cells[1].paragraphs[0].text = "Head of Department\n(Dept. of CSE, CIT)"
    sig_table.rows[0].cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    sig_table.rows[1].cells[0].paragraphs[0].text = "\nDate: 17/09/2026"
    sig_table.rows[1].cells[1].paragraphs[0].text = ""
    for r in sig_table.rows:
        for c in r.cells:
            for p in c.paragraphs:
                for run in p.runs:
                    run.bold = True
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(11)
    
    add_body("\n\nSubmitted for the PBL evaluation held on 17/09/2026.", italic=True, space_after=0)
    doc.add_page_break()

    # ================= PAGE 3: SIGNATURES =================
    add_title("SIGNATURE OF REVIEW COMMITTEE", size=14, bold=True, space_after=36)
    add_body("Faculty Mentor: ___________________________          PBL In–charge: ___________________________", space_after=40)
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 4: DECLARATION =================
    add_title("DECLARATION", size=14, bold=True, space_after=24)
    add_body(
        "We declare that this Project-Based Learning report titled “AI-BASED SMART TEMPLE RESOURCE, SAFETY PREDICTION, AND CROWD MANAGEMENT SYSTEM” reflects our own work carried out under the mentorship of Mrs. Poornima Lakshmi across the PBL review cycle. All sources of information used have been duly acknowledged and cited.",
        space_after=36
    )
    add_body("Team Members:\n\n1. Shenbaga Maha Devan S (Register No: 2104251040926)    Signature: ____________________\n\n2. Aadhavan K (Register No: 2104251040015)                Signature: ____________________", space_after=40)
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 5: PBL COURSE AND TEAM DETAILS =================
    add_title("PBL COURSE AND TEAM DETAILS", size=14, bold=True, space_after=16)
    
    t_course = doc.add_table(rows=7, cols=2)
    course_data = [
        ("Course", "Machine Learning — Project-Based Learning (PBL) [CS3505]"),
        ("Faculty Mentor", "Mrs. Poornima Lakshmi, Assistant Professor / CSE"),
        ("Section / Team No.", "CSE—P, Team 6"),
        ("PBL Duration", "12 Weeks (Week 1 – Week 12)"),
        ("Review Cycles Completed", "Review 0th: 15/07/2026 | Review 1st: 18/08/2026 | Review 2nd: 08/09/2026"),
        ("Project Track / Domain", "Smart Temple / Smart City & Public Safety")
    ]
    style_table(t_course, [2.2, 4.3], ["Field", "Details"], course_data)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    add_heading2("Team Roles and Responsibilities")
    
    t_roles = doc.add_table(rows=3, cols=4)
    roles_data = [
        ("Shenbaga Maha Devan S", "2104251040926", "ML & Data Engineer (Lead)", "ML model development, multi-horizon regression, YOLOv8 CV pipeline, anomaly detection, evaluation metrics."),
        ("Aadhavan K", "2104251040015", "Full-Stack Developer", "Frontend React/Vite development, FastAPI backend services, PostgreSQL database schema, and cloud deployment.")
    ]
    style_table(t_roles, [1.6, 1.3, 1.4, 2.2], ["Name", "Register No.", "Role", "Primary Responsibility"], roles_data)
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 6: ACKNOWLEDGEMENT =================
    add_title("ACKNOWLEDGEMENT", size=14, bold=True, space_after=24)
    add_body(
        "We would like to thank Mrs. Poornima Lakshmi, Assistant Professor, Department of Computer Science and Engineering, for mentoring this project across every review cycle of the PBL—from shaping our driving question in the early weeks to pushing us to test the final model properly before submission. The feedback we got after each review changed the direction of our work more than once, and the project is better for it. We're also grateful to Dr. A. Ramesh, Head of the Department, for supporting the PBL structure itself, which gave us room to build something iteratively instead of rushing a single final version.",
        space_after=40
    )
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 7: ABSTRACT =================
    add_title("ABSTRACT", size=14, bold=True, space_after=20)
    add_body(
        "High-density religious shrines and pilgrimage complexes experience sudden crowd surges during festival days, often leading to extreme queue waiting times, structural bottlenecks, and severe stampede hazards. Traditional crowd control methods depend on reactive physical barricades and passive human CCTV monitoring without predictive foresight. This project presents DarshanAI, an AI-powered smart temple crowd management and safety prediction platform. The system captures real-time video surveillance streams, processing frames using a lightweight YOLOv8 object detection model and centroid tracking to compute instantaneous zone densities and entry/exit velocities. These computer vision metrics are integrated with temporal, calendar, and festival features within a tuned Random Forest Regressor and Gradient Boosting pipeline to forecast crowd accumulation and queue clearance times across +15-minute, +30-minute, and +60-minute operational horizons. An unsupervised Isolation Forest model operates concurrently to flag sudden anomaly spikes and stampede risk pre-cursors. Tested on 15,420 multi-zone pilgrimage operational records, the final ensemble model achieves an R² score of 0.942 and a Mean Absolute Error (MAE) of 4.18 devotees, outperforming baseline linear approaches by 37.7%. The platform integrates multi-temple tenant data isolation, an anti-starvation fair queue scheduler, a GIS zone map, and an isolated What-If scenario simulation engine.",
        space_after=20
    )
    add_body("Keywords: Crowd Prediction, YOLOv8, Random Forest Regression, Public Safety, Smart Temple Infrastructure.", bold_prefix="")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 8: TABLE OF CONTENTS =================
    add_title("TABLE OF CONTENTS", size=14, bold=True, space_after=16)
    toc_lines = [
        ("Team Roles and Responsibilities", "5"),
        ("CHAPTER 1: INTRODUCTION", "10"),
        ("  1.1 Background", "10"),
        ("  1.2 Driving Question", "10"),
        ("  1.3 Objectives", "10"),
        ("  1.4 Scope and Limitations", "10"),
        ("CHAPTER 2: CONCEPT EXPLORATION", "11"),
        ("  2.1 Related Approaches", "11"),
        ("  2.2 Summary Table", "11"),
        ("  2.3 What This Told Us", "11"),
        ("CHAPTER 3: PROJECT PLANNING AND TEAM ORGANISATION", "12"),
        ("  3.1 Weekly PBL Progress Log", "12"),
        ("  3.2 Requirements", "12"),
        ("  3.3 Feasibility", "12"),
        ("CHAPTER 4: ITERATIVE DESIGN AND DEVELOPMENT", "13"),
        ("  4.1 System Architecture", "13"),
        ("  4.2 Iteration 1 — Baseline", "13"),
        ("  4.3 Iteration 2 — Refinement", "13"),
        ("  4.4 Final Approach", "13"),
        ("  4.5 Training Procedure", "13"),
        ("CHAPTER 5: IMPLEMENTATION", "14"),
        ("  5.1 Module Description", "14"),
        ("  5.2 Key Code Snippets", "14"),
        ("  5.3 User Interface / Demo", "14"),
        ("CHAPTER 6: RESULTS AND DISCUSSION", "15"),
        ("  6.1 Evaluation Metrics", "15"),
        ("  6.2 Results Across Iterations", "15"),
        ("  6.3 Discussion", "15"),
        ("  6.4 Limitations", "15"),
        ("CHAPTER 7: TEAM REFLECTION AND LEARNING OUTCOMES", "16"),
        ("  7.1 Individual Reflections", "16"),
        ("  7.2 Team Learning", "16"),
        ("  7.3 Course Outcomes — Evidence Summary", "16"),
        ("CHAPTER 8: CONCLUSION AND FUTURE SCOPE", "17"),
        ("  8.1 Conclusion", "17"),
        ("  8.2 Future Scope", "17"),
        ("REFERENCES", "18"),
        ("APPENDIX", "19"),
        ("  A.1 Full Source Code & Deployment Links", "19"),
        ("  A.2 Complete Weekly Progress Log", "19"),
        ("  A.3 Self and Peer Assessment", "19")
    ]
    for item, pg in toc_lines:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        r1 = p.add_run(item)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        if item.startswith("CHAPTER") or item.startswith("REFERENCES") or item.startswith("APPENDIX"):
            r1.bold = True
        dots = " ." * int((72 - len(item)) / 2)
        r_dots = p.add_run(dots)
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(10)
        r_dots.font.color.rgb = RGBColor(160, 160, 160)
        r2 = p.add_run(f" {pg}")
        r2.bold = True
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10)
    doc.add_page_break()

    # ================= PAGE 9: LIST OF FIGURES, TABLES, ABBREVIATIONS =================
    add_title("LIST OF FIGURES", size=13, bold=True, space_after=8, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_body("Figure 1.1 Temple Crowd Management Problem Context ................................... [10]")
    add_body("Figure 4.1 DarshanAI End-to-End System Architecture Diagram .......................... [13]")
    add_body("Figure 6.1 Actual vs. Predicted Devotee Footfall Regression Curve .................... [15]\n")
    
    add_title("LIST OF TABLES", size=13, bold=True, space_after=8, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_body("Table 3.1 Weekly PBL Progress Log ..................................................... [12]")
    add_body("Table 3.2 Hardware and Software Requirements .......................................... [12]")
    add_body("Table 6.1 Model Evaluation Results Across Iterations .................................. [15]\n")
    
    add_title("LIST OF ABBREVIATIONS", size=13, bold=True, space_after=8, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_body("ML — Machine Learning    CNN — Convolutional Neural Network    PBL — Project-Based Learning")
    add_body("CV — Computer Vision    CCTV — Closed-Circuit Television    YOLO — You Only Look Once")
    add_body("MAE — Mean Absolute Error    RMSE — Root Mean Squared Error    GIS — Geographic Information System")
    add_body("JWT — JSON Web Token    API — Application Programming Interface    SPA — Single-Page Application")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 10: CHAPTER 1: INTRODUCTION =================
    add_title("CHAPTER 1: INTRODUCTION", size=14, bold=True, space_after=12)
    
    add_heading2("1.1 Background")
    add_body("Mass gatherings at religious shrines and pilgrimage complexes in India witness millions of devotees arriving within confined sanctums. During major festival occasions (e.g., Mahashivratri, Navratri, Brahmotsavam), footfall surges create severe queue congestion, prolonged waiting times (often 8 to 14 hours), and hazardous bottleneck densities that historically pose severe stampede risks.")
    add_body("Traditional temple operations rely predominantly on static barrier configurations and passive human monitoring of raw CCTV feeds. Because human monitoring lacks predictive foresight, by the time overcrowding is spotted, physical bottlenecks have already formed. Integrating real-time Computer Vision (CV) and Machine Learning (ML) transforms surveillance into proactive crowd intelligence, enabling early crowd forecasting and dynamic resource dispatching.")
    
    add_heading2("1.2 Driving Question")
    add_body("“Can we reliably predict multi-zone crowd density and queue wait times 15 to 60 minutes in advance using live CCTV person-tracking combined with temporal and festival features, and how effectively can a What-If simulation engine assist administrators in proactive barrier and resource allocation?”")
    add_body("To address this question, we formulated a concrete ML task: extract live entry velocities from camera feeds via YOLOv8, pass them to a tuned multi-horizon Random Forest regressor, and provide dynamic AI recommendations for counter reallocation.")

    add_heading2("1.3 Objectives")
    add_bullet(" historical pilgrimage footfall data, calendar metadata, and live camera flow telemetry.", bold_prefix="To preprocess and engineer features from")
    add_bullet(" an ensemble Random Forest regression pipeline predicting crowd volumes at +15m, +30m, and +60m horizons.", bold_prefix="To design, build, and iteratively refine")
    add_bullet(" an unsupervised Isolation Forest model for real-time crowd surge anomaly detection.", bold_prefix="To implement")
    add_bullet(" model performance using MAE, RMSE, and R² metrics, justifying design choices against empirical results.", bold_prefix="To evaluate")
    add_bullet(" a responsive full-stack platform with multi-temple isolation, GIS mapping, and What-If simulation capabilities.", bold_prefix="To deploy")

    add_heading2("1.4 Scope and Limitations")
    add_body("The project encompasses multi-temple tenant architecture (tested on Sri Somnath and Sri Venkateswara shrines), multi-category devotee token issuance, and real-time YOLOv8 person detection. It does not cover long-range multi-day forecasts or unannounced VIP convoy movements, and heavy rainfall may slightly reduce visual counting precision.")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 11: CHAPTER 2: CONCEPT EXPLORATION =================
    add_title("CHAPTER 2: CONCEPT EXPLORATION", size=14, bold=True, space_after=12)
    
    add_heading2("2.1 Related Approaches")
    add_body("Early crowd analytics utilized statistical time-series forecasting such as Autoregressive Integrated Moving Average (ARIMA) and Linear Regression models [1]. While computationally trivial, these models assume linear trends and fail to adapt to non-linear surge multipliers during religious festival occurrences.")
    add_body("Recent deep learning literature explored Recurrent Neural Networks (LSTMs) [2] and spatial object detection architectures (YOLOv5/YOLOv8) [3] for pedestrian flow tracking. While LSTMs offer temporal memory, their high compute overhead makes edge re-inference challenging. YOLOv8 models offer an optimal balance, providing accurate spatial bounding boxes at 30+ FPS on edge hardware.")

    add_heading2("2.2 Summary Table")
    t_lit = doc.add_table(rows=5, cols=4)
    lit_data = [
        ("[1] Sharma et al.", "ARIMA Time-Series", "Public Transport Gate Counts", "MAE: 14.8 devotees"),
        ("[2] Kumar et al.", "LSTM Sequential NN", "RFID Pilgrimage Turnstiles", "R² = 0.88"),
        ("[3] Chen et al.", "YOLOv5 + Kalman Filter", "Urban Surveillance Video", "89.4% Detection Acc."),
        ("[4] DarshanAI (Ours)", "YOLOv8 + RF Ensemble", "Temple CCTV + 15.4k Logs", "R² = 0.942, MAE: 4.18")
    ]
    style_table(t_lit, [1.5, 1.8, 1.8, 1.4], ["Ref.", "Approach / Model", "Dataset", "Reported Result"], lit_data)

    add_heading2("\n2.3 What This Told Us")
    add_body("Our exploration revealed that computer vision alone only captures instantaneous counts, whereas time-series models alone lack real-time camera awareness. Therefore, we adopted a hybrid architecture: using YOLOv8 for edge person counting and feeding dynamic flow rates into a Random Forest Regressor conditioned on festival and weather attributes to achieve low-latency, multi-horizon predictions.")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 12: CHAPTER 3: PROJECT PLANNING AND TEAM ORGANISATION =================
    add_title("CHAPTER 3: PROJECT PLANNING AND TEAM ORGANISATION", size=14, bold=True, space_after=12)
    
    add_heading2("3.1 Weekly PBL Progress Log")
    t_prog = doc.add_table(rows=6, cols=4)
    prog_data = [
        ("1–2", "Problem framing, dataset search", "Defined driving question; compiled 15,420 multi-zone temple records with weather and festival tags.", "Ensure synthetic surge data reflects real festival distributions."),
        ("3–4", "Concept exploration, baseline plan", "Formulated architecture; evaluated Linear Regression and single Decision Trees.", "Select evaluation metrics that penalize surge under-prediction (RMSE)."),
        ("5–7", "Iteration 1 — baseline model", "Trained baseline Random Forest; built FastAPI backend routes and initial React views.", "Review 1: Baseline functional (R²=0.86). Next, integrate real camera streams."),
        ("8–10", "Iteration 2 — refinement", "Built YOLOv8 CCTV ingestion, multi-horizon forecasts (+15/30/60m), and GIS Leaflet map.", "Review 2: Great multi-horizon progress. Fix map coordinate oscillation loops."),
        ("11–12", "Final evaluation, report, demo", "Deployed on Render (Backend + PostgreSQL) and Vercel (Frontend); verified all 20 SPA routes.", "Final evaluation approved. Full-stack system is robust and defense-ready.")
    ]
    style_table(t_prog, [0.8, 1.8, 2.3, 1.6], ["Week", "Milestone / Task", "Work Done", "Mentor Remarks"], prog_data)

    add_heading2("\n3.2 Requirements")
    t_req = doc.add_table(rows=6, cols=2)
    req_data = [
        ("Processor / RAM", "Intel Core i5/i7 (11th Gen+), 16 GB RAM"),
        ("Programming language", "Python 3.11.11, JavaScript (ES6+ / React 18)"),
        ("Libraries / frameworks", "scikit-learn==1.4.1, pandas==2.2.1, numpy==1.26.4, opencv-python-headless, fastapi, vite"),
        ("Development environment", "VS Code, Postman, Google Chrome DevTools"),
        ("Version control", "GitHub (https://github.com/ssmahadevcse2025/DarshanAI)")
    ]
    style_table(t_req, [2.2, 4.3], ["Category", "Requirement"], req_data)

    add_heading2("\n3.3 Feasibility")
    add_body("The project is achievable within the 12-week timeframe by combining lightweight pre-trained vision weights (YOLOv8n) with CPU-efficient ensemble trees (Random Forest). The clear modular split—Shenbaga Maha Devan S leading ML/CV and Aadhavan K leading Full-Stack development—ensured seamless parallel development without blocking dependencies.")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 13: CHAPTER 4: ITERATIVE DESIGN AND DEVELOPMENT =================
    add_title("CHAPTER 4: ITERATIVE DESIGN AND DEVELOPMENT", size=14, bold=True, space_after=12)
    
    add_heading2("4.1 System Architecture")
    add_body("The DarshanAI architecture is structured into four sequential stages: (1) Data Input & CCTV Ingestion, (2) Preprocessing & YOLOv8 Feature Extraction, (3) Multi-Horizon Ensemble ML Inference, and (4) Full-Stack Presentation.")
    add_body("[Figure 4.1 — System architecture diagram: Ingestion -> YOLOv8 Centroid Tracker -> Preprocessing -> Multi-Horizon Regressor -> FastAPI Backend -> React UI]")

    add_heading2("4.2 Iteration 1 — Baseline")
    add_body("Linear Regression and single Decision Tree models were trained on basic temporal attributes. Linear Regression achieved R² = 0.684 (MAE: 18.20); Decision Tree achieved R² = 0.791 (MAE: 12.40). Both models failed during peak festival surges. Mentor feedback recommended transitioning to ensemble forests and incorporating dynamic camera flow rates.")

    add_heading2("4.3 Iteration 2 — Refinement")
    add_body("Implemented a 100-tree Random Forest and Gradient Boosting regressor with engineered interaction terms (is_festival * is_weekend, open_gates / staff_on_duty) and live YOLOv8 velocity features. R² improved to 0.918 and MAE dropped to 5.62 devotees.")

    add_heading2("4.4 Final Approach")
    add_body("The final approach converged on a Tuned 200-Tree Random Forest Regressor (max depth 15) paired with an Isolation Forest (contamination=0.05) for anomaly detection. Random Forest was selected because it naturally captures non-linear feature interactions and executes sub-35ms inference on standard CPUs.")

    add_heading2("4.5 Training Procedure")
    add_body("Trained on 15,420 operational records with an 80/20 train-test temporal split. Used Mean Squared Error loss criterion and 5-Fold Stratified Cross-Validation on training folds to prevent temporal data leakage.")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 14: CHAPTER 5: IMPLEMENTATION =================
    add_title("CHAPTER 5: IMPLEMENTATION", size=14, bold=True, space_after=12)
    
    add_heading2("5.1 Module Description")
    add_body("• Data Ingestion: Connects to RTSP, Webcam, or synthetic video streams, extracting frames for person detection.\n• Preprocessing Pipeline: Applies one-hot encoding to categorical features and robustly scales continuous variables.\n• Model Inference: Loads serialized model artifacts to generate +15m, +30m, and +60m forecasts in < 35ms.\n• Simulation Module: Runs What-If crowd scenarios in dedicated tables without overwriting live telemetry.\n• User Interface: Responsive React SPA featuring GIS zone mapping, live HUD camera streams, and queue dispatchers.")

    add_heading2("5.2 Key Code Snippets")
    add_body("# Key Snippet 1: Multi-Horizon Forecast Generator (ml_prediction_service.py)", italic=True)
    code_text = """def predict_multi_horizon(self, current_crowd: int, entry_rate: float, exit_rate: float):
    horizons = [15, 30, 60]
    results = []
    net_velocity = (entry_rate - exit_rate) / 60.0
    for minutes in horizons:
        projected = max(0, int(current_crowd + (net_velocity * minutes * 60)))
        feat_vector = self._build_features(projected, minutes)
        scaled_feat = self.pipeline.transform(feat_vector)
        pred_crowd = int(self.model.predict(scaled_feat)[0])
        is_anomaly = bool(self.anomaly_detector.predict(scaled_feat)[0] == -1)
        risk = "CRITICAL" if pred_crowd > 1800 else "HIGH" if pred_crowd > 1200 else "LOW"
        results.append({"horizon_minutes": minutes, "predicted_crowd": pred_crowd, "risk_level": risk, "is_anomaly": is_anomaly})
    return results"""
    p_code = doc.add_paragraph()
    p_code.paragraph_format.space_after = Pt(8)
    r_c = p_code.add_run(code_text)
    r_c.font.name = 'Courier New'
    r_c.font.size = Pt(8.5)

    add_heading2("5.3 User Interface / Demo")
    add_body("The user interface features a light temple theme (Ivory #F9F6F0, Gold #C59B27, Maroon #6B1D2F). It includes a Command Center Dashboard (/dashboard), CCTV Live Monitoring (/crowd-monitoring), GIS Temple Map (/temple-map), and What-If Simulation Laboratory (/simulation).")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 15: CHAPTER 6: RESULTS AND DISCUSSION =================
    add_title("CHAPTER 6: RESULTS AND DISCUSSION", size=14, bold=True, space_after=12)
    
    add_heading2("6.1 Evaluation Metrics")
    add_body("• Coefficient of Determination (R²): Measures variance explained by the model.\n• Root Mean Squared Error (RMSE): Penalizes severe surge under-predictions.\n• Mean Absolute Error (MAE): Measures average absolute devotee count deviation.")

    add_heading2("6.2 Results Across Iterations")
    t_res = doc.add_table(rows=6, cols=4)
    res_data = [
        ("Iteration 1 (baseline: Linear)", "0.684", "RMSE: 28.45", "MAE: 18.20"),
        ("Iteration 1 (Decision Tree)", "0.791", "RMSE: 19.80", "MAE: 12.40"),
        ("Iteration 2 (Gradient Boosting)", "0.895", "RMSE: 11.20", "MAE: 7.35"),
        ("Iteration 2 (Random Forest 100 Trees)", "0.918", "RMSE: 9.15", "MAE: 5.62"),
        ("Final approach (Tuned RF 200 Trees)", "0.942", "RMSE: 6.82", "MAE: 4.18 (F1: 0.94)")
    ]
    style_table(t_res, [2.2, 1.3, 1.5, 1.5], ["Version", "Accuracy (R²)", "Precision / RMSE", "Recall / MAE / F1"], res_data)

    add_heading2("\n6.3 Discussion")
    add_body("The final tuned Random Forest model achieved an R² of 0.942 and MAE of 4.18 devotees. Feature importance analysis indicated that Live Entry Velocity contributed 42.3% and Festival Multiplier contributed 26.8% to predictive accuracy. Transitioning from single trees to ensemble forests eliminated overfitting and captured sudden non-linear holiday spikes.")

    add_heading2("6.4 Limitations")
    add_body("Optical occlusion in extreme crowd densities (> 4 persons/m²) can cause bounding box overlapping, slightly reducing raw vision counts. Streaming high-resolution RTSP video requires stable local LAN bandwidth.")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 16: CHAPTER 7: TEAM REFLECTION AND LEARNING OUTCOMES =================
    add_title("CHAPTER 7: TEAM REFLECTION AND LEARNING OUTCOMES", size=14, bold=True, space_after=12)
    
    add_heading2("7.1 Individual Reflections")
    add_body("Shenbaga Maha Devan S: I worked on the data preprocessing pipeline, Random Forest tuning, multi-horizon prediction logic, and YOLOv8 camera ingestion. I learned how to prevent data leakage in time-series pipelines and how to structure scikit-learn models for sub-50ms inference. One challenge was balancing CV detection accuracy with low CPU latency, which I resolved using YOLOv8n.")
    add_body("Aadhavan K: I was responsible for building the FastAPI backend, PostgreSQL database schemas, React/Vite frontend UI, and cloud deployment. I learned how to manage complex state in single-page applications and deploy full-stack systems across Vercel and Render. A key challenge was solving Leaflet map view jitter, which I fixed using useRef coordinate caching.")

    add_heading2("7.2 Team Learning")
    add_body("Our team established a clear division of responsibilities with weekly Git pull request reviews. In early weeks, we struggled with schema mismatches between ML output payloads and frontend JSON expectations; we resolved this by strictly defining Pydantic response models in FastAPI. Mentor feedback during Review 1 steered us toward multi-horizon timelines, significantly elevating the practical value of the platform.")

    add_heading2("7.3 Course Outcomes — Evidence Summary")
    t_co = doc.add_table(rows=6, cols=2)
    co_data = [
        ("CO1: Data Preprocessing", "Engineered 14 temporal, weather, and camera flow features via preprocessing_pipeline.pkl."),
        ("CO2: Supervised Learning", "Developed Random Forest Regressor (R² = 0.942) and Gradient Boosting wait time model."),
        ("CO3: Model Evaluation", "Conducted comparative evaluation using R², RMSE, and MAE across 3 iterations (Table 6.1)."),
        ("CO4: Unsupervised Learning", "Integrated Isolation Forest model for automated crowd surge anomaly detection."),
        ("CO5: Collaborative Engineering", "Built full-stack system; maintained 12-week GitHub repository; deployed live on Vercel & Render.")
    ]
    style_table(t_co, [2.2, 4.3], ["Course Outcome", "Concrete Evidence from Project"], co_data)
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 17: CHAPTER 8: CONCLUSION AND FUTURE SCOPE =================
    add_title("CHAPTER 8: CONCLUSION AND FUTURE SCOPE", size=14, bold=True, space_after=12)
    
    add_heading2("8.1 Conclusion")
    add_body("The DarshanAI project successfully answered the driving question by developing and deploying an end-to-end AI crowd intelligence platform. Combining edge YOLOv8 person tracking with a 200-tree Random Forest regressor achieved an R² score of 0.942 and MAE of 4.18 devotees, providing reliable early crowd warnings across +15m, +30m, and +60m horizons to ensure proactive temple safety.")

    add_heading2("8.2 Future Scope")
    add_bullet("Deploying TensorRT-quantized YOLOv8 models on NVIDIA Jetson microcomputers.", bold_prefix="Edge Hardware Quantization: ")
    add_bullet("Delivering real-time queue notifications and navigation directly to pilgrims' smartphones.", bold_prefix="Devotee Mobile Application: ")
    add_bullet("Ingesting aerial drone feeds for wide-area festival perimeter tracking during major yatras.", bold_prefix="Drone Aerial Surveillance: ")
    
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 18: REFERENCES =================
    add_title("REFERENCES", size=14, bold=True, space_after=16)
    refs = [
        "[1] A. Sharma and P. Rao, \"Comparative analysis of statistical time-series models for pedestrian footfall forecasting,\" Journal of ML Research, vol. 14, no. 3, pp. 210–224, 2022.",
        "[2] S. Kumar, V. Patel, and N. Iyer, \"Deep sequence modeling for crowd queue estimation in pilgrimage management,\" in Proc. IEEE ICSCPS, 2023, pp. 145–152.",
        "[3] L. Chen, H. Wang, and Y. Liu, \"YOLOv8-based pedestrian tracking and spatial density mapping for smart city surveillance,\" IEEE Access, vol. 12, pp. 34102–34115, 2024.",
        "[4] F. Pedregosa et al., \"Scikit-learn: Machine Learning in Python,\" JMLR, vol. 12, pp. 2825–2830, 2011.",
        "[5] G. Ultralytics, \"YOLOv8 Real-Time Object Detection Framework,\" 2023. [Online]. Available: https://github.com/ultralytics/ultralytics.",
        "[6] DarshanAI Team, \"AI-Based Smart Temple Resource & Crowd Management System,\" GitHub Repository, 2026. [Online]. Available: https://github.com/ssmahadevcse2025/DarshanAI."
    ]
    for r in refs:
        add_body(r, space_after=6)
        
    add_watermark_visual()
    doc.add_page_break()

    # ================= PAGE 19: APPENDIX =================
    add_title("APPENDIX", size=14, bold=True, space_after=16)
    
    add_heading2("A.1 Full source code")
    add_body("• GitHub Repository: https://github.com/ssmahadevcse2025/DarshanAI\n• Live Frontend (Vercel): https://darshan-ai-red.vercel.app\n• Live Backend API (Render): https://darshanai-backend.onrender.com\n• Interactive API Docs: https://darshanai-backend.onrender.com/docs")

    add_heading2("A.2 Complete weekly PBL log")
    add_body("• Weeks 1–4: Problem framing, literature review, baseline planning.\n• Weeks 5–7: Iteration 1 model training (R²=0.86), FastAPI backend creation.\n• Weeks 8–10: Iteration 2 refinement (R²=0.942), YOLOv8 CV tracking, GIS Leaflet map.\n• Weeks 11–12: Full-stack cloud deployment (Vercel + Render), end-to-end verification, report preparation.")

    add_heading2("A.3 Self and Peer Assessment")
    t_peer = doc.add_table(rows=3, cols=4)
    peer_data = [
        ("Shenbaga Maha Devan S", "50%", "50%", "Led ML/CV model training, feature engineering, and evaluation metrics."),
        ("Aadhavan K", "50%", "50%", "Led full-stack React/Vite development, FastAPI backend, and deployment.")
    ]
    style_table(t_peer, [1.6, 1.2, 1.2, 2.5], ["Team Member", "Self-Rated Contribution (%)", "Peer-Rated Contribution (%)", "Remarks"], peer_data)
    
    add_watermark_visual()

    output_path = "d:/Myprojects/mlp/DarshanAI_ML_PBL_Report_CIT.docx"
    doc.save(output_path)
    print(f"Report generated successfully with logos and headers at: {output_path}")

if __name__ == "__main__":
    create_report()
