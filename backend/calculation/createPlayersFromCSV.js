import Player from '../models/playerModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import { getIO } from '../socket.js';
import { v4 as uuidv4 } from 'uuid'; // Import UUID to generate unique playerId

const sportPositions = {
  "Soccer": ["FullBack", "CentreDefender", "Midfield", "Forward"],
  "GAA Football": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "GAA Hurling": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "Rugby": ["Forward", "Back"],
  "Other": ["Other"]
};

/**
 * Creates missing players from CSV by:
 *  1) Distinctly gathering player names from SessionPlayerData.
 *  2) Checking which players already exist.
 *  3) Inserting any missing ones in a single bulk insert with random playerId.
 *  4) Ensuring that the playerId is correctly copied to SessionPlayerData.
 */
const createPlayersFromCSV = async (sessionId, userId) => {
  console.log(`🛠️ createPlayersFromCSV: Processing for sessionId=${sessionId}`);
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found.`);
      return;
    }
    if (session.userId.toString() !== userId.toString()) {
      console.log("❌ User not authorized to create players for this session.");
      return;
    }

    // Get distinct player names from SessionPlayerData
    const playerNames = await SessionPlayerData.distinct('playerName', { sessionId });
    if (!playerNames.length) {
      console.log(`❌ No player names found for session ${sessionId}`);
      return;
    }

    // Query existing players in the database
    const existingPlayers = await Player.find({
      userId,
      teamName: session.teamName,
      name: { $in: playerNames }
    });

    // Create a map of existing player names to playerId
    const existingPlayerMap = new Map(existingPlayers.map(player => [player.name, player.playerId]));

    // Identify missing players that need to be created
    const newPlayers = playerNames
      .filter(name => !existingPlayerMap.has(name))
      .map(name => ({
        userId,
        name,
        playerId: uuidv4(), // Generate a random unique playerId
        position: (sportPositions[session.type] || sportPositions["Other"])[0], // Default position
        teamName: session.teamName,
      }));

    // Insert missing players into the database
    if (newPlayers.length > 0) {
      const insertedPlayers = await Player.insertMany(newPlayers, { ordered: false });

      // Add new players to the existing player map
      insertedPlayers.forEach(player => existingPlayerMap.set(player.name, player.playerId));

      console.log(`✅ Created ${insertedPlayers.length} new players.`);
    }

    // Update sessionPlayerDatas to ensure the correct playerId is set
    for (const [playerName, playerId] of existingPlayerMap) {
      await SessionPlayerData.updateMany(
        { sessionId, playerName }, 
        { $set: { playerId } }
      );
    }

    console.log(`✅ Updated playerId references in SessionPlayerData.`);
  } catch (error) {
    console.error(`🚨 Error in createPlayersFromCSV: ${error.message}`);
  }
};

export default createPlayersFromCSV;
