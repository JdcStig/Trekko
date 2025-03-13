import Player from '../models/playerModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import { getIO } from '../socket.js';

const sportPositions = {
  Soccer: ["FullBack", "CentreDefender", "Midfield", "Forward"],
  "GAA Football": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "GAA Hurling": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  Rugby: ["Forward", "Back"],
  Other: ["Other"],
};

/**
 * Creates missing players from CSV by:
 *  1) Gathering distinct 'playerName' from SessionPlayerData for this session.
 *  2) Checking which are already in the Player collection (by playerId).
 *  3) Inserting the missing ones with position=some random pick.
 */
const createPlayersFromCSV = async (sessionId, userId) => {
  console.log(`\n🛠️ [createPlayersFromCSV] Starting. sessionId=${sessionId}, userId=${userId}`);
  try {
    // 1) Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      console.log(`❌ [createPlayersFromCSV] No session found for id=${sessionId}`);
      return;
    }
    if (session.userId.toString() !== userId.toString()) {
      console.log("❌ [createPlayersFromCSV] User is not authorized for this session.");
      return;
    }

    // 2) Distinct playerName from SessionPlayerData
    const playerNames = await SessionPlayerData.distinct('playerName', { sessionId });
    if (!playerNames.length) {
      console.log(`❌ [createPlayersFromCSV] No player names in sessionPlayerData for sessionId=${sessionId}`);
      return;
    }
    console.log(`[createPlayersFromCSV] Found these distinct playerNames:`, playerNames);

    // 3) Which players do we already have in the Player collection?
    const existingPlayers = await Player.find({
      userId,
      teamName: session.teamName,
      playerId: { $in: playerNames },
    });
    const existingPlayerIds = new Set(existingPlayers.map((p) => p.playerId));
    console.log(`[createPlayersFromCSV] existingPlayers count=${existingPlayers.length}`);

    // 4) Filter out missing
    const missing = playerNames.filter((nm) => !existingPlayerIds.has(nm));
    if (!missing.length) {
      console.log(`[createPlayersFromCSV] All players exist. No new players needed.`);
      return;
    }
    console.log(`[createPlayersFromCSV] Missing players:`, missing);

    // 5) Insert missing as new Player docs
    const positions = sportPositions[session.type] || sportPositions.Other;
    const newPlayers = missing.map((name) => {
      const randPos = positions[Math.floor(Math.random() * positions.length)];
      return {
        userId,
        name,       // store CSV name
        playerId: name, // same string
        position: randPos,
        teamName: session.teamName,
      };
    });

    const inserted = await Player.insertMany(newPlayers, { ordered: false });
    console.log(`[createPlayersFromCSV] Inserted ${inserted.length} new Player docs.`);
    inserted.forEach((p) => {
      console.log(`✅ [createPlayersFromCSV] Created player: ${p.name} (id=${p._id})`);
      getIO().emit('playerCreated', { playerName: p.name });
    });
  } catch (err) {
    console.error(`🚨 [createPlayersFromCSV] ERROR: ${err.message}`);
  }
};

export default createPlayersFromCSV;
