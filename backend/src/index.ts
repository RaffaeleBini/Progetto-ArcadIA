import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT ?? 5000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.warn("Avvio senza connessione al database:", (err as Error).message);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
  });
}

start();
