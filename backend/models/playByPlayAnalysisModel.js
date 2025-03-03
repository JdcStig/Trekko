import mongoose from 'mongoose';

const playByPlayAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the users model
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    timeStart: {
        type: Number, // Unix timestamp format
        required: true,
        default: 0,
    },
    timeEnd: {
        type: Number, // Unix timestamp format
        required: true,
        default: 0,
    },
    duration: {
      type: Number, // Unix timestamp format
      required: true,
      default: 0,
    },
    teamStartPosession: {
      type: String,
      required: true,
    },
    teamEndPosession: {
        type: String,
        required: true,
    },
    turnovers: {
      type: Number,
      required: true,
    },
    startAction: {
        type: String,
        required: true,
    },
    endAction: {
        type: String,
        required: true,
    },
  },
  {
    timestamps: true, 
  }
);


export default mongoose.model('PlayByPlayAnalysis', playByPlayAnalysisSchema);
