import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';

/**
 * Calculates the average distance for a session.
 * @param {String} sessionId - The ID of the session.
 * @returns {Promise<Number>} The calculated average distance.
 */
const calculateAverageDistance = async (sessionId) => {
    try {
        console.time('Average Distance Calculation');
        console.log("📌 Calculating average distance for session:", sessionId);

        const sessionPlayerDataList = await SessionPlayerData.find({ sessionId });
        if (!sessionPlayerDataList.length) {
            console.log(`❌ No player data found for session ${sessionId}`);
            await Session.findByIdAndUpdate(sessionId, { avgDistance: 0 });
            return 0;
        }

        let totalSpeed = 0;
        sessionPlayerDataList.forEach((data) => {
            totalSpeed += data.speeds.reduce((acc, speed) => acc + speed, 0);
        });

        const numberOfFiles = sessionPlayerDataList.length;
        const avgDistance = totalSpeed > 0 ? ((totalSpeed / 10) / 1000) / numberOfFiles : 0;

        await Session.findByIdAndUpdate(sessionId, { avgDistance });

        console.log(`✅ Average distance calculated: ${avgDistance.toFixed(5)} km for session ${sessionId}`);
        console.timeEnd('Average Distance Calculation');
        return avgDistance;
    } catch (error) {
        console.error("🚨 Error calculating average distance:", error.message);
        throw error;
    }
};

export default calculateAverageDistance;
