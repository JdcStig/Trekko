import mongoose from 'mongoose';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';

/**
 * Uses MongoDB aggregation to compute the average distance:
 *   - totalSpeed is sum of speeds for each doc
 *   - doc distance = (doc.totalSpeed / 10) / 1000
 *   - average distance = totalDistance / numberOfDocs
 */
const calculateAverageDistance = async (sessionId) => {
  try {
    console.log(`🔄 calculateAverageDistance for sessionId=${sessionId}`);

    const result = await SessionPlayerData.aggregate([
      {
        $match: {
          sessionId: new mongoose.Types.ObjectId(sessionId),
        },
      },
      {
        $project: {
          totalSpeed: { $sum: "$speeds" },
        },
      },
      {
        $group: {
          _id: null,
          sumSpeed: { $sum: "$totalSpeed" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (!result || result.length === 0) {
      await Session.findByIdAndUpdate(sessionId, { avgDistance: 0 });
      return 0;
    }

    const { sumSpeed, count } = result[0];
    // totalDistance = (sumSpeed / 10) / 1000
    const totalDistance = (sumSpeed / 10) / 1000;
    const avgDistance = totalDistance / count;

    await Session.findByIdAndUpdate(sessionId, { avgDistance });
    console.log(`✅ Updated average distance for session ${sessionId}: ${avgDistance.toFixed(5)} km`);
    return avgDistance;
  } catch (error) {
    console.error("🚨 Error calculating average distance:", error.message);
    throw error;
  }
};

export default calculateAverageDistance;
