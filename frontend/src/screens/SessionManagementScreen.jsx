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
  FaSortDown,
  FaCaretDown,
  FaCaretUp,
  FaChartLine
} from 'react-icons/fa';
import ConfirmDeletion from '../components/ConfirmDeletion';
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
import SessionCharts from '../components/SessionCharts';

const SessionManagementScreen = () => {
  // ----- 1) Fetch sessions + define mutations -----
  const { data, isLoading, error, refetch } = useGetSessionsQuery();
  const [createSession, { isLoading: loadingCreate }] = useCreateSessionMutation();
  const [deleteSession, { isLoading: loadingDelete }] = useDeleteSessionMutation();
  const [updateSession, { isLoading: loadingUpdate }] = useUpdateSessionMutation();

  // ----- 2) Modal + state -----
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newSessionId, setNewSessionId] = useState(null);
  // Local state for refresh loader after CSV changes
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  // ----- 3) Sorting, filtering, search -----
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // ----- 4) Pagination -----
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ----- 5) Chart display -----
  const [chartSessionId, setChartSessionId] = useState(null);

  // For expanded rows to show split details
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRowExpansion = (sessionId) => {
    if (expandedRows.includes(sessionId)) {
      setExpandedRows(expandedRows.filter(id => id !== sessionId));
    } else {
      setExpandedRows([...expandedRows, sessionId]);
    }
  };

  // ----- Sorting -----
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ----- Filter, Search, Sort data -----
  let sortedSessions = data ? [...data] : [];
  if (sortConfig.key) {
    sortedSessions.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number') {
        return sortConfig.direction === 'asc'
          ? valA - valB
          : valB - valA;
      }
      return 0;
    });
  }

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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ----- Delete -----
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

  // ----- Create -----
  const handleAddSession = async (sessionData) => {
    try {
      const response = await createSession(sessionData).unwrap();
      return response.session || response; // depends on your API response
    } catch (error) {
      throw error;
    }
  };
  const handleSessionCreated = (newSession) => {
    setNewSessionId(newSession._id);
    setShowCSVModal(true);
  };

  // ----- Edit -----
  const handleEditClick = (session) => {
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleEditSession = async (sessionData) => {
    try {
      await updateSession(sessionData).unwrap();
      toast.success('Session updated successfully!', { position: 'top-right' });
      refetch();
      setShowEditModal(false);
      setSelectedSession(null);
    } catch (err) {
      toast.error('Failed to update session.', { position: 'top-right' });
    }
  };

  // ----- Chart toggle -----
  const handleShowChart = (sessionId) => {
    setChartSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  // ----- CSV Modal Closure with Refresh Loader -----
  const handleCSVModalClose = async () => {
    setShowCSVModal(false);
    setLoadingRefresh(true);
    await refetch();
    setLoadingRefresh(false);
  };

  // ----- Render -----
  if (isLoading || loadingDelete || loadingCreate || loadingUpdate || loadingRefresh) {
    return <Loader />;
  }
  if (error) {
    return <Alert variant="danger">Error loading sessions.</Alert>;
  }

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

      {/* Filter & Search */}
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
              {[...new Set(sortedSessions.map((s) => s.type))].map((type) => (
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

      {filteredSessions.length === 0 ? (
        <Alert variant="info">No sessions found.</Alert>
      ) : (
        <>
          <Table striped bordered hover responsive className="table-sm">
            <thead className="table-dark">
              <tr>
                <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>
                  Team {sortConfig.key === 'teamName' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('sessionName')} style={{ cursor: 'pointer' }}>
                  Session Name {sortConfig.key === 'sessionName' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('number')} style={{ cursor: 'pointer' }}>
                  Number {sortConfig.key === 'number' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                  Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('duration')} style={{ cursor: 'pointer' }}>
                  Duration {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('avgDistance')} style={{ cursor: 'pointer' }}>
                  Avg Distance {sortConfig.key === 'avgDistance' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('splits')} style={{ cursor: 'pointer' }}>
                  Splits {sortConfig.key === 'splits' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th>Notes</th>
                <th>Split Details</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Chart</th>
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
                      {session.avgDistance ? session.avgDistance.toFixed(2) + ' km' : 'N/A'}
                    </td>
                    <td>{Array.isArray(session.splits) ? session.splits.length : 0}</td>
                    <td>{session.notes || 'N/A'}</td>
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm"
                        onClick={() => toggleRowExpansion(session._id)}
                      >
                        {expandedRows.includes(session._id) ? <FaCaretUp /> : <FaCaretDown />}
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm"
                        onClick={() => handleEditClick(session)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm"
                        onClick={() => handleDeleteClick(session)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="light"
                        className="btn-sm"
                        onClick={() => handleShowChart(session._id)}
                      >
                        <FaChartLine />
                      </Button>
                    </td>
                  </tr>
                  {expandedRows.includes(session._id) && (
                    <tr>
                      <td colSpan={13}>
                        <Table striped bordered hover responsive className="table-sm mt-2">
                          <thead>
                            <tr>
                              <th>Title</th>
                              <th>Split Number</th>
                              <th>Start</th>
                              <th>End</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.splits && session.splits.map((split, idx) => (
                              <tr key={idx}>
                                <td>{split.title}</td>
                                <td>{split.splitNumber}</td>
                                <td>{new Date(split.start).toLocaleTimeString()}</td>
                                <td>{new Date(split.end).toLocaleTimeString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
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

          {chartSessionId && <SessionCharts sessionId={chartSessionId} />}
        </>
      )}

      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        message={`Are you sure you want to delete the session "${selectedSession?.sessionName}"?`}
      />

      <AddSessionModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddSession={handleAddSession}
        onAddSessionSuccess={handleSessionCreated}
      />

      <EditSessionModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEditSession={handleEditSession}
        onRefreshSessions={refetch}
        session={selectedSession}
      />

      {/* CSV Modal now uses our handleCSVModalClose to show a loader and refresh sessions */}
      <AddCSVModal
        show={showCSVModal}
        onHide={handleCSVModalClose}
        sessionId={newSessionId}
      />
    </Container>
  );
};

export default SessionManagementScreen;
