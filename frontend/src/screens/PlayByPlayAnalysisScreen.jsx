// src/screens/PlayByPlayAnalysisScreen.jsx
import React, { useState } from 'react';
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
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa';
import { FaChartLine, FaListUl } from 'react-icons/fa6';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
} from '../slices/sessionsApiSlice';
import AddSessionModal from '../components/SessionManagement/AddSessionModal';
import EditSessionModal from '../components/SessionManagement/EditSessionModal';
import AddCSVModal from '../components/SessionManagement/AddCSVModal';
import SessionPlaysCharts from '../components/SessionPlaysCharts'; // <-- Updated import

export default function PlayByPlayAnalysisScreen() {
  // 1) Fetch all sessions
  const { data, isLoading, error, refetch } = useGetSessionsQuery();

  // 2) Filter sessions to only those with type='game'
  const gameSessions = data
    ? data.filter((session) => session.type?.toLowerCase() === 'game')
    : [];

  // 3) RTK Query mutations
  const [createSession] = useCreateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();
  const [updateSession] = useUpdateSessionMutation();

  // 4) Modal & state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newSessionId, setNewSessionId] = useState(null);

  // 5) Sorting, search, pagination
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 6) Expand/collapse states for chart & plays
  const [chartSessionId, setChartSessionId] = useState(null);
  const [playsSessionId, setPlaysSessionId] = useState(null);

  // ====== Sorting ======
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  let sortedSessions = [...gameSessions];
  if (sortConfig.key) {
    sortedSessions.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // Compare durations as numbers
      if (sortConfig.key === 'duration') {
        return sortConfig.direction === 'asc'
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }
      // Compare dates
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      // Compare splits based on array length
      if (
        sortConfig.key === 'splits' &&
        Array.isArray(valA) &&
        Array.isArray(valB)
      ) {
        return sortConfig.direction === 'asc'
          ? valA.length - valB.length
          : valB.length - valA.length;
      }
      // If values are numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      // If values are strings
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return 0;
    });
  }

  // ====== Search by sessionName ======
  let filteredSessions = [...sortedSessions];
  if (searchTerm.trim() !== '') {
    filteredSessions = filteredSessions.filter((session) =>
      session.sessionName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // ====== Pagination ======
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ====== Add Session ======
  const handleAddSession = async (sessionData) => {
    const response = await createSession(sessionData).unwrap();
    return response.session || response;
  };
  const handleSessionCreated = (newSession) => {
    setNewSessionId(newSession._id);
    setShowCSVModal(true);
  };

  // ====== Edit Session ======
  const handleEditClick = (session) => {
    setSelectedSession(session);
    setShowEditModal(true);
  };
  const handleEditSession = async (sessionData) => {
    await updateSession(sessionData).unwrap();
    toast.success('Session updated successfully!', { position: 'top-right' });
    refetch();
    setShowEditModal(false);
    setSelectedSession(null);
  };

  // ====== Delete Session ======
  const handleDeleteClick = (session) => {
    setSelectedSession(session);
    setShowConfirm(true);
  };
  const handleConfirmDeletion = async () => {
    if (!selectedSession) return;
    try {
      await deleteSession(selectedSession._id).unwrap();
      refetch();
      toast.success('Session deleted successfully!', { position: 'top-right' });
    } catch (err) {
      toast.error('Failed to delete session.', { position: 'top-right' });
    } finally {
      setShowConfirm(false);
      setSelectedSession(null);
    }
  };
  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedSession(null);
  };

  // ====== Toggle Chart & Plays ======
  const toggleChart = (sessionId) => {
    setChartSessionId((prev) => (prev === sessionId ? null : sessionId));
  };
  const togglePlays = (sessionId) => {
    setPlaysSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  // ====== Old Plays Table Filters ======
  const [filterTeamStart, setFilterTeamStart] = useState('All');
  const [filterTeamEnd, setFilterTeamEnd] = useState('All');
  const [filterStartAction, setFilterStartAction] = useState('All');
  const [filterEndAction, setFilterEndAction] = useState('All');

  // Use consistent property names: "teamStartPossession" and "teamEndPossession"
  const filterPlays = (session) => {
    if (!session || !Array.isArray(session.plays)) return [];
    let plays = [...session.plays];

    if (filterTeamStart !== 'All') {
      plays = plays.filter(
        (p) =>
          p.teamStartPossession?.toLowerCase() === filterTeamStart.toLowerCase()
      );
    }
    if (filterTeamEnd !== 'All') {
      plays = plays.filter(
        (p) =>
          p.teamEndPossession?.toLowerCase() === filterTeamEnd.toLowerCase()
      );
    }
    if (filterStartAction !== 'All') {
      plays = plays.filter(
        (p) => p.startAction?.toLowerCase() === filterStartAction.toLowerCase()
      );
    }
    if (filterEndAction !== 'All') {
      plays = plays.filter(
        (p) => p.endAction?.toLowerCase() === filterEndAction.toLowerCase()
      );
    }
    return plays;
  };

  // Also unify here: "teamStartPossession" and "teamEndPossession"
  function getUniqueValues(session, key) {
    if (!session || !Array.isArray(session.plays)) return [];
    return [...new Set(session.plays.map((p) => p[key]).filter(Boolean))];
  }

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
        <h2>Play By Play Analysis</h2>
        <Alert variant="info" className="text-center">
          No session found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      {/* Page heading and Add button */}
      <Row className="align-items-center my-4">
        <Col>
          <h2>Play By Play Analysis</h2>
        </Col>
      </Row>

      {/* Always show the search bar, even if no sessions found */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="searchTerm">
            <Form.Label>Search by Session Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* If no sessions after filtering, show "No data found" but keep filters */}
      {filteredSessions.length === 0 ? (
        <Alert variant="info">No data found.</Alert>
      ) : (
        <>
          <Table striped bordered hover className="table-sm">
            <thead className="table-dark">
              <tr>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('teamName')}
                >
                  Team{' '}
                  {sortConfig.key === 'teamName' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('sessionName')}
                >
                  Session Name{' '}
                  {sortConfig.key === 'sessionName' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('date')}
                >
                  Date{' '}
                  {sortConfig.key === 'date' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('number')}
                >
                  Number{' '}
                  {sortConfig.key === 'number' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('type')}
                >
                  Type{' '}
                  {sortConfig.key === 'type' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('duration')}
                >
                  Duration{' '}
                  {sortConfig.key === 'duration' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('avgDistance')}
                >
                  Avg Distance{' '}
                  {sortConfig.key === 'avgDistance' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('splits')}
                >
                  Splits{' '}
                  {sortConfig.key === 'splits' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th>Notes</th>
                {/* Edit, Delete, Chart, Plays */}
                <th></th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((session) => (
                <React.Fragment key={session._id}>
                  <tr>
                    <td>{session.teamName}</td>
                    <td>{session.sessionName}</td>
                    <td>{new Date(session.date).toLocaleDateString()}</td>
                    <td>{session.sessionPlayerData?.length || 0}</td>
                    <td>{session.type}</td>
                    <td>{session.duration || 'N/A'}</td>
                    <td>
                      {session.avgDistance
                        ? session.avgDistance.toFixed(2) + ' km/s'
                        : 'N/A'}
                    </td>
                    <td>
                      {Array.isArray(session.splits) ? session.splits.length : 0}
                    </td>
                    <td>{session.notes || 'N/A'}</td>
                    {/* Edit button */}
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm mx-2"
                        onClick={() => handleEditClick(session)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                    {/* Delete button */}
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm mx-2"
                        onClick={() => handleDeleteClick(session)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                    {/* Chart icon */}
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm mx-2"
                        onClick={() => toggleChart(session._id)}
                      >
                        <FaChartLine />
                      </Button>
                    </td>
                    {/* Plays icon */}
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm mx-2"
                        onClick={() => togglePlays(session._id)}
                      >
                        <FaListUl />
                      </Button>
                    </td>
                  </tr>

                  {/* If chartSessionId === session._id, expand row with SessionPlaysCharts */}
                  {chartSessionId === session._id && (
                    <tr>
                      <td colSpan={13}>
                        <SessionPlaysCharts sessionId={session._id} />
                      </td>
                    </tr>
                  )}

                  {/* If playsSessionId === session._id, expand row with old plays table + filters */}
                  {playsSessionId === session._id && (
                    <tr>
                      <td colSpan={13}>
                        {/* Plays filters */}
                        {Array.isArray(session.plays) && session.plays.length > 0 ? (
                          <>
                            <Row className="mb-3">
                              <Col md={3}>
                                <Form.Group>
                                  <Form.Label>Filter by Team Start</Form.Label>
                                  <Form.Control
                                    as="select"
                                    value={filterTeamStart}
                                    onChange={(e) => setFilterTeamStart(e.target.value)}
                                  >
                                    <option value="All">All</option>
                                    {getUniqueValues(session, 'teamStartPossession').map((val) => (
                                      <option key={val} value={val}>
                                        {val}
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
                                    onChange={(e) => setFilterTeamEnd(e.target.value)}
                                  >
                                    <option value="All">All</option>
                                    {getUniqueValues(session, 'teamEndPossession').map((val) => (
                                      <option key={val} value={val}>
                                        {val}
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
                                    onChange={(e) => setFilterStartAction(e.target.value)}
                                  >
                                    <option value="All">All</option>
                                    {getUniqueValues(session, 'startAction').map((val) => (
                                      <option key={val} value={val}>
                                        {val}
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
                                    onChange={(e) => setFilterEndAction(e.target.value)}
                                  >
                                    <option value="All">All</option>
                                    {getUniqueValues(session, 'endAction').map((val) => (
                                      <option key={val} value={val}>
                                        {val}
                                      </option>
                                    ))}
                                  </Form.Control>
                                </Form.Group>
                              </Col>
                            </Row>

                            {/* Old plays table */}
                            <Table striped bordered hover className="table-sm">
                              <thead className="table-dark">
                                <tr>
                                  <th>Title</th>
                                  <th>Play</th>
                                  <th>Half</th>
                                  <th>Duration (seconds)</th>
                                  <th>Numb Sprints</th>
                                  <th>Avg Distance</th>
                                  <th>Team Start Possession</th>
                                  <th>Team End Possession</th>
                                  <th>Turnovers</th>
                                  <th>Start Action</th>
                                  <th>End Action</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {filterPlays(session).map((play) => (
                                  <tr key={play._id}>
                                    <td>{play.title}</td>
                                    <td>{play.playNumber}</td>
                                    <td>{play.half}</td>
                                    <td>{play.duration}</td>
                                    <td>{play.numbsprints}</td>
                                    <td>{play.avgdistance}</td>
                                    <td>{play.teamStartPossession}</td>
                                    <td>{play.teamEndPossession}</td>
                                    <td>{play.turnovers}</td>
                                    <td>{play.startAction}</td>
                                    <td>{play.endAction}</td>
                                    <td>
                                      <Button variant="light" className="btn-sm mx-2">
                                        <FaChartLine />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </>
                        ) : (
                          <Alert variant="info">No plays found for this session.</Alert>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
        </>
      )}

      {/* ConfirmDeletion modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        message={`Are you sure you want to delete the session "${selectedSession?.sessionName}"?`}
      />

      {/* AddSession Modal */}
      <AddSessionModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddSession={handleAddSession}
        onAddSessionSuccess={handleSessionCreated}
      />

      {/* EditSession Modal */}
      <EditSessionModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEditSession={handleEditSession}
        onRefreshSessions={refetch}
        session={selectedSession}
      />

      {/* CSV Upload Modal */}
      <AddCSVModal
        show={showCSVModal}
        onHide={() => {
          setShowCSVModal(false);
          refetch();
        }}
        sessionId={newSessionId}
      />
    </Container>
  );
}
