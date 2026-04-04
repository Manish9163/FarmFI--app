import requests
from io import BytesIO
from PIL import Image

url = "https://img.freepik.com/premium-vector/logo-design-letter-f-vector-art_1002026-165.jpg"
response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
img = Image.open(BytesIO(response.content)).convert("RGBA")

data = img.getdata()
new_data = []

# Replace white background (and light grey watermarks) with transparency
for item in data:
    if item[0] > 210 and item[1] > 210 and item[2] > 210:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

img.putdata(new_data)
img.save("assets/logo_f_clear.png", "PNG")
print("Saved transparent logo successfully to assets/logo_f_clear.png!")
