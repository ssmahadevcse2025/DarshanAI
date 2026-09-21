from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('d:/Myprojects/mlp/assets', exist_ok=True)

def create_cit_logo():
    # Width 320, Height 140 (high resolution)
    w, h = 400, 200
    img = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Yellow background card with rounded corners
    yellow = (255, 222, 0, 255) # #FFDE00
    draw.rounded_rectangle([(10, 10), (w - 10, h - 10)], radius=16, fill=yellow)

    # Dark blue butterfly graphic on the right
    dark_blue = (10, 25, 60, 255) # #0A193C
    
    # Left wing (large upper)
    draw.pieslice([(240, 25), (330, 115)], start=160, end=340, fill=dark_blue)
    # Left wing (small lower)
    draw.pieslice([(260, 90), (320, 145)], start=140, end=300, fill=dark_blue)
    
    # Right wing (large upper)
    draw.pieslice([(310, 20), (385, 105)], start=190, end=20, fill=dark_blue)
    # Right wing (small lower)
    draw.pieslice([(315, 85), (370, 140)], start=210, end=40, fill=dark_blue)

    # Butterfly body
    draw.ellipse([(308, 35), (320, 130)], fill=dark_blue)

    # Text rendering
    try:
        font_bold = ImageFont.truetype("arialbd.ttf", 22)
        font_sub = ImageFont.truetype("arialbd.ttf", 15)
        font_italic = ImageFont.truetype("ariali.ttf", 15)
    except:
        font_bold = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_italic = ImageFont.load_default()

    # CHENNAI
    draw.text((25, 25), "CHENNAI", fill=(10, 10, 10, 255), font=font_bold)
    # INSTITUTE OF
    draw.text((25, 54), "INSTITUTE OF", fill=(20, 70, 150, 255), font=font_sub)
    # TECHNOLOGY
    draw.text((25, 75), "TECHNOLOGY", fill=(10, 10, 10, 255), font=font_bold)

    # Green pill banner at bottom: Transforming Lives
    green = (46, 139, 87, 255) # SeaGreen #2E8B57
    draw.rounded_rectangle([(25, 125), (280, 165)], radius=10, fill=green)
    draw.text((38, 133), "Transforming Lives", fill=(255, 255, 255, 255), font=font_italic)

    img.save('d:/Myprojects/mlp/assets/cit_logo.png', 'PNG')
    print("CIT Logo created at assets/cit_logo.png")

def create_siragu_logo():
    # Large watermark: Width 800, Height 400
    w, h = 800, 300
    img = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Pastel Rainbow Butterfly on the Left
    # Wing pastel polygons (Cyan/Teal, Pink/Magenta, Yellow, Green) with soft opacity
    cyan = (64, 224, 208, 90)
    pink = (255, 105, 180, 90)
    yellow = (255, 215, 0, 90)
    green = (144, 238, 144, 90)

    # Geometric faceted wings
    # Left upper wing
    draw.polygon([(200, 150), (120, 60), (70, 110), (100, 180)], fill=cyan)
    draw.polygon([(200, 150), (150, 40), (220, 50), (210, 110)], fill=green)
    # Left lower wing
    draw.polygon([(200, 150), (100, 190), (140, 260), (180, 230)], fill=pink)
    draw.polygon([(200, 150), (160, 240), (210, 260), (210, 190)], fill=yellow)

    # Right upper wing
    draw.polygon([(220, 150), (270, 40), (320, 70), (270, 130)], fill=cyan)
    draw.polygon([(220, 150), (310, 60), (360, 110), (310, 180)], fill=pink)
    # Right lower wing
    draw.polygon([(220, 150), (260, 220), (310, 260), (280, 180)], fill=green)
    draw.polygon([(220, 150), (310, 190), (340, 250), (270, 240)], fill=yellow)

    # SIRAGU Text in soft pastel gradient-like green
    try:
        font_siragu = ImageFont.truetype("arialbd.ttf", 110)
    except:
        font_siragu = ImageFont.load_default()

    siragu_color = (168, 230, 163, 110) # Soft pastel green
    draw.text((370, 85), "SIRAGU", fill=siragu_color, font=font_siragu)

    img.save('d:/Myprojects/mlp/assets/siragu_watermark.png', 'PNG')
    print("Siragu Watermark created at assets/siragu_watermark.png")

if __name__ == "__main__":
    create_cit_logo()
    create_siragu_logo()
