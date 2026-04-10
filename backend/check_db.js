import mongoose from "mongoose";

async function run() {
  await mongoose.connect('mongodb+srv://dhruvbhavsar6205_db_user:iPch8bFhhrnVZ6QO@maincluster.o54p5fc.mongodb.net/RouteMate');
  const db = mongoose.connection.db;
  const lastTrip = await db.collection('trips').find().sort({createdAt: -1}).limit(1).toArray();
  console.log('Last Trip Payload:', JSON.stringify(lastTrip, null, 2));
  process.exit(0);
}

run().catch(console.error);
