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
  const [grouping, setGrouping] = useState('none'); // 'none' | 'day' | 'week' | 'month'
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [analysisValue, setAnalysisValue] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
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

  // 3) Mutation to run analysis (calls the Python script)
  const [runForceVelocityAnalysis, { isLoading: loadingAnalysis }] =
    useRunForceVelocityAnalysisMutation();

  // Reset current selections when dates or players change (if needed)
  useEffect(() => {
    // You may add additional actions here
  }, [selectedPlayers, startDate, endDate]);

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

  // Sorting (if needed later; currently no search/filter options are provided)
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Prepare table data from ForceVelocity API data
  const tableData = useMemo(() => {
    if (!fvData || !Array.isArray(fvData)) return [];
    let filtered = fvData;

    if (sortConfig.key) {
      filtered.sort((a, b) => {
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
    return filtered;
  }, [fvData, sortConfig]);

  // Show loader if data is loading/refetching
  if (
    loadingPlayers ||
    fetchingPlayers ||
    loadingFV ||
    fetchingFV ||
    loadingAnalysis
  ) {
    return <Loader />;
  }
  if (errorPlayers)
    return <Message variant="danger">{errorPlayers.message}</Message>;

  const allPlayers = playersData?.players || [];
  const isSelectAllChecked =
    allPlayers.length > 0 && selectedPlayers.length === allPlayers.length;

  // Handler for analysis button click: pass the analysisValue to the python script via the API
  const handleAnalysisClick = async () => {
    try {
      const result = await runForceVelocityAnalysis(analysisValue).unwrap();
      setAnalysisResult(result);
      console.log('Analysis result:', result);
    } catch (error) {
      console.error('Error running analysis:', error);
    }
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

      {/* Row for grouping radio + "Select All Players" checkboxes */}
      <Row className="mb-4 justify-content-center">
        <Col
          md="auto"
          className="d-inline-flex align-items-center"
          style={{ gap: '1rem' }}
        >
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

      {/* Force Velocity Data Table or fallback messages */}
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
              <th onClick={() => handleSort('playerName')} style={{ cursor: 'pointer' }}>
                Player Name {sortConfig.key === 'playerName' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
              <th onClick={() => handleSort('numberSessions')} style={{ cursor: 'pointer' }}>
                Number Sessions {sortConfig.key === 'numberSessions' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
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
      )}

      {/* Input field and button to run analysis */}
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

      {/* Display analysis result if available */}
      {analysisResult && (
        <Row className="justify-content-center mt-4">
          <Col md={4} className="text-center border p-3">
            <h5>Analysis Result</h5>
            <p>Max Speed: {analysisResult.MaxSpeed}</p>
            <p>Max Accel: {analysisResult.MaxAccel}</p>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default ForceVelocityScreen;
