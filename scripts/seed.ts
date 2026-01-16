import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load .env.local file, fallback to .env
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
  console.log("✅ Loaded .env.local");
} else if (existsSync(envPath)) {
  config({ path: envPath });
  console.log("✅ Loaded .env");
} else {
  console.warn("⚠️  Warning: No .env.local or .env file found. Make sure MONGODB_URI is set.");
}

// Verify MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI is not set in environment variables.");
  console.error("   Please check your .env.local or .env file.");
  process.exit(1);
} else {
  console.log("✅ MONGODB_URI is set");
}

import connectDB from "../src/lib/mongodb";
import User from "../src/models/User";

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Clear existing users (optional - comment out if you want to keep existing users)
    // await User.deleteMany({});
    // console.log("Cleared existing users");

    // Create default admin
    const adminEmail = "admin@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = await User.create({
        name: "Admin User",
        email: adminEmail,
        password: "admin123",
        role: "admin",
      });
      console.log("✅ Created admin user:", admin.email);
    } else {
      console.log("ℹ️  Admin user already exists:", adminEmail);
    }

    // Create default agent
    const agentEmail = "agent@example.com";
    const existingAgent = await User.findOne({ email: agentEmail });

    if (!existingAgent) {
      const agent = await User.create({
        name: "Agent User",
        email: agentEmail,
        password: "agent123",
        role: "agent",
        number: "+1234567890",
        extensionId: "1001",
      });
      console.log("✅ Created agent user:", agent.email);
    } else {
      console.log("ℹ️  Agent user already exists:", agentEmail);
    }

    // Create default regular user
    const userEmail = "user@example.com";
    const existingUser = await User.findOne({ email: userEmail });

    if (!existingUser) {
      const user = await User.create({
        name: "Regular User",
        email: userEmail,
        password: "user123",
        role: "user",
        number: "+1234567891",
      });
      console.log("✅ Created regular user:", user.email);
    } else {
      console.log("ℹ️  Regular user already exists:", userEmail);
    }

    // Create additional test users
    const testUsers = [
      {
        name: "Test Agent 1",
        email: "testagent1@example.com",
        password: "test123",
        role: "agent" as const,
        number: "+1234567892",
        extensionId: "1002",
      },
      {
        name: "Test Agent 2",
        email: "testagent2@example.com",
        password: "test123",
        role: "agent" as const,
        number: "+1234567893",
        extensionId: "1003",
      },
      {
        name: "Test User 1",
        email: "testuser1@example.com",
        password: "test123",
        role: "user" as const,
        number: "+1234567894",
      },
    ];

    for (const testUser of testUsers) {
      const existing = await User.findOne({ email: testUser.email });
      if (!existing) {
        await User.create(testUser);
        console.log("✅ Created test user:", testUser.email);
      } else {
        console.log("ℹ️  Test user already exists:", testUser.email);
      }
    }

    console.log("\n✅ Seeding completed successfully!");
    console.log("\nDefault credentials:");
    console.log("Admin: admin@gmail.com / admin123");
    console.log("Agent: agent@example.com / agent123");
    console.log("User: user@example.com / user123");
    console.log("Test users: testagent1@example.com, testagent2@example.com, testuser1@example.com / test123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
