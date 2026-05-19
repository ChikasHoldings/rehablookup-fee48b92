/**
 * Per-modality colour themes shared between the national treatment-
 * hub heroes (TreatmentHubHero, used by DrugAddictionTreatment,
 * AlcoholRehabilitation, …) and the state-scoped treatment heroes
 * (TreatmentStateHero, used by StateAlcoholRehab, StateDrugAddiction,
 * …). Keeping the palette in one place means the national +
 * state-scoped pages for the same modality read as visually
 * connected — same accent colour, same eyebrow ring — even though
 * each archetype has its own layout.
 *
 * Tailwind-arbitrary values so we don't need to extend the theme
 * config; everything resolves at compile time.
 */
export const TREATMENT_THEMES = {
  alcohol: {
    gradient: "from-teal-950 via-teal-900/85 to-cyan-700/60",
    accent: "from-teal-500 to-cyan-500",
    iconBg: "bg-teal-500/20 ring-teal-300/25",
  },
  drug: {
    gradient: "from-slate-950 via-primary/85 to-primary/60",
    accent: "from-primary to-primary",
    iconBg: "bg-primary/20 ring-primary/25",
  },
  dual: {
    gradient: "from-slate-950 via-violet-900/80 to-fuchsia-700/55",
    accent: "from-violet-500 to-fuchsia-500",
    iconBg: "bg-violet-500/20 ring-violet-300/25",
  },
  inpatient: {
    gradient: "from-slate-950 via-indigo-900/80 to-indigo-600/55",
    accent: "from-indigo-500 to-indigo-400",
    iconBg: "bg-indigo-500/20 ring-indigo-300/25",
  },
  outpatient: {
    gradient: "from-slate-950 via-emerald-900/80 to-emerald-600/55",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-500/20 ring-emerald-300/25",
  },
  detox: {
    gradient: "from-slate-950 via-sky-900/85 to-sky-600/55",
    accent: "from-sky-500 to-cyan-500",
    iconBg: "bg-sky-500/20 ring-sky-300/25",
  },
  holistic: {
    gradient: "from-slate-950 via-emerald-900/75 to-lime-700/50",
    accent: "from-emerald-500 to-lime-500",
    iconBg: "bg-emerald-500/20 ring-emerald-300/25",
  },
  luxury: {
    gradient: "from-slate-950 via-amber-900/70 to-amber-600/45",
    accent: "from-amber-500 to-yellow-500",
    iconBg: "bg-amber-500/20 ring-amber-300/25",
  },
} as const;

export type TreatmentThemeKey = keyof typeof TREATMENT_THEMES;
