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

function SessionPlaysCharts({
  sessionId,
  sessionName,
  sessionDate,
  sessionType,
  teamName,
}) {
  const chartRef = useRef(null);
  const allChartsRef = useRef(null);

  // --------------------------------
  // 1) State
  // --------------------------------
  const [showAllCharts, setShowAllCharts] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingCurrent, setExportingCurrent] = useState(false); // NEW for current-charts export
  const [chartImages, setChartImages] = useState({}); // { [playValue]: { [metricKey]: URI } }
  const [exportStatus, setExportStatus] = useState([]); // For progress messages
  const [filterValue, setFilterValue] = useState('All'); // "All" or numeric
  const [visiblePlayers, setVisiblePlayers] = useState({});

  // --------------------------------
  // 2) Data Fetch
  // --------------------------------
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // --------------------------------
  // 3) Build Play Options
  // --------------------------------
  const allPlayOptions = useMemo(() => {
    const result = [{ label: 'Overall', value: 'All' }];
    playsArray.forEach((play) => {
      result.push({ label: `Play ${play.playNumber}`, value: play.playNumber });
    });
    return result;
  }, [playsArray]);

  const dropdownOptions = useMemo(() => allPlayOptions, [allPlayOptions]);

  // --------------------------------
  // 4) Player Names & Visibility
  // --------------------------------
  const allPlayerNames = useMemo(() => {
    const names = Array.from(new Set(playerDataArray.map((p) => p.playerName)));
    return names;
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

  // --------------------------------
  // 5) PDF Generation for ALL Plays
  // --------------------------------
  const generateAllPlaysPDF = useCallback(() => {
    setExportStatus((prev) => [...prev, '']);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- COVER PAGE ---
    pdf.setFontSize(22);
    pdf.text(sessionName || 'Session', pdfWidth / 2, 50, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text(teamName || 'Team', pdfWidth / 2, 80, { align: 'center' });
    pdf.text(
      `Date: ${
        sessionDate ? new Date(sessionDate).toLocaleDateString() : 'N/A'
      }`,
      pdfWidth / 2,
      110,
      { align: 'center' }
    );
    pdf.text(`Type: ${sessionType || 'N/A'}`, pdfWidth / 2, 140, {
      align: 'center',
    });
    pdf.addPage();

    // --- For each play, 2-charts/page ---
    dropdownOptions.forEach((playObj) => {
      const playVal = playObj.value;
      const label = playObj.label;
      const imagesForPlay = chartImages[playVal];
      if (!imagesForPlay) return;

      // Group metrics in pairs: [0,1] and [2,3]
      const pairs = [];
      for (let i = 0; i < METRIC_KEYS.length; i += 2) {
        pairs.push(METRIC_KEYS.slice(i, i + 2));
      }

      pairs.forEach((pair) => {
        // Page heading
        pdf.setFontSize(16);
        pdf.text(`${label} - ${pair.join(' & ')}`, pdfWidth / 2, 30, {
          align: 'center',
        });

        // Layout for 2 stacked charts
        const margin = 20;
        const headerHeight = 40;
        const gap = 10;
        const availableHeight = pdfHeight - headerHeight - margin - gap;
        const chartHeight = availableHeight / 2;
        const chartWidth = pdfWidth - margin * 2;

        pair.forEach((metric, idx) => {
          const uri = imagesForPlay[metric];
          if (!uri) return;
          const yPos = headerHeight + idx * (chartHeight + gap);
          pdf.addImage(uri, 'PNG', margin, yPos, chartWidth, chartHeight);
        });
        pdf.addPage();
      });
    });

    // Remove trailing blank page if it exists
    if (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }

    pdf.save(`${sessionName || 'Session'}_plays.pdf`);
    setShowAllCharts(false);
    setExportingAll(false);
    setChartImages({});
    setExportStatus((prev) => [...prev, 'PDF export complete.']);
  }, [
    chartImages,
    dropdownOptions,
    playsArray,
    sessionName,
    sessionDate,
    sessionType,
    teamName,
  ]);

  // --------------------------------
  // 6) Monitor Hidden Charts Readiness
  // --------------------------------
  useEffect(() => {
    if (!showAllCharts) return;
    const allReady = dropdownOptions.every((playObj) => {
      const val = playObj.value;
      if (!chartImages[val]) return false;
      return METRIC_KEYS.every((key) => chartImages[val][key]);
    });
    if (allReady) {
      generateAllPlaysPDF();
    }
  }, [showAllCharts, dropdownOptions, chartImages, generateAllPlaysPDF]);

  // --------------------------------
  // 7) Early Returns (loading/error)
  // --------------------------------
  if (isLoading) {
    return <p>Loading chart data...</p>;
  }
  if (error) {
    return <p>Error loading chart data.</p>;
  }

  // --------------------------------
  // 8) Build Data Arrays for Current Filter
  // --------------------------------
  const distanceDataArr = [['Player', 'Distance (km)']];
  const topSpeedDataArr = [['Player', 'Top Speed (m/s)']];
  const hsrDataArr = [['Player', 'High Speed Running (km)']];
  const sprintDataArr = [['Player', 'Sprinting (km)']];

  const getMetricValue = (playerItem, metricName) => {
    if (filterValue === 'All') {
      const found = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return found ? Number(found.Value) : NaN;
    } else {
      const foundPlay = playerItem.playPlayerMetrics?.find(
        (pm) => pm.PlayNumber === filterValue
      );
      if (!foundPlay) return NaN;
      const foundMetric = foundPlay.PlayMetrics.find(
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

  // --------------------------------
  // 9) Chart Options
  // --------------------------------
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

  // --------------------------------
  // 10) Export Current Charts -> PDF
  // --------------------------------
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExportingCurrent(true); // show "Please Wait..." for current charts
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

      // Name the PDF after the session
      pdf.save(`${sessionName || 'Session'}_current_charts.pdf`);
    } catch (err) {
      // handle error if needed
    } finally {
      setExportingCurrent(false);
    }
  };

  // --------------------------------
  // 11) Export ALL Charts
  // --------------------------------
  const handleExportAllValuesPDF = () => {
    setChartImages({});
    setExportStatus([]);
    setShowAllCharts(true);
    setExportingAll(true); // show "Please Wait..." for all charts
    // optionally add any status messages
    setExportStatus((prev) => [...prev, 'Preparing all charts...']);
  };

  // --------------------------------
  // 12) Chart Ready Callback
  // --------------------------------
  const handleChartReady = (playVal, metricKey, chartWrapper) => {
    if (!chartWrapper || !chartWrapper.getChart) return;
    const uri = chartWrapper.getChart().getImageURI();
    setChartImages((prev) => ({
      ...prev,
      [playVal]: {
        ...prev[playVal],
        [metricKey]: uri,
      },
    }));
    setExportStatus((prev) => [...prev]); // you can add messages if desired
  };

  const generateChartEvents = (playVal, metricKey) => [
    {
      eventName: 'ready',
      callback: ({ chartWrapper }) => {
        handleChartReady(playVal, metricKey, chartWrapper);
      },
    },
  ];

  // --------------------------------
  // 13) Toggle Player Visibility
  // --------------------------------
  const toggleVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // --------------------------------
  // 14) Data Check
  // --------------------------------
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  // --------------------------------
  // 15) Render
  // --------------------------------
  return (
    <div>
      {/* Show "Please Wait..." + any status messages if exporting */}
      {(exportingAll || exportingCurrent) && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 'bold', color: 'blue' }}>
            Please Wait...
          </div>
          {exportStatus.map((msg, idx) => (
            <p key={idx} style={{ fontSize: '0.9rem', margin: '2px 0' }}>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Top bar: Export buttons & dropdown */}
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
                Export All Plays Charts to PDF
              </button>
            </>
          )}
        </div>
        <div>
          <label htmlFor="playSelect" style={{ marginRight: '10px' }}>
            Select a Play:
          </label>
          <select
            id="playSelect"
            name="playSelect"
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
      <div style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => {
          const inputId = `checkbox-${name}`;
          return (
            <div
              key={name}
              style={{ marginRight: '1rem', display: 'inline-block' }}
            >
              <input
                type="checkbox"
                id={inputId}
                name={inputId}
                checked={visiblePlayers[name] || false}
                onChange={() => toggleVisibility(name)}
              />
              <label htmlFor={inputId}>{name}</label>
            </div>
          );
        })}
      </div>

      {/* Container for CURRENT visible charts */}
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

      {/* Hidden container for ALL plays (for PDF export) */}
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
          {/* Cover sheet / Session Info */}
          <div
            style={{
              marginBottom: '2rem',
              textAlign: 'center',
              padding: '100px 0',
            }}
          >
            <h1>{sessionName || 'Session'}</h1>
            <h2>{teamName || 'Team'}</h2>
            <h2>
              Date:{' '}
              {sessionDate
                ? new Date(sessionDate).toLocaleDateString()
                : 'N/A'}
            </h2>
            <h2>Type: {sessionType || 'N/A'}</h2>
          </div>

          {/* Render hidden charts for "Overall" plus each play */}
          {dropdownOptions.map((playObj, idx) => {
            const playVal = playObj.value;
            const label = playObj.label;

            // Build hidden data (include ALL players)
            const buildHiddenMetricData = (metricName) => {
              const header = ['Player', metricName];
              const rows = [header];
              playerDataArray.forEach((p) => {
                let val;
                if (playVal === 'All') {
                  const found = p.sessionPlayerMetrics?.find(
                    (m) => m.MetricName === metricName
                  );
                  val = found ? Number(found.Value) : NaN;
                } else {
                  const foundPlay = p.playPlayerMetrics?.find(
                    (pm) => pm.PlayNumber === playVal
                  );
                  if (!foundPlay) {
                    val = NaN;
                  } else {
                    const foundM = foundPlay.PlayMetrics.find(
                      (m) => m.MetricName === metricName
                    );
                    val = foundM ? Number(foundM.Value) : NaN;
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
              // Ensure at least one data row for the chart to render
              if (filtered.length === 1) {
                filtered.push(['Dummy', 0]);
              }
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
                      playVal === 'All'
                        ? 'Distance (Overall)'
                        : `Distance (Play ${playVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(playVal, 'Distance')}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={topData}
                  options={{
                    ...topSpeedOptions,
                    title:
                      playVal === 'All'
                        ? 'Top Speed (Overall)'
                        : `Top Speed (Play ${playVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(playVal, 'TopSpeed')}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={hsrData}
                  options={{
                    ...hsrOptions,
                    title:
                      playVal === 'All'
                        ? 'High Speed Running (Overall)'
                        : `HSR (Play ${playVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(
                    playVal,
                    'HighSpeedRunning'
                  )}
                />
                <Chart
                  chartType="ColumnChart"
                  width="800px"
                  height="400px"
                  data={sprintData}
                  options={{
                    ...sprintOptions,
                    title:
                      playVal === 'All'
                        ? 'Sprinting (Overall)'
                        : `Sprinting (Play ${playVal})`,
                  }}
                  loader={<div>Loading Chart...</div>}
                  chartEvents={generateChartEvents(playVal, 'Sprinting')}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SessionPlaysCharts;
