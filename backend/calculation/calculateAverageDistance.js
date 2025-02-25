// import SessionPlayerData from '../models/sessionPlayerDataModel.js';
// import Session from '../models/sessionModel.js';

// /**
//  * Calculates the average distance for a session.
//  * @param {String} sessionId - The ID of the session.
//  * @returns {Promise<Number>} The calculated average distance.
//  */
// const calculateAverageDistance = async (sessionId) => {
//   try {
//     // Fetch all session data for this session
//     const sessionPlayerDataList = await SessionPlayerData.find({ sessionId });
//     if (!sessionPlayerDataList.length) {
//       await Session.findByIdAndUpdate(sessionId, { avgDistance: 0 });
//       return 0;
//     }
//     let totalSpeed = 0;
//     sessionPlayerDataList.forEach((data) => {
//       // Adjust the calculation formula as needed.
//       totalSpeed += data.speeds.reduce((acc, speed) => acc + speed, 0);
//     });
//     const numberOfFiles = sessionPlayerDataList.length;
//     const avgDistance = totalSpeed > 0 ? ((totalSpeed / 10) / 1000) / numberOfFiles : 0;
//     // Update the session with the new average distance
//     await Session.findByIdAndUpdate(sessionId, { avgDistance });
//     //console.log(`✅ Updated average distance for session ${sessionId}: ${avgDistance.toFixed(5)} km`);
//     return avgDistance;
//   } catch (error) {
//     //console.error("🚨 Error calculating average distance:", error.message);
//     throw error;
//   }
// };

// export default calculateAverageDistance;
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';

const calculateAverageDistance = async (sessionId) => {
  try {
    console.log(`🔄 calculateAverageDistance for sessionId=${sessionId}`);
    // Get all SessionPlayerData for this session
    const sessionPlayerDataList = await SessionPlayerData.find({ sessionId });
    if (!sessionPlayerDataList.length) {
      await Session.findByIdAndUpdate(sessionId, { avgDistance: 0 });
      return 0;
    }

    let totalSpeed = 0;
    sessionPlayerDataList.forEach((data) => {
      // Summation of speeds. Adjust if you want a different formula.
      totalSpeed += data.speeds.reduce((acc, speed) => acc + speed, 0);
    });

    // Example formula: total speed / 10 -> total meters, /1000 -> total km,
    // divided by # of files
    const numberOfFiles = sessionPlayerDataList.length;
    const avgDistance = totalSpeed > 0 ? ((totalSpeed / 10) / 1000) / numberOfFiles : 0;

    await Session.findByIdAndUpdate(sessionId, { avgDistance });
    console.log(`✅ Updated average distance for session ${sessionId}: ${avgDistance.toFixed(5)} km`);
    return avgDistance;
  } catch (error) {
    console.error('🚨 Error calculating average distance:', error.message);
    throw error;
  }
};

export default calculateAverageDistance;
