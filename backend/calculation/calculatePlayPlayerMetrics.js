export default function calculatePlayPlayerMetrics(times = [], speeds = [], plays = []) {
  console.log(`\n[calculatePlayPlayerMetrics] START. times.length=${times.length}, speeds.length=${speeds.length}, plays.length=${plays.length}`);

  // Convert speeds to a safe array of numbers
  const safeSpeeds = speeds.map(n => {
    const num = Number(n);
    return isNaN(num) ? 0 : num;
  });

  // If times array is empty or safeSpeeds is empty, return default metrics for each play
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

  // If there are no plays defined, use overall metrics as a fallback
  if (plays.length === 0) {
    const sumSpeeds = safeSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSpeeds / 10000;
    const topSpeed = safeSpeeds.length ? Math.max(...safeSpeeds) : 0;
    return [{
      PlayNumber: 1,
      TotalDistance: distanceKm,
      TopSpeed: topSpeed,
      AvgDistance: distanceKm, // fallback using overall distance
      NumSprint: topSpeed > 7 ? 1 : 0,
      PlayMetrics: [
        { MetricName: "Distance", Value: distanceKm, Unit: "km" },
        { MetricName: "HighSpeedRunning", Value: 0, Unit: "km" },
        { MetricName: "Sprinting", Value: 0, Unit: "km" },
        { MetricName: "TopSpeed", Value: topSpeed, Unit: "m/s" },
      ],
    }];
  }

  // Otherwise, use a two-pointer approach for each play
  const sortedPlays = [...plays].sort((a, b) => a.timeStart - b.timeStart);
  const results = [];
  let timeIndex = 0;

  for (let i = 0; i < sortedPlays.length; i++) {
    const play = sortedPlays[i];
    // Advance pointer to the play's start time
    while (timeIndex < times.length && times[timeIndex] < play.timeStart) {
      timeIndex++;
    }
    const startIndex = timeIndex;
    // Advance pointer until the play's end time
    while (timeIndex < times.length && times[timeIndex] <= play.timeEnd) {
      timeIndex++;
    }
    const endIndex = timeIndex;

    const snippetSpeeds = safeSpeeds.slice(startIndex, endIndex);
    const sumSnippet = snippetSpeeds.reduce((acc, val) => acc + val, 0);
    const distanceKm = sumSnippet / 10000;

    const sumHSR = snippetSpeeds.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;
    const sumSprinting = snippetSpeeds.filter(v => v > 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;

    const topSpeed = snippetSpeeds.length ? Math.max(...snippetSpeeds) : 0;
    const playLengthSec = (play.timeEnd - play.timeStart) / 1000;
    
    // Avg distance => distance per 15 minutes
    const avgDistance = playLengthSec > 0 ? (distanceKm / playLengthSec) * 900 : 0;

    // # sprints
    const numSprint = topSpeed > 7 ? 1 : 0;

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
