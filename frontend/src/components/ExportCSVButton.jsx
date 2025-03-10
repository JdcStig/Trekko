import React from 'react';

// Helper to generate CSV content from a session object.
export function generateSessionCSV(session) {
  const csvRows = [];

  // SECTION 1: Session-level info

  const sessionHeader = [
    "Team",
    "Session Name",
    "Date",
    "Number of Players",
    "Type",
    "Duration (minutes)",
    "Avg Distance",
    "Splits",
    "Notes"
  ];
  csvRows.push(sessionHeader.join(","));

  const sessionData = [
    session.teamName,
    session.sessionName,
    new Date(session.date).toLocaleDateString(),
    session.sessionPlayerData ? session.sessionPlayerData.length : 0,
    session.type,
    // If session.duration is already in seconds, just use it:
    session.duration || "N/A",
    session.avgDistance ? session.avgDistance.toFixed(2) + " km/s" : "N/A",
    Array.isArray(session.splits) ? session.splits.length : 0,
    session.notes || "N/A"
  ];
  csvRows.push(sessionData.join(","));

  // Blank separator row
  csvRows.push("");

  // 1) Gather all unique metric names across all plays/players
  const allMetricNames = new Set();
  if (session.plays && session.sessionPlayerData) {
    session.plays.forEach((play) => {
      session.sessionPlayerData.forEach((player) => {
        const metricsObj = player.playPlayerMetrics?.find(
          (m) => m.PlayNumber === play.playNumber
        );
        if (metricsObj?.PlayMetrics?.length) {
          metricsObj.PlayMetrics.forEach((metric) => {
            allMetricNames.add(metric.MetricName);
          });
        }
      });
    });
  }
  const metricList = Array.from(allMetricNames);

  // 2) SECTION 2: Detailed plays & player data, each metric in its own column
  // Include columns for Play Title, Half, Play Number, Play Duration (seconds), Player Name, plus each metric
  const playsHeader = [
    "Play Title",
    "Half",
    "Play Number",
    "Play Duration (seconds)",
    "Player Name",
    ...metricList
  ];
  csvRows.push(playsHeader.join(","));

  // For each play, and for each player, create a row with each metric in its own column
  if (session.plays && session.sessionPlayerData) {
    session.plays.forEach((play) => {
      session.sessionPlayerData.forEach((player) => {
        // Find the metrics object for this specific (play, player)
        const metricsObj = player.playPlayerMetrics?.find(
          (m) => m.PlayNumber === play.playNumber
        );

        const rowData = [
          play.title || "",
          play.half || "",
          play.playNumber || "",
          // If your play durations are also in seconds, just use play.duration
          play.duration || "",
          player.playerName || ""
        ];

        // Match each metricName to its value or blank
        const metricValues = metricList.map((metricName) => {
          if (metricsObj?.PlayMetrics?.length) {
            const foundMetric = metricsObj.PlayMetrics.find(
              (m) => m.MetricName === metricName
            );
            return foundMetric ? foundMetric.Value : "";
          }
          return "";
        });

        // Push metric values into the row
        rowData.push(...metricValues);

        csvRows.push(rowData.join(","));
      });
    });
  }

  // Return the final CSV string
  return csvRows.join("\n");
}

const ExportCSVButton = ({ session }) => {
  const handleExport = () => {
    const csvContent = generateSessionCSV(session);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${session.sessionName.replace(/\s+/g, "_")}_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className="btn btn-primary">
      Export CSV
    </button>
  );
};

export default ExportCSVButton;
