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
  useGetForceVelocityDataQuery,
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

  // Fetch Force Velocity data (if already calculated)
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

  // Mutation to run analysis
  const [runAnalysis, { isLoading: loadingAnalysis }] =
    useRunForceVelocityAnalysisMutation();

  const isBusy =
    loadingPlayers || fetchingPlayers || loadingFV || fetchingFV || loadingAnalysis;

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
      setAnalysisResult(result); // result expected as { message, docs: [ ... ], didCalculate }
      console.log('Analysis doc:', result);
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

      {/* Force Velocity Table (without sorting) */}
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
      )}

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

      {/* Display Line Chart if analysis results exist */}
      {analysisResult?.docs && analysisResult.docs.length > 0 && (
        <Row className="mt-5">
          <Col>
            <ForceVelocityLineChart analysisDocs={analysisResult.docs} grouping={grouping} />
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default ForceVelocityScreen;
