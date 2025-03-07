import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart } from 'react-google-charts';
import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SessionPlaysCharts = ({
  sessionId,
  sessionName,   // from parent
  sessionDate,    // from parent
  sessionType,    // from parent
  teamName,       // from parent
}) => {
  const chartRef = useRef(null);

  // This ref + state handle the hidden container for "Export All" PDF
  const allChartsRef = useRef(null);
  const [showAllCharts, setShowAllCharts] = useState(false);

  // Fetch data for this session
  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

  // 1) Extract arrays
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // 2) Dropdown: "Overall" => 'All', plus each play => 'Play X'
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

  // 3) Current filter: 'All' or numeric
  const [filterValue, setFilterValue] = useState('All');

  // 4) Unique player names => checkboxes
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);

  const [visiblePlayers, setVisiblePlayers] = useState({});
  useEffect(() => {
    const newVisibility = {};
    allPlayerNames.forEach((name) => {
      newVisibility[name] = true; // default all visible
    });
    setVisiblePlayers(newVisibility);
  }, [allPlayerNames]);

  const togglePlayerVisibility = (playerName) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerName]: !prev[playerName],
    }));
  };

  // 5) Loading/error
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // 6) Build data arrays for *current* filterValue
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  const getMetricValue = (playerItem, metricName) => {
    if (filterValue === 'All') {
      // overall
      const foundOverall = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return foundOverall ? Number(foundOverall.Value) : NaN;
    } else {
      // numeric playNumber
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

  // 7) Filter out hidden players or invalid data
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

  // 8) Chart options
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
    chartArea: {
      left: 80,
      top: 50,
      bottom: 100,
      right: 20,
    },
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

  // 9) Export *current* charts to PDF
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

  // 10) Export *all* (cover sheet, plays table, overall + each play charts)
  const handleExportAllValuesPDF = async () => {
    try {
      // 1) Show the hidden container
      setShowAllCharts(true);

      // 2) Let it finish rendering
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3) Capture each .chart-wrapper
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const chartWrappers = allChartsRef.current.querySelectorAll('.chart-wrapper');
      for (let i = 0; i < chartWrappers.length; i++) {
        const canvas = await html2canvas(chartWrappers[i]);
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
        pdf.addImage(imgData, 'PNG', 0, 0, newImgWidth, newImgHeight);
      }

      // 4) Save the PDF
      pdf.save('all_plays_charts.pdf');
    } catch (err) {
      console.error('Error exporting all values PDF:', err);
    } finally {
      // 5) Hide the container again
      setShowAllCharts(false);
    }
  };

  const hasAnyData =
    filteredDistanceData.length > 1 ||
    filteredTopSpeedData.length > 1 ||
    filteredHSRData.length > 1 ||
    filteredSprintData.length > 1;

  return (
    <div>
      {/* Top bar: PDF export buttons, play dropdown */}
      <div
        className="charts-top-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
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

        {/* Dropdown to select Overall or a specific play */}
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

      {/* Charts for the *current* filterValue */}
      <div className="chart-container" ref={chartRef} style={{ marginTop: '2rem' }}>
        {/* Distance */}
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

        {/* Top Speed */}
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

        {/* High Speed Running */}
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

        {/* Sprinting */}
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

      {/* Hidden container with cover sheet, plays table, & all charts */}
      <div
        ref={allChartsRef}
        style={{
          display: showAllCharts ? 'block' : 'none',
          position: 'absolute',
          left: '-99999px',
          top: 0,
        }}
      >
        {/* COVER SHEET as first page */}
        <div
          className="chart-wrapper"
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
            {sessionDate ? new Date(sessionDate).toLocaleDateString() : 'N/A'}
          </h2>
          <h2>Type: {sessionType || 'N/A'}</h2>

          <p style={{ marginTop: '2rem' }}>
           
          </p>
        </div>

        {/* Full plays table (all plays) */}
        {playsArray.length > 0 && (
          <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
            <h3>All Plays</h3>
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Play</th>
                  <th>Half</th>
                  <th>Duration (seconds)</th>
                  <th>Numb Sprints</th>
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
                    <td>{play.numbsprints}</td>
                    <td>{play.avgdistance}</td>
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

        {/* Charts for "Overall" plus each play */}
        {[{ label: 'Overall', value: 'All' }, ...playsArray.map((p) => p.playNumber)].map(
          (playVal, idx) => {
            const playNumber = playVal.value;

            // Build data arrays for this playNumber
            const localDistanceData = [['Player', 'Distance (km)']];
            const localTopSpeedData = [['Player', 'Top Speed (m/s)']];
            const localHsrData = [['Player', 'High Speed Running (km)']];
            const localSprintData = [['Player', 'Sprinting (km)']];

            const getLocalMetricValue = (playerItem, metricName, val) => {
              if (val === 'All') {
                // overall
                const foundOverall = playerItem.sessionPlayerMetrics?.find(
                  (m) => m.MetricName === metricName
                );
                return foundOverall ? Number(foundOverall.Value) : NaN;
              } else {
                // numeric
                const foundPlay = playerItem.playPlayerMetrics?.find(
                  (pm) => pm.PlayNumber === val
                );
                if (!foundPlay) return NaN;
                const foundMetric = foundPlay.PlayMetrics.find(
                  (m) => m.MetricName === metricName
                );
                return foundMetric ? Number(foundMetric.Value) : NaN;
              }
            };

            // Populate data
            playerDataArray.forEach((player) => {
              localDistanceData.push([
                player.playerName,
                getLocalMetricValue(player, 'Distance', playNumber),
              ]);
              localTopSpeedData.push([
                player.playerName,
                getLocalMetricValue(player, 'TopSpeed', playNumber),
              ]);
              localHsrData.push([
                player.playerName,
                getLocalMetricValue(player, 'HighSpeedRunning', playNumber),
              ]);
              localSprintData.push([
                player.playerName,
                getLocalMetricValue(player, 'Sprinting', playNumber),
              ]);
            });

            // Filter out NaN rows
            const filterData = (arr) => [
              arr[0],
              ...arr.slice(1).filter((row) => typeof row[1] === 'number' && !isNaN(row[1])),
            ];

            const dist = filterData(localDistanceData);
            const tops = filterData(localTopSpeedData);
            const hsr = filterData(localHsrData);
            const sprint = filterData(localSprintData);

            if (
              dist.length <= 1 &&
              tops.length <= 1 &&
              hsr.length <= 1 &&
              sprint.length <= 1
            ) {
              return null;
            }

            return (
              <div className="chart-wrapper" key={idx} style={{ marginBottom: '2rem' }}>
                <h3>
                  {playNumber === 'All'
                    ? 'Overall'
                    : `Play ${playNumber}`}
                </h3>

                {/* Distance */}
                {dist.length > 1 && (
                  <Chart
                    chartType="ColumnChart"
                    width="100%"
                    height="400px"
                    data={dist}
                    options={{
                      ...distanceOptions,
                      title:
                        playNumber === 'All'
                          ? 'Distance (Overall)'
                          : `Distance (Play ${playNumber})`,
                    }}
                  />
                )}

                {/* Top Speed */}
                {tops.length > 1 && (
                  <Chart
                    chartType="ColumnChart"
                    width="100%"
                    height="400px"
                    data={tops}
                    options={{
                      ...topSpeedOptions,
                      title:
                        playNumber === 'All'
                          ? 'Top Speed (Overall)'
                          : `Top Speed (Play ${playNumber})`,
                    }}
                  />
                )}

                {/* High Speed Running */}
                {hsr.length > 1 && (
                  <Chart
                    chartType="ColumnChart"
                    width="100%"
                    height="400px"
                    data={hsr}
                    options={{
                      ...hsrOptions,
                      title:
                        playNumber === 'All'
                          ? 'High Speed Running (Overall)'
                          : `HSR (Play ${playNumber})`,
                    }}
                  />
                )}

                {/* Sprinting */}
                {sprint.length > 1 && (
                  <Chart
                    chartType="ColumnChart"
                    width="100%"
                    height="400px"
                    data={sprint}
                    options={{
                      ...sprintOptions,
                      title:
                        playNumber === 'All'
                          ? 'Sprinting (Overall)'
                          : `Sprinting (Play ${playNumber})`,
                    }}
                  />
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default SessionPlaysCharts;
