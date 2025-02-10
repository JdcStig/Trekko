import React from 'react';
import { Table, Container } from 'react-bootstrap';

const SessionManagementTable = () => {
  // Dummy data for demonstration
  const sessions = [
    {
      _id: '1',
      team: 'Team A',
      sessionName: 'Session 1',
      date: '2025-02-10',
      number: '1',
      type: 'Practice',
      duration: '60 mins',
      avgDistance: '5 km',
      numberOfSplits: '3',
      notes: 'Good session',
    },
    {
      _id: '2',
      team: 'Team B',
      sessionName: 'Session 2',
      date: '2025-02-11',
      number: '2',
      type: 'Match',
      duration: '90 mins',
      avgDistance: '7 km',
      numberOfSplits: '4',
      notes: 'Challenging session',
    },
    // Add more dummy sessions as needed
  ];

  return (
    <Container>
      <h2 className="my-4">Session Management</h2>
      <Table striped bordered hover responsive className="table-sm">
        <thead className="table-dark">
          <tr>
            <th>Team</th>
            <th>Session Name</th>
            <th>Date</th>
            <th>Number</th>
            <th>Type</th>
            <th>Duration</th>
            <th>AvgDistance</th>
            <th>Number of Splits</th>
            <th>Notes</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session._id}>
              <td>{session.team}</td>
              <td>{session.sessionName}</td>
              <td>{session.date}</td>
              <td>{session.number}</td>
              <td>{session.type}</td>
              <td>{session.duration}</td>
              <td>{session.avgDistance}</td>
              <td>{session.numberOfSplits}</td>
              <td>{session.notes}</td>
              <td>{}</td>
              <td>{}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default SessionManagementTable;