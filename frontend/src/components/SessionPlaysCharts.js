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

  // For the "live" single-play or overall chart
  const [filterValue, setFilterValue] = useState('All');

  // For show/hide of the big hidden container
  const allChartsRef = useRef(null);
  const [showAllCharts, setShowAllCharts] = useState(false);

  const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);
  const playerDataArray = data?.sessionPlayerDataArray || [];
  const playsArray = data?.plays || [];

  // Build dropdown for the "live" chart
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

  // Collect all player names for checkboxes
  const allPlayerNames = useMemo(() => {
    return Array.from(new Set(playerDataArray.map((p) => p.playerName)));
  }, [playerDataArray]);
  const [visiblePlayers, setVisiblePlayers] = useState({});

  useEffect(() => {
    // On mount or when allPlayerNames changes, default all to visible
    const newVisibility = {};
    allPlayerNames.forEach((name) => {
      newVisibility[name] = true;
    });
    setVisiblePlayers(newVisibility);
  }, [allPlayerNames]);

  // Basic loading / error
  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p>Error loading chart data.</p>;

  // === The "live" chart for filterValue ===
  const distanceData = [['Player', 'Distance (km)']];
  const topSpeedData = [['Player', 'Top Speed (m/s)']];
  const hsrData = [['Player', 'High Speed Running (km)']];
  const sprintData = [['Player', 'Sprinting (km)']];

  // Get a single metric for the "live" chart
  const getMetricValue = (playerItem, metricName) => {
    if (filterValue === 'All') {
      // overall
      const foundOverall = playerItem.sessionPlayerMetrics?.find(
        (m) => m.MetricName === metricName
      );
      return foundOverall ? Number(foundOverall.Value) : NaN;
    } else {
      // numeric play
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

  // Populate "live" chart data
  playerDataArray.forEach((player) => {
    distanceData.push([player.playerName, getMetricValue(player, 'Distance')]);
    topSpeedData.push([player.playerName, getMetricValue(player, 'TopSpeed')]);
    hsrData.push([player.playerName, getMetricValue(player, 'HighSpeedRunning')]);
    sprintData.push([player.playerName, getMetricValue(player, 'Sprinting')]);
  });

  // Filter out hidden players or NaN rows
  const filterChartData = (arr) => [
    arr[0],
    ...arr.slice(1).filter(
      (row) =>
        visiblePlayers[row[0]] &&
        typeof row[1] === 'number' &&
        !isNaN(row[1])
    ),
  ];

  const filteredDistanceData = filterChartData(distanceData);
  const filteredTopSpeedData = filterChartData(topSpeedData);
  const filteredHSRData = filterChartData(hsrData);
  const filteredSprintData = filterChartData(sprintData);

  const baseOptions = {
    hAxis: {
      title: '',
      slantedText: true,
      slantedTextAngle: 45,
    },
    vAxis: {
      viewWindowMode: 'explicit',
      viewWindow: { min: 0 },
      format: '0.###',
    },
    chartArea: { left: 80, top: 50, bottom: 100, right: 20 },
    legend: { position: 'none' },
  };

  const distanceOptions = { ...baseOptions, title: 'Distance (km)' };
  const topSpeedOptions = { ...baseOptions, title: 'Top Speed (m/s)' };
  const hsrOptions = { ...baseOptions, title: 'High Speed Running (km)' };
  const sprintOptions = { ...baseOptions, title: 'Sprinting (km)' };

  // Export "live" chart to PDF
  const handleExportPDF = async () => {
    try {
      if (!chartRef.current) return;
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;

      let newImgWidth = pdfWidth;
      let newImgHeight = pdfWidth / ratio;
      if (newImgHeight > pdfHeight) {
        newImgHeight = pdfHeight;
        newImgWidth = pdfHeight * ratio;
      }
      pdf.addImage(imgData, 'PNG', 0, 0, newImgWidth, newImgHeight);
      pdf.save('charts.pdf');
    } catch (err) {
      console.error('Export PDF error:', err);
    }
  };

  // Export all plays (cover sheet, table, 4 charts per play)
  const handleExportAllValuesPDF = async () => {
    try {
      setShowAllCharts(true);
      // Wait for the hidden container to render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const chartWrappers = allChartsRef.current.querySelectorAll('.chart-wrapper');
      for (let i = 0; i < chartWrappers.length; i++) {
        const canvas = await html2canvas(chartWrappers[i]);
        const imgData = canvas.toDataURL('image/png');

        const ratio = canvas.width / canvas.height;
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

      pdf.save('all_plays_charts.pdf');
    } catch (err) {
      console.error('Export All PDF error:', err);
    } finally {
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
      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {hasAnyData && (
          <div>
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
          </div>
        )}

        {/* "Live" dropdown */}
        <div>
          <label>Select a Play: </label>
          <select
            value={filterValue}
            onChange={(e) => {
              const val = e.target.value;
              setFilterValue(val === 'All' ? 'All' : Number(val));
            }}
          >
            {dropdownOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* "Live" player checkboxes */}
      <div style={{ marginTop: '1rem' }}>
        {allPlayerNames.map((name) => (
          <label key={name} style={{ marginRight: '1rem' }}>
            <input
              type="checkbox"
              checked={visiblePlayers[name] || false}
              onChange={() => {
                setVisiblePlayers((prev) => ({
                  ...prev,
                  [name]: !prev[name],
                }));
              }}
            />
            {name}
          </label>
        ))}
      </div>

      {/* "Live" chart container */}
      <div ref={chartRef} style={{ marginTop: '2rem' }}>
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
          <div>No distance data available</div>
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
          <div>No top speed data available</div>
        )}

        {/* HSR */}
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
          <div>No HSR data available</div>
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
          <div>No sprinting data available</div>
        )}
      </div>

      {/* Hidden container for "Export All" */}
      <div
        ref={allChartsRef}
        style={{
          display: showAllCharts ? 'block' : 'none',
          position: 'absolute',
          left: '-99999px',
          top: 0,
        }}
      >
        {/* COVER SHEET */}
        <div
          className="chart-wrapper"
          style={{ marginBottom: '2rem', textAlign: 'center', padding: '100px 0' }}
        >
          <h1>{sessionName || 'Session'}</h1>
          <h2>{teamName || 'Team'}</h2>
          <h2>
            Date: {sessionDate ? new Date(sessionDate).toLocaleDateString() : 'N/A'}
          </h2>
          <h2>Type: {sessionType || 'N/A'}</h2>
          <h2 style={{ marginTop: '2rem' }}>
  
          </h2>
        </div>

        {/* Table of all plays */}
        <div className="chart-wrapper" style={{ marginBottom: '2rem' }}>
          <h3>All Plays</h3>
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Title</th>
                <th>Play</th>
                <th>Half</th>
                <th>Duration (s)</th>
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
              {playsArray.map((p) => (
                <tr key={p._id}>
                  <td>{p.title}</td>
                  <td>{p.playNumber}</td>
                  <td>{p.half}</td>
                  <td>{p.duration}</td>
                  <td>{p.numbsprints}</td>
                  <td>{p.avgdistance}</td>
                  <td>{p.teamStartPossession}</td>
                  <td>{p.teamEndPossession}</td>
                  <td>{p.turnovers}</td>
                  <td>{p.startAction}</td>
                  <td>{p.endAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4 charts per play */}
        {playsArray.map((play) => {
          const distanceData = [['Player', 'Distance (km)']];
          const topSpeedData = [['Player', 'Top Speed (m/s)']];
          const hsrData = [['Player', 'High Speed Running (km)']];
          const sprintData = [['Player', 'Sprinting (km)']];

          // Metric for a single player in this play
          const getPlayMetric = (player, metricName) => {
            const foundPlay = player.playPlayerMetrics?.find(
              (pm) => pm.PlayNumber === play.playNumber
            );
            if (!foundPlay) return NaN;
            const foundMetric = foundPlay.PlayMetrics.find(
              (m) => m.MetricName === metricName
            );
            return foundMetric ? Number(foundMetric.Value) : NaN;
          };

          // Populate
          playerDataArray.forEach((pl) => {
            distanceData.push([pl.playerName, getPlayMetric(pl, 'Distance')]);
            topSpeedData.push([pl.playerName, getPlayMetric(pl, 'TopSpeed')]);
            hsrData.push([pl.playerName, getPlayMetric(pl, 'HighSpeedRunning')]);
            sprintData.push([pl.playerName, getPlayMetric(pl, 'Sprinting')]);
          });

          const filterData = (arr) => [
            arr[0],
            ...arr.slice(1).filter((r) => typeof r[1] === 'number' && !isNaN(r[1])),
          ];
          const dist = filterData(distanceData);
          const tops = filterData(topSpeedData);
          const hsr = filterData(hsrData);
          const sprint = filterData(sprintData);

          // If there's no data, skip
          if (
            dist.length <= 1 &&
            tops.length <= 1 &&
            hsr.length <= 1 &&
            sprint.length <= 1
          ) {
            return null;
          }

          return (
            <div className="chart-wrapper" key={play._id} style={{ marginBottom: '3rem' }}>
              <h2>Play {play.playNumber}</h2>

              {dist.length > 1 && (
                <Chart
                  chartType="ColumnChart"
                  width="100%"
                  height="400px"
                  data={dist}
                  options={{
                    ...distanceOptions,
                    title: `Distance`,
                  }}
                />
              )}

              {tops.length > 1 && (
                <Chart
                  chartType="ColumnChart"
                  width="100%"
                  height="400px"
                  data={tops}
                  options={{
                    ...topSpeedOptions,
                    title: `Top Speed`,
                  }}
                />
              )}

              {hsr.length > 1 && (
                <Chart
                  chartType="ColumnChart"
                  width="100%"
                  height="400px"
                  data={hsr}
                  options={{
                    ...hsrOptions,
                    title: `High Speed Running`,
                  }}
                />
              )}

              {sprint.length > 1 && (
                <Chart
                  chartType="ColumnChart"
                  width="100%"
                  height="400px"
                  data={sprint}
                  options={{
                    ...sprintOptions,
                    title: `Sprinting`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionPlaysCharts;
