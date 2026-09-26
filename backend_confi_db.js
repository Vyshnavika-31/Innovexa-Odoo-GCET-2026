const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (error) => console.error("Unexpected PostgreSQL pool error:", error));

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  close: () => pool.end(),
};
