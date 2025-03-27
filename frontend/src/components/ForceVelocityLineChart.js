// file: src/components/ForceVelocityLineChart.jsx

import React, { useMemo } from 'react';
import { Chart } from 'react-google-charts';

function ForceVelocityLineChart({ analysisDocs, grouping }) {
  // Sort analysis docs by startDate ascending
  const sortedData = useMemo(() => {
    if (!analysisDocs || !Array.isArray(analysisDocs)) return [];
    return [...analysisDocs].sort((a, b) => a.startDate - b.startDate);
  }, [analysisDocs]);

  // Build chart data with 4 columns => ["Date", "Max Speed", "Max Accel", "Num Sessions"]
  // Convert zero => null for speed/accel if you want to skip plotting zeros
  // Keep zero for sessions if you want to see a dot at zero
  const chartData = useMemo(() => {
    const dataArr = [['Date', 'Max Speed', 'Max Accel', 'Num Sessions']];

    sortedData.forEach((doc) => {
      let dateLabel = new Date(doc.startDate).toLocaleDateString();
      if (grouping === 'week') {
        const startLbl = new Date(doc.startDate).toLocaleDateString();
        const endLbl = new Date(doc.endDate).toLocaleDateString();
        dateLabel = `${startLbl} - ${endLbl}`;
      }

      const speedVal = doc.maxSpeed === 0 ? null : doc.maxSpeed;
      const accelVal = doc.maxAccel === 0 ? null : doc.maxAccel;
      const sessionsVal = doc.number ?? 0; // or doc.numSessions, doc.numberSessions, etc.

      dataArr.push([dateLabel, speedVal, accelVal, sessionsVal]);
    });

    return dataArr;
  }, [sortedData, grouping]);

  // Count how many x‐axis labels => used for vertical gridlines
  const dateCount = chartData.length > 1 ? chartData.length - 1 : 1;

  // Chart options
  const options = {
    title: 'Force Velocity Analysis Over Time',
    legend: { position: 'bottom' },
    curveType: 'function',       // smooth lines
    pointSize: 6,                // show dots
    lineWidth: 2,
    interpolateNulls: true,      // connect lines across "null"

    hAxis: {
      title: 'Date',
      // Rotate the text ~ -45° => set angle to 315
      slantedText: true,
      slantedTextAngle: 315, // 315 deg is about -45 from horizontal
      gridlines: {
        count: dateCount,
        color: '#ccc',
      },
    },
    vAxis: {
      title: 'Value',
      // Force the vertical axis to start at 0
      viewWindowMode: 'explicit',
      viewWindow: { min: 0 },
      gridlines: {
        color: '#ccc',
        count: 5,
      },
    },
    // Increase the bottom margin so the rotated labels fit
    chartArea: {
      left: 60,
      top: 40,
      right: 20,
      bottom: 100, // <--- Adjust as needed (e.g. 120, 140)
    },
    // Series styling: color, shapes, etc.
    series: {
      0: { color: 'blue',  pointShape: 'circle'   }, // Max Speed
      1: { color: 'red',   pointShape: 'square'   }, // Max Accel
      2: { color: 'green', pointShape: 'triangle' }, // Num Sessions
    },
  };

  if (!analysisDocs || analysisDocs.length === 0) {
    return <p>No analysis data to display.</p>;
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <Chart
        chartType="LineChart"
        width="100%"
        height="500px"
        data={chartData}
        options={options}
        loader={<div>Loading line chart...</div>}
      />
    </div>
  );
}

export default ForceVelocityLineChart;
