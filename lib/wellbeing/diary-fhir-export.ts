import { addDaysLocalIso, localIsoDate } from "@/lib/calendar/local-iso-date";
import type { DiaryEntry, DiaryMood } from "@/lib/schemas/diary-entry";
import type { DiaryExportRange } from "@/lib/wellbeing/diary-export";
import { diaryEntriesForExport } from "@/lib/wellbeing/diary-export";

const KAMPUS_FHIR_SYSTEM = "https://kampus.app/fhir/CodeSystem/wellbeing";

const MOOD_CODE: Record<DiaryMood, string> = {
  heavy: "mood-heavy",
  low: "mood-low",
  neutral: "mood-neutral",
  light: "mood-light",
  bright: "mood-bright",
};

export type FhirExportOptions = {
  includeNarrative: boolean;
  patientReference: string;
};

export type FhirLiteBundle = {
  resourceType: "Bundle";
  type: "collection";
  meta: { profile: string[]; lastUpdated: string };
  identifier: { system: string; value: string };
  entry: Array<{ fullUrl: string; resource: Record<string, unknown> }>;
};

function observationId(entryId: string, kind: string): string {
  return `urn:uuid:kampus-${kind}-${entryId}`;
}

function moodObservation(entry: DiaryEntry, patientRef: string, includeNarrative: boolean): Record<string, unknown> {
  const obs: Record<string, unknown> = {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: KAMPUS_FHIR_SYSTEM,
          code: "mood-self-report",
          display: "Self-reported mood (Kampus diary)",
        },
      ],
    },
    subject: { reference: patientRef },
    effectiveDateTime: `${entry.entryDate}T12:00:00`,
    valueCodeableConcept: {
      coding: [
        {
          system: KAMPUS_FHIR_SYSTEM,
          code: MOOD_CODE[entry.mood],
          display: entry.mood,
        },
      ],
    },
  };
  if (includeNarrative && entry.body.trim()) {
    obs.note = [{ text: entry.body.trim().slice(0, 500) }];
  }
  return obs;
}

function energyObservation(entry: DiaryEntry, patientRef: string): Record<string, unknown> {
  return {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: KAMPUS_FHIR_SYSTEM,
          code: "energy-self-report",
          display: "Self-reported energy 1-5 (Kampus diary)",
        },
      ],
    },
    subject: { reference: patientRef },
    effectiveDateTime: `${entry.entryDate}T12:00:00`,
    valueQuantity: {
      value: entry.energy,
      unit: "{score}",
      system: KAMPUS_FHIR_SYSTEM,
      code: "energy-1-5",
    },
  };
}

export function buildDiaryFhirLiteBundle(
  entries: DiaryEntry[],
  range: DiaryExportRange,
  options: Partial<FhirExportOptions> = {},
): FhirLiteBundle {
  const includeNarrative = options.includeNarrative ?? false;
  const patientRef = options.patientReference ?? "Patient/kampus-self";
  const filtered = diaryEntriesForExport(entries, range);
  const exportId = `kampus-wellbeing-${localIsoDate()}`;

  const entryResources: FhirLiteBundle["entry"] = [];

  for (const e of filtered) {
    entryResources.push({
      fullUrl: observationId(e.id, "mood"),
      resource: moodObservation(e, patientRef, includeNarrative),
    });
    entryResources.push({
      fullUrl: observationId(e.id, "energy"),
      resource: energyObservation(e, patientRef),
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    meta: {
      profile: ["https://kampus.app/fhir/StructureDefinition/wellbeing-diary-lite"],
      lastUpdated: new Date().toISOString(),
    },
    identifier: {
      system: "https://kampus.app/fhir/export",
      value: exportId,
    },
    entry: entryResources,
  };
}

export function downloadDiaryFhirJson(bundle: FhirLiteBundle, filenamePrefix = "kampus-wellbeing-fhir"): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${localIsoDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fhirExportRangeStart(range: DiaryExportRange): string {
  if (range === "all") return "1970-01-01";
  return addDaysLocalIso(-(range - 1));
}
