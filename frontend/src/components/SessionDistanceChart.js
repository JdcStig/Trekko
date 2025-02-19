import React from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';

const SessionDistanceChart = ({ sessionId }) => {
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // Build chart data: first row is the header.
  const chartData = [['Player', 'Distance (km)']];
  const playerDataArray = data.sessionPlayerDataArray || [];
  playerDataArray.forEach((item) => {
    const distanceMetric = item.sessionPlayerMetrics?.find(
      (metric) => metric.MetricName === 'Distance'
    );
    const distance = distanceMetric ? distanceMetric.Value : 0;
    chartData.push([item.playerName, distance]);
  });

  const options = {
    title: 'Player Distance',
    hAxis: { title: 'Player' },
    vAxis: { title: 'Distance (km)' },
    legend: { position: 'none' },
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Chart
        chartType="ColumnChart" // Change to ColumnChart for vertical bars
        width="100%"
        height="400px"
        data={chartData}
        options={options}
      />
    </div>
  );
};

export default SessionDistanceChart;
