import mongoose from 'mongoose';

const sessionPlayerDataSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },

    // The real Player _id (referencing the Player model):
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: false },

    // The CSV “Player Display Name”:
    playerName: { type: String, required: true, default: "Unknown Player" },

    // Store these as numeric Unix timestamps (in ms)
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },

    // NEW: Store the timestamp for every reading
    times: { type: [Number], required: true, default: [] },

    lats: { type: [Number], required: true, default: [] },
    lons: { type: [Number], required: true, default: [] },
    speeds: { type: [Number], required: true, default: [] },
    heartRates: { type: [Number], required: true, default: [] },
    accelerationImpulses: { type: [Number], required: true, default: [] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("SessionPlayerData", sessionPlayerDataSchema);
