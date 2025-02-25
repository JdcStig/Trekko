import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionCharts = ({ sessionId }) => {
  // All hooks are called at the top:
  const chartRef = useRef(null);
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  const playerDataArray = data?.sessionPlayerDataArray || [];
  const splits = data?.splits || [];

  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

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

  const [selectedSplitTitle, setSelectedSplitTitle] = useState('No Split');
  const handleSplitChange = (e) => setSelectedSplitTitle(e.target.value);

  const [visiblePlayers, setVisiblePlayers] = useState(() => {
    const init = {};
    allPlayerNames.forEach((name) => {
      init[name] = true;
    });
    return init;
  });
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

  // Conditional returns (after all hooks have been declared)
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  const selectedSplitNumber =
    selectedSplitTitle === 'No Split'
      ? null
      : Number(selectedSplitTitle.replace('Split ', ''));

  // Build raw data arrays for each chart
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

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

  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

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

  const baseOptions = {
    hAxis: { title: '', slantedText: true, slantedTextAngle: 45 },
    chartArea: { left: 50, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };
  const distanceOptions = { ...baseOptions, title: `Distance`, vAxis: { title: 'Distance (km)' } };
  const topSpeedOptions = { ...baseOptions, title: `Top Speed`, vAxis: { title: 'Speed (m/s)' } };
  const hsrOptions = { ...baseOptions, title: `High Speed Running`, vAxis: { title: 'Distance (km)' } };
  const sprintOptions = { ...baseOptions, title: `Sprinting`, vAxis: { title: 'Distance (km)' } };

  // PDF Export Logic
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

  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  return (
    <div>
      {/* Split Selection */}
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

      {/* Player Checkboxes */}
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

      {/* Chart Container for PDF Export */}
      <div ref={chartRef}>
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

      {/* Export PDF Button */}
      {hasAnyData && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="btn btn-success" onClick={handleExportPDF}>
            Export Charts to PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionCharts;
