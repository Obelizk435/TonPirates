import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function initializeDatabase() {
  try {
    console.log("Starting database initialization...")

    // Create test player
    const player = await prisma.player.create({
      data: {
        walletAddress: "test_wallet_" + Date.now(),
        islandName: "Test Island",
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
      include: {
        ships: true,
      },
    })

    console.log("Test player created:", player)
    console.log("Database initialization complete!")
  } catch (error) {
    console.error("Database initialization failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

initializeDatabase()

