import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  playerId: {
    type: String, 
    sparse: true, // Allows multiple null values
    unique: true, // Ensures each playerId is unique
  },
  name: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  teamName: {
    type: String,
    required: true,
  },
}, {
    timestamps: true,
});


const Player = mongoose.model("Player", playerSchema);

export default Player;