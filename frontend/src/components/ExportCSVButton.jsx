import React from 'react';

// Helper to generate CSV content from a session object.
export function generateSessionCSV(session) {
  const csvRows = [];

  // SECTION 1: Session row info
  const sessionHeader = [
    "Team",
    "Session Name",
    "Date",
    "Number of Players",
    "Type",
    "Duration",
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
    session.duration || "N/A",
    session.avgDistance ? session.avgDistance.toFixed(2) + " km/s" : "N/A",
    Array.isArray(session.splits) ? session.splits.length : 0,
    session.notes || "N/A"
  ];
  csvRows.push(sessionData.join(","));

  // Separator row
  csvRows.push("");

  // SECTION 2: Detailed plays & player data
  csvRows.push("Play Title,Half,Player Name,Play Metrics");

  // Loop through each play and for each player, list their metrics.
  if (session.plays && session.sessionPlayerData) {
    session.plays.forEach((play) => {
      session.sessionPlayerData.forEach((player) => {
        // Assumes each player has a playPlayerMetrics array with an object containing a PlayNumber and PlayMetrics.
        const metricsObj = player.playPlayerMetrics?.find(
          (m) => m.PlayNumber === play.playNumber
        );
        let metricsStr = "";
        if (metricsObj && Array.isArray(metricsObj.PlayMetrics)) {
          // Format as "MetricName:Value" pairs separated by a pipe.
          metricsStr = metricsObj.PlayMetrics
            .map((metric) => `${metric.MetricName}:${metric.Value}`)
            .join(" | ");
        }
        const row = [play.title, play.half, player.playerName, metricsStr];
        csvRows.push(row.join(","));
      });
    });
  }

  return csvRows.join("\n");
}

const ExportCSVButton = ({ session }) => {
  const handleExport = () => {
    const csvContent = generateSessionCSV(session);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Use a safe filename based on the session name
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
