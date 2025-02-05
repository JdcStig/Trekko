import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSortUp, FaSortDown } from 'react-icons/fa';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { 
  useGetPlayersQuery, 
  useDeletePlayerMutation, 
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
} from '../slices/playersApiSlice';
import AddPlayerModal from '../components/Player/AddPlayerModal';
import EditPlayerModal from '../components/Player/EditPlayerModal';

const SquadManagementScreen = () => {

  // RTK Query hooks 
 
const { data, isLoading, error, refetch } = useGetPlayersQuery();

  const [deletePlayer, { isLoading: loadingDelete }] = useDeletePlayerMutation();
  const [createPlayer, { isLoading: loadingCreate }] = useCreatePlayerMutation();
  const [updatePlayer, { isLoading: loadingUpdate }] = useUpdatePlayerMutation();

  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
 
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState(null);

  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const [filterPosition, setFilterPosition] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Function to handle sorting when a header is clicked
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // When trash icon is clicked, open the confirm deletion modal
  const handleDeleteClick = (player) => {
    setSelectedPlayer(player);
    setShowConfirm(true);
  };

  // Called when the user confirms deletion
  const handleConfirmDeletion = async () => {
    if (!selectedPlayer) return;
    try {
      await deletePlayer(selectedPlayer._id).unwrap();
      refetch();
    } catch (err) {
     // console.error(err);
    } finally {
      setShowConfirm(false);
      setSelectedPlayer(null);
    }
  };

  // Called when the user cancels deletion
  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedPlayer(null);
  };

  // Called when a new player is submitted via the Add modal
  const handleAddPlayer = async (playerData) => {
    try {
      await createPlayer(playerData).unwrap();
      refetch();
      setShowAddModal(false);
    } catch (err) {
      //console.error(err);
    }
  };

  // When edit icon is clicked open the edit modal
  const handleEditClick = (player) => {
    setSelectedEditPlayer(player);
    setShowEditModal(true);
  };

  // Called when the user submits the edit form in the edit modal
  const handleEditPlayer = async (playerData) => {
    try {
      await updatePlayer(playerData).unwrap();
      refetch();
      setShowEditModal(false);
      setSelectedEditPlayer(null);
    } catch (err) {
      //console.error(err);
    }
  };

  // sorts players if data is available to sort 
  let sortedPlayers = [];
  if (data && data.players) {
    sortedPlayers = [...data.players];
    if (sortConfig.key) {
      sortedPlayers.sort((a, b) => {
        // Compare values 
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

  // creates an array of unique player positions and populates it into the players sort drop down
  const uniquePositions = sortedPlayers.reduce((acc, player) => {
    if (!acc.includes(player.position)) {
      acc.push(player.position);
    }
    return acc;
  }, []);

  // Filter the sorted players by the selected filter and search term
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

  return (
    <Container>
      {/* Header with Squad Management title and plus button */}
      <Row className="align-items-center my-4">
        <Col>
          <h2>Squad Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" className="btn-sm" onClick={() => setShowAddModal(true)}>
            <FaPlus />
          </Button>
        </Col>
      </Row>

      {/* Filter and Search Controls */}
      <Row className="mb-3">
        <Col md={4}>
          {/* Filter by Position */}
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
          {/* Search by Name */}
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

      {/* Show loader if fetching, deleting, creating, or updating */}
      {isLoading || loadingDelete || loadingCreate || loadingUpdate ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error.data?.message || error.error}
        </Message>
      ) : filteredPlayers && filteredPlayers.length > 0 ? (
        <Table striped bordered hover responsive className="table-sm">
          <thead className="table-dark">
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
              </th>
              <th onClick={() => handleSort('position')} style={{ cursor: 'pointer' }}>
                Position {sortConfig.key === 'position' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
              </th>
              <th onClick={() => handleSort('teamId')} style={{ cursor: 'pointer' }}>
                Team ID {sortConfig.key === 'teamId' ? (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />) : null}
              </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player._id}>
                <td>{player.name}</td>
                <td>{player.position}</td>
                <td>{player.teamId}</td>
                <td>
                  <Button 
                    variant="light" 
                    className="btn-sm mx-2" 
                    onClick={() => handleEditClick(player)}
                  >
                    <FaEdit />
                  </Button>
                </td>
                <td>
                  <Button
                    variant="light"
                    className="btn-sm mx-2"
                    onClick={() => handleDeleteClick(player)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info" className="text-center">
          No players found.
        </Alert>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${
          selectedPlayer ? selectedPlayer.name : 'this player'
        }?`}
      />

      {/* Add Player Modal */}
      <AddPlayerModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddPlayer={handleAddPlayer}
      />

      {/* Edit Player Modal */}
      <EditPlayerModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEditPlayer={handleEditPlayer}
        initialData={selectedEditPlayer}
      />
    </Container>
  );
};

export default SquadManagementScreen;
