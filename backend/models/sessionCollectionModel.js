// sessionCollectionModel.js
import mongoose from 'mongoose';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

const sessionCollectionSchema = new mongoose.Schema(
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
        start: { type: String, required: true },
        end: { type: String, required: true },
      },
    ],
    notes: {
      type: String, 
      default: '',
    },
    sessionData: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SessionData", // Reference to the SessionData collection
      },
    ],
  },
  {
    timestamps: true, 
  }
);

// Post-save hook: After saving a session, automatically calculate avgDistance.
sessionCollectionSchema.post('save', async function (doc, next) {
  try {
    // Call your calculation function with the saved document's _id.
    await calculateAverageDistance(doc._id);
    next();
  } catch (error) {
    console.error("Error in post-save hook:", error);
    next(error);
  }
});

export default mongoose.model('SessionCollection', sessionCollectionSchema);
