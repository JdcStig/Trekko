// sessionCollectionModel.js
import mongoose from 'mongoose';

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
      default: 20.0, // Default value 
      required: true,
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

// Export as default:
export default mongoose.model('SessionCollection', sessionCollectionSchema);