// src/screens/SessionManagementScreen.js
import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSortUp, FaSortDown } from 'react-icons/fa';
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

const SessionManagementScreen = () => {
  // Fetch sessions using RTK Query
  const { data, isLoading, error, refetch } = useGetSessionsQuery();
//console.log("Fetched Sessions:", data); 

  const [createSession, { isLoading: loadingCreate }] = useCreateSessionMutation();
  const [deleteSession, { isLoading: loadingDelete }] = useDeleteSessionMutation();
  const [updateSession, { isLoading: loadingUpdate }] = useUpdateSessionMutation();

  // Modal and deletion state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sorting, filtering, and search state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle sorting when a header is clicked
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
  const handleAddSession = async (sessionData) => {
    try {
      await createSession(sessionData).unwrap();
      toast.success('Session added successfully!', { position: 'top-right' });
      refetch();
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to add session.', { position: 'top-right' });
    }
  };

  // Handle edit session
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

  // Sort sessions
  let sortedSessions = [];
  if (data && Array.isArray(data)) {
    sortedSessions = [...data]; // Ensure data is an array
    if (sortConfig.key) {
      sortedSessions.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
  }

  // Build a list of unique session types for filtering
  const uniqueTypes = [...new Set(sortedSessions.map(session => session.type))];

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

  //console.log("Filtered Sessions:", filteredSessions);

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
            <Form.Control as="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      {isLoading || loadingDelete ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error.data?.message || error.error}</Message>
      ) : filteredSessions.length > 0 ? (
        <Table striped bordered hover responsive className="table-sm">
          <thead className="table-dark">
            <tr>
              <th>Team</th>
              <th>Session Name</th>
              <th>Date</th>
              <th>Number</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Splits</th>
              <th>Notes</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session) => (
              <tr key={session._id}>
                <td>{session.teamName || "N/A"}</td>
                <td>{session.sessionName || "N/A"}</td>
                <td>{new Date(session.date).toLocaleDateString()}</td>
                <td>{Array.isArray(session.files) ? session.files.length : 0}</td>
                <td>{session.type || "N/A"}</td>
                <td>{session.duration || "N/A"}</td>
                <td>{Array.isArray(session.splits) ? session.splits.length : 0}</td>
                <td>{session.notes || "N/A"}</td>
                <td><FaEdit onClick={() => handleEditClick(session)} /></td>
                <td><FaTrash onClick={() => handleDeleteClick(session)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info">No sessions found.</Alert>
      )}

      <AddSessionModal show={showAddModal} onHide={() => setShowAddModal(false)} onAddSession={handleAddSession} />
    </Container>
  );
};

export default SessionManagementScreen;
