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

/**
 * Creates missing players from CSV by:
 *  1) Distinctly gathering playerIds from SessionPlayerData.
 *  2) Checking which players already exist.
 *  3) Inserting any missing ones in a single bulk insert.
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

    // Use distinct to get only unique player IDs from SessionPlayerData
    const playerIds = await SessionPlayerData.distinct('playerId', { sessionId });
    if (!playerIds.length) {
      console.log(`❌ No player IDs found for session ${sessionId}`);
      return;
    }

    // Query existing players in one go
    const existingPlayers = await Player.find({
      userId,
      teamName: session.teamName,
      playerId: { $in: playerIds }
    });
    const existingPlayerIds = new Set(existingPlayers.map(p => p.playerId));

    // Filter out missing players
    const missingPlayers = playerIds.filter(id => !existingPlayerIds.has(id));
    if (missingPlayers.length === 0) {
      console.log(`✅ All players already exist for session ${sessionId}.`);
      return;
    }

    const positions = sportPositions[session.type] || sportPositions["Other"];
    const newPlayers = missingPlayers.map(playerId => {
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];
      return {
        userId,
        name: playerId, // CSV "Player Display Name" as the player's name
        playerId: playerId,
        position: randomPosition,
        teamName: session.teamName,
      };
    });

    // Insert all missing players concurrently
    const insertedPlayers = await Player.insertMany(newPlayers, { ordered: false });
    console.log(`✅ Created ${insertedPlayers.length} new players.`);

    // Emit socket events for each new player
    insertedPlayers.forEach(newPlayer => {
      console.log(`✅ Created new player: ${newPlayer.name} (${newPlayer.position})`);
      getIO().emit('playerCreated', { playerName: newPlayer.name });
    });
  } catch (error) {
    console.error(`🚨 Error in createPlayersFromCSV: ${error.message}`);
  }
};

export default createPlayersFromCSV;
