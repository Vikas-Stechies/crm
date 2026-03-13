import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

//export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//export const db = drizzle(pool, { schema });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SECURITY & CONNECTIVITY FIX:
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // Required for Railway internal networking
    : false,
});

// Use a try-catch block for the initial connection to prevent the container loop
export const db = drizzle(pool);

async function checkConnection() {
  try {
    const client = await pool.connect();
    console.log("Database connectivity established via Private Networking.");
    client.release();
  } catch (err) {
    console.error("Database connection error:", (err as Error).message);
    // On Railway, if the DB isn't ready, we might want to wait or exit
    process.exit(1);
  }
}

checkConnection();
