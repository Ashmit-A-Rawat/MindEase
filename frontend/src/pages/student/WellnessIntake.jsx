import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

// Values stored in the DB stay the fixed English strings the ML service
// expects (see ml-service/SCHEMA_MAPPING.md) — only the on-screen label is
// translated, via the sleepOptionKeys/dietaryOptionKeys/genderOptionKeys maps.
const SLEEP_OPTIONS = ["Less than 5 hours", "5-6 hours", "7-8 hours", "More than 8 hours"];
const SLEEP_OPTION_KEYS = ["under5", "5to6", "7to8", "over8"];
const DIETARY_OPTIONS = ["Healthy", "Moderate", "Unhealthy"];
const DIETARY_OPTION_KEYS = ["healthy", "moderate", "unhealthy"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const GENDER_OPTION_KEYS = ["male", "female", "other"];

const EMPTY_FORM = {
  gender: "",
  city: "",
  cgpa: "",
  academicPressure: 2,
  workPressure: 0,
  studySatisfaction: 3,
  jobSatisfaction: 0,
  sleepDuration: "",
  dietaryHabits: "",
  degree: "",
  workStudyHours: 6,
  financialStress: 2,
  familyHistory: false,
};

export default function WellnessIntake() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchIntake = async () => {
      try {
        const res = await api.get(`/wellness/${studentId}`);
        if (res.data) {
          setForm({ ...EMPTY_FORM, ...res.data });
        }
      } catch (error) {
        console.error("Error fetching wellness intake:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntake();
  }, [studentId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post("/wellness", { studentId, ...form });
      setSaved(true);
    } catch (error) {
      console.error("Error saving wellness intake:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
          <p className="text-blue-600 font-medium">{t("wellnessIntake.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-teal-600 hover:text-teal-800 mb-6 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("wellnessIntake.back")}
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-2">
              {t("wellnessIntake.title")}
            </h1>
            <p className="text-gray-600 text-sm">{t("wellnessIntake.description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.gender")}</label>
                <select
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="">{t("wellnessIntake.select")}</option>
                  {GENDER_OPTIONS.map((g, i) => <option key={g} value={g}>{t(`wellnessIntake.genderOptions.${GENDER_OPTION_KEYS[i]}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.city")}</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                  placeholder={t("wellnessIntake.cityPlaceholder")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.degree")}</label>
                <input
                  type="text"
                  value={form.degree}
                  onChange={(e) => handleChange("degree", e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                  placeholder={t("wellnessIntake.degreePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.cgpa")}</label>
                <input
                  type="number" min="0" max="10" step="0.1"
                  value={form.cgpa}
                  onChange={(e) => handleChange("cgpa", e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-300 p-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("wellnessIntake.academicPressure", { value: form.academicPressure })}
              </label>
              <input
                type="range" min="0" max="5" step="1"
                value={form.academicPressure}
                onChange={(e) => handleChange("academicPressure", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("wellnessIntake.workPressure", { value: form.workPressure })}{" "}
                <span className="text-xs text-gray-400">{t("wellnessIntake.workPressureNote")}</span>
              </label>
              <input
                type="range" min="0" max="5" step="1"
                value={form.workPressure}
                onChange={(e) => handleChange("workPressure", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("wellnessIntake.studySatisfaction", { value: form.studySatisfaction })}
              </label>
              <input
                type="range" min="0" max="5" step="1"
                value={form.studySatisfaction}
                onChange={(e) => handleChange("studySatisfaction", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("wellnessIntake.financialStress", { value: form.financialStress })}
              </label>
              <input
                type="range" min="0" max="5" step="1"
                value={form.financialStress}
                onChange={(e) => handleChange("financialStress", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.sleepDuration")}</label>
                <select
                  value={form.sleepDuration}
                  onChange={(e) => handleChange("sleepDuration", e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="">{t("wellnessIntake.select")}</option>
                  {SLEEP_OPTIONS.map((s, i) => <option key={s} value={s}>{t(`wellnessIntake.sleepOptions.${SLEEP_OPTION_KEYS[i]}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("wellnessIntake.dietaryHabits")}</label>
                <select
                  value={form.dietaryHabits}
                  onChange={(e) => handleChange("dietaryHabits", e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="">{t("wellnessIntake.select")}</option>
                  {DIETARY_OPTIONS.map((d, i) => <option key={d} value={d}>{t(`wellnessIntake.dietaryOptions.${DIETARY_OPTION_KEYS[i]}`)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("wellnessIntake.workStudyHours", { value: form.workStudyHours })}
              </label>
              <input
                type="range" min="0" max="16" step="1"
                value={form.workStudyHours}
                onChange={(e) => handleChange("workStudyHours", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="familyHistory"
                checked={form.familyHistory}
                onChange={(e) => handleChange("familyHistory", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <label htmlFor="familyHistory" className="ml-2 text-sm text-gray-700">
                {t("wellnessIntake.familyHistory")}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium hover:from-blue-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? t("wellnessIntake.saving") : saved ? t("wellnessIntake.saved") : t("wellnessIntake.save")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
