// /**
//  * Calculates per-play metrics for each play in a session, given:
//  *   - plays[i].timeStart (in seconds)
//  *   - plays[i].timeEnd   (in seconds)
//  *   - speeds array, recorded at 10 readings per second
//  *
//  * Metrics (per play):
//  *   1) Distance (km): sumOfSpeeds / 10000
//  *   2) HighSpeedRunning (km): sum of speeds > 5.5 m/s, / 10000
//  *   3) Sprinting (km): sum of speeds > 7 m/s, / 10000
//  *   4) TopSpeed (m/s): max value in the slice
//  *
//  * NOTE:
//  *   For the first play, we start at index 0 in the speeds array.
//  *   For subsequent plays, we continue from where the previous play ended,
//  *   so each play is processed sequentially (not jumping around).
//  */
// const calculatePlayPlayerMetrics = (speeds = [], plays = []) => {
//     console.log(
//       '[calculatePlayPlayerMetrics] Starting calculation:',
//       `speeds.length = ${speeds.length}, plays.length = ${plays.length}`
//     );
  
//     let currentIndex = 0; // Keeps track of position in the speeds array
  
//     return plays.map((play, index) => {
//       console.log(`\n=== Processing Play #${index + 1} ===`);
//       console.log('Play details:', play);
  
//       // Calculate how many readings this play spans
//       const playLengthSeconds = play.timeEnd - play.timeStart;
//       const playSize = playLengthSeconds * 10; // 10 readings per second
  
//       // Determine the slice of the speeds array for this play
//       const startIndex = currentIndex;
//       const endIndex = currentIndex + playSize;
//       console.log(`Play #${index + 1}: startIndex=${startIndex}, endIndex=${endIndex}`);
  
//       // Extract just the speeds for this play
//       const playSpeeds = speeds.slice(startIndex, endIndex);
//       console.log(`Play #${index + 1}: playSpeeds.length = ${playSpeeds.length}`);
  
//       // 1) Distance (km)
//       const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
//       const distanceKm = sumSpeeds / 10000;
  
//       // 2) High Speed Running (km) – speeds above 5.5 m/s
//       const sumHSR = playSpeeds
//         .filter((val) => val > 5.5)
//         .reduce((acc, val) => acc + val, 0);
//       const hsrKm = sumHSR / 10000;
  
//       // 3) Sprinting (km) – speeds above 7 m/s
//       const sumSprinting = playSpeeds
//         .filter((val) => val > 7)
//         .reduce((acc, val) => acc + val, 0);
//       const sprintKm = sumSprinting / 10000;
  
//       // 4) Top Speed (m/s)
//       const topSpeed = playSpeeds.length ? Math.max(...playSpeeds) : 0;
  
//       // Move our "currentIndex" so the next play starts where this one ended
//       currentIndex = endIndex;
  
//       // Return the metrics for this play
//       const result = {
//         PlayNumber: index + 1,
//         PlayMetrics: [
//           {
//             MetricName: 'Distance',
//             Value: distanceKm,
//             Unit: 'km',
//           },
//           {
//             MetricName: 'HighSpeedRunning',
//             Value: hsrKm,
//             Unit: 'km',
//           },
//           {
//             MetricName: 'Sprinting',
//             Value: sprintKm,
//             Unit: 'km',
//           },
//           {
//             MetricName: 'TopSpeed',
//             Value: topSpeed,
//             Unit: 'm/s',
//           },
//         ],
//       };
  
//       console.log(
//         `Play #${index + 1}: Returning result:`,
//         JSON.stringify(result, null, 2)
//       );
//       return result;
//     });
//   };
  
//   export default calculatePlayPlayerMetrics;
/**
 * Calculates per-split metrics for each split in a session, given:
 *   - plays[i].start (in seconds)
 *   - plays[i].end   (in seconds)
 *   - speeds array, recorded at 10 readings per second
 *
 * Metrics (per split):
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
    console.log(
        '[calculatePlayPlayerMetrics] Starting calculation:',
        `speeds.length = ${speeds.length}, plays.length = ${plays.length}`
    );

    let currentIndex = 0; // Keeps track of position in the speeds array

    return plays.map((play, index) => {
        console.log(`\n=== Processing Play #${index + 1} ===`);
        console.log('Play details:', play);

        // Calculate how many readings this play spans
        const playLengthSeconds = play.timeEnd - play.timeStart;
        const playSize = playLengthSeconds * 10; // 10 readings per second

        // Determine the slice of the speeds array for this play
        const startIndex = currentIndex;
        const endIndex = currentIndex + playSize;
        console.log(`Play #${index + 1}: startIndex=${startIndex}, endIndex=${endIndex}`);

        // Extract just the speeds for this play
        const playSpeeds = speeds.slice(startIndex, endIndex);
        console.log(`Play #${index + 1}: playSpeeds.length = ${playSpeeds.length}`);

        // 1) Distance (km)
        const sumSpeeds = playSpeeds.reduce((acc, val) => acc + val, 0);
        const distanceKm = sumSpeeds / 10000;

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

        // Move our "currentIndex" so the next play starts where this one ended
        currentIndex = endIndex;

        // Return the metrics for this play
        const result = {
            PlayNumber: index + 1,
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

        console.log(`Play #${index + 1}: Returning result:`, JSON.stringify(result, null, 2));
        return result;
    });
};

export default calculatePlayPlayerMetrics;  