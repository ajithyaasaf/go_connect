import os
from PIL import Image, ImageOps

# Paths
source_logo = r"e:\Godivatech\Godivatech\GoConnect\assets\Logo.png"
res_dir = r"e:\Godivatech\Godivatech\GoConnect\android\app\src\main\res"

# Standard Android Icon Sizes for Splash (Safe, optimized)
# Base: ~160-200dp width
sizes = {
    "mipmap-mdpi": 192,
    "mipmap-hdpi": 288,
    "mipmap-xhdpi": 384,
    "mipmap-xxhdpi": 576,
    "mipmap-xxxhdpi": 768,
}

def create_splash_logo(source_path, target_path, width):
    try:
        with Image.open(source_path) as img:
             # Ensure RGBA 
            img = img.convert("RGBA")
            
            # Resize maintaining aspect ratio
            aspect_ratio = img.height / img.width
            height = int(width * aspect_ratio)
            
            # High quality resize
            img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
            
            img_resized.save(target_path, "PNG")
            
    except FileNotFoundError:
        print(f"Error: Source file not found at {source_path}")
        exit(1)

# Generate PNGs
for folder, width in sizes.items():
    target_folder = os.path.join(res_dir, folder)
    if not os.path.exists(target_folder):
        os.makedirs(target_folder)
    
    print(f"Generating splash logo for {folder} ({width}px)...")
    create_splash_logo(source_logo, os.path.join(target_folder, "splash_logo.png"), width)

print("Splash assets generated successfully!")
