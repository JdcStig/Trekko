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
 // console.log('Rendering SessionPlaysCharts...');

  // 1) HOOKS & INITIAL STATE
  const chartRef = useRef(null); // For current visible charts
  const allChartsRef = useRef(null); // For hidden container

  const [showAllCharts, setShowAllCharts] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [chartImages, setChartImages] = useState({}); // { [playValue]: { [metricKey]: URI } }
  const [exportStatus, setExportStatus] = useState([]); // For progress messages
  const [filterValue, setFilterValue] = useState('All'); // "All" or numeric
  const [visiblePlayers, setVisiblePlayers] = useState({});

  // 2) Data fetch
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // 3) Build play options array ("Overall" + each play)
  const allPlayOptions = useMemo(() => {
    const result = [{ label: 'Overall', value: 'All' }];
    playsArray.forEach((play) => {
      result.push({ label: `Play ${play.playNumber}`, value: play.playNumber });
    });
   // console.log('allPlayOptions:', result);
    return result;
  }, [playsArray]);

  const dropdownOptions = useMemo(() => allPlayOptions, [allPlayOptions]);

  // Gather unique player names
  const allPlayerNames = useMemo(() => {
    const names = Array.from(new Set(playerDataArray.map((p) => p.playerName)));
    //console.log('allPlayerNames:', names);
    return names;
  }, [playerDataArray]);

  // 4) Initialize visiblePlayers once data is loaded
  useEffect(() => {
    if (!isLoading && allPlayerNames.length > 0) {
      const initial = {};
      allPlayerNames.forEach((name) => {
        initial[name] = true;
      });
      setVisiblePlayers(initial);
    }
  }, [isLoading, allPlayerNames]);

  // ===========================================================================
  // 5) PDF GENERATION: Cover page -> Full Plays table -> each play 2-charts/page
  // ===========================================================================
  const generateAllPlaysPDF = useCallback(() => {
    //console.log('Generating PDF for all plays...');
    setExportStatus((prev) => [
      ...prev,
      '',
    ]);

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- COVER PAGE ---
    pdf.setFontSize(22);
    pdf.text(sessionName || 'Session', pdfWidth / 2, 50, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text(teamName || 'Team', pdfWidth / 2, 80, { align: 'center' });
    pdf.text(
      `Date: ${sessionDate ? new Date(sessionDate).toLocaleDateString() : 'N/A'}`,
      pdfWidth / 2,
      110,
      { align: 'center' }
    );
    pdf.text(`Type: ${sessionType || 'N/A'}`, pdfWidth / 2, 140, {
      align: 'center',
    });
    pdf.addPage();

    // --- FULL PLAYS TABLE PAGE ---
    pdf.setFontSize(16);
    pdf.text('Full Plays', pdfWidth / 2, 30, { align: 'center' });
    pdf.setFontSize(10);

    let yPos = 50;
    playsArray.forEach((play, idx) => {
      const line = `Play ${play.playNumber}: ${play.title} | Duration: ${play.duration}s | Half: ${play.half}`;
      pdf.text(line, 40, yPos);
      yPos += 14;
      // If we exceed page height, add new page
      if (yPos > pdfHeight - 40 && idx < playsArray.length - 1) {
        pdf.addPage();
        pdf.setFontSize(10);
        yPos = 50;
      }
    });
    pdf.addPage();

    // --- For each play, 2-charts/page (stacked vertically) ---
    dropdownOptions.forEach((playObj) => {
      const playVal = playObj.value;
      const label = playObj.label;
      const imagesForPlay = chartImages[playVal];
      if (!imagesForPlay) {
        //console.log(`No images for ${label}`);
        return;
      }

      // We have 4 metrics total. We'll group them in pairs: [0,1], [2,3].
      // That means 2 charts per page, stacked vertically
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
          if (!uri) {
            //console.log(`Missing image for ${label} - ${metric}`);
            return;
          }
          // top chart => y = headerHeight
          // bottom chart => y = headerHeight + chartHeight + gap
          const yPos = headerHeight + idx * (chartHeight + gap);
          pdf.addImage(uri, 'PNG', margin, yPos, chartWidth, chartHeight);
        });

        // add new page for the next pair (if any)
        pdf.addPage();
      });
    });

    // remove trailing blank page if it exists
    if (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }

    pdf.save('all_plays_charts.pdf');
    //console.log('All plays PDF saved');
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

  // 6) MONITOR HIDDEN CHARTS READINESS
  useEffect(() => {
    if (!showAllCharts) return;
    const allReady = dropdownOptions.every((playObj) => {
      const val = playObj.value;
      if (!chartImages[val]) return false;
      return METRIC_KEYS.every((key) => chartImages[val][key]);
    });
   // console.log('Readiness status:', allReady, chartImages);
    if (allReady) {
      generateAllPlaysPDF();
    }
  }, [showAllCharts, dropdownOptions, chartImages, generateAllPlaysPDF]);

  // 7) EARLY RETURNS FOR LOADING/ERROR
  if (isLoading) {
    return <p>Loading chart data...</p>;
  }
  if (error) {
    return <p>Error loading chart data.</p>;
  }

  // 8) BUILD DATA ARRAYS FOR CURRENT FILTER (VISIBLE CHARTS)
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

  // 9) CHART OPTIONS
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

  // 10) EXPORT CURRENT CHARTS => single snapshot with html2canvas
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
      pdf.save('current_charts.pdf');
    } catch (err) {
      //console.error('Error exporting current PDF:', err);
    }
  };

  // 11) EXPORT ALL => concurrency approach
  const handleExportAllValuesPDF = () => {
    setChartImages({});
    setExportStatus([]);
    setShowAllCharts(true);
    setExportingAll(true);
    setExportStatus((prev) => [...prev]);
  };

  // 12) CHART READY CALLBACK => store each chart's image
  const handleChartReady = (playVal, metricKey, chartWrapper) => {
    if (!chartWrapper || !chartWrapper.getChart) {
      //console.log('No valid chartWrapper in ready event for', playVal, metricKey);
      return;
    }
    const uri = chartWrapper.getChart().getImageURI();
    //console.log(`Captured image for ${playVal} - ${metricKey}`);
    setChartImages((prev) => ({
      ...prev,
      [playVal]: {
        ...prev[playVal],
        [metricKey]: uri,
      },
    }));
    setExportStatus((prev) => [
      ...prev,
      // `Captured image for ${playVal} - ${metricKey}`,
    ]);
  };

  // 13) EVENT GENERATOR
  const generateChartEvents = (playVal, metricKey) => [
    {
      eventName: 'ready',
      callback: ({ chartWrapper }) => {
        handleChartReady(playVal, metricKey, chartWrapper);
      },
    },
  ];

  // 14) Toggle player visibility
  const toggleVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // 15) Check if current filter has any data
  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  // 16) RENDER
  return (
    <div>
      {exportingAll && (
        <div style={{ marginBottom: '1rem' }}>
         
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

          {/* Full Plays Table */}
          {playsArray.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3>All Plays</h3>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Play</th>
                    <th>Half</th>
                    <th>Duration (seconds)</th>
                    <th>Num Sprints</th>
                    <th>Avg Distance</th>
                    <th>Team Start Possession</th>
                    <th>Team End Possession</th>
                    <th>Turnovers</th>
                    <th>Start Action</th>
                    <th>End Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playsArray.map((play) => (
                    <tr key={play._id}>
                      <td>{play.title}</td>
                      <td>{play.playNumber}</td>
                      <td>{play.half}</td>
                      <td>{play.duration}</td>
                      <td>{play.numSprint}</td>
                      <td>{play.avgDistance}</td>
                      <td>{play.teamStartPossession}</td>
                      <td>{play.teamEndPossession}</td>
                      <td>{play.turnovers}</td>
                      <td>{play.startAction}</td>
                      <td>{play.endAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
              if (filtered.length === 1) {
                filtered.push(['Dummy', 0]);
              }
              return filtered;
            };

            const distData = buildHiddenMetricData('Distance');
            const topData = buildHiddenMetricData('TopSpeed');
            const hsrData = buildHiddenMetricData('HighSpeedRunning');
            const sprintData = buildHiddenMetricData('Sprinting');

            // Render hidden charts at 800x400; they will be captured in the PDF export
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
                  chartEvents={generateChartEvents(playVal, 'HighSpeedRunning')}
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
