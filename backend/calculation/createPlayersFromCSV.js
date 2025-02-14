// const createPlayersFromCSV = async (sessionId, userId) => {
//   try {
//     // Retrieve the session using the provided sessionId
//     const session = await SessionCollection.findById(sessionId);
//     if (!session) {
//       console.error(`❌ Session ${sessionId} not found.`);
//       return [];
//     }

//     // Ensure that the user triggering the CSV upload is the owner of the session
//     if (session.userId.toString() !== userId.toString()) {
//       console.error("❌ User not authorized to create players for this session.");
//       return [];
//     }

//     // Retrieve all session data associated with this session
//     const sessionDataList = await SessionData.find({ sessionId });
//     if (!sessionDataList.length) {
//       console.log(`❌ No session data found for session ${sessionId}`);
//       return [];
//     }

//     // Determine sport positions based on the session type
//     const positions = sportPositions[session.type] || sportPositions["Other"];
//     const createdPlayers = [];

//     // Loop through each piece of session data and create a player if one doesn’t already exist
//     for (const data of sessionDataList) {
//       const playerIdentifier = data.playerId; // Using playerId from sessionData as the player's name/identifier
//       const randomPosition = positions[Math.floor(Math.random() * positions.length)];

//       // Check if a player already exists for this user with the same name and team
//       const existingPlayer = await Player.findOne({
//         userId,
//         name: playerIdentifier,
//         teamName: session.teamName,
//       });

//       if (!existingPlayer) {
//         // Create a new player with the correct userId
//         const newPlayer = new Player({
//           userId, // This ensures that only the creator can view this player
//           name: playerIdentifier,
//           position: randomPosition,
//           teamName: session.teamName,
//         });

//         await newPlayer.save();
//         createdPlayers.push(newPlayer.name);
//         console.log(`✅ Player created: ${newPlayer.name} (${newPlayer.position})`);
//       } else {
//         console.log(`⚠️ Player ${playerIdentifier} already exists for team ${session.teamName}`);
//       }
//     }

//     return createdPlayers;
//   } catch (error) {
//     console.error("🚨 Error creating players from CSV:", error.message);
//     return [];
//   }
// };

// export default createPlayersFromCSV;
import Player from '../models/playerModel.js';
import SessionData from '../models/sessionDataModel.js';
import SessionCollection from '../models/sessionCollectionModel.js'; // <-- Make sure this import is here

const sportPositions = {
  "Soccer": ["FullBack", "CentreDefender", "Midfield", "Forward"],
  "GAA Football": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "GAA Hurling": ["GoalKeeper", "Defender", "Midfielder", "Forward"],
  "Rugby": ["Forward", "Back"],
  "Other": ["Other"]
};

const createPlayersFromCSV = async (sessionId, userId) => {
  try {
    // Retrieve the session using the SessionCollection model
    const session = await SessionCollection.findById(sessionId);
    if (!session) {
      console.error(`❌ Session ${sessionId} not found.`);
      return [];
    }

    // Ensure that the session belongs to the current user
    if (session.userId.toString() !== userId.toString()) {
      console.error("❌ User not authorized to create players for this session.");
      return [];
    }

    // Retrieve all sessionData associated with the session
    const sessionDataList = await SessionData.find({ sessionId });
    if (!sessionDataList.length) {
      console.log(`❌ No session data found for session ${sessionId}`);
      return [];
    }

    // Determine positions based on session type
    const positions = sportPositions[session.type] || sportPositions["Other"];
    const createdPlayers = [];

    // Create players from each piece of sessionData
    for (const data of sessionDataList) {
      const playerIdentifier = data.playerId; // Using playerId as the player's name/identifier
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];

      // Prevent duplicate players for the same team and user
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
        createdPlayers.push(newPlayer.name);
        console.log(`✅ Player created: ${newPlayer.name} (${newPlayer.position})`);
      } else {
        console.log(`⚠️ Player ${playerIdentifier} already exists for team ${session.teamName}`);
      }
    }

    return createdPlayers;
  } catch (error) {
    console.error("🚨 Error creating players from CSV:", error.message);
    return [];
  }
};

export default createPlayersFromCSV;
