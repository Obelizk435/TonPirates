export function calculatePlunderSuccess(crewMembers: number, plunderLevel: number): boolean {
  // Simplified success calculation based on crew and plunder level
  const baseChance = 0.5 // 50% base chance
  const crewBonus = crewMembers * 0.01 // 1% bonus per crew member
  const levelPenalty = (plunderLevel - 1) * 0.05 // 5% penalty per level above 1

  const successChance = baseChance + crewBonus - levelPenalty
  return Math.random() < Math.max(0, Math.min(1, successChance)) // Ensure chance is between 0 and 1
}

export function calculatePlunderRewards(
  success: boolean,
  crewMembers: number,
  plunderLevel: number,
): { rewards: { tnau: number; rum?: number; sugar?: number; wood?: number }; message: string } {
  if (success) {
    const baseReward = 10
    const crewBonus = crewMembers * 0.5
    const levelBonus = plunderLevel * 2

    const tnauReward = baseReward + crewBonus + levelBonus
    const rumReward = Math.floor(Math.random() * 5)
    const sugarReward = Math.floor(Math.random() * 3)
    const woodReward = Math.floor(Math.random() * 2)

    return {
      rewards: { tnau: tnauReward, rum: rumReward, sugar: sugarReward, wood: woodReward },
      message: "Plunder successful! Resources gained.",
    }
  } else {
    return {
      rewards: { tnau: 0 },
      message: "Plunder failed. No resources gained.",
    }
  }
}

export function calculateDailyEarnings(ships: { isActive: boolean; earningsPerDay: number }[]): number {
  let totalEarnings = 0
  for (const ship of ships) {
    if (ship.isActive) {
      totalEarnings += ship.earningsPerDay
    }
  }
  return totalEarnings
}

export function calculateResourceUpkeep(ships: { isActive: boolean }[]): { rum: number; wood: number } {
  let rumUpkeep = 0
  let woodUpkeep = 0

  for (const ship of ships) {
    if (ship.isActive) {
      rumUpkeep += 1
      woodUpkeep += 1
    }
  }

  return { rum: rumUpkeep, wood: woodUpkeep }
}

