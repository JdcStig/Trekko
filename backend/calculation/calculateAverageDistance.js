import SessionData from '../models/sessionDataModel.js';
import SessionCollection from '../models/sessionCollectionModel.js';

/**
 * Calculates the average distance for a session.
 * @param {String} sessionId - The ID of the session.
 * @returns {Promise<Number>} The calculated average distance.
 */
const calculateAverageDistance = async (sessionId) => {
  try {
    // Fetch all session data for this session
    const sessionDataList = await SessionData.find({ sessionId });
    if (!sessionDataList.length) {
      await SessionCollection.findByIdAndUpdate(sessionId, { avgDistance: 0 });
      return 0;
    }
    let totalSpeed = 0;
    sessionDataList.forEach((data) => {
      // Adjust the calculation formula as needed.
      totalSpeed += data.speeds.reduce((acc, speed) => acc + speed, 0);
    });
    const numberOfFiles = sessionDataList.length;
    const avgDistance = totalSpeed > 0 ? ((totalSpeed / 10) / 1000) / numberOfFiles : 0;
    // Update the session with the new average distance
    await SessionCollection.findByIdAndUpdate(sessionId, { avgDistance });
    //console.log(`✅ Updated average distance for session ${sessionId}: ${avgDistance.toFixed(5)} km`);
    return avgDistance;
  } catch (error) {
    //console.error("🚨 Error calculating average distance:", error.message);
    throw error;
  }
};

export default calculateAverageDistance;
