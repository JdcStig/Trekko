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
      type: Number, 
      required: true,
    },
    avgDistance: {
      type: Number,
      default: 0.0, 
    },
    splits: [
      {
        title: { type: String, required: true },
        splitNumber: { type: Number, required: true },
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
        csvId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionPlayerData' },
        playerName: { type: String }, 
        sessionPlayerMetrics: [{  
          MetricName: { type: String, required: true },
          Value: { type: Number, required: true },
          Unit: { type: String, required: true }
        }],
        splitPlayerMetrics: [{ 
          SplitNumber: { type: Number, required: true },
          SplitMetrics: [{
            MetricName: { type: String, required: true },
            Value: { type: Number, required: true },
            Unit: { type: String, required: true }
          }]
        }]
      },
    ],
  },
  {
    timestamps: true, 
  }
);


export default mongoose.model('Session', sessionSchema);
