// file: calculation/calculatePlayPlayerMetrics.js

/**
 * Given:
 *   - times[] (timestamps in ms)
 *   - speeds[] (in m/s, recorded at 10Hz by default)
 *   - plays[] (each play has { timeStart, timeEnd, ... })
 *
 * Returns an array of objects, one per play:
 *   [
 *     {
 *       PlayNumber: number,
 *       TotalDistance: number, // in km
 *       TopSpeed: number,     // snippet top speed (m/s)
 *       AvgDistance: number,  // for this single player's snippet (same as distance)
 *       NumSprint: number,    // 1 if topSpeed >= 7, else 0
 *       PlayMetrics: [
 *         { MetricName: "Distance", Value: X, Unit: "km" },
 *         { MetricName: "HighSpeedRunning", Value: Y, Unit: "km" },
 *         { MetricName: "Sprinting", Value: Z, Unit: "km" },
 *         { MetricName: "TopSpeed", Value: T, Unit: "m/s" },
 *       ],
 *     },
 *     ...
 *   ]
 */
export default function calculatePlayPlayerMetrics(times = [], speeds = [], plays = []) {
  console.log(
    `\n[calculatePlayPlayerMetrics] START. times.length=${times.length}, speeds.length=${speeds.length}, plays.length=${plays.length}`
  );

  // Convert speeds to numeric array
  const safeSpeeds = speeds.map((n) => {
    const num = Number(n);
    return isNaN(num) ? 0 : num;
  });

  // If no times or speeds, return zeroed-out metrics for each play
  if (times.length === 0 || safeSpeeds.length === 0) {
    return plays.map((play, index) => ({
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
    }));
  }

  // If no plays, fallback to overall metrics
  if (plays.length === 0) {
    const sumSpeeds = safeSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000; // sumSpeeds/10 => meters => /1000 => km
    const topSpeed = safeSpeeds.length ? Math.max(...safeSpeeds) : 0;
    const isSprint = topSpeed >= 7 ? 1 : 0;
    return [
      {
        PlayNumber: 1,
        TotalDistance: distanceKm,
        TopSpeed: topSpeed,
        AvgDistance: distanceKm,
        NumSprint: isSprint,
        PlayMetrics: [
          { MetricName: "Distance", Value: distanceKm, Unit: "km" },
          { MetricName: "HighSpeedRunning", Value: 0, Unit: "km" },
          { MetricName: "Sprinting", Value: 0, Unit: "km" },
          { MetricName: "TopSpeed", Value: topSpeed, Unit: "m/s" },
        ],
      },
    ];
  }

  // Otherwise, do a two-pointer approach for each play snippet
  const sortedPlays = [...plays].sort((a, b) => a.timeStart - b.timeStart);
  const results = [];
  let timeIndex = 0;

  for (let i = 0; i < sortedPlays.length; i++) {
    const play = sortedPlays[i];

    // Move pointer to the start of this play
    while (timeIndex < times.length && times[timeIndex] < play.timeStart) {
      timeIndex++;
    }
    const startIndex = timeIndex;

    // Move pointer up until the end time
    while (timeIndex < times.length && times[timeIndex] <= play.timeEnd) {
      timeIndex++;
    }
    const endIndex = timeIndex;

    const snippetSpeeds = safeSpeeds.slice(startIndex, endIndex);
    const sumSnippet = snippetSpeeds.reduce((acc, val) => acc + val, 0);
    // Distance in km => sumSnippet (m/s) / 10 => total meters => /1000 => km
    const distanceKm = sumSnippet / 10000;

    // High Speed Running
    const sumHSR = snippetSpeeds.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;

    // Sprinting
    const sumSprint = snippetSpeeds.filter((v) => v >= 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprint / 10000;

    // Top Speed
    const topSpeed = snippetSpeeds.length ? Math.max(...snippetSpeeds) : 0;

    // For a single player's snippet, we'll store snippetDistance in "AvgDistance"
    const avgDistance = distanceKm;

    // 1 if topSpeed >= 7, else 0
    const numSprint = topSpeed >= 7 ? 1 : 0;

    results.push({
      PlayNumber: i + 1,
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
    });
  }

  return results;
}
