import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Container,
  Alert,
  Row,
  Col,
  Form,
  Pagination,
} from 'react-bootstrap';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { useGetSessionsQuery } from '../slices/sessionsApiSlice';

const PlayByPlayAnalysisScreen = () => {
  // 1) Fetch all sessions
  const { data: sessions, isLoading, error } = useGetSessionsQuery();

  // 2) Flatten all plays
  const [allPlays, setAllPlays] = useState([]);

  useEffect(() => {
    if (sessions && Array.isArray(sessions)) {
      const combined = [];
      sessions.forEach((session) => {
        if (Array.isArray(session.plays) && session.plays.length > 0) {
          session.plays.forEach((play) => {
            combined.push({
              // Keep track of session info
              sessionId: session._id,
              sessionName: session.sessionName,
              // Merge the play fields
              ...play,
            });
          });
        }
      });
      setAllPlays(combined);
    }
  }, [sessions]);

  // ====== Sorting & Filtering & Pagination State ======
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterTeamStart, setFilterTeamStart] = useState('All');
  const [filterTeamEnd, setFilterTeamEnd] = useState('All');
  const [filterStartAction, setFilterStartAction] = useState('All');
  const [filterEndAction, setFilterEndAction] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ====== Sorting ======
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  let sortedPlays = [...allPlays];
  if (sortConfig.key) {
    sortedPlays.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // numeric
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      // string
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return 0;
    });
  }

  // ====== Unique Values for Filtering ======
  const uniqueTeamStarts = [
    ...new Set(allPlays.map((p) => p.teamStartPosession).filter(Boolean)),
  ];
  const uniqueTeamEnds = [
    ...new Set(allPlays.map((p) => p.teamEndPosession).filter(Boolean)),
  ];
  const uniqueStartActions = [
    ...new Set(allPlays.map((p) => p.startAction).filter(Boolean)),
  ];
  const uniqueEndActions = [
    ...new Set(allPlays.map((p) => p.endAction).filter(Boolean)),
  ];

  // ====== Filtering ======
  let filteredPlays = [...sortedPlays];
  if (filterTeamStart !== 'All') {
    filteredPlays = filteredPlays.filter(
      (play) =>
        play.teamStartPosession?.toLowerCase() === filterTeamStart.toLowerCase()
    );
  }
  if (filterTeamEnd !== 'All') {
    filteredPlays = filteredPlays.filter(
      (play) =>
        play.teamEndPosession?.toLowerCase() === filterTeamEnd.toLowerCase()
    );
  }
  if (filterStartAction !== 'All') {
    filteredPlays = filteredPlays.filter(
      (play) => play.startAction?.toLowerCase() === filterStartAction.toLowerCase()
    );
  }
  if (filterEndAction !== 'All') {
    filteredPlays = filteredPlays.filter(
      (play) => play.endAction?.toLowerCase() === filterEndAction.toLowerCase()
    );
  }

  // ====== Pagination ======
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPlays.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPlays.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ====== Render ======
  if (isLoading) {
    return (
      <Container className="mt-4">
        <h1>Play By Play Analysis</h1>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <h1>Play By Play Analysis</h1>
        <Message variant="danger">
          {error.data?.message || error.error || 'An error occurred.'}
        </Message>
      </Container>
    );
  }

  if (!allPlays.length) {
    return (
      <Container className="mt-4">
        <h1>Play By Play Analysis</h1>
        <Alert variant="info">No plays found in any session.</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h1>Play By Play Analysis</h1>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by Team Start</Form.Label>
            <Form.Control
              as="select"
              value={filterTeamStart}
              onChange={(e) => {
                setFilterTeamStart(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueTeamStarts.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by Team End</Form.Label>
            <Form.Control
              as="select"
              value={filterTeamEnd}
              onChange={(e) => {
                setFilterTeamEnd(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueTeamEnds.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
      
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by Start Action</Form.Label>
            <Form.Control
              as="select"
              value={filterStartAction}
              onChange={(e) => {
                setFilterStartAction(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueStartActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filter by End Action</Form.Label>
            <Form.Control
              as="select"
              value={filterEndAction}
              onChange={(e) => {
                setFilterEndAction(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueEndActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>

      <Table striped bordered hover responsive className="table-sm">
        <thead className="table-dark">
          <tr>
            <th>Session</th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('title')}
            >
              Title{' '}
              {sortConfig.key === 'title' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('playNumber')}
            >
              Play #
              {sortConfig.key === 'playNumber' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('timeStart')}
            >
              Time Start
              {sortConfig.key === 'timeStart' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('timeEnd')}
            >
              Time End
              {sortConfig.key === 'timeEnd' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            {/* ADD half and duration columns */}
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('half')}
            >
              Half
              {sortConfig.key === 'half' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('duration')}
            >
              Duration
              {sortConfig.key === 'duration' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('teamStartPosession')}
            >
              Team Start
              {sortConfig.key === 'teamStartPosession' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('teamEndPosession')}
            >
              Team End
              {sortConfig.key === 'teamEndPosession' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('turnovers')}
            >
              Turnovers
              {sortConfig.key === 'turnovers' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('startAction')}
            >
              Start Action
              {sortConfig.key === 'startAction' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('endAction')}
            >
              End Action
              {sortConfig.key === 'endAction' &&
                (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((play) => (
            <tr key={play._id || Math.random()}>
              <td>{play.sessionName}</td>
              <td>{play.title}</td>
              <td>{play.playNumber}</td>
              <td>{play.timeStart}</td>
              <td>{play.timeEnd}</td>
              <td>{play.half}</td>
              <td>{play.duration}</td>
              <td>{play.teamStartPosession}</td>
              <td>{play.teamEndPosession}</td>
              <td>{play.turnovers}</td>
              <td>{play.startAction}</td>
              <td>{play.endAction}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {[...Array(totalPages).keys()].map((num) => (
            <Pagination.Item
              key={num + 1}
              active={num + 1 === currentPage}
              onClick={() => paginate(num + 1)}
            >
              {num + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}
    </Container>
  );
};

export default PlayByPlayAnalysisScreen;
