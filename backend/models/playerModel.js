import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
}, {
    timestamps: true,
});


const Player = mongoose.model("Player", playerSchema);

export default Player;