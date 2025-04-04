// file: src/components/ForceVelocityLineChart.jsx
import React, { useMemo } from 'react';
import { Chart } from 'react-google-charts';

function ForceVelocityLineChart({ analysisDocs, grouping }) {
  // Sort analysis docs by startDate ascending
  const sortedData = useMemo(() => {
    if (!analysisDocs || !Array.isArray(analysisDocs)) return [];
    return [...analysisDocs].sort((a, b) => a.startDate - b.startDate);
  }, [analysisDocs]);

  // Build chart data with columns: ["Date", "Max Speed", "Max Accel", "Num Sessions"]
  const chartData = useMemo(() => {
    const dataArr = [['Date', 'Max Speed', 'Max Accel', 'Num Sessions']];

    sortedData.forEach((doc) => {
      let dateLabel;

      // WEEK grouping => "MM/DD/yy - MM/DD/yy"
      if (grouping === 'week') {
        const startLbl = new Date(doc.startDate).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
        });
        const endLbl = new Date(doc.endDate).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
        });
        dateLabel = `${startLbl} - ${endLbl}`;
      }
      // MONTH grouping => "Sep 23"
      else if (grouping === 'month') {
        const d = new Date(doc.startDate);
        dateLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      }
      // Default (DAY or none) => "MM/DD/yy"
      else {
        dateLabel = new Date(doc.startDate).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
        });
      }

      // If a value is zero, we use null so the line is drawn continuously with no dot at zero.
      const speedVal = doc.maxSpeed === 0 ? null : doc.maxSpeed;
      const accelVal = doc.maxAccel === 0 ? null : doc.maxAccel;
      const sessionsVal = doc.number ?? 0;

      dataArr.push([dateLabel, speedVal, accelVal, sessionsVal]);
    });

    return dataArr;
  }, [sortedData, grouping]);

  // Build an array of ticks for the x-axis (one per data row, excluding the header)
  const xTicks = useMemo(() => {
    if (chartData.length <= 1) return [];
    // Each row => [dateLabel, maxSpeed, maxAccel, numSessions]
    // We map each row's dateLabel into { v, f } objects for clarity
    return chartData.slice(1).map((row) => ({
      v: row[0],
      f: row[0], // The string label to display
    }));
  }, [chartData]);

  const options = {
    title: 'Force Velocity Analysis Over Time',
    legend: { position: 'bottom' },
    curveType: 'none',
    pointSize: 6,
    lineWidth: 2,
    interpolateNulls: true,
    hAxis: {
      title: 'Date',
      slantedText: true,
      slantedTextAngle: 15,
      baselineColor: '#000',         // Dark baseline to make the axis stand out
      ticks: xTicks,                 // One tick per data point => short “notch”
      gridlines: {
        color: 'transparent',       // Hide major vertical grid lines
        count: 0,
      },
      minorGridlines: {
        color: 'transparent',       // Hide minor vertical grid lines
        count: 0,
      },
    },
    vAxis: {
      title: 'Value',
      viewWindowMode: 'explicit',
      viewWindow: { min: 0 },
      gridlines: {
        color: '#ccc',              // Horizontal lines remain
        count: 5,
      },
    },
    chartArea: {
      left: 60,
      top: 40,
      right: 20,
      bottom: 120, // extra bottom margin to avoid label overlap
    },
    series: {
      0: { color: 'blue',  pointShape: 'circle'   },
      1: { color: 'red',   pointShape: 'square'   },
      2: { color: 'green', pointShape: 'triangle' },
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
