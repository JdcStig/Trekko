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
        console.time('Player Creation Time');
        console.log("📌 Starting player creation process for session:", sessionId);
        const session = await Session.findById(sessionId);
        if (!session) {
            console.error(`❌ Session ${sessionId} not found.`);
            return { createdPlayers: [] };
        }

        if (session.userId.toString() !== userId.toString()) {
            console.error("❌ User not authorized to create players for this session.");
            return { createdPlayers: [] };
        }

        const sessionPlayerDataList = await SessionPlayerData.find({ sessionId });
        if (!sessionPlayerDataList.length) {
            console.log(`❌ No session data found for session ${sessionId}`);
            return { createdPlayers: [] };
        }

        const createdPlayersSet = new Set();
        const positions = sportPositions[session.type] || sportPositions["Other"];

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
                console.log(`✅ Player created: ${newPlayer.name} (${newPlayer.position})`);
                getIO().emit('playerCreated', { playerName: newPlayer.name });
            } else {
                console.log(`⚠️ Player ${playerIdentifier} already exists for team ${session.teamName}`);
            }
        }

        console.timeEnd('Player Creation Time');
        return { createdPlayers: Array.from(createdPlayersSet) };
    } catch (error) {
        console.error("🚨 Error creating players from CSV:", error.message);
        return { createdPlayers: [] };
    }
};

export default createPlayersFromCSV;
