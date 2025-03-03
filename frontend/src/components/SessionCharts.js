// src/components/SessionCharts.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionCharts = ({ sessionId, dropdownSource = "splits", plays: playsProp }) => {
  const chartRef = useRef(null);
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // Parsed CSV data (array of objects, one per player)
  const playerDataArray = data?.sessionPlayerDataArray || [];

  // For dropdown options, use either the splits array (default) or the provided plays array
  const sourceArray = dropdownSource === "splits" ? (data?.splits || []) : (playsProp || []);

  // Build the dropdown options:
  // - If dropdownSource === "splits", each option shows the split title and uses the splitNumber as value.
  // - If dropdownSource === "plays", each option shows the play title and uses the play title as value.
  const dropdownOptions = useMemo(() => {
    const result = [
      {
        label: dropdownSource === "splits" ? 'Overall' : 'All Titles',
        value: dropdownSource === "splits" ? null : 'All',
      },
    ];
    sourceArray.forEach((item) => {
      if (dropdownSource === "splits") {
        result.push({
          label: item.title, // split title
          value: item.splitNumber,
        });
      } else {
        result.push({
          label: item.title, // play title
          value: item.title,
        });
      }
    });
    return result;
  }, [sourceArray, dropdownSource]);

  // Selected filter value from the dropdown.
  // For splits, it's either null (for overall) or a number; for plays, it's a string.
  const [filterValue, setFilterValue] = useState(dropdownSource === "splits" ? null : 'All');

  // All unique player names (for checkboxes)
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  // Which players are visible?
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

  // Prepare data arrays for each metric
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  // Helper to extract metric value.
  // In "splits" mode, if filterValue is null use overall metrics;
  // otherwise, use the metrics in the matching split.
  // In "plays" mode, we assume each playerItem may have a titleMetrics object mapping play titles to metrics.
  const getMetricValue = (playerItem, metricName) => {
    if (dropdownSource === "splits") {
      if (filterValue === null) {
        const found = playerItem.sessionPlayerMetrics?.find(
          (m) => m.MetricName === metricName
        );
        return found ? Number(found.Value) : NaN;
      } else {
        const foundSplit = playerItem.splitPlayerMetrics?.find(
          (sp) => sp.SplitNumber === filterValue
        );
        if (!foundSplit) return NaN;
        const foundMetric = foundSplit.SplitMetrics.find(
          (m) => m.MetricName === metricName
        );
        return foundMetric ? Number(foundMetric.Value) : NaN;
      }
    } else {
      // "plays" mode
      if (filterValue === 'All') {
        const found = playerItem.sessionPlayerMetrics?.find(
          (m) => m.MetricName === metricName
        );
        return found ? Number(found.Value) : NaN;
      } else {
        // Assume playerItem.titleMetrics is an object: { [title]: [{MetricName, Value, Unit}, ...] }
        if (!playerItem.titleMetrics) return NaN;
        const metricsForTitle = playerItem.titleMetrics[filterValue];
        if (!metricsForTitle) return NaN;
        const foundMetric = metricsForTitle.find(
          (m) => m.MetricName === metricName
        );
        return foundMetric ? Number(foundMetric.Value) : NaN;
      }
    }
  };

  // Populate the chart data arrays
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // Filter out hidden players
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

  // Basic chart configuration
  const baseOptions = {
    hAxis: { title: 'Player', slantedText: true, slantedTextAngle: 45 },
    vAxis: { title: '', minValue: 0 },
    chartArea: { left: 50, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };

  // Get the label for the current filter from the dropdown options.
  const currentFilterLabel =
    dropdownOptions.find((opt) => opt.value === filterValue)?.label ||
    (dropdownSource === "splits" ? 'Overall' : 'All Titles');

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

  // PDF export for current charts
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

  // PDF export: Export charts for every value from the dropdown (excluding overall)
  const handleExportAllValuesPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const optionsToExport = dropdownOptions.filter(
        (opt) => opt.value !== (dropdownSource === "splits" ? null : 'All')
      );

      for (let i = 0; i < optionsToExport.length; i++) {
        setFilterValue(optionsToExport[i].value);
        // Wait for charts to update (adjust delay as needed)
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
        pdf.text(`Charts for ${optionsToExport[i].label}`, 40, 40);
        pdf.addImage(imgData, 'PNG', 0, 50, newImgWidth, newImgHeight);
      }
      pdf.save('all_values_charts.pdf');
      // Reset filterValue to default (Overall or All Titles)
      setFilterValue(dropdownSource === "splits" ? null : 'All');
    } catch (err) {
      console.error('Error exporting all values PDF:', err);
    }
  };

  // Check if any chart data is available
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  return (
    <div>
      {/* Top bar: two buttons for PDF export and a dropdown for filter selection */}
      <div className="charts-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {hasAnyData && (
            <>
              <button className="btn btn-success" onClick={handleExportPDF}>
                Export Current Charts to PDF
              </button>
              <button className="btn btn-warning" onClick={handleExportAllValuesPDF} style={{ marginLeft: '10px' }}>
                Export All {dropdownSource === "splits" ? 'Splits' : 'Titles'} Charts to PDF
              </button>
            </>
          )}
        </div>
        <div>
          <label style={{ marginRight: '10px' }}>
            Select a {dropdownSource === "splits" ? 'Split' : 'Title'}:
          </label>
          <select
            value={filterValue === null ? '' : filterValue}
            onChange={(e) => {
              const val = e.target.value;
              setFilterValue(val === '' ? (dropdownSource === "splits" ? null : 'All') : (dropdownSource === "splits" ? Number(val) : val));
            }}
          >
            {dropdownOptions.map((option) => (
              <option key={option.value === null ? 'No Value' : option.value} value={option.value === null ? '' : option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Player Checkboxes */}
      <div className="player-checkbox-container" style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => (
          <label key={name} style={{ marginRight: '1rem', display: 'inline-block' }}>
            <input type="checkbox" checked={visiblePlayers[name] || false} onChange={() => togglePlayerVisibility(name)} />
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
