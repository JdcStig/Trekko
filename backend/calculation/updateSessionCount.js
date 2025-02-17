import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import calculateAverageDistance from "./calculateAverageDistance.js";

/**
 * Updates the "number" field in sessions for a given user.
 * @param {String} userId - The user ID.
 */
const updateSessionCount = async (userId) => {
    try {
        // Counts the number of sessionPlayerDatas entries for this user
        const sessionCount = await SessionPlayerData.countDocuments({ userId });

        // Updates all sessions for this user with the new count
        await Session.updateMany({ userId }, { $set: { number: sessionCount } });

        await calculateAverageDistance(userId);

       // console.log(`Updated sessions for user ${userId} with ${sessionCount} session entries.`);
    } catch (error) {
       // console.error("Error updating session collection count:", error);
    }
};

export default updateSessionCount;
