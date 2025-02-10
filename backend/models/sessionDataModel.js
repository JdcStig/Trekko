import mongoose from "mongoose";

const sessionDataSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'players', // References the players table in MongoDB
      required: true,
      default: null, // Will be set to an existing player or a default one
    },
    startTime: {
      type: String, 
      required: true,
      default: '00:00.0', // Placeholder value
    },
    endTime: {
      type: String, 
      required: true,
      default: '10:00.0', // Placeholder value
    },
    lats: {
      type: [Number], // Array of latitude values
      required: true,
      default: [],
    },
    lons: {
      type: [Number], // Array of longitude values
      required: true,
      default: [],
    },
    speeds: {
      type: [Number], // Array of speed values
      required: true,
      default: [],
    },
  },
  {
    timestamps: true, 
  }
);

const SessionData = mongoose.model('SessionData', sessionDataSchema);
export default SessionData;
