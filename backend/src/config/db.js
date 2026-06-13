import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // ─── Connection Pool ─────────────────────────────────────────────
            // Keep up to 20 persistent connections — avoids reconnecting on
            // every request which is the main source of 4-5s delays.
            maxPoolSize: 20,
            minPoolSize: 5,

            // ─── Timeouts ────────────────────────────────────────────────────
            serverSelectionTimeoutMS: 5000,  // fail fast if Atlas unreachable
            socketTimeoutMS: 30000,          // don't hang on slow queries
            connectTimeoutMS: 10000,         // max time to establish connection

            // ─── Misc ────────────────────────────────────────────────────────
            // Don't queue operations when connection is down — fail immediately
            bufferCommands: false,
        });

        // 🚨 ONE-TIME INDEX DROP: Remove the old unique index that was clashing with registrations
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections({ name: "users" }).toArray();
            if (collections.length > 0) {
               await db.collection("users").dropIndex("Mobile_no_1");
            }
        } catch (err) {
            // Index might not exist or already dropped, ignore
        }

    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};

export default connectDB;
