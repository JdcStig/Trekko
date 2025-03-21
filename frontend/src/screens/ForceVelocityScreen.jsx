import React, { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Alert,
  Button,
} from 'react-bootstrap';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { useGetPlayersQuery } from '../slices/playersApiSlice';
import { useGetForceVelocityDataQuery } from '../slices/forceVelocityApiSlice';

const ForceVelocityScreen = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grouping, setGrouping] = useState('none'); // 'none' | 'day' | 'week' | 'month'
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  // 1) Fetch all players
  const {
    data: playersData,
    isLoading: loadingPlayers,
    isFetching: fetchingPlayers,
    error: errorPlayers,
  } = useGetPlayersQuery();

  // 2) Fetch ForceVelocity data (skip if no dates)
  const skipQuery = !startDate || !endDate;
  const {
    data: fvData,
    isLoading: loadingFV,
    isFetching: fetchingFV,
    error: errorFV,
  } = useGetForceVelocityDataQuery(
    { startDate, endDate, grouping, playerIds: selectedPlayers },
    { skip: skipQuery }
  );

  // Show a loader whenever data or players are loading or refetching
  if (loadingPlayers || fetchingPlayers || loadingFV || fetchingFV) {
    return <Loader />;
  }

  // Show error if players query failed
  if (errorPlayers) {
    return <Message variant="danger">{errorPlayers.message}</Message>;
  }

  // Prepare the players list
  const allPlayers = playersData?.players || [];

  // "Select All" is checked if every player is selected
  const isSelectAllChecked =
    allPlayers.length > 0 && selectedPlayers.length === allPlayers.length;

  // Toggle an individual player's checkbox
  const handleTogglePlayer = (playerId) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Toggle “Select All Players”
  const handleToggleAllPlayers = (e) => {
    if (!allPlayers.length) return;
    if (e.target.checked) {
      const allIds = allPlayers.map((p) => p._id);
      setSelectedPlayers(allIds);
    } else {
      setSelectedPlayers([]);
    }
  };

  // Simple button click handler
  const handleButtonClick = () => {
    console.log('Button pressed!');
  };

  return (
    <Container>
      <h2 className="my-4 text-center">Force‐Velocity Analysis</h2>

      {/* Row for Start Date & End Date */}
      <Row className="mb-3 justify-content-center">
        <Col md={3} className="text-center">
          <Form.Group controlId="startDate">
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3} className="text-center">
          <Form.Group controlId="endDate">
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Row for grouping radio + "Select All Players" in line */}
      <Row className="mb-4 justify-content-center">
        <Col md="auto" className="d-inline-flex align-items-center" style={{ gap: '1rem' }}>
          <span className="fw-bold">Group By:</span>
          <Form.Check
            type="radio"
            id="group-none"
            name="grouping"
            label="None"
            checked={grouping === 'none'}
            onChange={() => setGrouping('none')}
          />
          <Form.Check
            type="radio"
            id="group-day"
            name="grouping"
            label="Day"
            checked={grouping === 'day'}
            onChange={() => setGrouping('day')}
          />
          <Form.Check
            type="radio"
            id="group-week"
            name="grouping"
            label="Week"
            checked={grouping === 'week'}
            onChange={() => setGrouping('week')}
          />
          <Form.Check
            type="radio"
            id="group-month"
            name="grouping"
            label="Month"
            checked={grouping === 'month'}
            onChange={() => setGrouping('month')}
          />
        </Col>
        <Col md="auto" className="d-inline-flex align-items-center">
          <Form.Check
            type="checkbox"
            label="Select All Players"
            checked={isSelectAllChecked}
            onChange={handleToggleAllPlayers}
          />
        </Col>
      </Row>

      {/* Row of player checkboxes */}
      <Row className="mb-3 justify-content-center">
        <Col className="text-center">
          <div className="d-flex flex-wrap justify-content-center" style={{ gap: '1rem' }}>
            {allPlayers.map((player) => (
              <Form.Check
                key={player._id}
                id={`player-${player._id}`}
                type="checkbox"
                label={player.name}
                checked={selectedPlayers.includes(player._id)}
                onChange={() => handleTogglePlayer(player._id)}
                style={{ minWidth: '120px' }}
              />
            ))}
          </div>
        </Col>
      </Row>

      {/* If date range not selected, show message */}
      {!startDate || !endDate ? (
        <Alert variant="info" className="text-center">
          Please select a start date and end date.
        </Alert>
      ) : // If we have Force-Velocity data but it's empty
      !fvData || fvData.length === 0 ? (
        <Alert variant="info" className="text-center">
          No data found.
        </Alert>
      ) : (
        <>
          {/* Force-Velocity Table */}
          <Table striped bordered hover responsive className="table-sm text-center">
            <thead className="table-dark">
              <tr>
                <th>Player Name</th>
                <th>Number Sessions</th>
              </tr>
            </thead>
            <tbody>
              {fvData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.playerName}</td>
                  <td>{row.numberSessions}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Simple button below table */}
          <div className="text-center mt-3">
            <Button variant="primary" onClick={handleButtonClick}>
              Run Analysis
            </Button>
          </div>
        </>
      )}
    </Container>
  );
};

export default ForceVelocityScreen;
