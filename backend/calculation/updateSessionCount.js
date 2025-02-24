import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import calculateAverageDistance from "./calculateAverageDistance.js";

/**
 * Updates the "number" field in sessions for a given user.
 * @param {String} userId - The user ID.
 */
const updateSessionCount = async (userId) => {
    try {
        // Finds all sessions for the user
        const sessions = await Session.find({ userId });

        // Iterates over each session and update the 'number' field
        for (const session of sessions) {
            const sessionCount = await SessionPlayerData.countDocuments({ sessionId: session._id });
            
            // Updates the session with the new count
            await Session.findByIdAndUpdate(session._id, { $set: { number: sessionCount } });
        }

        await calculateAverageDistance(userId);

       // console.log(`Updated sessions for user ${userId} with ${sessionCount} session entries.`);
    } catch (error) {
       // console.error("Error updating session collection count:", error);
    }
};

export default updateSessionCount;
