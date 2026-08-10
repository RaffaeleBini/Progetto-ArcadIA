import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI non è definita nelle variabili d'ambiente");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connesso");
}
