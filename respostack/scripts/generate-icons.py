import os
import math
from PIL import Image, ImageDraw

def draw_shield_icon(size, is_maskable=False):
    # Base image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    teal_color = (13, 148, 136, 255) # #0d9488
    dark_teal = (15, 118, 110, 255) # #0f766e
    white_color = (255, 255, 255, 255)
    soft_teal = (204, 251, 241, 255) # #ccfbf1

    if is_maskable:
        # Full-bleed solid background for maskable icon
        draw.rectangle([0, 0, size, size], fill=teal_color)
        scale = size * 0.65 # Safe zone is central 80%, so 65% is comfortably safe
        offset_x = (size - scale) / 2
        offset_y = (size - scale) / 2
    else:
        # Rounded rectangle for standard icon
        corner_radius = size * 0.22
        draw.rounded_rectangle([0, 0, size, size], radius=corner_radius, fill=teal_color)
        scale = size * 0.72
        offset_x = (size - scale) / 2
        offset_y = (size - scale) / 2

    # Draw stylized shield shape
    # Shield points relative to [0, 0, 1, 1]
    # Top left: (0.15, 0.2), Top center: (0.5, 0.12), Top right: (0.85, 0.2)
    # Mid right: (0.85, 0.55), Bottom tip: (0.5, 0.9), Mid left: (0.15, 0.55)
    shield_rel_points = [
        (0.5, 0.12),  # Top peak
        (0.85, 0.20), # Top right
        (0.85, 0.52), # Right flank
        (0.50, 0.88), # Bottom tip
        (0.15, 0.52), # Left flank
        (0.15, 0.20), # Top left
    ]

    shield_pts = [
        (offset_x + x * scale, offset_y + y * scale)
        for (x, y) in shield_rel_points
    ]

    # Draw outer shield border / fill
    draw.polygon(shield_pts, fill=dark_teal)

    # Inset shield
    inset = scale * 0.04
    inner_pts = [
        (offset_x + x * scale + (0 if x == 0.5 else (-inset if x > 0.5 else inset)),
         offset_y + y * scale + (inset if y < 0.5 else -inset))
        for (x, y) in shield_rel_points
    ]
    draw.polygon(inner_pts, fill=teal_color)

    # Draw checkmark inside shield
    # Checkmark coords relative to scale
    # Start: (0.32, 0.50), Corner: (0.45, 0.64), Tip: (0.70, 0.36)
    chk_start = (offset_x + 0.32 * scale, offset_y + 0.48 * scale)
    chk_corner = (offset_x + 0.45 * scale, offset_y + 0.62 * scale)
    chk_tip = (offset_x + 0.68 * scale, offset_y + 0.36 * scale)

    stroke_width = max(2, int(scale * 0.09))
    draw.line([chk_start, chk_corner], fill=white_color, width=stroke_width, joint='curve')
    draw.line([chk_corner, chk_tip], fill=white_color, width=stroke_width, joint='curve')

    # Draw small end caps for clean rendering
    r = stroke_width / 2
    for pt in [chk_start, chk_corner, chk_tip]:
        draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=white_color)

    return img

def main():
    os.makedirs('public', exist_ok=True)

    # 1. Standard 192x192
    img_192 = draw_shield_icon(192, is_maskable=False)
    img_192.save('public/pwa-192x192.png', 'PNG')
    print('Generated public/pwa-192x192.png')

    # 2. Standard 512x512
    img_512 = draw_shield_icon(512, is_maskable=False)
    img_512.save('public/pwa-512x512.png', 'PNG')
    print('Generated public/pwa-512x512.png')

    # 3. Maskable 512x512
    img_maskable = draw_shield_icon(512, is_maskable=True)
    img_maskable.save('public/pwa-maskable-512x512.png', 'PNG')
    print('Generated public/pwa-maskable-512x512.png')

    # 4. Apple Touch Icon 180x180
    img_apple = draw_shield_icon(180, is_maskable=False)
    img_apple.save('public/apple-touch-icon.png', 'PNG')
    print('Generated public/apple-touch-icon.png')

    # 5. Favicon 32x32 & 48x48
    img_favicon = draw_shield_icon(48, is_maskable=False)
    img_favicon.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('Generated public/favicon.ico')

    # 6. Vector SVG icon
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0d9488"/>
  <path d="M256 65 L415 105 L415 270 Q415 390 256 450 Q97 390 97 270 L97 105 Z" fill="#0f766e"/>
  <path d="M256 85 L395 120 L395 265 Q395 375 256 430 Q117 375 117 265 L117 120 Z" fill="#0d9488"/>
  <path d="M190 255 L240 315 L335 185" fill="none" stroke="#ffffff" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''
    with open('public/pwa-icon.svg', 'w') as f:
        f.write(svg_content)
    print('Generated public/pwa-icon.svg')

if __name__ == '__main__':
    main()
