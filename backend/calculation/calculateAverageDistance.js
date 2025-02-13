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
        const objectId = new mongoose.Types.ObjectId(sessionId);

        // Fetch all session data for this session (multiple files)
        const sessionDataList = await SessionData.find({ sessionId: objectId });

        if (!sessionDataList.length) {
            console.log(`❌ No session data for session ${sessionId}`);
            await SessionCollection.findByIdAndUpdate(objectId, { avgDistance: 0 });
            return;
        }

        // Sum all speeds from multiple session files
        let totalSpeed = 0;

        sessionDataList.forEach((data) => {
            totalSpeed += data.speeds.reduce((acc, speed) => acc + speed, 0);
        });

        // Number of CSV files (equal to sessionData entries)
        const numberOfFiles = sessionDataList.length;

        // Calculate average distance per file using provided formula
        // avgDistance = ((totalSpeed / 10) / 1000) / numberOfFiles
        const avgDistance = totalSpeed > 0 ? ((totalSpeed / 10) / 1000) / numberOfFiles : 0;

        console.log(`✅ Average Distance per file for session ${sessionId}: ${avgDistance.toFixed(5)} km`);

        // Update avgDistance in sessionCollection
        await SessionCollection.findByIdAndUpdate(objectId, { avgDistance: avgDistance });

    } catch (error) {
        console.error("🚨 Error calculating avgDistance:", error.message);
    }
};

export default calculateAverageDistance;
