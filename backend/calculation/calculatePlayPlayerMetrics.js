// file: calculation/calculatePlayPlayerMetrics.js

/**
 * Calculates per-play metrics by filtering times[] and speeds[] to the snippet
 * [play.timeStart, play.timeEnd].
 */
export default function calculatePlayPlayerMetrics(times = [], speeds = [], plays = []) {
  console.log(`\n[calculatePlayPlayerMetrics] START. times.length=${times.length}, speeds.length=${speeds.length}, plays.length=${plays.length}`);

  // Sort plays by timeStart just in case
  const sortedPlays = [...plays].sort((a, b) => a.timeStart - b.timeStart);

  return sortedPlays.map((play, index) => {
    console.log(`\n[Play #${index + 1}] timeStart=${play.timeStart}, timeEnd=${play.timeEnd}`);

    // Gather speeds that fall within [timeStart, timeEnd]
    const snippetIndices = [];
    for (let i = 0; i < times.length; i++) {
      if (times[i] >= play.timeStart && times[i] <= play.timeEnd) {
        snippetIndices.push(i);
      }
    }

    const snippetSpeeds = snippetIndices.map(i => speeds[i]);
    const snippetTimes = snippetIndices.map(i => times[i]);

    console.log(`[Play #${index + 1}] snippetIndices=`, snippetIndices);
    console.log(`[Play #${index + 1}] snippetTimes=`, snippetTimes);
    console.log(`[Play #${index + 1}] snippetSpeeds=`, snippetSpeeds);

    // Sum of snippet speeds => distance
    const sumSpeeds = snippetSpeeds.reduce((acc, val) => acc + val, 0);
    // If you record at 10 Hz in m/s => sum / 10000 => distance in km
    const distanceKm = sumSpeeds / 10000;

    // High Speed Running
    const sumHSR = snippetSpeeds.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0);
    const hsrKm = sumHSR / 10000;

    // Sprinting
    const sumSprinting = snippetSpeeds.filter(v => v > 7).reduce((acc, val) => acc + val, 0);
    const sprintKm = sumSprinting / 10000;

    // Top Speed
    const topSpeed = snippetSpeeds.length ? Math.max(...snippetSpeeds) : 0;

    // Duration in seconds
    const playLengthSec = (play.timeEnd - play.timeStart) / 1000;
    // Avg distance => distance per 15 minutes
    const avgDistance = playLengthSec > 0 ? (distanceKm / playLengthSec) * 900 : 0;

    // # sprints
    const numSprint = topSpeed > 7 ? 1 : 0;

    console.log(`[Play #${index + 1}] snippetSpeeds.length=${snippetSpeeds.length}, distanceKm=${distanceKm.toFixed(3)}, topSpeed=${topSpeed.toFixed(2)}, avgDistance=${avgDistance.toFixed(3)}, numSprint=${numSprint}`);

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
}
