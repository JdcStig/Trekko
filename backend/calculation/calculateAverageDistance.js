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

        if (!sessionData || sessionData.lats.length < 2 || sessionData.lons.length < 2) {
            console.log("❌ Not enough data points to calculate distance.");
            return;
        }

        // Haversine formula to calculate total distance
        const toRadians = (degrees) => (degrees * Math.PI) / 180;
        const R = 6371; // Radius of Earth in km
        let totalDistance = 0;

        for (let i = 0; i < sessionData.lats.length - 1; i++) {
            const lat1 = toRadians(sessionData.lats[i]);
            const lon1 = toRadians(sessionData.lons[i]);
            const lat2 = toRadians(sessionData.lats[i + 1]);
            const lon2 = toRadians(sessionData.lons[i + 1]);

            const dLat = lat2 - lat1;
            const dLon = lon2 - lon1;

            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // Distance in km

            totalDistance += distance;
        }

        // Convert startTime & endTime into seconds
        const timeToSeconds = (time) => {
            const [minutes, seconds] = time.split(":").map(Number);
            return minutes * 60 + seconds;
        };

        const durationSeconds =
            timeToSeconds(sessionData.endTime) - timeToSeconds(sessionData.startTime);
        const avgDistance = durationSeconds > 0 ? totalDistance / durationSeconds : 0;

        console.log(`✅ Calculated avgDistance: ${avgDistance.toFixed(2)} km/s`);

        // Update sessionCollection with avgDistance
        await SessionCollection.findByIdAndUpdate(objectId, { avgDistance });

    } catch (error) {
        console.error("🚨 Error calculating avgDistance:", error.message);
    }
};

export default calculateAverageDistance;
