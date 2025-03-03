import React, { useState } from 'react';
import {
  Table,
  Button,
  Container,
  Alert,
  Row,
  Col,
  Form,
  Pagination
} from 'react-bootstrap';
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';
import { FaChartLine } from "react-icons/fa6";
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
import SessionCharts from '../components/SessionCharts'; // Import the two-charts component

const SessionManagementScreen = () => {
  // Fetch sessions and define mutations
  const { data, isLoading, error, refetch } = useGetSessionsQuery();
  const [createSession, { isLoading: loadingCreate }] = useCreateSessionMutation();
  const [deleteSession, { isLoading: loadingDelete }] = useDeleteSessionMutation();
  const [updateSession, { isLoading: loadingUpdate }] = useUpdateSessionMutation();

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newSessionId, setNewSessionId] = useState(null);

  // Sorting, filtering, and search state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New state for chart display (session id for which the chart is shown)
  const [chartSessionId, setChartSessionId] = useState(null);

  // Handle sorting when a header is clicked
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  let sortedSessions = data ? [...data] : [];
  if (sortConfig.key) {
    sortedSessions.sort((a, b) => {
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];

      // Compare durations as numbers
      if (sortConfig.key === 'duration') {
        return sortConfig.direction === 'asc'
          ? Number(valueA) - Number(valueB)
          : Number(valueB) - Number(valueA);
      }
      // Compare dates
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      // Compare splits based on array length
      if (sortConfig.key === 'splits' && Array.isArray(valueA) && Array.isArray(valueB)) {
        return sortConfig.direction === 'asc'
          ? valueA.length - valueB.length
          : valueB.length - valueA.length;
      }
      // If values are numbers
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      // If values are strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortConfig.direction === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      return 0;
    });
  }

  // Apply filter and search
  let filteredSessions = [...sortedSessions];
  if (filterType !== 'All' && filterType.trim() !== '') {
    filteredSessions = filteredSessions.filter(
      (session) => session.type?.toLowerCase() === filterType.toLowerCase()
    );
  }
  if (searchTerm.trim() !== '') {
    filteredSessions = filteredSessions.filter((session) =>
      session.sessionName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Calculate pagination details
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle deletion modal
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

  // Handle add session via the modal
  const handleAddSession = async (sessionPlayerData) => {
    try {
      const response = await createSession(sessionPlayerData).unwrap();
      // Return the created session object (adjust if your API returns a different structure)
      return response.session || response;
    } catch (error) {
      throw error;
    }
  };

  // Use the same edit handler from your original code
  const handleEditClick = (session) => {
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleEditSession = async (sessionPlayerData) => {
    try {
      await updateSession(sessionPlayerData).unwrap();
      toast.success('Session updated successfully!', { position: 'top-right' });
      refetch();
      setShowEditModal(false);
      setSelectedSession(null);
    } catch (err) {
      toast.error('Failed to update session.', { position: 'top-right' });
    }
  };

  // Build a list of unique session types for filtering
  const uniqueTypes = [...new Set(sortedSessions.map((session) => session.type))];

  // When a session is successfully created, open the CSV upload modal
  const handleSessionCreated = (newSession) => {
    setNewSessionId(newSession._id);
    setShowCSVModal(true);
  };

  // Toggle the chart display when clicking the magnifying glass button
  const handleShowChart = (sessionId) => {
    if (chartSessionId === sessionId) {
      // If already open, close it
      setChartSessionId(null);
    } else {
      // Open chart for the clicked session
      setChartSessionId(sessionId);
    }
  };

  return (
    <Container>
      <Row className="align-items-center my-4">
        <Col>
          <h2>Session Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" className="btn-sm" onClick={() => setShowAddModal(true)}>
            <FaPlus />
          </Button>
        </Col>
      </Row>

      {/* Filter and Search */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="filterType">
            <Form.Label>Filter by Type</Form.Label>
            <Form.Control
              as="select"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
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

      {isLoading || loadingDelete ? (
        <Loader />
      ) : error ? (
        <Alert variant="info" className="text-center">
          No session found.
        </Alert>
      ) : filteredSessions.length > 0 ? (
        <>
          <Table striped bordered hover responsive className="table-sm">
            <thead className="table-dark">
              <tr>
                <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>
                  Team{' '}
                  {sortConfig.key === 'teamName'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('sessionName')} style={{ cursor: 'pointer' }}>
                  Session Name{' '}
                  {sortConfig.key === 'sessionName'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                  Date{' '}
                  {sortConfig.key === 'date'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('number')} style={{ cursor: 'pointer' }}>
                  Number{' '}
                  {sortConfig.key === 'number'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                  Type{' '}
                  {sortConfig.key === 'type'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('duration')} style={{ cursor: 'pointer' }}>
                  Duration{' '}
                  {sortConfig.key === 'duration'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('avgDistance')} style={{ cursor: 'pointer' }}>
                  Avg Distance{' '}
                  {sortConfig.key === 'avgDistance'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th onClick={() => handleSort('splits')} style={{ cursor: 'pointer' }}>
                  Splits{' '}
                  {sortConfig.key === 'splits'
                    ? sortConfig.direction === 'asc'
                      ? <FaSortUp />
                      : <FaSortDown />
                    : null}
                </th>
                <th>Notes</th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((session) => (
                <tr key={session._id}>
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
                  <td>{Array.isArray(session.splits) ? session.splits.length : 0}</td>
                  <td>{session.notes || 'N/A'}</td>
                  <td>
                    <Button
                      variant="light"
                      className="btn-sm mx-2"
                      onClick={() => handleEditClick(session)}
                    >
                      <FaEdit />
                    </Button>
                  </td>
                  <td>
                    <Button
                      variant="light"
                      className="btn-sm mx-2"
                      onClick={() => handleDeleteClick(session)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                  <td>
                    <Button
                      variant="light"
                      className="btn-sm mx-2"
                      onClick={() => handleShowChart(session._id)}
                    >
                      <FaChartLine />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination Controls */}
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

          {/* Render the TWO charts if a session is selected */}
          {chartSessionId && (
            <SessionCharts sessionId={chartSessionId} />
          )}
        </>
      ) : (
        <Alert variant="info">No sessions found.</Alert>
      )}

      {/* Confirm deletion modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        message={`Are you sure you want to delete the session "${selectedSession?.sessionName}"?`}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddSession={handleAddSession}
        onAddSessionSuccess={handleSessionCreated}
      />

      {/* Edit Session Modal */}
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
};

export default SessionManagementScreen;
