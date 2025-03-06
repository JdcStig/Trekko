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
 *   5) AvgDistance (custom calculation)
 *   6) NumSprint (increments if top speed > 7 m/s)
 *
 * NOTE:
 *   For the first play, we start at index 0 in the speeds array.
 *   For subsequent plays, we continue from where the previous play ended,
 *   so each play is processed sequentially (not jumping around).
 */
const calculatePlayPlayerMetrics = (speeds = [], plays = []) => {
  console.log(`[calculatePlayPlayerMetrics] Processing ${plays.length} plays`);

  let currentIndex = 0; // Tracks our position in the speeds array

  return plays.map((play, index) => {
    console.log(
      `\n🔹 Processing Play #${index + 1}: Start=${play.timeStart}, End=${play.timeEnd}`
    );

    // How many readings does this play span?
    const playLengthSeconds = play.timeEnd - play.timeStart;
    // Each second has 10 readings => multiply by 10
    const playSize = Math.round(playLengthSeconds * 10);

    const startIndex = currentIndex;
    const endIndex = currentIndex + playSize;
    console.log(`🔹 Play #${index + 1}: Index Range ${startIndex} to ${endIndex}`);

    // If we've run out of speed data, return zeros
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

    // Slice out just the speeds for this play
    const playSpeeds = speeds.slice(startIndex, endIndex);
    console.log(
      `🔹 Play #${index + 1}: Retrieved ${playSpeeds.length} speed values`
    );

    // If the slice is empty, also return zeros
    if (!playSpeeds.length) {
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

    // 1) Distance (km)
    // Each speed reading is m/s for 0.1 second => total distance = sumSpeeds * 0.1 meters => / 1000 => km
    // => sumSpeeds / 10000 if sumSpeeds is the sum of all speed values.
    const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000;

    // 2) High Speed Running (km) – speeds above 5.5 m/s
    const sumHSR = playSpeeds.filter((val) => val > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;

    // 3) Sprinting (km) – speeds above 7 m/s
    const sumSprinting = playSpeeds
      .filter((val) => val > 7)
      .reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;

    // 4) Top Speed (m/s)
    const topSpeed = playSpeeds.length ? Math.max(...playSpeeds) : 0;

    // 5) Average Distance (custom formula; tweak as needed)
    let avgDistance = 0;
    const playDuration = playLengthSeconds; // or play.duration if you have that
    if (playDuration > 0) {
      // Example: scale distance by (minutes / 15) or whatever your logic is
      // The line below is just an example from the conflict code
      avgDistance = (distanceKm / playDuration) * 60 / 15;
    }

    // 6) NumSprint: increment if top speed > 7 m/s
    const numSprint = topSpeed > 7 ? 1 : 0;

    // Advance our speeds index for the next play
    currentIndex = endIndex;

    const result = {
      PlayNumber: index + 1,
      TotalDistance: distanceKm,
      TopSpeed: topSpeed,
      AvgDistance: avgDistance,
      NumSprint: numSprint,
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

    console.log(
      `🔹 Play #${index + 1}: Returning result:`,
      JSON.stringify(result, null, 2)
    );
    return result;
  });
};

export default calculatePlayPlayerMetrics;
