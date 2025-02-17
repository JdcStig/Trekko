// sessionModel.js
import mongoose from 'mongoose';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the users model
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
    sessionName: {
      type: String,
      required: true,
    },
    date: {
      type: Number, // Unix timestamp format
      required: true,
    },
    number: {
      type: Number,
      default: 0, // Default value 
      required: true,
    },
    type: {
      type: String,
      enum: ["Training", "Game"], // Dropdown values
      required: true,
    },
    duration: {
      type: String, 
      required: true,
    },
    avgDistance: {
      type: Number,
      default: 0.0, 
    },
    splits: [
      {
        title: { type: String, required: true },
        start: { type: Number, required: true, default: 0  },
        end: { type: Number, required: true, default: 0  },
      },
    ],
    notes: {
      type: String, 
      default: '',
    },
    sessionPlayerData: [
      {
        csvId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionPlayerData' }, // Reference to the SessionPlayerData collection
        playerName: { type: String }, // Added player name
        avgSpeed: { type: Number },   // Added average speed
      },
    ],
  },
  {
    timestamps: true, 
  }
);

// Post-save hook: After saving a session, automatically calculate avgDistance.
sessionSchema.post('save', async function (doc, next) {
  try {
    // Call your calculation function with the saved document's _id.
    await calculateAverageDistance(doc._id);
    next();
  } catch (error) {
    console.error("Error in post-save hook:", error);
    next(error);
  }
});

export default mongoose.model('Session', sessionSchema);
