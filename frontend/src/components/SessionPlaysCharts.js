import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionPlaysCharts = ({ sessionId }) => {
  const chartRef = useRef(null);
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // 1) Extract the relevant arrays from the fetched data
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // 2) Build dropdown options. The first option is “Overall” => 'All'
  //    Then each play => label “Play X” and value is the numeric playNumber.
  const dropdownOptions = useMemo(() => {
    const result = [{ label: 'Overall', value: 'All' }];
    playsArray.forEach((play) => {
      result.push({
        label: `Play ${play.playNumber}`,
        value: play.playNumber,
      });
    });
    return result;
  }, [playsArray]);

  // 3) filterValue is either 'All' or a numeric playNumber
  const [filterValue, setFilterValue] = useState('All');

  // 4) Gather all unique player names (for the show/hide checkboxes)
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // 5) Maintain which players are visible
  const [visiblePlayers, setVisiblePlayers] = useState({});
  useEffect(() => {
    const newVisibility = {};
    allPlayerNames.forEach((name) => {
      newVisibility[name] = true; // default: all visible
    });
    setVisiblePlayers(newVisibility);
  }, [allPlayerNames]);

  // Toggle a single player’s visibility
  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // 6) Loading and error states
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // 7) Prepare data arrays for each metric
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  /**
   * getMetricValue:
   *  - If "Overall", read from sessionPlayerMetrics
   *  - Otherwise, find the matching playNumber in playPlayerMetrics
   */
  const getMetricValue = (playerItem, metricName) => {
    // If user selected "Overall", read from sessionPlayerMetrics
    if (filterValue === 'All') {
      const foundOverall = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return foundOverall ? Number(foundOverall.Value) : NaN;
    }

    // Otherwise, filterValue is a numeric playNumber
    const playNumber = filterValue;
    const foundPlay = playerItem.playPlayerMetrics?.find(
      (pm) => pm.PlayNumber === playNumber
    );
    if (!foundPlay) return NaN;

    const foundMetric = foundPlay.PlayMetrics.find(
      (m) => m.MetricName === metricName
    );
    return foundMetric ? Number(foundMetric.Value) : NaN;
  };

  // 8) Populate chart data arrays for each player
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([
      player.playerName,
      getMetricValue(player, 'HighSpeedRunning'),
    ]);
    sprintData.push([
      player.playerName,
      getMetricValue(player, 'Sprinting'),
    ]);
  });

  // 9) Filter out players that are hidden or invalid data
  const filterChartData = (dataArray) => [
    dataArray[0], // header row
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

  // 10) Base chart configuration:
  //     - Force the chart to start at 0 (no negative axis)
  //     - Auto-scale the top end
  //     - Increase left margin to avoid truncating labels
  //     - Use a custom number format so short decimals don't get ellipses
  const baseOptions = {
    hAxis: {
      title: 'Player',
      slantedText: true,
      slantedTextAngle: 45,
      textStyle: { fontSize: 12 },
    },
    vAxis: {
      viewWindowMode: 'explicit',
      viewWindow: { min: 0 },
      format: '0.###', // up to 3 decimals
      textStyle: { fontSize: 12 },
      titleTextStyle: { fontSize: 12 },
    },
    chartArea: {
      left: 80,
      top: 50,
      bottom: 100,
      right: 20,
      // width: '80%', // optional if you want to further adjust
    },
    legend: { position: 'none' },
  };

  // Specialized chart options for each metric
  const distanceOptions = {
    ...baseOptions,
    title: 'Distance',
    vAxis: {
      ...baseOptions.vAxis,
      title: 'Distance (km)',
    },
  };
  const topSpeedOptions = {
    ...baseOptions,
    title: 'Top Speed',
    vAxis: {
      ...baseOptions.vAxis,
      title: 'Speed (m/s)',
    },
  };
  const hsrOptions = {
    ...baseOptions,
    title: 'High Speed Running',
    vAxis: {
      ...baseOptions.vAxis,
      title: 'Distance (km)',
    },
  };
  const sprintOptions = {
    ...baseOptions,
    title: 'Sprinting',
    vAxis: {
      ...baseOptions.vAxis,
      title: 'Distance (km)',
    },
  };

  // 11) PDF export for the currently displayed charts
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

  // 12) PDF export for each play (excluding "Overall")
  const handleExportAllValuesPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const optionsToExport = dropdownOptions.filter((opt) => opt.value !== 'All');

      for (let i = 0; i < optionsToExport.length; i++) {
        setFilterValue(optionsToExport[i].value);
        // allow charts time to update
        await new Promise((resolve) => setTimeout(resolve, 500));

        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        let newImgWidth = pdfWidth;
        let newImgHeight = pdfWidth / ratio;
        if (newImgHeight > pdfHeight) {
          newImgHeight = pdfHeight;
          newImgWidth = pdfHeight * ratio;
        }
        if (i > 0) {
          pdf.addPage();
        }
        pdf.text(`Charts for Play: ${optionsToExport[i].label}`, 40, 40);
        pdf.addImage(imgData, 'PNG', 0, 50, newImgWidth, newImgHeight);
      }
      pdf.save('all_plays_charts.pdf');
      // Reset filterValue to 'All'
      setFilterValue('All');
    } catch (err) {
      console.error('Error exporting all values PDF:', err);
    }
  };

  // 13) Determine if there is any data for the current filter
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  return (
    <div>
      {/* Top bar: PDF export buttons and dropdown for plays */}
      <div
        className="charts-top-bar"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          {hasAnyData && (
            <>
              <button className="btn btn-success" onClick={handleExportPDF}>
                Export Current Charts to PDF
              </button>
              <button
                className="btn btn-warning"
                onClick={handleExportAllValuesPDF}
                style={{ marginLeft: '10px' }}
              >
                Export All Plays Charts to PDF
              </button>
            </>
          )}
        </div>

        {/* The dropdown to select Overall or a specific play */}
        <div>
          <label style={{ marginRight: '10px' }}>Select a Play:</label>
          <select
            value={filterValue}
            onChange={(e) => {
              const val = e.target.value;
              setFilterValue(val === 'All' ? 'All' : Number(val));
            }}
          >
            {dropdownOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Player visibility checkboxes */}
      <div className="player-checkbox-container" style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => (
          <label key={name} style={{ marginRight: '1rem', display: 'inline-block' }}>
            <input
              type="checkbox"
              checked={visiblePlayers[name] || false}
              onChange={() => togglePlayerVisibility(name)}
            />
            {name}
          </label>
        ))}
      </div>

      {/* Chart container */}
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

export default SessionPlaysCharts;
