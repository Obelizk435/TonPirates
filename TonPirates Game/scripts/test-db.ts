import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log("Testing database connection...")

    // Test player creation
    const player = await prisma.player.create({
      data: {
        walletAddress: "test_" + Date.now(),
        islandName: "Test Island",
        referralCode: `REF${Math.random().toString(36).substr(2, 9)}`,
      },
    })
    console.log("Created test player:", player)

    // Test ship creation
    const ship = await prisma.ship.create({
      data: {
        name: "Test Ship",
        type: "Small Ship",
        earningsPerDay: 1.25,
        plunderLevel: 1,
        imageUrl: "https://i.imgur.com/k4igWTR.png",
        maxCrew: 5,
        playerId: player.id,
      },
    })
    console.log("Created test ship:", ship)

    // Clean up test data
    await prisma.ship.delete({
      where: { id: ship.id },
    })
    await prisma.player.delete({
      where: { id: player.id },
    })
    console.log("Test data cleaned up")

    console.log("All database tests passed!")
  } catch (error) {
    console.error("Database tests failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()

