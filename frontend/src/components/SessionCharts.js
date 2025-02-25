import React, { useState, useEffect, useMemo } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';

const SessionCharts = ({ sessionId }) => {
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // Use the returned property names from the API:
  // We expect data.sessionPlayerDataArray and data.splits
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const splits = data?.splits || [];

  // Build a unique list of player names
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // Build a list of split titles from the players’ splitPlayerMetrics.
  const allSplitTitles = useMemo(() => {
    const splitNumbers = new Set();
    playerDataArray.forEach((player) => {
      player.splitPlayerMetrics?.forEach((sp) => {
        splitNumbers.add(sp.SplitNumber);
      });
    });
    const titles = Array.from(splitNumbers)
      .sort((a, b) => a - b)
      .map((num) => `Split ${num}`);
    return ['No Split', ...titles];
  }, [playerDataArray]);

  // Selected split state (default "No Split")
  const [selectedSplitTitle, setSelectedSplitTitle] = useState('No Split');
  const handleSplitChange = (e) => setSelectedSplitTitle(e.target.value);

  // Visible players state – start with all tick boxes checked.
  const [visiblePlayers, setVisiblePlayers] = useState(() => {
    const init = {};
    allPlayerNames.forEach((name) => {
      init[name] = true;
    });
    return init;
  });
  // When the list of players changes, add any new names as checked.
  useEffect(() => {
    setVisiblePlayers((prev) => {
      const updated = { ...prev };
      allPlayerNames.forEach((name) => {
        if (!(name in updated)) {
          updated[name] = true;
        }
      });
      return updated;
    });
  }, [allPlayerNames]);

  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // Convert selected split title to number if applicable
  const selectedSplitNumber =
    selectedSplitTitle === 'No Split'
      ? null
      : Number(selectedSplitTitle.replace('Split ', ''));

  // Build raw data arrays for each chart
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  // Helper to get the correct metric value from session-level or split-level metrics.
  const getMetricValue = (playerItem, metricName) => {
    if (selectedSplitNumber === null) {
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    } else {
      const foundSplit = playerItem.splitPlayerMetrics?.find(
        (sp) => sp.SplitNumber === selectedSplitNumber
      );
      if (!foundSplit) return NaN;
      const foundMetric = foundSplit.SplitMetrics.find(
        (m) => m.MetricName === metricName
      );
      return foundMetric ? Number(foundMetric.Value) : NaN;
    }
  };

  // Populate the data arrays using each player's metrics.
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // Filter out players who are unchecked.
  const filterChartData = (dataArray) => [
    dataArray[0],
    ...dataArray.slice(1).filter(
      (row) =>
        visiblePlayers[row[0]] === true &&
        typeof row[1] === 'number' &&
        !isNaN(row[1])
    ),
  ];

  const filteredDistanceData = filterChartData(distanceData);
  const filteredTopSpeedData = filterChartData(topSpeedData);
  const filteredHSRData = filterChartData(hsrData);
  const filteredSprintData = filterChartData(sprintData);

  // Chart options
  const baseOptions = {
    hAxis: { title: '', slantedText: true, slantedTextAngle: 45 },
    chartArea: { left: 50, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };
  const distanceOptions = { ...baseOptions, title: `Distance (${selectedSplitTitle})`, vAxis: { title: 'Distance (km)' } };
  const topSpeedOptions = { ...baseOptions, title: `Top Speed (${selectedSplitTitle})`, vAxis: { title: 'Speed (m/s)' } };
  const hsrOptions = { ...baseOptions, title: `High Speed Running (${selectedSplitTitle})`, vAxis: { title: 'Distance (km)' } };
  const sprintOptions = { ...baseOptions, title: `Sprinting (${selectedSplitTitle})`, vAxis: { title: 'Distance (km)' } };

  return (
    <div>
      {/* Split selection dropdown */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Select a Split:</label>
        <select value={selectedSplitTitle} onChange={handleSplitChange}>
          {allSplitTitles.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {/* Player checkboxes */}
      <div className="player-checkbox-container">
        {allPlayerNames.map((name) => (
          <label key={name} className="player-checkbox-label">
            <input
              type="checkbox"
              checked={visiblePlayers[name] || false}
              onChange={() => togglePlayerVisibility(name)}
            />
            {name}
          </label>
        ))}
      </div>

      {/* Distance Chart */}
      {filteredDistanceData.length > 1 ? (
        <div className="chart-container">
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredDistanceData}
            options={distanceOptions}
          />
        </div>
      ) : (
        <div className="no-data">No distance data available</div>
      )}

      {/* Top Speed Chart */}
      {filteredTopSpeedData.length > 1 ? (
        <div className="chart-container">
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredTopSpeedData}
            options={topSpeedOptions}
          />
        </div>
      ) : (
        <div className="no-data">No top speed data available</div>
      )}

      {/* High Speed Running Chart */}
      {filteredHSRData.length > 1 ? (
        <div className="chart-container">
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredHSRData}
            options={hsrOptions}
          />
        </div>
      ) : (
        <div className="no-data">No high speed running data available</div>
      )}

      {/* Sprinting Chart */}
      {filteredSprintData.length > 1 ? (
        <div className="chart-container">
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredSprintData}
            options={sprintOptions}
          />
        </div>
      ) : (
        <div className="no-data">No sprinting data available</div>
      )}
    </div>
  );
};

export default SessionCharts;
