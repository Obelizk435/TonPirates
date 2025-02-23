"use server"

import { prisma } from "./db"
import {
  calculatePlunderSuccess,
  calculatePlunderRewards,
  calculateDailyEarnings,
  calculateResourceUpkeep,
} from "./game/mechanics"

export async function initializePlayer(walletAddress: string) {
  try {
    // Check if player already exists
    let player = await prisma.player.findUnique({
      where: { walletAddress },
      include: { ships: true },
    })

    if (!player) {
      // Create new player with starter ship
      player = await prisma.player.create({
        data: {
          walletAddress,
          islandName: "Tonau Island",
          tnauBalance: 100,
          tonBalance: 50,
          referralCode: `REF${Math.random().toString(36).substr(2, 9)}`,
          ships: {
            create: {
              name: "Small Vessel",
              type: "Small Ship",
              isActive: true,
              earningsPerDay: 1.25,
              plunderLevel: 1,
              imageUrl: "https://i.imgur.com/k4igWTR.png",
              crewMembers: 3,
              maxCrew: 5,
            },
          },
        },
        include: { ships: true },
      })
    }

    return { success: true, player }
  } catch (error) {
    console.error("Failed to initialize player:", error)
    return { success: false, error: "Failed to initialize player" }
  }
}

export async function getGameState(walletAddress: string) {
  try {
    const player = await prisma.player.findUnique({
      where: { walletAddress },
      include: {
        ships: true,
        plunders: {
          where: { status: "active" },
        },
      },
    })

    if (!player) {
      return { success: false, error: "Player not found" }
    }

    return { success: true, player }
  } catch (error) {
    console.error("Failed to fetch game state:", error)
    return { success: false, error: "Failed to fetch game state" }
  }
}

export async function toggleShipActive(shipId: string, playerId: string) {
  try {
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        playerId,
      },
    })

    if (!ship) {
      return { success: false, error: "Ship not found" }
    }

    const updatedShip = await prisma.ship.update({
      where: { id: shipId },
      data: { isActive: !ship.isActive },
    })

    return { success: true, ship: updatedShip }
  } catch (error) {
    console.error("Failed to toggle ship:", error)
    return { success: false, error: "Failed to toggle ship" }
  }
}

export async function recruitCrew(shipId: string, playerId: string, quantity: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
      })

      const ship = await tx.ship.findFirst({
        where: {
          id: shipId,
          playerId,
        },
      })

      if (!player || !ship) {
        throw new Error("Player or ship not found")
      }

      const cost = quantity * 5 // 5 TNAU per crew member

      if (player.tnauBalance.toNumber() < cost) {
        throw new Error("Insufficient TNAU balance")
      }

      if (ship.crewMembers + quantity > ship.maxCrew) {
        throw new Error("Exceeds maximum crew capacity")
      }

      // Update player balance
      await tx.player.update({
        where: { id: playerId },
        data: { tnauBalance: { decrement: cost } },
      })

      // Update ship crew
      const updatedShip = await tx.ship.update({
        where: { id: shipId },
        data: { crewMembers: { increment: quantity } },
      })

      // Record the transaction
      await tx.transaction.create({
        data: {
          type: "spend",
          resource: "tnau",
          amount: cost,
          fromId: playerId,
          reason: "crew_hire",
        },
      })

      return { success: true, ship: updatedShip }
    })
  } catch (error) {
    console.error("Failed to recruit crew:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to recruit crew" }
  }
}

export async function startPlunder(shipId: string, playerId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const ship = await tx.ship.findFirst({
        where: {
          id: shipId,
          playerId,
          isActive: true,
        },
      })

      const player = await tx.player.findUnique({
        where: { id: playerId },
      })

      if (!ship || !player) {
        throw new Error("Ship or player not found")
      }

      if (ship.crewMembers === 0) {
        throw new Error("Cannot plunder without crew members")
      }

      if (player.plunderTips < 1) {
        throw new Error("No plunder tips available")
      }

      // Calculate plunder results
      const success = calculatePlunderSuccess(ship.crewMembers, ship.plunderLevel)
      const result = calculatePlunderRewards(success, ship.crewMembers, ship.plunderLevel)

      // Create plunder record
      const plunder = await tx.plunder.create({
        data: {
          playerId,
          status: success ? "completed" : "failed",
          reward: result.rewards.tnau,
          resources: result.rewards,
          completedAt: new Date(),
        },
      })

      // Update player resources
      await tx.player.update({
        where: { id: playerId },
        data: {
          plunderTips: { decrement: 1 },
          tnauBalance: { increment: result.rewards.tnau },
          rum: { increment: result.rewards.rum || 0 },
          sugar: { increment: result.rewards.sugar || 0 },
          wood: { increment: result.rewards.wood || 0 },
        },
      })

      return {
        success: true,
        plunder,
        message: result.message,
      }
    })
  } catch (error) {
    console.error("Failed to start plunder:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start plunder",
    }
  }
}

export async function processDailyUpdate(playerId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { ships: true },
      })

      if (!player) {
        throw new Error("Player not found")
      }

      // Calculate earnings and upkeep
      const dailyEarnings = calculateDailyEarnings(player.ships)
      const upkeep = calculateResourceUpkeep(player.ships)

      // Check if player has enough resources for upkeep
      if (player.rum < upkeep.rum || player.wood < upkeep.wood) {
        // Deactivate ships if not enough resources
        await tx.ship.updateMany({
          where: {
            playerId,
            isActive: true,
          },
          data: { isActive: false },
        })

        return {
          success: false,
          message: "Not enough resources for ship maintenance. Ships have been deactivated.",
        }
      }

      // Update player resources
      await tx.player.update({
        where: { id: playerId },
        data: {
          tnauBalance: { increment: dailyEarnings },
          rum: { decrement: upkeep.rum },
          wood: { decrement: upkeep.wood },
        },
      })

      // Record the earnings transaction
      await tx.transaction.create({
        data: {
          type: "earn",
          resource: "tnau",
          amount: dailyEarnings,
          toId: playerId,
          reason: "daily_earnings",
        },
      })

      return {
        success: true,
        earnings: dailyEarnings,
        upkeep,
        message: `Daily update complete: +${dailyEarnings} TNAU, -${upkeep.rum} Rum, -${upkeep.wood} Wood`,
      }
    })
  } catch (error) {
    console.error("Failed to process daily update:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process daily update",
    }
  }
}

