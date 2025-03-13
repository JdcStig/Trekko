import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Container, Alert, Row, Col, Form, Pagination } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSortUp, FaSortDown } from 'react-icons/fa';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useSelector } from 'react-redux';
import { 
  useGetPlayersQuery, 
  useDeletePlayerMutation, 
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
} from '../slices/playersApiSlice';
import AddPlayerModal from '../components/Player/AddPlayerModal';
import EditPlayerModal from '../components/Player/EditPlayerModal';
import { toast } from 'react-toastify';

const PlayerManagementScreen = () => {
  const { userInfo } = useSelector((state) => state.auth);

  const { data, isLoading, error } = useGetPlayersQuery();
  const [deletePlayer] = useDeletePlayerMutation();
  const [createPlayer] = useCreatePlayerMutation();
  const [updatePlayer] = useUpdatePlayerMutation();

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterPosition, setFilterPosition] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Function to handle sorting when a header is clicked
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Delete a player with toast notification
  const handleDeleteClick = (player) => {
    setSelectedPlayer(player);
    setShowConfirm(true);
  };

  const handleConfirmDeletion = async () => {
    if (!selectedPlayer) return;
    try {
      await deletePlayer(selectedPlayer._id).unwrap();
      // Toast on success
      toast.success(`Player "${selectedPlayer.name}" deleted successfully`);
    } catch (err) {
      toast.error('Failed to delete player');
    } finally {
      setShowConfirm(false);
      setSelectedPlayer(null);
    }
  };

  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedPlayer(null);
  };

  // Add a player with toast notification
  const handleAddPlayer = async (playerData) => {
    try {
      await createPlayer(playerData).unwrap();
      toast.success(`Player "${playerData.name}" added successfully`);
      setShowAddModal(false);
    } catch (err) {
      toast.error('Failed to add player');
    }
  };

  // Edit a player (toast could be added similarly if desired)
  const handleEditClick = (player) => {
    setSelectedEditPlayer(player);
    setShowEditModal(true);
  };

  const handleEditPlayer = async (playerData) => {
    try {
      await updatePlayer({ id: playerData.id, name: playerData.name, position: playerData.position, teamName: playerData.teamName }).unwrap();
      toast.success(`Player "${playerData.name}" updated successfully`);
      setShowEditModal(false);
      setSelectedEditPlayer(null);
    } catch (err) {
      toast.error('Failed to update player');
    }
  };

  // Sorting and filtering logic...
  let sortedPlayers = [];
  if (data && data.players) {
    sortedPlayers = [...data.players];
    if (sortConfig.key) {
      sortedPlayers.sort((a, b) => {
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

  const uniquePositions = sortedPlayers.reduce((acc, player) => {
    if (!acc.includes(player.position)) {
      acc.push(player.position);
    }
    return acc;
  }, []);

  let filteredPlayers = sortedPlayers;
  if (filterPosition !== 'All') {
    filteredPlayers = filteredPlayers.filter(
      (player) => player.position.toLowerCase() === filterPosition.toLowerCase()
    );
  }
  if (searchTerm.trim() !== '') {
    filteredPlayers = filteredPlayers.filter((player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Container>
      <Row className="align-items-center my-4">
        <Col>
          <h2>Player Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" className="btn-sm" onClick={() => setShowAddModal(true)}>
            <FaPlus />
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="filterPosition">
            <Form.Label>Filter by Position</Form.Label>
            <Form.Control
              as="select"
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
            >
              <option value="All">All</option>
              {uniquePositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group controlId="searchTerm">
            <Form.Label>Search by Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error.data?.message || error.error}</Message>
      ) : filteredPlayers && filteredPlayers.length > 0 ? (
        <>
          <Table striped bordered hover responsive className="table-sm">
            <thead className="table-dark">
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
                </th>
                <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>
                  Team Name {sortConfig.key === 'teamName' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
                </th>
                <th onClick={() => handleSort('position')} style={{ cursor: 'pointer' }}>
                  Position {sortConfig.key === 'position' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
                </th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentPlayers.map((player) => (
                <tr key={player._id}>
                  <td>{player.name}</td>
                  <td>{player.teamName}</td>
                  <td>{player.position}</td>
                  <td>
                    <Button variant="light" className="btn-sm mx-2" onClick={() => handleEditClick(player)}>
                      <FaEdit />
                    </Button>
                  </td>
                  <td>
                    <Button variant="light" className="btn-sm mx-2" onClick={() => handleDeleteClick(player)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              <Pagination.Prev onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
              {[...Array(totalPages).keys()].map((num) => (
                <Pagination.Item key={num + 1} active={num + 1 === currentPage} onClick={() => paginate(num + 1)}>
                  {num + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} />
            </Pagination>
          )}
        </>
      ) : (
        <Alert variant="info" className="text-center">
          No players found.
        </Alert>
      )}

      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        message={`Are you sure you want to delete ${selectedPlayer ? selectedPlayer.name : 'this player'}?`}
      />

      <AddPlayerModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddPlayer={handleAddPlayer}
      />

      <EditPlayerModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEditPlayer={handleEditPlayer}
        initialData={selectedEditPlayer}
      />
    </Container>
  );
};

export default PlayerManagementScreen;
