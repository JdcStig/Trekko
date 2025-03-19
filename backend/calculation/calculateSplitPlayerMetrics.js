// const calculateSplitPlayerMetrics = (times = [], speeds = [], splits = []) => {
//   return splits.map((split, index) => {
//     // For each split, select speeds whose corresponding time is within the split's boundaries.
//     const splitSpeeds = speeds.filter((_, i) => {
//       const t = times[i];
//       return t >= split.start && t <= split.end;
//     });

//     // Calculate metrics based on these readings.
//     const sumSpeeds = splitSpeeds.reduce((acc, val) => acc + val, 0);
//     const distanceKm = sumSpeeds / 10000; // Formula: sumSpeeds/10000
//     const sumHSR = splitSpeeds.filter(val => val > 5.5).reduce((acc, val) => acc + val, 0);
//     const hsrKm = sumHSR / 10000;
//     const sumSprinting = splitSpeeds.filter(val => val > 7).reduce((acc, val) => acc + val, 0);
//     const sprintKm = sumSprinting / 10000;
//     const topSpeed = splitSpeeds.length ? Math.max(...splitSpeeds) : 0;

//     return {
//       SplitNumber: index + 1,
//       SplitMetrics: [
//         { MetricName: "Distance", Value: distanceKm, Unit: "km" },
//         { MetricName: "HighSpeedRunning", Value: hsrKm, Unit: "km" },
//         { MetricName: "Sprinting", Value: sprintKm, Unit: "km" },
//         { MetricName: "TopSpeed", Value: topSpeed, Unit: "m/s" },
//       ],
//     };
//   });
// };

// export default calculateSplitPlayerMetrics;


// calculation/calculateSplitPlayerMetrics.js
// Updated so that split metrics are computed using each reading’s timestamp.
const calculateSplitPlayerMetrics = (times = [], speeds = [], splits = []) => {
  return splits.map((split, index) => {
    // Filter speeds using the corresponding times that fall within the split's boundaries.
    const splitSpeeds = speeds.filter((_, i) => {
      const t = times[i];
      return t >= split.start && t <= split.end;
    });

    const sumSpeeds = splitSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000;
    const sumHSR = splitSpeeds.filter(val => val > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;
    const sumSprinting = splitSpeeds.filter(val => val > 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;
    const topSpeed = splitSpeeds.length ? Math.max(...splitSpeeds) : 0;

    return {
      SplitNumber: index + 1,
      SplitMetrics: [
        { MetricName: "Distance", Value: distanceKm, Unit: "km" },
        { MetricName: "HighSpeedRunning", Value: hsrKm, Unit: "km" },
        { MetricName: "Sprinting", Value: sprintKm, Unit: "km" },
        { MetricName: "TopSpeed", Value: topSpeed, Unit: "m/s" },
      ],
    };
  });
};

export default calculateSplitPlayerMetrics;
