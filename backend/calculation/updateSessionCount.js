import SessionData from '../models/sessionDataModel.js';
import SessionCollection from '../models/sessionCollectionModel.js';

/**
 * Updates the "number" field in sessionCollections for a given user.
 * @param {String} userId - The user ID.
 */
const updateSessionCount = async (userId) => {
    try {
        // Counts the number of sessionDatas entries for this user
        const sessionCount = await SessionData.countDocuments({ userId });

        // Updates all sessionCollections for this user with the new count
        await SessionCollection.updateMany({ userId }, { $set: { number: sessionCount } });

        console.log(`Updated sessionCollections for user ${userId} with ${sessionCount} session entries.`);
    } catch (error) {
        console.error("Error updating session collection count:", error);
    }
};

export default updateSessionCount;
