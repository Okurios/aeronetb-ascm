// MongoDB connection singleton
const { MongoClient } = require('mongodb');

let client;
let db;

async function connectMongo() {
  if (db) return db;
  client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db(process.env.MONGO_DB || 'aeronetb_ascm');
  console.log('MongoDB connected:', process.env.MONGO_DB);
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB not initialised. Call connectMongo() first.');
  return db;
}

module.exports = { connectMongo, getDb };
