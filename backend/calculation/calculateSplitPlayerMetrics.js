/**
 * Calculates distance (in km) for each split in a session, given:
 *   - splits[i].start (in seconds)
 *   - splits[i].end   (in seconds)
 *   - speeds array, recorded at 10 readings per second
 *
 * Distance formula:
 *   sumOfSpeeds / 10000  (since sumOfSpeeds * 0.1 / 1000 == sumOfSpeeds / 10000)
 *
 * NOTE:
 *   For the first split, we start at index 0.
 *   For subsequent splits, we pick up exactly where the last split ended.
 *   We do NOT jump to (split.start * 10); we only use (split.end - split.start)
 *   to figure out how many readings to slice.
 */
const calculateSplitPlayerMetrics = (speeds = [], splits = []) => {
    console.log(
      '[calculateSplitPlayerMetrics] Starting calculation:',
      `speeds.length = ${speeds.length}, splits.length = ${splits.length}`
    );
  
    // Keep track of where the previous split ended in the speeds array
    let currentIndex = 0;
  
    return splits.map((split, index) => {
      console.log(`\n=== Processing Split #${index + 1} ===`);
      console.log('Split details:', split);
  
      // How many seconds long is this split?
      const splitLengthSeconds = split.end - split.start; 
      console.log(`Split #${index + 1}: duration = ${splitLengthSeconds} seconds`);
  
      // Number of readings in this split (10 per second)
      const splitSize = splitLengthSeconds * 10;
  
      // Slice from currentIndex to currentIndex + splitSize
      const startIndex = currentIndex;
      const endIndex = currentIndex + splitSize;
      console.log(`Split #${index + 1}: startIndex=${startIndex}, endIndex=${endIndex}`);
  
      // Pull out those speeds
      const splitSpeeds = speeds.slice(startIndex, endIndex);
      console.log(`Split #${index + 1}: splitSpeeds.length = ${splitSpeeds.length}`);
  
      // Sum them
      const sumSpeeds = splitSpeeds.reduce((acc, val) => acc + val, 0);
      console.log(`Split #${index + 1}: sumSpeeds = ${sumSpeeds}`);
  
      // Convert to distance in km
      const distanceKm = sumSpeeds / 10000;
      console.log(`Split #${index + 1}: distanceKm = ${distanceKm}`);
  
      // Advance currentIndex so the next split picks up where we left off
      currentIndex = endIndex;
  
      // Return the data structure you need
      const result = {
        SplitNumber: index + 1,
        SplitMetrics: [
          {
            MetricName: 'Distance',
            Value: distanceKm,
            Unit: 'km',
          },
        ],
      };
      console.log(
        `Split #${index + 1}: Returning result:`,
        JSON.stringify(result, null, 2)
      );
  
      return result;
    });
  };
  
  export default calculateSplitPlayerMetrics;
  