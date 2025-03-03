import React, { useEffect, useState } from 'react';
import { useGetPlayByPlayDataQuery } from '../slices/playByPlayApiSlice';

const PlayByPlayAnalysisScreen = ({ sessionId }) => {
  const { data: playByPlayData, error, isLoading } = useGetPlayByPlayDataQuery(sessionId);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading data.</p>;

  return (
    <div>
      <h1>Play By Play Analysis</h1>
      <table>
        <thead>
          <tr>
            <th>Time Start</th>
            <th>Time End</th>
            <th>Duration</th>
            <th>Half</th>
            <th>Team Start Possession</th>
            <th>Team End Possession</th>
            <th>Turnovers</th>
            <th>Start Action</th>
            <th>End Action</th>
          </tr>
        </thead>
        <tbody>
          {playByPlayData.map((play, index) => (
            <tr key={index}>
              <td>{play.timeStart}</td>
              <td>{play.timeEnd}</td>
              <td>{play.duration}</td>
              <td>{play.half}</td>
              <td>{play.teamStartPosession}</td>
              <td>{play.teamEndPosession}</td>
              <td>{play.turnovers}</td>
              <td>{play.startAction}</td>
              <td>{play.endAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayByPlayAnalysisScreen;
