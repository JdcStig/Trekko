// sessionCollectionModel.js
import mongoose from 'mongoose';

const sessionCollectionSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  sessionName: { type: String, required: true },
  date: { type: Number, required: true },
  type: { type: String, required: true },
  duration: { type: String, required: true },
  splits: { type: Array, default: [] },
  notes: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  number: { type: Number, default: 0 },
  sessionData: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SessionData' }]
}, { timestamps: true });

// Export as default:
export default mongoose.model('SessionCollection', sessionCollectionSchema);
