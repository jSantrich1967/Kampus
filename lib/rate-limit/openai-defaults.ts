/**
 * Defaults for OpenAI-backed API routes. Override with env (server-side only).
 */
export function psychologistChatRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_PSYCHOLOGIST_CHAT ?? "40", 10),
    windowMs: parseInt(process.env.API_RL_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  };
}

export function rescuePackRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_RESCUE_PACK ?? "20", 10),
    windowMs: parseInt(process.env.API_RL_RESCUE_PACK_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function classPresentationRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_CLASS_PRESENTATION ?? "15", 10),
    windowMs: parseInt(process.env.API_RL_CLASS_PRESENTATION_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function classPresentationSpeechRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_CLASS_PRESENTATION_SPEECH ?? "60", 10),
    windowMs: parseInt(process.env.API_RL_CLASS_PRESENTATION_SPEECH_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function classPresentationIllustrationRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_CLASS_PRESENTATION_ILLUSTRATION ?? "30", 10),
    windowMs: parseInt(process.env.API_RL_CLASS_PRESENTATION_ILLUSTRATION_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function rescueExtractRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_RESCUE_EXTRACT ?? "45", 10),
    windowMs: parseInt(process.env.API_RL_RESCUE_EXTRACT_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function presentationTutorRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_PRESENTATION_TUTOR ?? "35", 10),
    windowMs: parseInt(process.env.API_RL_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  };
}

export function presentationTranscribeRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_TRANSCRIBE ?? "30", 10),
    windowMs: parseInt(process.env.API_RL_TRANSCRIBE_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function examCorrectorRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_EXAM_CORRECTOR ?? "20", 10),
    windowMs: parseInt(process.env.API_RL_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  };
}

export function selfExamCorrectorRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_SELF_EXAM_CORRECTOR ?? "20", 10),
    windowMs: parseInt(process.env.API_RL_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  };
}

export function materialConverterRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_MATERIAL_CONVERT ?? "15", 10),
    windowMs: parseInt(process.env.API_RL_MATERIAL_CONVERT_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}

export function studyRoomAssistantRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_STUDY_ROOM_ASSISTANT ?? "35", 10),
    windowMs: parseInt(process.env.API_RL_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  };
}

export function virtualClassTranscribeRateLimits(): { max: number; windowMs: number } {
  return {
    max: parseInt(process.env.API_RL_MAX_VIRTUAL_CLASS_TRANSCRIBE ?? "15", 10),
    windowMs: parseInt(process.env.API_RL_VIRTUAL_CLASS_TRANSCRIBE_WINDOW_MS ?? String(60 * 60 * 1000), 10),
  };
}
