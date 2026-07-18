import base64
import json
import sys

from PIL import Image


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: read_image_rgb.py <image_path>")

    image_path = sys.argv[1]
    image = Image.open(image_path).convert("RGB")
    payload = {
        "path": image_path,
        "width": image.width,
        "height": image.height,
        "rgbBase64": base64.b64encode(image.tobytes()).decode("ascii"),
    }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
