// src/db.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/?replicaSet=rs0";
const dbName = process.env.DB_NAME || "pizza_y_punto";

const client = new MongoClient(uri, {
  // Opciones útiles
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db = null;

export async function connect() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log("MongoDB conectado a:", dbName);
  }
  return db;
}

export function getClient() {
  return client;
}

export async function close() {
  await client.close();
  db = null;
}
