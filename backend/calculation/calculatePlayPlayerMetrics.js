import mongoose from "mongoose";
/**
 * Calculates per-play metrics for each play in a session, given:
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
 * NOTE:
 *   For the first play, we start at index 0 in the speeds array.
 *   For subsequent plays, we continue from where the previous play ended,
 *   so each play is processed sequentially (not jumping around).
 */
const calculatePlayPlayerMetrics = (speeds = [], plays = []) => {
  console.log(`[calculatePlayPlayerMetrics] Processing ${plays.length} plays`);

  let currentIndex = 0; // Keeps track of speed data

  return plays.map((play, index) => {
      console.log(`\n🔹 Processing Play #${index + 1}: Start=${play.timeStart}, End=${play.timeEnd}`);

      const playLengthSeconds = play.timeEnd - play.timeStart;
      const playSize = Math.round(playLengthSeconds * 10); // 10 readings per second

      const startIndex = currentIndex;
      const endIndex = currentIndex + playSize;
      console.log(`🔹 Play #${index + 1}: Index Range ${startIndex} to ${endIndex}`);

      // Ensure speed data exists
      if (startIndex >= speeds.length) {
          console.warn(`⚠️ Play #${index + 1} has no speed data!`);
          return {
              PlayNumber: index + 1,
              TotalDistance: 0,
              TopSpeed: 0,
              AvgDistance: 0,
              NumSprint: 0,
          };
      }

      const playSpeeds = speeds.slice(startIndex, endIndex);
      console.log(`🔹 Play #${index + 1}: Retrieved ${playSpeeds.length} speed values`);

      if (!playSpeeds.length) {
          return {
              PlayNumber: index + 1,
              TotalDistance: 0,
              TopSpeed: 0,
              AvgDistance: 0,
              NumSprint: 0,
          };
      }

      // 1) Distance Calculation (convert to km)
      const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
      const distanceKm = sumSpeeds / 1000; // Convert meters to km

      // 2) High Speed Running (km) – speeds above 5.5 m/s
      const sumHSR = playSpeeds
      .filter((val) => val > 5.5)
      .reduce((acc, val) => acc + val, 0);
  const hsrKm = sumHSR / 10000;

  // 3) Sprinting (km) – speeds above 7 m/s
  const sumSprinting = playSpeeds
  .filter((val) => val > 7)
  .reduce((acc, val) => acc + val, 0);
const sprintKm = sumSprinting / 10000;

      // 4) Top Speed (m/s)
      const topSpeed = playSpeeds.length ? Math.max(...playSpeeds) : 0;

      // 5) Avg Distance Calculation (Prevent Division by Zero)
      let avgDistance = 0;
      if (play.duration > 0) {
          avgDistance = (distanceKm / play.duration) * 60 / 15;
      }

      // 6) numSprint Calculation (Increment if TopSpeed > 7)
      const numSprint = topSpeed > 7 ? 1 : 0;

      // Move to the next play
      currentIndex = endIndex;

      return {
          PlayNumber: index + 1,
          TotalDistance: distanceKm,  // ✅ Used for avgDistance calculation
          TopSpeed: topSpeed,         // ✅ Used for numSprint calculation
          AvgDistance: avgDistance,   // ✅ Final calculated AvgDistance
          NumSprint: numSprint,       // ✅ Final calculated NumSprint

          PlayMetrics: [
            {
                MetricName: 'Distance',
                Value: distanceKm,
                Unit: 'km',
            },
            {
                MetricName: 'HighSpeedRunning',
                Value: hsrKm,
                Unit: 'km',
            },
            {
                MetricName: 'Sprinting',
                Value: sprintKm,
                Unit: 'km',
            },
            {
                MetricName: 'TopSpeed',
                Value: topSpeed,
                Unit: 'm/s',
            },
        ],
      };
      
  });
};
  
  export default calculatePlayPlayerMetrics;
  