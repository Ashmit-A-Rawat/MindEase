# Kaggle → MindEase schema mapping

The trained models (`rf_model.pkl`, `log_model.pkl`, the upcoming Decision Tree/K-Means/Apriori)
were fit on `student_depression.csv` (Kaggle, 27,901 rows). This doc maps every column in that
dataset to what MindEase actually has (or doesn't have) today, so `/predict` and friends can be
fed real user data instead of only the CSV.

## Source: `student_depression.csv` columns

```
id, Gender, Age, City, Profession, Academic Pressure, Work Pressure, CGPA,
Study Satisfaction, Job Satisfaction, Sleep Duration, Dietary Habits, Degree,
Have you ever had suicidal thoughts ?, Work/Study Hours, Financial Stress,
Family History of Mental Illness, Depression (target)
```

## Column-by-column mapping

| Kaggle feature | MindEase source | Status | Notes |
|---|---|---|---|
| `Gender` | — | **Missing** | Not captured anywhere in `User` model |
| `Age` | `User.dob` | Derivable | Compute from DOB at request time |
| `City` | — | **Missing** | Not captured |
| `Profession` | — | Constant | Always `"Student"` for MindEase's population — safe to hardcode |
| `Academic Pressure` | — | **Missing** | |
| `Work Pressure` | — | **Missing** | |
| `CGPA` | — | **Missing** | |
| `Study Satisfaction` | — | **Missing** | |
| `Job Satisfaction` | — | **Missing** | Likely always low/0 for full-time students — needs a default, not a real signal |
| `Sleep Duration` | — | **Missing** | |
| `Dietary Habits` | — | **Missing** | |
| `Degree` | — | **Missing** | Not captured (only `collegeName`, `academicYear` exist) |
| `Have you ever had suicidal thoughts ?` | `TestResult.tests[].answers[8]` (PHQ-9 item 9) | **Proxy available** | PHQ-9 Q9 is literally "Thoughts of self-harm or death?" (see `backend/seeder.js`). `answers[8] >= 1` → `Yes`. This is the same signal the existing safety-override logic in `ml-service/app.py` already treats as critical. |
| `Work/Study Hours` | — | **Missing** | |
| `Financial Stress` | — | **Missing** | |
| `Family History of Mental Illness` | — | **Missing** | |
| `Depression` (target) | `TestResult.tests[].score` + `severity` | Related but not equivalent | PHQ-9/GAD-7/GHQ-12 scores are the closest MindEase equivalent of the label, not a 1:1 match |

## The real finding

Out of 16 input features, MindEase's current schema (`User`, `TestResult`, `TestQuestion`) only
covers **2 directly** (Age via DOB, suicidal-ideation proxy via PHQ-9 Q9) and **1 by convention**
(Profession = "Student"). The other 13 — gender, city, CGPA, academic/work pressure, study/job
satisfaction, sleep duration, dietary habits, degree, work/study hours, financial stress, family
history — are **not captured anywhere**. `StudentForm.jsx` is identity verification (name, college,
DOB, ID card) only; it was never meant to collect lifestyle data.

This means that today, a call to `/predict/risk` for a real MindEase user would run on mostly
placeholder defaults (the same fallback values already hardcoded in `preprocess_student_data`,
e.g. `Age=20.0`, `Academic Pressure=1.0`) rather than real signal — the model would barely be
better than a coin flip for anyone whose actual pressure/sleep/finances differ from those defaults.

## Recommendation (blocking prerequisite for Phase 2 model integration)

Add a minimal `WellnessIntake` collection capturing the 13 missing fields, collected once
(re-editable) per student — separate from `StudentForm.jsx`'s identity-verification flow. Schema
only, no UI yet (UI is Phase 4 scope):

```js
// backend/models/WellnessIntake.js
{
  studentId: ObjectId (ref: User),
  gender: String,          // Male | Female | Other
  city: String,
  cgpa: Number,
  academicPressure: Number,   // 0-5
  workPressure: Number,       // 0-5
  studySatisfaction: Number,  // 0-5
  jobSatisfaction: Number,    // 0-5, default 0 (students)
  sleepDuration: String,      // 'Less than 5 hours' | '5-6 hours' | '7-8 hours' | 'More than 8 hours'
  dietaryHabits: String,      // Healthy | Moderate | Unhealthy
  degree: String,
  workStudyHours: Number,
  financialStress: Number,    // 0-5
  familyHistory: Boolean,
  updatedAt: Date
}
```

Until this ships, `/predict/risk` should keep using the existing default-fallback behavior — that's
not a bug to fix in Phase 2, it's the intended degraded mode when intake data doesn't exist yet.

## Update (Phase 2): the real model needs far fewer fields than this doc assumed

While building the Decision Tree Regressor, K-Means, and Apriori models, I discovered
`rf_model.pkl`/`log_model.pkl` were actually trained on only **12 engineered features** —
not the 110-feature scheme this document originally mapped against. That 110-feature
`features.pkl`/`scaler.pkl`/`model.pkl` set was an orphaned artifact from a separate,
abandoned experiment; `preprocess_student_data()` in `app.py` was building vectors against
it while `rf_model.pkl` expected something completely different. Every live `/predict` call
was hitting a silent shape-mismatch fallback (always returning a hardcoded low-risk guess),
and (separately) the risk-level thresholds in `get_detailed_analysis()` were inverted — see
`train_all_models.py` and the fix commit for full detail. Both are now fixed and verified
end-to-end.

The actual classifier feature contract is: `Age, Academic Pressure, Work Pressure, CGPA,
Study Satisfaction, Job Satisfaction, Sleep Duration, Work/Study Hours, Total Pressure
(engineered = Academic + Work Pressure), Dietary Habits (one-hot)`.

Good news: **`WellnessIntake` (added in Phase 1) already covers every one of these** —
`cgpa`, `academicPressure`, `workPressure`, `studySatisfaction`, `jobSatisfaction`,
`sleepDuration`, `workStudyHours`, `dietaryHabits` map 1:1, `Age` comes from `User.dob`, and
`Total Pressure` is computed server-side. Gender/City/Degree/Financial-Stress/Family-History
were never actually used by the live model — they only matter for the K-Means/Apriori
population-level analyses (trained on the full CSV, not constrained to the classifier's
12-feature contract), where `WellnessIntake.financialStress` is still useful.

## Training data strategy

- **Now**: keep training on `student_depression.csv` (Kaggle) — it's the only dataset with enough
  volume (27.9k rows) to fit a meaningful model.
- **Later**: once `WellnessIntake` + `TestResult` accumulate real MindEase rows, add a Mongo export
  script (deferred — not in the current 3-day scope) to retrain on real usage data. The
  `train_model.py` entrypoint (Phase 2) should accept either source without changing the pipeline,
  since the column names above are designed to line up.
