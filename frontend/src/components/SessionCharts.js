// src/components/SessionCharts.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const METRIC_KEYS = ['Distance', 'TopSpeed', 'HighSpeedRunning', 'Sprinting'];

function SessionCharts({
  sessionId,
  sessionName,
  sessionDate,
  sessionType,
  teamName,
}) {
  const chartRef = useRef(null);
  const allChartsRef = useRef(null);

  // -----------------------------
  // 1) State
  // -----------------------------
  const [showAllCharts, setShowAllCharts] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingCurrent, setExportingCurrent] = useState(false);
  const [chartImages, setChartImages] = useState({}); // { [splitValue]: { [metricKey]: URI } }
  const [exportStatus, setExportStatus] = useState([]);
  // Default filter: "All" means overall; otherwise a split number.
  const [filterValue, setFilterValue] = useState('All');
  const [visiblePlayers, setVisiblePlayers] = useState({});

  // -----------------------------
  // 2) Data Fetch
  // -----------------------------
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const splitsArray = data?.splits || [];

  // -----------------------------
  // 3) Build Dropdown Options (Overall + each split)
  // -----------------------------
  const dropdownOptions = useMemo(() => {
    const opts = [{ label: 'Overall', value: 'All' }];
    splitsArray.forEach((split) => {
      opts.push({ label: split.title, value: split.splitNumber });
    });
    return opts;
  }, [splitsArray]);

  // -----------------------------
  // 4) Player Names & Visibility
  // -----------------------------
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  useEffect(() => {
    if (!isLoading && allPlayerNames.length > 0) {
      const initial = {};
      allPlayerNames.forEach((name) => {
        initial[name] = true;
      });
      setVisiblePlayers(initial);
    }
  }, [isLoading, allPlayerNames]);

  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // -----------------------------
  // 5) PDF Generation for ALL Splits
  // -----------------------------
  const generateAllSplitsPDF = useCallback(() => {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // For each dropdown option, render the corresponding charts.
    dropdownOptions.forEach((splitObj) => {
      const splitVal = splitObj.value;
      const label = splitObj.label;
      const imagesForSplit = chartImages[splitVal];
      if (!imagesForSplit) return;

      // Group metrics into groups of 3
      const groups = [];
      for (let i = 0; i < METRIC_KEYS.length; i += 3) {
        groups.push(METRIC_KEYS.slice(i, i + 3));
      }

      groups.forEach((group) => {
        // Page heading
        pdf.setFontSize(16);
        pdf.text(`${label} - ${group.join(' / ')}`, pdfWidth / 2, 30, {
          align: 'center',
        });

        // Layout for stacked charts (3 per page or fewer if last group)
        const margin = 20;
        const headerHeight = 40;
        const gap = 10;
        const numCharts = group.length;
        const availableHeight = pdfHeight - headerHeight - margin - (numCharts - 1) * gap;
        const chartHeight = availableHeight / numCharts;
        const chartWidth = pdfWidth - margin * 2;

        group.forEach((metric, idx) => {
          const uri = imagesForSplit[metric];
          if (!uri) return;
          const yPos = headerHeight + idx * (chartHeight + gap);
          pdf.addImage(uri, 'PNG', margin, yPos, chartWidth, chartHeight);
        });
        pdf.addPage();
      });
    });

    // Remove trailing blank page if exists
    if (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }
    pdf.save(`${sessionName || 'Session'}_splits.pdf`);
    setShowAllCharts(false);
    setExportingAll(false);
    setChartImages({});
    setExportStatus((prev) => [...prev, 'PDF export complete.']);
  }, [chartImages, dropdownOptions, sessionName, sessionDate, sessionType, teamName]);

  // -----------------------------
  // 6) Monitor Hidden Charts Readiness for PDF Export
  // -----------------------------
  useEffect(() => {
    if (!showAllCharts) return;
    const allReady = dropdownOptions.every((opt) => {
      const val = opt.value;
      if (!chartImages[val]) return false;
      return METRIC_KEYS.every((key) => chartImages[val][key]);
    });
    if (allReady) {
      generateAllSplitsPDF();
    }
  }, [showAllCharts, dropdownOptions, chartImages, generateAllSplitsPDF]);

  // -----------------------------
  // 7) Early Returns for Loading/Error
  // -----------------------------
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // -----------------------------
  // 8) Build Data Arrays for Current Filter
  // -----------------------------
  const distanceDataArr = [['Player', 'Distance (km)']];
  const topSpeedDataArr = [['Player', 'Top Speed (m/s)']];
  const hsrDataArr = [['Player', 'High Speed Running (km)']];
  const sprintDataArr = [['Player', 'Sprinting (km)']];

  // Helper: extract metric value from a player's data.
  const getMetricValue = (playerItem, metricName) => {
    if (filterValue === 'All') {
      // Overall value from sessionPlayerMetrics
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    } else {
      // Use the splitPlayerMetrics for the selected split
      const foundSplit = playerItem.splitPlayerMetrics?.find(
        (sp) => sp.SplitNumber === filterValue
      );
      if (!foundSplit) return NaN;
      const foundMetric = foundSplit.SplitMetrics.find(
        (m) => m.MetricName === metricName
      );
      return foundMetric ? Number(foundMetric.Value) : NaN;
    }
  };

  playerDataArray.forEach((p) => {
    distanceDataArr.push([p.playerName, getMetricValue(p, 'Distance')]);
    topSpeedDataArr.push([p.playerName, getMetricValue(p, 'TopSpeed')]);
    hsrDataArr.push([p.playerName, getMetricValue(p, 'HighSpeedRunning')]);
    sprintDataArr.push([p.playerName, getMetricValue(p, 'Sprinting')]);
  });

  const filterChartData = (arr) => [
    arr[0],
    ...arr.slice(1).filter(
      (row) =>
        visiblePlayers[row[0]] &&
        typeof row[1] === 'number' &&
        !isNaN(row[1])
    ),
  ];

  const filteredDistanceData = filterChartData(distanceDataArr);
  const filteredTopSpeedData = filterChartData(topSpeedDataArr);
  const filteredHSRData = filterChartData(hsrDataArr);
  const filteredSprintData = filterChartData(sprintDataArr);

  // -----------------------------
  // 9) Chart Options
  // -----------------------------
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
      format: '0.###',
      textStyle: { fontSize: 12 },
      titleTextStyle: { fontSize: 12 },
    },
    chartArea: { left: 80, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };

  const distanceOptions = {
    ...baseOptions,
    title: 'Distance',
    vAxis: { ...baseOptions.vAxis, title: 'Distance (km)' },
  };
  const topSpeedOptions = {
    ...baseOptions,
    title: 'Top Speed',
    vAxis: { ...baseOptions.vAxis, title: 'Speed (m/s)' },
  };
  const hsrOptions = {
    ...baseOptions,
    title: 'High Speed Running',
    vAxis: { ...baseOptions.vAxis, title: 'Distance (km)' },
  };
  const sprintOptions = {
    ...baseOptions,
    title: 'Sprinting',
    vAxis: { ...baseOptions.vAxis, title: 'Distance (km)' },
  };

  // -----------------------------
  // 10) Export Current Charts to PDF
  // -----------------------------
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExportingCurrent(true);
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
      pdf.save(`${sessionName || 'Session'}_current_charts.pdf`);
    } catch (err) {
      console.error('Error exporting current charts PDF:', err);
    } finally {
      setExportingCurrent(false);
    }
  };

  // -----------------------------
  // 11) Export ALL Charts (Hidden Container)
  // -----------------------------
  const handleExportAllValuesPDF = () => {
    setChartImages({});
    setExportStatus([]);
    setShowAllCharts(true);
    setExportingAll(true);
    setExportStatus((prev) => [...prev, 'Preparing all charts...']);
  };

  // -----------------------------
  // 12) Chart Ready Callback & Events
  // -----------------------------
  const handleChartReady = (splitVal, metricKey, chartWrapper) => {
    if (!chartWrapper || !chartWrapper.getChart) return;
    const uri = chartWrapper.getChart().getImageURI();
    setChartImages((prev) => ({
      ...prev,
      [splitVal]: {
        ...prev[splitVal],
        [metricKey]: uri,
      },
    }));
    setExportStatus((prev) => [...prev]);
  };

  const generateChartEvents = (splitVal, metricKey) => [
    {
      eventName: 'ready',
      callback: ({ chartWrapper }) => {
        handleChartReady(splitVal, metricKey, chartWrapper);
      },
    },
  ];

  // -----------------------------
  // 13) Toggle Player Visibility
  // -----------------------------
  const toggleVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // -----------------------------
  // 14) Data Check
  // -----------------------------
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  // -----------------------------
  // 15) Render
  // -----------------------------
  return (
    <div>
      {/* Show "Please Wait..." + status messages if exporting */}
      {(exportingAll || exportingCurrent) && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 'bold', color: 'blue' }}>Please Wait...</div>
          {exportStatus.map((msg, idx) => (
            <p key={idx} style={{ fontSize: '0.9rem', margin: '2px 0' }}>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Top Bar: Export Buttons & Dropdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          {hasAnyData && (
            <>
              <button onClick={handleExportPDF} className="btn btn-success">
                Export Current Charts to PDF
              </button>
              <button
                onClick={handleExportAllValuesPDF}
                className="btn btn-warning"
                style={{ marginLeft: '10px' }}
              >
                Export All Splits Charts to PDF
              </button>
            </>
          )}
        </div>
        <div>
          <label style={{ marginRight: '10px' }}>Select a Split:</label>
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

      {/* Player Visibility Checkboxes */}
      <div style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => (
          <label key={name} style={{ marginRight: '1rem', display: 'inline-block' }}>
            <input
              type="checkbox"
              checked={visiblePlayers[name] || false}
              onChange={() => toggleVisibility(name)}
            />
            {name}
          </label>
        ))}
      </div>

      {/* Chart Container for CURRENT visible charts */}
      <div ref={chartRef} style={{ marginTop: '2rem' }}>
        {filteredDistanceData.length > 1 ? (
          <div style={{ marginBottom: '2rem' }}>
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="400px"
              data={filteredDistanceData}
              options={distanceOptions}
              loader={<div>Loading Chart...</div>}
            />
          </div>
        ) : (
          <div>No distance data available</div>
        )}
        {filteredTopSpeedData.length > 1 ? (
          <div style={{ marginBottom: '2rem' }}>
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="400px"
              data={filteredTopSpeedData}
              options={topSpeedOptions}
              loader={<div>Loading Chart...</div>}
            />
          </div>
        ) : (
          <div>No top speed data available</div>
        )}
        {filteredHSRData.length > 1 ? (
          <div style={{ marginBottom: '2rem' }}>
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="400px"
              data={filteredHSRData}
              options={hsrOptions}
              loader={<div>Loading Chart...</div>}
            />
          </div>
        ) : (
          <div>No high speed running data available</div>
        )}
        {filteredSprintData.length > 1 ? (
          <div style={{ marginBottom: '2rem' }}>
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="400px"
              data={filteredSprintData}
              options={sprintOptions}
              loader={<div>Loading Chart...</div>}
            />
          </div>
        ) : (
          <div>No sprinting data available</div>
        )}
      </div>

      {/* Hidden Container for ALL Splits Charts (for PDF export) */}
      {showAllCharts && (
        <div
          ref={allChartsRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -9999,
          }}
        >
          {/* Render hidden charts for each split option */}
          {dropdownOptions.map((splitObj, idx) => {
            const splitVal = splitObj.value;
            const label = splitObj.label;

            // Build hidden data arrays using ALL players.
            const buildHiddenMetricData = (metricName) => {
              const header = ['Player', metricName];
              const rows = [header];
              playerDataArray.forEach((p) => {
                let val;
                if (splitVal === 'All') {
                  const found = p.sessionPlayerMetrics?.find((m) => m.MetricName === metricName);
                  val = found ? Number(found.Value) : NaN;
                } else {
                  const foundSplit = p.splitPlayerMetrics?.find((sp) => sp.SplitNumber === splitVal);
                  if (!foundSplit) {
                    val = NaN;
                  } else {
                    const foundMetric = foundSplit.SplitMetrics.find((m) => m.MetricName === metricName);
                    val = foundMetric ? Number(foundMetric.Value) : NaN;
                  }
                }
                rows.push([p.playerName, val]);
              });
              const filtered = [
                rows[0],
                ...rows.slice(1).filter(
                  (r) => typeof r[1] === 'number' && !isNaN(r[1])
                ),
              ];
              if (filtered.length === 1) filtered.push(['Dummy', 0]);
              return filtered;
            };

            const distData = buildHiddenMetricData('Distance');
            const topData = buildHiddenMetricData('TopSpeed');
            const hsrData = buildHiddenMetricData('HighSpeedRunning');
            const sprintData = buildHiddenMetricData('Sprinting');

            return (
              <div key={idx} style={{ marginBottom: '3rem' }}>
                <h3>{label}</h3>
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={distData}
                  options={{
                    ...distanceOptions,
                    title:
                      splitVal === 'All'
                        ? 'Distance (Overall)'
                        : `Distance (Split ${splitVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(splitVal, 'Distance')}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={topData}
                  options={{
                    ...topSpeedOptions,
                    title:
                      splitVal === 'All'
                        ? 'Top Speed (Overall)'
                        : `Top Speed (Split ${splitVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(splitVal, 'TopSpeed')}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={hsrData}
                  options={{
                    ...hsrOptions,
                    title:
                      splitVal === 'All'
                        ? 'High Speed Running (Overall)'
                        : `HSR (Split ${splitVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(splitVal, 'HighSpeedRunning')}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={sprintData}
                  options={{
                    ...sprintOptions,
                    title:
                      splitVal === 'All'
                        ? 'Sprinting (Overall)'
                        : `Sprinting (Split ${splitVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(splitVal, 'Sprinting')}
                />
                <hr />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SessionCharts;
