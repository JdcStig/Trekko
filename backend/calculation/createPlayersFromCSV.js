import Player from '../models/playerModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import { getIO } from '../socket.js';

const sportPositions = {
  "Soccer": ["FullBack", "CentreDefender", "Midfield", "Forward"],
  "GAA Football": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "GAA Hurling": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "Rugby": ["Forward", "Back"],
  "Other": ["Other"]
};

const createPlayersFromCSV = async (sessionId, userId) => {
  try {
   // console.log("Processing CSV for session id:", sessionId);
    // Retrieve the session using the Session model
    const session = await Session.findById(sessionId);
    // console.log("Found session:", session);
    if (!session) {
      // console.error(`❌ Session ${sessionId} not found.`);
      return { createdPlayers: [] };
    }

    if (session.userId.toString() !== userId.toString()) {
      // console.error("❌ User not authorized to create players for this session.");
      return { createdPlayers: [] };
    }

    // Retrieve all sessionPlayerData associated with the session
    const sessionPlayerDataList = await SessionPlayerData.find({ sessionId });
    // console.log("SessionPlayerData count:", sessionPlayerDataList.length);
    if (!sessionPlayerDataList.length) {
      // console.log(`❌ No session data found for session ${sessionId}`);
      return { createdPlayers: [] };
    }

    // (Optionally, if you want to process only unique rows or add a "processed" flag, do it here.)

    const positions = sportPositions[session.type] || sportPositions["Other"];
    const createdPlayersSet = new Set();

    // Process each sessionPlayerData row one by one
    for (const data of sessionPlayerDataList) {
      const playerIdentifier = data.playerId;
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];

      const existingPlayer = await Player.findOne({
        userId,
        name: playerIdentifier,
        teamName: session.teamName,
      });

      if (!existingPlayer) {
        const newPlayer = new Player({
          userId,
          name: playerIdentifier,
          position: randomPosition,
          teamName: session.teamName,
        });
        await newPlayer.save();
        createdPlayersSet.add(newPlayer.name);
        //console.log(`✅ Player created: ${newPlayer.name} (${newPlayer.position})`);
        // Emit a real-time event to the frontend
        getIO().emit('playerCreated', { playerName: newPlayer.name });
      } else {
        // console.log(`⚠️ Player ${playerIdentifier} already exists for team ${session.teamName}`);
      }
    }

    return { createdPlayers: Array.from(createdPlayersSet) };
  } catch (error) {
    // console.error("🚨 Error creating players from CSV:", error.message);
    return { createdPlayers: [] };
  }
};

export default createPlayersFromCSV;
