import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
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
  // RTK Query hook for fetching players
  const { data, isLoading, error, refetch } = useGetPlayersQuery();
  // RTK Query hook for deleting a player
  const [deletePlayer, { isLoading: loadingDelete }] = useDeletePlayerMutation();
  const [createPlayer, { isLoading: loadingCreate }] = useCreatePlayerMutation();
  const [updatePlayer, { isLoading: loadingUpdate }] = useUpdatePlayerMutation();

  // Local state for confirming deletion
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Local state for editing a player
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditPlayer, setSelectedEditPlayer] = useState(null);

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
      console.error(err);
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
      console.error(err);
    }
  };

  // When edit icon is clicked, open the edit modal
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
      console.error(err);
    }
  };

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

      {/* Show loader if fetching, deleting, creating, or updating */}
      {isLoading || loadingDelete || loadingCreate || loadingUpdate ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error.data?.message || error.error}
        </Message>
      ) : data && data.players && data.players.length > 0 ? (
        <Table striped bordered hover responsive className="table-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Team ID</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.players.map((player) => (
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
