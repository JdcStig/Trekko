// backend/calculations/calculateAverageDistance.js
import mongoose from "mongoose";
import SessionData from "../models/sessionDataModel.js";
import SessionCollection from "../models/sessionCollectionModel.js";

/**
 * Calculates the average distance traveled in a session.
 * @param {String} sessionId - The ID of the session.
 */
const calculateAverageDistance = async (sessionId) => {
    try {
        const objectId = new mongoose.Types.ObjectId(sessionId); // Ensure ObjectId format
        const sessionData = await SessionData.findOne({ sessionId: objectId });

        if (!sessionData || sessionData.speeds.length === 0) {
            console.log("❌ No speed data available for distance calculation.");
            return;
        }

        // Sums all speeds
        const totalSpeed = sessionData.speeds.reduce((acc, speed) => acc + speed, 0);
 
        // Calculates average speed
        const averageSpeedMeters = totalSpeed / 10;
        const averageSpeedKm = averageSpeedMeters / 1000;

        console.log(`✅ Average Distance: ${averageSpeedKm.toFixed(5)} km`);

        // Update sessionCollection with avgDistance
        await SessionCollection.findByIdAndUpdate(objectId, { avgDistance: averageSpeedKm });

    } catch (error) {
        console.error("🚨 Error calculating avgDistance:", error.message);
    }
};

export default calculateAverageDistance;
