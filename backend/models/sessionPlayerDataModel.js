import mongoose from "mongoose";

const sessionPlayerDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  playerId: { type: String, required: true, default: "Unknown" },
  playerName: { type: String, required: true, default: "Unknown Player" }, 
  startTime: { type: Number, required: true },  // Ensure the correct type is Date
  endTime: { type: Number, required: true },  // Ensure the correct type is Date
  lats: { type: [Number], required: true, default: [] },
  lons: { type: [Number], required: true, default: [] },
  speeds: { type: [Number], required: true, default: [] },
  heartRates: { type: [Number], required: true, default: [] },
  accelerationImpulses: { type: [Number], required: true, default: [] }
}, { timestamps: true });

const SessionPlayerData = mongoose.model('SessionPlayerData', sessionPlayerDataSchema);
export default SessionPlayerData;
