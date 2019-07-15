# Uploads all sticker images under /static, respecting a directory structure
# explained in /static/README to create a cached query response.

import base64
import io
import firebase_admin

from firebase_admin import credentials
from firebase_admin import firestore
from os import listdir
from os.path import isfile, isdir, join
from PIL import Image

cred = credentials.Certificate('../.private/serviceAccount.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

STICKER_URL = "https://requestionapp.firebaseapp.com/sticker/?id="
TITLE_MAP = {
    "groups": "Groups",
    "recap": "Recap",
    "scorers": "Top Scorers",
    "upcoming": "Upcoming"
}


def upload_sticker(size, b64, url=None, alternatives=None):
    data = {
        "image": b64,
        "width": size[0],
        "height": size[1],
        "type": "pythonScriptStaticUpload"
    }
    if url:
        data["redirectUrl"] = url
    if alternatives:
        data["alternatives"] = alternatives
    _, sticker_id = db.collection(u'stickers').add(data)
    return STICKER_URL + sticker_id.id


def image_from_path(path):
    with Image.open(path) as img:
        imgByteArr = io.BytesIO()
        img.save(imgByteArr, format='PNG')
        encoded = base64.b64encode(imgByteArr.getvalue()).decode('utf-8')
        b64 = "data:image/png;base64," + encoded
        return (img.size, b64)


def upload_sticker_and_alternatives(path, name):
    sticker_size, sticker_b64 = image_from_path(join(path, name))
    url = "https://" + name.strip()[:-4].replace("_", "/")
    possible_alternatives_path = join(path, name[:-4])
    if isdir(possible_alternatives_path):
        alternatives = []
        alt_path = possible_alternatives_path
        png_paths = [
            join(alt_path, f) for f in listdir(alt_path)
            if isfile(join(alt_path, f)) and f.endswith(".png")
        ]
        for png in png_paths:
            size, b64 = image_from_path(png)
            img_src = upload_sticker(size, b64, url)
            alternatives.append({
                "imgSrc": img_src,
                "imgHeight": size[1],
                "imgWidth": size[0]
            })
        sticker_src = upload_sticker(sticker_size, sticker_b64, url,
                                     alternatives)
    else:
        sticker_src = upload_sticker(sticker_size, sticker_b64, url)

    result = {
        "redirectUrl": url,
        "imgSrc": sticker_src,
        "imgHeight": sticker_size[1],
        "imgWidth": sticker_size[0]
    }
    return result


def query(q):
    path = f"./static/{q}/"
    section_keys = [f for f in listdir(path) if isdir(join(path, f))]
    sections = {}
    for key in section_keys:
        section_path = join(path, key)
        sticker_names = [
            f for f in listdir(section_path)
            if isfile(join(section_path, f)) and f.endswith(".png")
        ]
        stickers = map(
            lambda name: upload_sticker_and_alternatives(section_path, name),
            sticker_names)
        sections[key] = {"title": TITLE_MAP[key], "data": list(stickers)}
    db.collection(u'cache').document('query:' + q).set({
        "data": sections
    })
    return sections

#query("2019 Women's World Cup")
