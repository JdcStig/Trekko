import mongoose from "mongoose";

const forceVelocityAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the users model
      required: true,
    },
    sessions: [
        {
          sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
          sessionName: { type: String, required: true, default: "Unknown Session" },
        },
      ],
    player: [
        {
          playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: false },
          name: { type: String, required: true, default: "Unknown Player" },
        },
      ],
    grouped: {
        type: String,
        required: true,
    },
    number: {
      type: Number,
      default: 0, // Default value 
      required: true,
    },
    startDate: {
      type: Number,
      required: true,
    },
    endDate: {
      type: Number,
      required: true,
    },
    maxAccel: {
      type: Number,
      default: 0.0,
    },
    maxSpeed: {
        type: Number,
        default: 0.0,
      },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("forceVelocityAnalysis", forceVelocityAnalysisSchema);
