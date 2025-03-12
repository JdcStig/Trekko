import mongoose from "mongoose";

/**
 * Calculates per-play metrics for each play in a session, given:
 *   - play.timeStart (in seconds)
 *   - play.timeEnd   (in seconds)
 *   - speeds array, recorded at 10 readings per second
 *
 * Metrics (per play):
 *   1) Distance (km): sumOfSpeeds / 10000
 *   2) HighSpeedRunning (km): sum of speeds > 5.5 m/s, / 10000
 *   3) Sprinting (km): sum of speeds > 7 m/s, / 10000
 *   4) TopSpeed (m/s): max value in the slice
 *   5) AvgDistance (km per 15-minute interval)
 *   6) NumSprint (increments if top speed > 7 m/s)
 */
const calculatePlayPlayerMetrics = (speeds = [], plays = []) => {
  console.log(`[calculatePlayPlayerMetrics] Processing ${plays.length} plays`);

  let currentIndex = 0; // Tracks position in speeds array

  return plays.map((play, index) => {
    console.log(`\n🔹 Processing Play #${index + 1}: Start=${play.timeStart}, End=${play.timeEnd}`);

    const playLengthSeconds = play.timeEnd - play.timeStart; // playLengthSeconds will be playLengthMiliseconds (divide in 1000) play.timeEnd - play.timeStart / 1000
    const playSize = Math.round(playLengthSeconds * 10);

    const startIndex = currentIndex; // Going to be the (playstartTime - sessionstartTimeplayer) / 100
    const endIndex = currentIndex + playSize; // Change to startIndex + playSize

    if (startIndex >= speeds.length) {
      console.warn(`⚠️ Play #${index + 1} has no speed data!`);
      return {
        PlayNumber: index + 1,
        TotalDistance: 0,
        TopSpeed: 0,
        AvgDistance: 0,
        NumSprint: 0,
        PlayMetrics: [
          { MetricName: 'Distance', Value: 0, Unit: 'km' },
          { MetricName: 'HighSpeedRunning', Value: 0, Unit: 'km' },
          { MetricName: 'Sprinting', Value: 0, Unit: 'km' },
          { MetricName: 'TopSpeed', Value: 0, Unit: 'm/s' },
        ],
      };
    }


    const playSpeeds = speeds.slice(startIndex, endIndex);
    const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000;
    const sumHSR = playSpeeds.filter((val) => val > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;
    const sumSprinting = playSpeeds.filter((val) => val > 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;
    const topSpeed = playSpeeds.length ? Math.max(...playSpeeds) : 0;

    let avgDistance = 0;
    if (playLengthSeconds > 0) {
      avgDistance = (distanceKm / playLengthSeconds) * 60 / 15; 
    }

    const numSprint = topSpeed > 7 ? 1 : 0; // Calculate all the players (total number of players who sprint)
    currentIndex = endIndex;

    return {
      PlayNumber: index + 1,
      TotalDistance: distanceKm,
      TopSpeed: topSpeed,
      AvgDistance: avgDistance,
      NumSprint: numSprint,
      PlayMetrics: [
        { MetricName: 'Distance', Value: distanceKm, Unit: 'km' },
        { MetricName: 'HighSpeedRunning', Value: hsrKm, Unit: 'km' },
        { MetricName: 'Sprinting', Value: sprintKm, Unit: 'km' },
        { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
      ],
    };
  });
};

export default calculatePlayPlayerMetrics;
