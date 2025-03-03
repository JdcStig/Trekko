import SessionPlayerData from '../models/sessionPlayerDataModel.js';

/**
 * Calculates per-play metrics for each play in a session, using:
 *   - plays[i].timeStart (in seconds)
 *   - plays[i].timeEnd   (in seconds)
 *   - speeds array, recorded at 10 readings per second
 *
 * Metrics (per play):
 *   1) Distance (km): sumOfSpeeds / 10000
 *   2) HighSpeedRunning (km): sum of speeds > 5.5 m/s, / 10000
 *   3) Sprinting (km): sum of speeds > 7 m/s, / 10000
 *   4) TopSpeed (m/s): max value in the slice
 *
 */
const calculatePlayPlayerMetrics = async (sessionId, plays) => {
    try {
        console.log(`📌 [calculatePlayPlayerMetrics] Calculating for session=${sessionId}`);
        
        const sessionPlayers = await SessionPlayerData.find({ sessionId });

        for (const playerData of sessionPlayers) {
            const playMetrics = [];
            let currentIndex = 0;

            for (const play of plays) {
                console.log(`\n=== Processing Play #${play.playNumber} ===`);
                console.log('Play details:', play);

                // Calculate how many readings this play spans
                const playLengthSeconds = play.timeEnd - play.timeStart;
                const playSize = playLengthSeconds * 10; // 10 readings per second

                // Determine slice of speeds array for this play
                const startIndex = currentIndex;
                const endIndex = currentIndex + playSize;

                console.log(`Play #${play.playNumber}: startIndex=${startIndex}, endIndex=${endIndex}`);

                // Extract just the speeds for this play
                const playSpeeds = Array.isArray(playerData.speeds)
                    ? playerData.speeds.slice(startIndex, endIndex)
                    : [];

                console.log(`Play #${play.playNumber}: playSpeeds.length = ${playSpeeds.length}`);

                // Handle empty speed arrays safely
                if (!Array.isArray(playSpeeds) || playSpeeds.length === 0) {
                    console.warn(`⚠️ No valid speed data for Play #${play.playNumber}, skipping calculations.`);
                    playMetrics.push({
                        PlayNumber: play.playNumber,
                        PlayMetrics: [
                            { MetricName: 'Distance', Value: 0, Unit: 'km' },
                            { MetricName: 'HighSpeedRunning', Value: 0, Unit: 'km' },
                            { MetricName: 'Sprinting', Value: 0, Unit: 'km' },
                            { MetricName: 'TopSpeed', Value: 0, Unit: 'm/s' },
                        ],
                    });
                    continue;
                }

                // 1) Distance (km)
                const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
                const distanceKm = sumSpeeds / 10000;

                // 2) High Speed Running (km) – speeds above 5.5 m/s
                const sumHSR = playSpeeds.filter(val => val > 5.5).reduce((acc, val) => acc + val, 0);
                const hsrKm = sumHSR / 10000;

                // 3) Sprinting (km) – speeds above 7 m/s
                const sumSprinting = playSpeeds.filter(val => val > 7).reduce((acc, val) => acc + val, 0);
                const sprintKm = sumSprinting / 10000;

                // 4) Top Speed (m/s)
                const topSpeed = Math.max(...playSpeeds);

                // Move index forward for the next play
                currentIndex = endIndex;

                // Return the metrics for this play
                const result = {
                    PlayNumber: play.playNumber,
                    PlayMetrics: [
                        { MetricName: 'Distance', Value: distanceKm, Unit: 'km' },
                        { MetricName: 'HighSpeedRunning', Value: hsrKm, Unit: 'km' },
                        { MetricName: 'Sprinting', Value: sprintKm, Unit: 'km' },
                        { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
                    ],
                };

                console.log(`Play #${play.playNumber}: Returning result:`, JSON.stringify(result, null, 2));
                playMetrics.push(result);
            }

            // Save playPlayerMetrics into sessionPlayerData
            await SessionPlayerData.findByIdAndUpdate(
                playerData._id,
                { $set: { playPlayerMetrics: playMetrics } },
                { new: true }
            );
        }

        console.log("✅ playPlayerMetrics updated successfully!");
    } catch (error) {
        console.error("❌ Error calculating playPlayerMetrics:", error);
    }
};

export default calculatePlayPlayerMetrics;
