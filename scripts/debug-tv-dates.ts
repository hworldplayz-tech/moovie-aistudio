
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "46d13701165988b5bb5fb4d123c0447e";
const BASE_URL = "https://api.themoviedb.org/3";

async function checkTV(id: number, name: string) {
    console.log(`\nChecking ${name} (ID: ${id})...`);
    const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`);
    const data = await res.json();

    console.log("First Air Date:", data.first_air_date);
    console.log("Last Air Date:", data.last_air_date);
    console.log("Next Episode to Air:", data.next_episode_to_air);
    console.log("Status:", data.status);
    console.log("In Production:", data.in_production);
}

async function main() {
    // Stranger Things: 66732
    await checkTV(66732, "Stranger Things");
    // Peacemaker: 110492
    await checkTV(110492, "Peacemaker");
}

main().catch(console.error);
