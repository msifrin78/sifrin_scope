import type { EngagementDetails, ParticipationDetails } from "./definitions"

export const calculateParticipationScore = (details: ParticipationDetails) => {
  return Object.values(details).reduce((sum, value) => sum + value, 0)
}

export const calculateEngagementScore = (details: EngagementDetails) => {
  let score = details.attendance ? 2 : 0
  score += details.preparedness
  score += details.focus
  score += details.respect
  return score
}
