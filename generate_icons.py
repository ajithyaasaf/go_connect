import os
from PIL import Image, ImageOps, ImageDraw

# Paths - Updated to look for favicon generally, will confirm extension dynamically if needed, 
# but hardcoding based on expected user action first.
source_icon = r"e:\Godivatech\Godivatech\GoConnect\assets\Favicon.png" 
res_dir = r"e:\Godivatech\Godivatech\GoConnect\android\app\src\main\res"

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def create_icon(source_path, target_path, size, round_icon=False):
    try:
        with Image.open(source_path) as img_raw:
            # Ensure RGBA for consistency
            img = img_raw.convert("RGBA")
            
            # Create a white background
            background = Image.new("RGBA", (size, size), (255, 255, 255, 255))
            
            # Use FULL SIZE (Standard fits to 100% of canvas)
            img_resized = ImageOps.fit(img, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
            
            if round_icon:
                # Mask to circle
                mask = Image.new("L", (size, size), 0)
                draw = ImageDraw.Draw(mask)
                draw.ellipse((0, 0, size, size), fill=255)
                
                output = ImageOps.fit(img_resized, mask.size, centering=(0.5, 0.5))
                output.putalpha(mask)
                
                # Composite on white if transparent
                final = Image.new("RGBA", (size, size), (255, 255, 255, 255))
                final.paste(output, (0, 0), output)
                final.save(target_path, "PNG")
            else:
                background.paste(img_resized, (0, 0), img_resized)
                background.save(target_path, "PNG")
    except FileNotFoundError:
        print(f"Error: Source file not found at {source_path}")
        exit(1)

for folder, size in sizes.items():
    target_folder = os.path.join(res_dir, folder)
    if not os.path.exists(target_folder):
        os.makedirs(target_folder)
        
    print(f"Generating icons for {folder} ({size}px)...")
    create_icon(source_icon, os.path.join(target_folder, "ic_launcher.png"), size)
    create_icon(source_icon, os.path.join(target_folder, "ic_launcher_round.png"), size, round_icon=True)

print("Icons generated successfully!")
