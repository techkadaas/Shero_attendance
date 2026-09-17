import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI as string;
if (!uri) {
  throw new Error('MONGO_URI not defined in .env');
}

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectMongo = async (): Promise<Db> => {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(); // defaults to db name from URI
  console.log('✅ Connected to MongoDB');
  return db;
};

export const getCollection = <T extends Document = any>(name: string): Collection<T> => {
  if (!db) {
    throw new Error('MongoDB not connected yet');
  }
  return db.collection<T>(name);
};

// Export helpers for each collection used in the app
export const users = () => getCollection<any>('User');
export const attendances = () => getCollection<any>('Attendance');
export const attendanceEvents = () => getCollection<any>('AttendanceEvent');
export const workSessions = () => getCollection<any>('WorkSession');
export const settings = () => getCollection<any>('Settings');
export const permissions = () => getCollection<any>('Permission');

process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
  process.exit(0);
});
