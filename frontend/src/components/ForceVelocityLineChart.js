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
      let dateLabel = new Date(doc.startDate).toLocaleDateString();
      if (grouping === 'week') {
        const startLbl = new Date(doc.startDate).toLocaleDateString();
        const endLbl = new Date(doc.endDate).toLocaleDateString();
        dateLabel = `${startLbl} - ${endLbl}`;
      } else if (grouping === 'month') {
        const d = new Date(doc.startDate);
        const monthName = d.toLocaleString('default', { month: 'short' });
        dateLabel = `${monthName} ${d.getFullYear()}`;
      }
      // If a value is zero, we use null so that the line is drawn across but no dot is placed.
      const speedVal = doc.maxSpeed === 0 ? null : doc.maxSpeed;
      const accelVal = doc.maxAccel === 0 ? null : doc.maxAccel;
      const sessionsVal = doc.number ?? 0;
      dataArr.push([dateLabel, speedVal, accelVal, sessionsVal]);
    });
    return dataArr;
  }, [sortedData, grouping]);

  // Count the number of x-axis labels for gridlines
  const dateCount = chartData.length > 1 ? chartData.length - 1 : 1;

  // Chart options
  const options = {
    title: 'Force Velocity Analysis Over Time',
    legend: { position: 'bottom' },
    curveType: 'function',
    pointSize: 6,
    lineWidth: 2,
    interpolateNulls: true,
    hAxis: {
      title: 'Date',
      slantedText: true,
      slantedTextAngle: 315,
      gridlines: {
        count: dateCount,
        color: '#ccc',
      },
    },
    vAxis: {
      title: 'Value',
      viewWindowMode: 'explicit',
      viewWindow: { min: 0 },
      gridlines: {
        color: '#ccc',
        count: 5,
      },
    },
    chartArea: {
      left: 60,
      top: 40,
      right: 20,
      bottom: 100,
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
