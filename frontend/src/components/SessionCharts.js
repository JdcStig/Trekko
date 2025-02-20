// import React, { useState, useEffect, useMemo } from 'react';
// import { Chart } from 'react-google-charts';
// import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';

// const SessionCharts = ({ sessionId }) => {
//   // ------------------ 1) Fetch Data ------------------
//   const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

//   // ------------------ 2) Define Hooks at Top ------------------
//   // Safely handle the array of player data
//   const playerDataArray = data?.sessionPlayerDataArray || [];

//   // Build a unique list of all player names
//   const allPlayerNames = useMemo(() => {
//     return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
//   }, [playerDataArray]);

//   // Build a unique list of all SplitNumbers found in splitPlayerMetrics
//   // plus "No Split" as the default
//   const allSplitNumbers = useMemo(() => {
//     const numbers = new Set();
//     playerDataArray.forEach((player) => {
//       player.splitPlayerMetrics?.forEach((sp) => {
//         numbers.add(sp.SplitNumber);
//       });
//     });
//     const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);
//     // We'll store them as strings so we can have "No Split" as well
//     return ['No Split', ...sortedNumbers.map(String)];
//   }, [playerDataArray]);

//   // State: which split is selected? Default to "No Split"
//   const [selectedSplitNumber, setSelectedSplitNumber] = useState('No Split');

//   // Handle user picking a different split from the dropdown
//   const handleSplitChange = (e) => {
//     setSelectedSplitNumber(e.target.value);
//   };

//   // Which players are visible? Start them all as true
//   const [visiblePlayers, setVisiblePlayers] = useState({});

//   // Whenever the player list changes, reset all to visible
//   useEffect(() => {
//     const init = {};
//     allPlayerNames.forEach((name) => {
//       init[name] = true;
//     });
//     setVisiblePlayers(init);
//   }, [allPlayerNames]);

//   // Toggling a single player's visibility
//   const togglePlayerVisibility = (playerName) => {
//     setVisiblePlayers((prev) => ({
//       ...prev,
//       [playerName]: !prev[playerName],
//     }));
//   };

//   // ------------------ 3) Early Returns After Hooks ------------------
//   if (isLoading) return <p>Loading chart data...</p>;
//   if (error) return <p>Error loading chart data.</p>;

//   // ------------------ 4) Build Raw Data Arrays ------------------
//   // We'll read from either sessionPlayerMetrics (if "No Split")
//   // or from the chosen split in splitPlayerMetrics (if user picks a number).
//   const distanceData = [['Player', 'Distance (km)']];
//   const topSpeedData = [['Player', 'Top Speed (m/s)']];
//   const hsrData = [['Player', 'High Speed Running (km)']];
//   const sprintData = [['Player', 'Sprinting (km)']];

//   // Helper to fetch the correct metric value from either session or a chosen split
//   const getMetricValue = (playerItem, metricName) => {
//     if (selectedSplitNumber === 'No Split') {
//       // Use sessionPlayerMetrics
//       const found = playerItem.sessionPlayerMetrics?.find(
//         (m) => m.MetricName === metricName
//       );
//       return found ? Number(found.Value) : NaN;
//     } else {
//       // Use splitPlayerMetrics
//       const splitNum = Number(selectedSplitNumber); // convert string to number
//       const foundSplit = playerItem.splitPlayerMetrics?.find(
//         (sp) => sp.SplitNumber === splitNum
//       );
//       if (!foundSplit) return NaN;
//       const foundMetric = foundSplit.SplitMetrics.find(
//         (m) => m.MetricName === metricName
//       );
//       return foundMetric ? Number(foundMetric.Value) : NaN;
//     }
//   };

//   // For each player, push the relevant metric values
//   playerDataArray.forEach((player) => {
//     distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
//     topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
//     hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
//     sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
//   });

//   // ------------------ 5) Filter Data by Visible Players ------------------
//   const filterChartData = (dataArray) => {
//     return [
//       dataArray[0],
//       ...dataArray.slice(1).filter(
//         (row) =>
//           visiblePlayers[row[0]] &&
//           typeof row[1] === 'number' &&
//           !isNaN(row[1])
//       ),
//     ];
//   };

//   const filteredDistanceData = filterChartData(distanceData);
//   const filteredTopSpeedData = filterChartData(topSpeedData);
//   const filteredHSRData = filterChartData(hsrData);
//   const filteredSprintData = filterChartData(sprintData);

//   // ------------------ 6) Chart Options ------------------
//   const baseOptions = {
//     hAxis: {
//       title: '',
//       slantedText: true,
//       slantedTextAngle: 45,
//     },
//     chartArea: {
//       left: 50,
//       top: 50,
//       bottom: 100,
//       right: 20,
//     },
//     legend: { position: 'none' },
//   };

//   const distanceOptions = {
//     ...baseOptions,
//     title: `Distance (${selectedSplitNumber})`,
//     vAxis: { title: 'Distance (km)' },
//   };

//   const topSpeedOptions = {
//     ...baseOptions,
//     title: `Top Speed (${selectedSplitNumber})`,
//     vAxis: { title: 'Speed (m/s)' },
//   };

//   const hsrOptions = {
//     ...baseOptions,
//     title: `High Speed Running (${selectedSplitNumber})`,
//     vAxis: { title: 'Distance (km)' },
//   };

//   const sprintOptions = {
//     ...baseOptions,
//     title: `Sprinting (${selectedSplitNumber})`,
//     vAxis: { title: 'Distance (km)' },
//   };

//   // ------------------ 7) Render ------------------
//   return (
//     <div>
//       {/* --- Dropdown for splits (including "No Split") --- */}
//       <div style={{ marginBottom: '20px', textAlign: 'center' }}>
//         <label style={{ marginRight: '10px' }}>Select a Split:</label>
//         <select value={selectedSplitNumber} onChange={handleSplitChange}>
//           {allSplitNumbers.map((splitStr) => (
//             <option key={splitStr} value={splitStr}>
//               {splitStr}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* --- Player Checkboxes --- */}
//       <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
//         {allPlayerNames.map((name) => (
//           <label key={name} style={{ marginRight: '10px' }}>
//             <input
//               type="checkbox"
//               checked={visiblePlayers[name] || false}
//               onChange={() => togglePlayerVisibility(name)}
//             />
//             {name}
//           </label>
//         ))}
//       </div>

//       {/* ---- DISTANCE CHART ---- */}
//       {filteredDistanceData.length > 1 ? (
//         <div style={{ marginTop: '20px' }}>
//           <Chart
//             chartType="ColumnChart"
//             width="100%"
//             height="400px"
//             data={filteredDistanceData}
//             options={distanceOptions}
//           />
//         </div>
//       ) : (
//         <div>No distance data available</div>
//       )}

//       {/* ---- TOP SPEED CHART ---- */}
//       {filteredTopSpeedData.length > 1 ? (
//         <div style={{ marginTop: '20px' }}>
//           <Chart
//             chartType="ColumnChart"
//             width="100%"
//             height="400px"
//             data={filteredTopSpeedData}
//             options={topSpeedOptions}
//           />
//         </div>
//       ) : (
//         <div>No top speed data available</div>
//       )}

//       {/* ---- HIGH SPEED RUNNING CHART ---- */}
//       {filteredHSRData.length > 1 ? (
//         <div style={{ marginTop: '20px' }}>
//           <Chart
//             chartType="ColumnChart"
//             width="100%"
//             height="400px"
//             data={filteredHSRData}
//             options={hsrOptions}
//           />
//         </div>
//       ) : (
//         <div>No high speed running data available</div>
//       )}

//       {/* ---- SPRINTING CHART ---- */}
//       {filteredSprintData.length > 1 ? (
//         <div style={{ marginTop: '20px' }}>
//           <Chart
//             chartType="ColumnChart"
//             width="100%"
//             height="400px"
//             data={filteredSprintData}
//             options={sprintOptions}
//           />
//         </div>
//       ) : (
//         <div>No sprinting data available</div>
//       )}
//     </div>
//   );
// };

// export default SessionCharts;
import React, { useState, useEffect, useMemo } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';

const SessionCharts = ({ sessionId }) => {
  // ------------------ All Hooks MUST be called at the top ------------------
  // 1. Fetch data
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // 2. Safely extract arrays (even if data is not ready)
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const splits = data?.splits || [];

  // 3. Build a unique list of all player names
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // 4. Build a list of split titles from the players’ splitPlayerMetrics.
  //    We assume each player has splitPlayerMetrics with a SplitNumber and
  //    we map that to a title. If your splits array is not reliable,
  //    you can instead build this list from player data.
  const allSplitTitles = useMemo(() => {
    // Collect split numbers from all players
    const splitNumbers = new Set();
    playerDataArray.forEach((player) => {
      player.splitPlayerMetrics?.forEach((sp) => {
        splitNumbers.add(sp.SplitNumber);
      });
    });
    // For display, you might want to label them "Split 1", "Split 2", etc.
    const titles = Array.from(splitNumbers)
      .sort((a, b) => a - b)
      .map((num) => `Split ${num}`);
    return ['No Split', ...titles];
  }, [playerDataArray]);

  // 5. State: which split is selected? Default to "No Split"
  const [selectedSplitTitle, setSelectedSplitTitle] = useState('No Split');

  // Handler for when the dropdown changes
  const handleSplitChange = (e) => {
    setSelectedSplitTitle(e.target.value);
  };

  // 6. State for which players are visible; default all to true.
  const [visiblePlayers, setVisiblePlayers] = useState(() => {
    const init = {};
    allPlayerNames.forEach((name) => {
      init[name] = true;
    });
    return init;
  });

  // Reinitialize visiblePlayers whenever the player list changes.
  useEffect(() => {
    const init = {};
    allPlayerNames.forEach((name) => {
      init[name] = true;
    });
    setVisiblePlayers(init);
  }, [allPlayerNames]);

  // Toggle function for a given player's checkbox
  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // ------------------ End Hook Definitions ------------------

  // 7. Now perform early returns for loading or error
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // 8. Helper: convert selected split title to a number.
  //    If "No Split" is selected, we use session-level metrics.
  const selectedSplitNumber =
    selectedSplitTitle === 'No Split'
      ? null
      : Number(selectedSplitTitle.replace('Split ', ''));

  // 9. Build raw data arrays for each chart.
  //    - If no split is selected ("No Split"), we use sessionPlayerMetrics.
  //    - Otherwise, we use the chosen split's SplitMetrics.
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  // Helper to get a metric value from a player item:
  //   - If selectedSplitNumber is null, return value from sessionPlayerMetrics.
  //   - Otherwise, find the player's splitPlayerMetrics for that split.
  const getMetricValue = (playerItem, metricName) => {
    if (selectedSplitNumber === null) {
      // Use session-level metrics
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    } else {
      // Use split-level metrics
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

  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // 10. Filter out rows for players who are unchecked
  const filterChartData = (dataArray) => {
    return [
      dataArray[0],
      ...dataArray.slice(1).filter(
        (row) =>
          visiblePlayers[row[0]] === true &&
          typeof row[1] === 'number' &&
          !isNaN(row[1])
      ),
    ];
  };

  const filteredDistanceData = filterChartData(distanceData);
  const filteredTopSpeedData = filterChartData(topSpeedData);
  const filteredHSRData = filterChartData(hsrData);
  const filteredSprintData = filterChartData(sprintData);

  // 11. Define chart options
  const baseOptions = {
    hAxis: {
      title: '',
      slantedText: true,
      slantedTextAngle: 45,
    },
    chartArea: {
      left: 50,
      top: 50,
      bottom: 100,
      right: 20,
    },
    legend: { position: 'none' },
  };

  const distanceOptions = {
    ...baseOptions,
    title: `Distance (${selectedSplitTitle})`,
    vAxis: { title: 'Distance (km)' },
  };

  const topSpeedOptions = {
    ...baseOptions,
    title: `Top Speed (${selectedSplitTitle})`,
    vAxis: { title: 'Speed (m/s)' },
  };

  const hsrOptions = {
    ...baseOptions,
    title: `High Speed Running (${selectedSplitTitle})`,
    vAxis: { title: 'Distance (km)' },
  };

  const sprintOptions = {
    ...baseOptions,
    title: `Sprinting (${selectedSplitTitle})`,
    vAxis: { title: 'Distance (km)' },
  };

  // 12. Render
  return (
    <div>
      {/* Dropdown for Splits */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label style={{ marginRight: '10px' }}>Select a Split:</label>
        <select value={selectedSplitTitle} onChange={handleSplitChange}>
          {allSplitTitles.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {/* Player Visibility Checkboxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
        {allPlayerNames.map((name) => (
          <label key={name} style={{ marginRight: '10px' }}>
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
        <div style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredDistanceData}
            options={distanceOptions}
          />
        </div>
      ) : (
        <div>No distance data available</div>
      )}

      {/* Top Speed Chart */}
      {filteredTopSpeedData.length > 1 ? (
        <div style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredTopSpeedData}
            options={topSpeedOptions}
          />
        </div>
      ) : (
        <div>No top speed data available</div>
      )}

      {/* High Speed Running Chart */}
      {filteredHSRData.length > 1 ? (
        <div style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredHSRData}
            options={hsrOptions}
          />
        </div>
      ) : (
        <div>No high speed running data available</div>
      )}

      {/* Sprinting Chart */}
      {filteredSprintData.length > 1 ? (
        <div style={{ marginTop: '20px' }}>
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="400px"
            data={filteredSprintData}
            options={sprintOptions}
          />
        </div>
      ) : (
        <div>No sprinting data available</div>
      )}
    </div>
  );
};

export default SessionCharts;
