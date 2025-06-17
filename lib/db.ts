import mysql from "mysql2/promise";

const isCloudSQL = process.env.MYSQL_HOST?.startsWith("/cloudsql/");

const pool = mysql.createPool({
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Solo usa socketPath si la variable MYSQL_HOST es la ruta del socket Unix
  ...(isCloudSQL
    ? { socketPath: process.env.MYSQL_HOST }
    : { host: process.env.MYSQL_HOST || "localhost" }),
});

export const db = {
  query: async (sql: string, params?: any[]) => {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  },
};
