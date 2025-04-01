// file: src/screens/ForceVelocityScreen.jsx
import React, { useState } from 'react';
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
import {
  useRunForceVelocityAnalysisMutation,
} from '../slices/forceVelocityApiSlice';
import CalculationModal from '../components/CalculationModal';
import ForceVelocityLineChart from '../components/ForceVelocityLineChart';

const ForceVelocityScreen = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grouping, setGrouping] = useState('week'); // Options: 'none', 'day', 'week', 'month'
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // Fetch players
  const {
    data: playersData,
    isLoading: loadingPlayers,
    isFetching: fetchingPlayers,
    error: errorPlayers,
  } = useGetPlayersQuery();

  // Mutation to run analysis on demand (when button is clicked)
  const [runAnalysis, { isLoading: loadingAnalysis }] =
    useRunForceVelocityAnalysisMutation();

  const isBusy = loadingPlayers || fetchingPlayers || loadingAnalysis;

  // Toggle individual player
  const handleTogglePlayer = (playerId) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Toggle all players
  const handleToggleAllPlayers = (e) => {
    if (!playersData?.players) return;
    if (e.target.checked) {
      const allIds = playersData.players.map((p) => p._id);
      setSelectedPlayers(allIds);
    } else {
      setSelectedPlayers([]);
    }
  };

  // Analysis button handler
  const handleAnalysisClick = async () => {
    setShowCalculationModal(true); // Show modal while calculating
    try {
      const payload = {
        startDate,
        endDate,
        grouping,
        playerIds: selectedPlayers,
      };
      const result = await runAnalysis(payload).unwrap();
      setAnalysisResult(result); // { message, docs: [ ... ] }
      console.log('Analysis result:', result);
    } catch (err) {
      console.error('Error running analysis:', err);
    } finally {
      setShowCalculationModal(false);
    }
  };

  if (isBusy) {
    return <Loader />;
  }
  if (errorPlayers) {
    return <Message variant="danger">{errorPlayers.message}</Message>;
  }

  const allPlayers = playersData?.players || [];
  const isSelectAllChecked =
    allPlayers.length > 0 && selectedPlayers.length === allPlayers.length;

  // ----------------------------------------------------
  // AGGREGATE the docs so each player appears only once.
  // ----------------------------------------------------
  let aggregated = [];
  if (analysisResult?.docs && analysisResult.docs.length > 0) {
    const map = {};
    analysisResult.docs.forEach((doc) => {
      const playerObj = doc.player?.[0];
      if (!playerObj) return;
      const playerId = playerObj.playerId.toString();
      const playerName = playerObj.name || 'Unknown Player';
      if (!map[playerId]) {
        map[playerId] = { name: playerName, totalSessions: 0 };
      }
      // Each doc.number = # of sessions in that time bucket
      map[playerId].totalSessions += doc.number;
    });
    aggregated = Object.values(map); // => [{ name, totalSessions }, ...]
  }

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
        <Col md="auto" className="d-inline-flex align-items-center" style={{ gap: '1rem' }}>
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

      {/* Analysis Button */}
      <Row className="justify-content-center mt-4">
        <Col md={4} className="text-center">
          <Button variant="primary" onClick={handleAnalysisClick}>
            Run Analysis
          </Button>
        </Col>
      </Row>

      {/* Calculation Modal */}
      <CalculationModal
        show={showCalculationModal}
        onHide={() => setShowCalculationModal(false)}
      />

      {/* Display Table and Line Chart only after clicking Run Analysis */}
      {analysisResult?.docs && analysisResult.docs.length > 0 ? (
        <>
          <Row className="mt-5">
            <Col>
              <Table striped bordered hover responsive className="table-sm text-center">
                <thead className="table-dark">
                  <tr>
                    <th>Player Name</th>
                    <th>Number Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.totalSessions}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>

          {/* Chart (optional multiple data points) */}
          <Row className="mt-5">
            <Col>
              <ForceVelocityLineChart
                analysisDocs={analysisResult.docs}
                grouping={grouping}
              />
            </Col>
          </Row>
        </>
      ) : (
        <Row className="mt-5">
          <Col>
            <Alert variant="info" className="text-center">
              Calculations will appear here
            </Alert>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default ForceVelocityScreen;
