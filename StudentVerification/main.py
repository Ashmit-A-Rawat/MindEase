from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import cv2
import easyocr
import numpy as np
from rapidfuzz import fuzz
import re
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reader = easyocr.Reader(['en'])

def normalize_dob(dob_str: str) -> str:
    dob_str = dob_str.replace("/", "-").replace(".", "-").replace(" ", "-")

    match = re.match(r"(\d{2})-(\d{2})-(\d{2,4})", dob_str)
    if not match:
        return dob_str  

    day, month, year = match.groups()
    if len(year) == 2:  
        year = "20" + year if int(year) < 50 else "19" + year

    try:
        dob = datetime.strptime(f"{day}-{month}-{year}", "%d-%m-%Y")
        return dob.strftime("%d-%m-%Y")
    except ValueError:
        return dob_str


@app.post("/verify")
async def verify_student(
    name: str = Form(...),
    college_name: str = Form(...),
    academic_year: str = Form(...),
    dob: str = Form(...),
    id_card: UploadFile = File(...)
):
    # ✅ Read file into memory as bytes
    image_bytes = await id_card.read()

    # ✅ Convert bytes → numpy array → OpenCV image
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Resize for better OCR
    scale_percent = 200
    width = int(img.shape[1] * scale_percent / 100)
    height = int(img.shape[0] * scale_percent / 100)
    resized = cv2.resize(img, (width, height), interpolation=cv2.INTER_CUBIC)

    # ✅ OCR directly on the in-memory image
    results = reader.readtext(resized)
    extracted_text = " ".join([text for (_, text, prob) in results])

    # Normalize DoB and extracted text
    dob_norm = normalize_dob(dob)
    extracted_text_norm = normalize_dob(extracted_text)

    # Fuzzy matching
    name_score = fuzz.partial_ratio(name.lower(), extracted_text.lower())
    college_score = fuzz.partial_ratio(college_name.lower(), extracted_text.lower())
    year_score = fuzz.partial_ratio(academic_year.lower(), extracted_text.lower())
    dob_score = fuzz.partial_ratio(dob_norm.lower(), extracted_text_norm.lower())

    strict_threshold = 70
    avg_threshold = 75

    name_verified = name_score >= strict_threshold
    college_verified = college_score >= strict_threshold
    dob_verified = dob_score >= strict_threshold

    avg_score = (name_score + college_score + year_score + dob_score) / 4

    if name_verified and college_verified and dob_verified and avg_score >= avg_threshold:
        status = "success"
    else:
        status = "error"

    return {
        "status": status,
        "similarity_scores": {
            "name": name_score,
            "college_name": college_score,
            "academic_year": year_score,
            "dob": dob_score,
            "average": round(avg_score, 2)
        },
        "field_status": {
            "name": "passed" if name_verified else "failed",
            "college_name": "passed" if college_verified else "failed",
            "dob": "passed" if dob_verified else "failed",
        }
    }
