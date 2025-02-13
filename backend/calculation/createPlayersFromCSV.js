import Player from "../models/playerModel.js";
import SessionData from "../models/sessionDataModel.js";
import SessionCollection from "../models/sessionCollectionModel.js";

// Predefined sport positions
const sportPositions = {
  "Soccer": ["FullBack", "CentreDefender", "Midfield", "Forward"],
  "GAA Football": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "GAA Hurling": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "Rugby": ["Forward", "Back"],
  "Other": ["Other"]
};

/**
 * Creates players from uploaded CSV data.
 * @param {String} sessionId - The session ID.
 * @param {String} userId - The user ID.
 */
const createPlayersFromCSV = async (sessionId, userId) => {
  try {
    // Retrieves session and session data
    const session = await SessionCollection.findById(sessionId);
    if (!session) {
      console.error(`❌ Session ${sessionId} not found.`);
      return;
    }

    const sessionDataList = await SessionData.find({ sessionId });

    if (!sessionDataList.length) {
      console.log(`❌ No session data found for session ${sessionId}`);
      return;
    }

    // Determines sport positions based on session type
    const positions = sportPositions[session.type] || sportPositions["Other"];
    const createdPlayers = [];

    // Creates the players from each sessionData
    for (const data of sessionDataList) {
      const playerId = data.playerId;
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];

      // Prevents duplicate players
      const existingPlayer = await Player.findOne({
        userId,
        name: playerId,
        teamName: session.teamName,
      });

      if (!existingPlayer) {
        // Creates a new player
        const newPlayer = new Player({
          userId,
          name: playerId,
          position: randomPosition,
          teamName: session.teamName,
        });

        await newPlayer.save();
        createdPlayers.push(newPlayer.name);
        console.log(`✅ Player created: ${newPlayer.name} (${newPlayer.position})`);
      } else {
        console.log(`⚠️ Player ${playerId} already exists for team ${session.teamName}`);
      }
    }

    return createdPlayers;
  } catch (error) {
    console.error("🚨 Error creating players from CSV:", error.message);
    return [];
  }
};

export default createPlayersFromCSV;
