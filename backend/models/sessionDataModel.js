import mongoose from "mongoose";

const sessionDataSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "SessionCollection", required: true },
    playerId: { type: String, required: true, default: "Unknown Player" },
    startTime: { type: String, required: true, default: "00:00.0" },
    endTime: { type: String, required: true, default: "00:00.0" },
    lats: { type: [Number], required: true, default: [] },
    lons: { type: [Number], required: true, default: [] },
    speeds: { type: [Number], required: true, default: [] },
    heartRates: { type: [Number], required: true, default: [] },
    accelerationImpulses: { type: [Number], required: true, default: [] }
  },
  { timestamps: true }
);

const SessionData = mongoose.model('SessionData', sessionDataSchema);
export default SessionData;
