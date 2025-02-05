import mongoose from "mongoose";

const squadSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sport: {
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


const Squad = mongoose.model("Squad", squadSchema);

export default Squad;