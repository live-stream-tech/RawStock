import "dotenv/config";
import { Pool } from "pg";
import { STATIONS } from "../constants/stations";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false,
});

const FLYERS = [
  "https://picsum.photos/id/1015/1200/1600",
  "https://picsum.photos/id/1016/1200/1600",
  "https://picsum.photos/id/1018/1200/1600",
  "https://picsum.photos/id/1025/1200/1600",
  "https://picsum.photos/id/1035/1200/1600",
  "https://picsum.photos/id/1036/1200/1600",
  "https://picsum.photos/id/1037/1200/1600",
  "https://picsum.photos/id/1038/1200/1600",
  "https://picsum.photos/id/1043/1200/1600",
  "https://picsum.photos/id/1047/1200/1600",
] as const;

const CITIES = ["Los Angeles", "Kingston", "Chicago", "Berlin", "Helsinki", "London", "Tokyo", "Detroit", "Bristol", "Vienna"];
const VENUES = ["Echo Yard", "Harbor Sound Yard", "Velvet Room", "Basement Riot Hall", "Iron Dome Club", "Fogline Theater", "Neon Shelter", "Warehouse 909", "Sub Low Hall", "Danube Recital Hall"];

function buildBody(i: number) {
  const station = STATIONS[i];
  const date = new Date(Date.now() + (i + 3) * 86400000);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  return [
    `Date: ${dateLabel}, 20:00`,
    `City: ${CITIES[i]}`,
    `Venue: ${VENUES[i]}`,
    `Lineup: ${station.name} curated night + local guests`,
    `Tickets: https://rawstock.live/tickets`,
    `Info: Station picks for live culture, streams, and scene discovery.`,
    `FLYER_IMAGE: ${FLYERS[i % FLYERS.length]}`,
  ].join("\n");
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from announcements where type = 'station_live'");
    for (let i = 0; i < STATIONS.length; i++) {
      const station = STATIONS[i];
      await client.query(
        `insert into announcements (title, body, type, is_pinned, start_at, end_at)
         values ($1, $2, 'station_live', $3, now(), null)`,
        [`${station.name}: Live Picks`, buildBody(i), i === 0],
      );
    }
    await client.query("commit");
    console.log(`Seeded ${STATIONS.length} Station live announcements.`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

