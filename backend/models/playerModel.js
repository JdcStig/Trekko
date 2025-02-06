import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
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