import mongoose from 'mongoose';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';

const calculateAverageDistance = async (sessionId) => {
  try {
    console.log(`🔄 calculateAverageDistance for sessionId=${sessionId}`);
    
    // Delay for 500ms to ensure all new CSV docs have been processed and saved
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Convert sessionId to ObjectId so the query matches correctly
    const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
    
    // Fetch all SessionPlayerData docs for this session
    const docs = await SessionPlayerData.find({ sessionId: sessionObjectId });
    
    if (!docs || docs.length === 0) {
      await Session.findByIdAndUpdate(sessionId, { avgDistance: 0 });
      return 0;
    }
    
    // Sum the speeds from all documents
    let totalSpeedSum = 0;
    docs.forEach((doc) => {
      totalSpeedSum += doc.speeds.reduce((sum, speed) => sum + speed, 0);
    });
    
    // Compute total distance (in km) using the formula: totalSpeedSum / 10000
    const totalDistance = totalSpeedSum / 10000;
    const avgDistance = totalDistance / docs.length;
    
    // Update the session with the newly calculated avgDistance
    await Session.findByIdAndUpdate(sessionId, { avgDistance });
    
    // Re-fetch and return the updated session document
    const updatedSession = await Session.findById(sessionId);
    console.log(`✅ Updated average distance for session ${sessionId}: ${avgDistance.toFixed(5)} km`);
    return updatedSession;
  } catch (error) {
    console.error("🚨 Error calculating average distance:", error.message);
    throw error;
  }
};

export default calculateAverageDistance;
