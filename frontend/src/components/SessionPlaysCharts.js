import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionPlaysCharts = ({ sessionId }) => {
  const chartRef = useRef(null);
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // Get CSV player data and plays from the fetched data.
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // Build dropdown options from plays data.
  // The first option is "All" (represented by the string "All"),
  // followed by each play's title.
  const dropdownOptions = useMemo(() => {
    const result = [{ label: 'All Plays', value: 'All' }];
    playsArray.forEach((play) => {
      result.push({
        label: play.title,
        value: play.title, // or play.playNumber if you prefer numeric values
      });
    });
    return result;
  }, [playsArray]);

  // For plays, filterValue is 'All' or the play’s title.
  const [filterValue, setFilterValue] = useState('All');

  // Gather all unique player names.
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // Control which players are visible.
  const [visiblePlayers, setVisiblePlayers] = useState({});
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

  // Prepare data arrays for each metric.
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  /**
   * Helper to extract metric value from each player's data.
   * 
   * We assume that:
   *   - "filterValue === 'All'" => use overall metrics from sessionPlayerMetrics
   *   - otherwise => use the array in playerItem.titleMetrics[filterValue]
   *     (i.e. the metrics for the specific play title).
   * 
   * Adjust this logic if your data structure differs (e.g., if you store
   * play metrics in a different property name).
   */
  const getMetricValue = (playerItem, metricName) => {
    // If 'All', use overall metrics
    if (filterValue === 'All') {
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    }

    // Otherwise, look up the metrics for the specific play
    if (!playerItem.titleMetrics || !playerItem.titleMetrics[filterValue]) {
      return NaN;
    }
    const metricsForPlay = playerItem.titleMetrics[filterValue];
    if (!metricsForPlay) return NaN;

    const foundMetric = metricsForPlay.find(
      (m) => m.MetricName === metricName
    );
    return foundMetric ? Number(foundMetric.Value) : NaN;
  };

  // Populate chart data arrays for each player.
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // Filter out rows for players that are not visible or where the value is invalid.
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

  // Basic chart configuration.
  const baseOptions = {
    hAxis: { title: 'Player', slantedText: true, slantedTextAngle: 45 },
    vAxis: { title: '', minValue: 0 },
    chartArea: { left: 50, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };

  const distanceOptions = {
    ...baseOptions,
    title: 'Distance',
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };
  const topSpeedOptions = {
    ...baseOptions,
    title: 'Top Speed',
    vAxis: { title: 'Speed (m/s)', minValue: 0 },
  };
  const hsrOptions = {
    ...baseOptions,
    title: 'High Speed Running',
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };
  const sprintOptions = {
    ...baseOptions,
    title: 'Sprinting',
    vAxis: { title: 'Distance (km)', minValue: 0 },
  };

  // PDF export for the currently displayed charts.
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

  // PDF export: Export charts for each play (excluding the "All" option).
  const handleExportAllValuesPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Exclude the "All" option.
      const optionsToExport = dropdownOptions.filter((opt) => opt.value !== 'All');

      for (let i = 0; i < optionsToExport.length; i++) {
        setFilterValue(optionsToExport[i].value);
        // Allow charts time to update.
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
      // Reset filterValue to "All".
      setFilterValue('All');
    } catch (err) {
      console.error('Error exporting all values PDF:', err);
    }
  };

  // Determine if there is any data for the current filter.
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
        <div>
          <label style={{ marginRight: '10px' }}>Select a Play:</label>
          <select
            value={filterValue}
            onChange={(e) => {
              const val = e.target.value;
              setFilterValue(val);
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
