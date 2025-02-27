import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionCharts = ({ sessionId }) => {
  const chartRef = useRef(null);
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // Parsed CSV data (array of objects, one per player)
  const playerDataArray = data?.sessionPlayerDataArray || [];

  // Session splits (with title, splitNumber, etc.)
  const splits = data?.splits || [];

  // 1) Build a dropdown array with an "Overall" option plus one entry per split
  const splitsForDropdown = useMemo(() => {
    const result = [{ label: 'Overall', value: null }]; // “No Split”
    splits.forEach((split) => {
      result.push({
        label: split.title,
        value: split.splitNumber,
      });
    });
    return result;
  }, [splits]);

  // 2) Which split is selected?  (null = overall)
  const [selectedSplitNumber, setSelectedSplitNumber] = useState(null);

  // 3) All unique player names (for the checkboxes)
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // 4) Which players are visible? (checkboxes)
  const [visiblePlayers, setVisiblePlayers] = useState({});
  useEffect(() => {
    // Whenever the list of players changes, ensure each is visible by default
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

  // Toggle a player's visibility
  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // 5) Prepare data arrays for each metric
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  // 6) Helper: find the correct metric
  //    - If no split selected => use overall metrics from sessionPlayerMetrics
  //    - Otherwise => use the specific split from splitPlayerMetrics
  const getMetricValue = (playerItem, metricName) => {
    if (selectedSplitNumber === null) {
      // Overall metric
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    } else {
      // Split‑specific metric
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

  // 7) Populate chart arrays
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // 8) Filter out hidden players or invalid data
  const filterChartData = (dataArray) => [
    dataArray[0], // Header row
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

  // 9) Basic chart config
  const baseOptions = {
    hAxis: { title: 'Player', slantedText: true, slantedTextAngle: 45 },
    vAxis: { title: '', minValue: 0 },
    chartArea: { left: 50, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };

  // Show the chosen split’s title in the chart title
  const currentSplitLabel =
    splitsForDropdown.find((opt) => opt.value === selectedSplitNumber)?.label ||
    'Overall';

  const distanceOptions = {
    ...baseOptions,
    title: `Distance`,
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };
  const topSpeedOptions = {
    ...baseOptions,
    title: `Top Speed`,
    vAxis: { title: 'Speed (m/s)', minValue: 0 },
  };
  const hsrOptions = {
    ...baseOptions,
    title: `High Speed Running`,
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };
  const sprintOptions = {
    ...baseOptions,
    title: `Sprinting`,
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };

  // 10) PDF export
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;

      let newImgWidth = pdfWidth;
      let newImgHeight = pdfWidth / ratio;
      if (newImgHeight > pdfHeight) {
        newImgHeight = pdfHeight;
        newImgWidth = pdfHeight * ratio;
      }
      pdf.addImage(imgData, 'PNG', 0, 0, newImgWidth, newImgHeight);
      pdf.save('charts.pdf');
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  // 11) Check if there’s anything to display
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  return (
    <div>
      {/* Top bar: export button (left) and split dropdown (right) */}
      <div className="charts-top-bar" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {hasAnyData && (
            <button className="btn btn-success" onClick={handleExportPDF}>
              Export Charts to PDF
            </button>
          )}
        </div>

        <div>
          {/* Split dropdown (includes “Overall” option) */}
          <label style={{ marginRight: '10px' }}>Select a Split:</label>
          <select
            value={selectedSplitNumber === null ? '' : selectedSplitNumber}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSplitNumber(val === '' ? null : Number(val));
            }}
          >
            {splitsForDropdown.map((option) => (
              <option
                key={option.value === null ? 'No Split' : option.value}
                value={option.value === null ? '' : option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Player Checkboxes */}
      <div className="player-checkbox-container" style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => (
          <label
            key={name}
            style={{ marginRight: '1rem', display: 'inline-block' }}
          >
            <input
              type="checkbox"
              checked={visiblePlayers[name] || false}
              onChange={() => togglePlayerVisibility(name)}
            />
            {name}
          </label>
        ))}
      </div>

      {/* Charts container */}
      <div className="chart-container" ref={chartRef} style={{ marginTop: '2rem' }}>
        {/* Distance Chart */}
        {filteredDistanceData.length > 1 ? (
          <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
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
          <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
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
          <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
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
          <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
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
    </div>
  );
};

export default SessionCharts;
