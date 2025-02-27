/**
 * Calculates per-split metrics for each split in a session, given:
 *   - splits[i].start (in seconds)
 *   - splits[i].end   (in seconds)
 *   - speeds array, recorded at 10 readings per second
 *
 * Metrics (per split):
 *   1) Distance (km): sumOfSpeeds / 10000
 *   2) HighSpeedRunning (km): sum of speeds > 5.5 m/s, / 10000
 *   3) Sprinting (km): sum of speeds > 7 m/s, / 10000
 *   4) TopSpeed (m/s): max value in the slice
 *
 * NOTE:
 *   For the first split, we start at index 0 in the speeds array.
 *   For subsequent splits, we continue from where the previous split ended,
 *   so each split is processed sequentially (not jumping around).
 */
const calculateSplitPlayerMetrics = (speeds = [], splits = []) => {
    console.log(
      '[calculateSplitPlayerMetrics] Starting calculation:',
      `speeds.length = ${speeds.length}, splits.length = ${splits.length}`
    );
  
    let currentIndex = 0; // Where we left off in the speeds array
  
    return splits.map((split, index) => {
      console.log(`\n=== Processing Split #${index + 1} ===`);
      console.log('Split details:', split);
  
      // Calculate how many readings this split spans
      const splitLengthSeconds = split.end - split.start;
      const splitSize = splitLengthSeconds * 10; // 10 readings per second
  
      // Determine the slice of the speeds array for this split
      const startIndex = currentIndex;
      const endIndex = currentIndex + splitSize;
      console.log(`Split #${index + 1}: startIndex=${startIndex}, endIndex=${endIndex}`);
  
      // Extract just the speeds for this split
      const splitSpeeds = speeds.slice(startIndex, endIndex);
      console.log(`Split #${index + 1}: splitSpeeds.length = ${splitSpeeds.length}`);
  
      // 1) Distance (km)
      const sumSpeeds = splitSpeeds.reduce((acc, val) => acc + val, 0);
      const distanceKm = sumSpeeds / 10000;
  
      // 2) High Speed Running (km) – speeds above 5.5 m/s
      const sumHSR = splitSpeeds
        .filter((val) => val > 5.5)
        .reduce((acc, val) => acc + val, 0);
      const hsrKm = sumHSR / 10000;
  
      // 3) Sprinting (km) – speeds above 7 m/s
      const sumSprinting = splitSpeeds
        .filter((val) => val > 7)
        .reduce((acc, val) => acc + val, 0);
      const sprintKm = sumSprinting / 10000;
  
      // 4) Top Speed (m/s)
      const topSpeed = splitSpeeds.length ? Math.max(...splitSpeeds) : 0;
  
      // Move our "currentIndex" so the next split starts where this one ended
      currentIndex = endIndex;
  
      // Return the metrics for this split
      const result = {
        SplitNumber: index + 1,
        SplitMetrics: [
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
  
      console.log(`Split #${index + 1}: Returning result:`, JSON.stringify(result, null, 2));
      return result;
    });
  };
  
  export default calculateSplitPlayerMetrics;
  