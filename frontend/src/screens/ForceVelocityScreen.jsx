// file: src/screens/ForceVelocityScreen.jsx

import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Alert,
  Button,
} from 'react-bootstrap';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { useGetPlayersQuery } from '../slices/playersApiSlice';
import {
  useGetForceVelocityDataQuery,
  useRunForceVelocityAnalysisMutation,
} from '../slices/forceVelocityApiSlice';

const ForceVelocityScreen = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grouping, setGrouping] = useState('week'); // 'none' | 'day' | 'week' | 'month'
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [analysisValue, setAnalysisValue] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  // Sorting config (if you need it for the table)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  // 3) Mutation to run local Python script & store doc
  const [runAnalysis, { isLoading: loadingAnalysis }] =
    useRunForceVelocityAnalysisMutation();

  // Are we busy?
  const isBusy =
    loadingPlayers || fetchingPlayers || loadingFV || fetchingFV || loadingAnalysis;

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
    if (!playersData?.players) return;
    if (e.target.checked) {
      const allIds = playersData.players.map((p) => p._id);
      setSelectedPlayers(allIds);
    } else {
      setSelectedPlayers([]);
    }
  };

  // Sorting for the table (if you need it)
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Build table data
  const tableData = useMemo(() => {
    if (!fvData || !Array.isArray(fvData)) return [];
    const dataCopy = [...fvData];

    if (sortConfig.key) {
      dataCopy.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (typeof valA === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return dataCopy;
  }, [fvData, sortConfig]);

  // Handler for analysis button
  const handleAnalysisClick = async () => {
    try {
      // Prepare the request body
      const payload = {
        analysisValue,
        startDate,
        endDate,
        grouping,
        playerIds: selectedPlayers,
      };
      // Run analysis, save doc, get the doc back
      const result = await runAnalysis(payload).unwrap();
      setAnalysisResult(result);
      console.log('Analysis doc:', result);
    } catch (err) {
      console.error('Error running analysis:', err);
    }
  };

  // If busy, show loader
  if (isBusy) {
    return <Loader />;
  }

  // If error loading players
  if (errorPlayers) {
    return <Message variant="danger">{errorPlayers.message}</Message>;
  }

  // Prepare players
  const allPlayers = playersData?.players || [];
  const isSelectAllChecked =
    allPlayers.length > 0 && selectedPlayers.length === allPlayers.length;

  return (
    <Container>
      <h2 className="my-4 text-center">Force‐Velocity Analysis</h2>

      {/* Start & End Date */}
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

      {/* Grouping + Select All */}
      <Row className="mb-4 justify-content-center">
        <Col
          md="auto"
          className="d-inline-flex align-items-center"
          style={{ gap: '1rem' }}
        >
          <span className="fw-bold">Group By:</span>
          
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

      {/* Player Checkboxes */}
      <Row className="mb-3 justify-content-center">
        <Col className="text-center">
          <div
            className="d-flex flex-wrap justify-content-center"
            style={{ gap: '1rem' }}
          >
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

      {/* Force Velocity Table */}
      {!startDate || !endDate ? (
        <Alert variant="info" className="text-center">
          Please select a start date and end date.
        </Alert>
      ) : !fvData || fvData.length === 0 ? (
        <Alert variant="info" className="text-center">
          No data found.
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="table-sm text-center">
          <thead className="table-dark">
            <tr>
              <th
                onClick={() => handleSort('playerName')}
                style={{ cursor: 'pointer' }}
              >
                Player Name{' '}
                {sortConfig.key === 'playerName' &&
                  (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
              <th
                onClick={() => handleSort('numberSessions')}
                style={{ cursor: 'pointer' }}
              >
                Number Sessions{' '}
                {sortConfig.key === 'numberSessions' &&
                  (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.playerName}</td>
                <td>{row.numberSessions}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Analysis input + button */}
      <Row className="justify-content-center mt-4">
        <Col md={4} className="text-center">
          <Form.Group controlId="analysisValue" className="mb-2">
            <Form.Label>Analysis Value</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter a value"
              value={analysisValue}
              onChange={(e) => setAnalysisValue(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" onClick={handleAnalysisClick}>
            Run Analysis
          </Button>
        </Col>
      </Row>

      {/* Display result if available */}
      {analysisResult && (
        <Row className="justify-content-center mt-4">
          <Col md={4} className="text-center border p-3">
            <h5>Analysis Result</h5>
            <p>Max Speed: {analysisResult.maxSpeed}</p>
            <p>Max Accel: {analysisResult.maxAccel}</p>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default ForceVelocityScreen;
