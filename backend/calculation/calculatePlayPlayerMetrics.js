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
 *   5) AvgDistance (km per 15-minute interval): (distanceKm / playLengthSeconds) * 900
 *   6) NumSprint (increments if top speed > 7 m/s)
 */
const calculatePlayPlayerMetrics = (speeds = [], plays = []) => {
  let currentIndex = 0; // Tracks position in speeds array

  // Ensure plays are sorted by timeStart for sequential processing
  const sortedPlays = [...plays].sort((a, b) => a.timeStart - b.timeStart);
  //console.log("calculatePlayPlayerMetrics: Sorted plays:", sortedPlays);

  return sortedPlays.map((play, index) => {
    const playLengthSeconds = play.timeEnd - play.timeStart;
    const playSize = Math.round(playLengthSeconds * 10); // number of readings expected

    const startIndex = currentIndex;
    const endIndex = currentIndex + playSize;
   // console.log(
   //   `Play #${index + 1}: timeStart=${play.timeStart}, timeEnd=${play.timeEnd}, duration=${playLengthSeconds}s, expected readings=${playSize}, currentIndex=${currentIndex}, endIndex=${endIndex}`
   // );

    if (startIndex >= speeds.length) {
      // console.warn(`⚠️ Play #${index + 1} has no speed data!`);
      return {
        PlayNumber: index + 1,
        TotalDistance: 0,
        TopSpeed: 0,
        AvgDistance: 0,
        NumSprint: 0,
        PlayMetrics: [
          { MetricName: "Distance", Value: 0, Unit: "km" },
          { MetricName: "HighSpeedRunning", Value: 0, Unit: "km" },
          { MetricName: "Sprinting", Value: 0, Unit: "km" },
          { MetricName: "TopSpeed", Value: 0, Unit: "m/s" },
        ],
      };
    }

    const playSpeeds = speeds.slice(startIndex, endIndex);
    // console.log(`Play #${index + 1}: Number of speed readings: ${playSpeeds.length}`);

    const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000;
    const sumHSR = playSpeeds.filter((val) => val > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;
    const sumSprinting = playSpeeds.filter((val) => val > 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;
    const topSpeed = playSpeeds.length ? Math.max(...playSpeeds) : 0;
    
    // Calculate average distance per 15-minute interval (900 seconds)
    const avgDistance = playLengthSeconds > 0 ? (distanceKm / playLengthSeconds) * 900 : 0;
    
    const numSprint = topSpeed > 7 ? 1 : 0;
    
    // console.log(
    //   `Play #${index + 1}: TotalDistance=${distanceKm.toFixed(3)} km, TopSpeed=${topSpeed.toFixed(2)} m/s, AvgDistance=${avgDistance.toFixed(3)} km/15min, NumSprint=${numSprint}`
    // );

    currentIndex = endIndex;

    return {
      PlayNumber: index + 1,
      TotalDistance: distanceKm,
      TopSpeed: topSpeed,
      AvgDistance: avgDistance,
      NumSprint: numSprint,
      PlayMetrics: [
        { MetricName: "Distance", Value: distanceKm, Unit: "km" },
        { MetricName: "HighSpeedRunning", Value: hsrKm, Unit: "km" },
        { MetricName: "Sprinting", Value: sprintKm, Unit: "km" },
        { MetricName: "TopSpeed", Value: topSpeed, Unit: "m/s" },
      ],
    };
  });
};

export default calculatePlayPlayerMetrics;
