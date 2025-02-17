import mongoose from "mongoose";

const sessionPlayerDataSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    playerId: { type: String, required: true, default: "Unknown Player" },
    startTime: { type: String, required: true, default: "00:00.0" },
    endTime: { type: String, required: true, default: "00:00.0" },
    lats: { type: [Number], required: true, default: [] },
    lons: { type: [Number], required: true, default: [] },
    speeds: { type: [Number], required: true, default: [] },
    avgSpeed: { type: Number },
    heartRates: { type: [Number], required: true, default: [] },
    accelerationImpulses: { type: [Number], required: true, default: [] }
  },
  { timestamps: true }
);

const SessionPlayerData = mongoose.model('SessionPlayerData', sessionPlayerDataSchema);
export default SessionPlayerData;
