// SessionCharts.js
import React from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';

const SessionCharts = ({ sessionId }) => {
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // Grab the array of players from the session data
  const playerDataArray = data.sessionPlayerDataArray || [];

  // ------------------ DISTANCE CHART ------------------
  const distanceData = [['Player', 'Distance (km)']];
  playerDataArray.forEach((item) => {
    const distanceMetric = item.sessionPlayerMetrics?.find(
      (metric) => metric.MetricName === 'Distance'
    );
    const distance = distanceMetric ? Number(distanceMetric.Value) : NaN;
    distanceData.push([item.playerName, distance]);
  });

  const validDistanceRows = distanceData.slice(1).filter(
    (row) => typeof row[1] === 'number' && !isNaN(row[1])
  );

  const distanceOptions = {
    title: 'Player Distance',
    hAxis: {
      title: 'Player',
      slantedText: true,
      slantedTextAngle: 45,
    },
    vAxis: { title: 'Distance (km)' },
    chartArea: {
      left: 50,
      top: 50,
      bottom: 100,
      right: 20,
    },
    legend: { position: 'none' },
  };

  // ------------------ TOP SPEED CHART ------------------
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  playerDataArray.forEach((item) => {
    const topSpeedMetric = item.sessionPlayerMetrics?.find(
      (metric) => metric.MetricName === 'TopSpeed'
    );
    const topSpeed = topSpeedMetric ? Number(topSpeedMetric.Value) : NaN;
    topSpeedData.push([item.playerName, topSpeed]);
  });

  const validTopSpeedRows = topSpeedData.slice(1).filter(
    (row) => typeof row[1] === 'number' && !isNaN(row[1])
  );

  const topSpeedOptions = {
    title: 'Player Top Speed',
    hAxis: {
      title: 'Player',
      slantedText: true,
      slantedTextAngle: 45,
    },
    vAxis: { title: 'Speed (m/s)' },
    chartArea: {
      left: 50,
      top: 50,
      bottom: 100,
      right: 20,
    },
    legend: { position: 'none' },
  };

  // ------------------ HIGH SPEED RUNNING CHART ------------------
  const hsrData = [['Player', 'High Speed Running (km)']];
  playerDataArray.forEach((item) => {
    const hsrMetric = item.sessionPlayerMetrics?.find(
      (metric) => metric.MetricName === 'HighSpeedRunning'
    );
    const hsrValue = hsrMetric ? Number(hsrMetric.Value) : NaN;
    hsrData.push([item.playerName, hsrValue]);
  });

  const validHSRRows = hsrData.slice(1).filter(
    (row) => typeof row[1] === 'number' && !isNaN(row[1])
  );

  const hsrOptions = {
    title: 'High Speed Running',
    hAxis: {
      title: 'Player',
      slantedText: true,
      slantedTextAngle: 45,
    },
    vAxis: { title: 'Distance (km)' },
    chartArea: {
      left: 50,
      top: 50,
      bottom: 100,
      right: 20,
    },
    legend: { position: 'none' },
  };

  return (
    <div>
      {/* ---- DISTANCE CHART ---- */}
      {validDistanceRows.length > 0 ? (
        <div className="chart-container">
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={distanceData}
            options={distanceOptions}
          />
        </div>
      ) : (
        <div className="no-data">No Distance data found</div>
      )}

      {/* ---- TOP SPEED CHART ---- */}
      {validTopSpeedRows.length > 0 ? (
        <div className="chart-container" style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={topSpeedData}
            options={topSpeedOptions}
          />
        </div>
      ) : (
        <div className="no-data">No Top Speed data found</div>
      )}

      {/* ---- HIGH SPEED RUNNING CHART ---- */}
      {validHSRRows.length > 0 ? (
        <div className="chart-container" style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={hsrData}
            options={hsrOptions}
          />
        </div>
      ) : (
        <div className="no-data">No High Speed Running data found</div>
      )}
    </div>
  );
};

export default SessionCharts;
