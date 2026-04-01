import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
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
