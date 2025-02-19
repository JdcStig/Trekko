// import React from 'react';
// import { Chart } from 'react-google-charts';
// import { useGetSessionCSVsQuery } from '../slices/sessionsApiSlice';
// //import './SessionDistanceChart.css'; // Import the CSS file

// const SessionDistanceChart = ({ sessionId }) => {
//   const { data, isLoading, error } = useGetSessionCSVsQuery(sessionId);

//   if (isLoading) return <p>Loading chart data...</p>;
//   if (error) return <p>Error loading chart data.</p>;

//   const playerDataArray = data.sessionPlayerDataArray || [];
  
//   // Build chart data: header row then each player's data
//   const chartData = [['Player', 'Distance (km)']];
//   playerDataArray.forEach((item) => {
//     // Find the Distance metric in the sessionPlayerMetrics array
//     const distanceMetric = item.sessionPlayerMetrics?.find(
//       (metric) => metric.MetricName === 'Distance'
//     );
//     // Convert the distance to a number (or NaN if not available)
//     const distance = distanceMetric ? Number(distanceMetric.Value) : NaN;
//     chartData.push([item.playerName, distance]);
//   });

//   // Validate: make sure at least one row (beyond the header) has a valid numeric distance.
//   const validRows = chartData.slice(1).filter(
//     row => typeof row[1] === 'number' && !isNaN(row[1])
//   );
//   if (validRows.length === 0) {
//     return (
//       <div className="no-data">
//         No data found
//       </div>
//     );
//   }

//   const options = {
//     title: 'Player Distance',
//     hAxis: 
//     { 
//       title: 'Player' ,
//       slantedText: true ,
//       slantedTextAngle: 45 ,
//     },
    

//     vAxis: { 
//       title: 'Distance (km)' 
//     },
    

//     chartArea: {
//       left: 50,
//       top: 50,
//       bottom: 100, 
//       right: 20,
//     },


//     legend: { 
//       position: 'none' 
//     },
//   };

//   return (
//     <div className="chart-container">
//       <Chart
//         chartType="ColumnChart" 
//         width="100%"
//         height="400px"
//         data={chartData}
//         options={options}
//       />
//     </div>
//   );
// };

// export default SessionDistanceChart;
