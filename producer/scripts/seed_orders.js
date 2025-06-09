import { Client } from "pg";
import { randomUUID } from "crypto";
async function main() {
    const db = new Client({
        host: "localhost",
        port: 5432,
        user: "scs",
        password: "scs",
        database: "scs",
    });
    await db.connect();
    for (let i = 0; i < 100; i++) {
        const id = randomUUID().slice(0, 8);
        await db.query(`INSERT INTO orders (order_id, created_at, destination)
       VALUES ($1, now(), $2)
       ON CONFLICT DO NOTHING`, [id, `DEST-${(i % 5) + 1}`]);
    }
    await db.end();
    console.log("inserted 100 orders");
}
main().catch(console.error);
