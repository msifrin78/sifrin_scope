import type { EngagementDetails, ParticipationDetails } from "./definitions"

// The score is now directly stored, so we just return it.
export const calculateParticipationScore = (details: ParticipationDetails) => {
  return details.score;
}

// The score is now directly stored, so we just return it.
export const calculateEngagementScore = (details: EngagementDetails) => {
  return details.score;
}
