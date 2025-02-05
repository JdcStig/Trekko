import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSortUp, FaSortDown } from 'react-icons/fa';
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
  // RTK Query hook 
  const { data, isLoading, error, refetch } = useGetSquadsQuery();
  
  const [deleteSquad, { isLoading: loadingDelete }] = useDeleteSquadMutation();
  const [createSquad, { isLoading: loadingCreate }] = useCreateSquadMutation();
  const [updateSquad, { isLoading: loadingUpdate }] = useUpdateSquadMutation();

    // Sorting state (Starts at Ascending/null)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
 
  // Creates a sortedSquads copy of the data
  const sortedSquads = [...(data?.squads || [])].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valueA = a[sortConfig.key].toLowerCase();
    const valueB = b[sortConfig.key].toLowerCase();

    if (sortConfig.direction === 'asc') {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  const [filterSport, setFilterSport] = useState('All');

  // Toggles the sorting, determines if the user clicks the column 
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
    
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
      //console.error(err);
    }
  };

  // Called when the user confirms deletion
  const handleConfirmDeletion = async () => {
    if (!selectedSquad) return;
    try {
      await deleteSquad(selectedSquad._id).unwrap();
      refetch();
    } catch (err) {
      //console.error(err);
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
      //console.error(err);
    }
  };

   // creates an array of unique squad sports and populates it into the squads sort drop down
   const uniqueSports = sortedSquads.reduce((acc, squad) => {
    if (!acc.includes(squad.sport)) {
      acc.push(squad.sport);
    }
    return acc;
  }, []);

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

      {/* Filter and Search Controls */}
            <Row className="mb-3">
              <Col md={4}>
                {/* Filter by Sport */}
                <Form.Group controlId="filterSport">
                  <Form.Label>Filter by Sport</Form.Label>
                  <Form.Control
                    as="select"
                    value={filterSport}
                    onChange={(e) => setFilterSport(e.target.value)}
                  >
                    <option value="All">All</option>
                    {uniqueSports.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
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
              {/* Contains a sorting feature */}
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
              {/* if it is ascending, cursor is up, else its down */}
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
              <th onClick={() => handleSort('teamId')} style={{ cursor: 'pointer' }}>
                Team ID {sortConfig.key === 'teamId' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th onClick={() => handleSort('sport')} style={{ cursor: 'pointer' }}>
                Sport {sortConfig.key === 'sport' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
                {sortedSquads
                 .filter((squad) => filterSport === 'All' || squad.sport === filterSport) // Filtering logic
                 .map((squad) => (
              <tr key={squad._id}>
                <td>{squad.name}</td>
                <td>{squad.teamId}</td>
                <td>{squad.sport}</td>
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
