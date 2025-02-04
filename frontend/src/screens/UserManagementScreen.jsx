import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useGetSquadsQuery, 
         useDeleteSquadMutation, 
         useCreateSquadMutation,
         useUpdateSquadMutation } from '../slices/squadsApiSlice';
import AddSquadModal from '../components/Squad Management/AddSquadModal';
import EditSquadModal from '../components/Squad Management/EditSquadModal';

const UserManagementScreen = () => {
  // RTK Query hook for fetching squads
  const { data, isLoading, error, refetch } = useGetSquadsQuery();
  // RTK Query hook for deleting a squad
  const [deleteSquad, { isLoading: loadingDelete }] = useDeleteSquadMutation();
  const [createSquad, { isLoading: loadingCreate }] = useCreateSquadMutation();
  const [updateSquad, { isLoading: loadingUpdate }] = useUpdateSquadMutation();

  // Local state for confirming deletion
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // When trash icon is clicked, opens the confirm deletion modal
  const handleDeleteClick = (squad) => {
    setSelectedSquad(squad);
    setShowConfirm(true);
  };

  // When the edit icon is clicked, opens the edit modal
  const handleEditClick = (squad) => {
    setSelectedSquad(squad);
    setShowEditModal(true);
  };

  // Updates the squad and closes the modal
  const handleEditSquad = async (updatedSquad) => {
    try {
      await updateSquad(updatedSquad).unwrap();
      refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Called when the user confirms deletion
  const handleConfirmDeletion = async () => {
    if (!selectedSquad) return;
    try {
      await deleteSquad(selectedSquad._id).unwrap();
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setShowConfirm(false);
      setSelectedSquad(null);
    }
  };

  // Called when the user cancels deletion
  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedSquad(null);
  };

  // Called when a new squad is submitted via the modal
  const handleAddSquad = async (squadData) => {
    try {
      await createSquad(squadData).unwrap();
      refetch();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container>
      {/* Header with User Management title and plus button */}
      <Row className="align-items-center my-4">
        <Col>
          <h2>User Management</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" className="btn-sm" onClick={() => setShowAddModal(true)}>
            <FaPlus />
          </Button>
        </Col>
      </Row>

      {/* Show loader if fetching or deleting */}
      {isLoading || loadingDelete || loadingCreate || loadingUpdate ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error.data?.message || error.error}
        </Message>
      ) : data && data.squads && data.squads.length > 0 ? (
        <Table striped bordered hover responsive className="table-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Team ID</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.squads.map((squad) => (
              <tr key={squad._id}>
                <td>{squad.name}</td>
                <td>{squad.teamId}</td>
                <td>
                  <Button variant="light" className="btn-sm mx-2" onClick={() => handleEditClick(squad)}>
                    <FaEdit />
                  </Button>
                </td>
                <td>
                  <Button
                    variant="light"
                    className="btn-sm mx-2"
                    onClick={() => handleDeleteClick(squad)}
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
          No squads found.
        </Alert>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${
          selectedSquad ? selectedSquad.name : 'this squad'
        }?`}
      />

      {/* Add Squad Modal */}
      <AddSquadModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAddSquad={handleAddSquad}
      />

      <EditSquadModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onEditSquad={handleEditSquad}
        squad={selectedSquad}
      />
    </Container>
  );
};

export default UserManagementScreen;
