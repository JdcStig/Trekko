import React, { useState } from 'react';
import { Table, Button, Container, Alert, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSortUp, FaSortDown } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { 
  useGetTeamsQuery, 
  useDeleteTeamMutation, 
  useCreateTeamMutation,
  useUpdateTeamMutation 
} from '../slices/teamsApiSlice';
import AddTeamModal from '../components/TeamManagement/AddTeamModal';
import EditTeamModal from '../components/TeamManagement/EditTeamModal';

const TeamManagementScreen = () => {
  // RTK Query hook 
  const { data, isLoading, error, refetch } = useGetTeamsQuery();
  
  const [deleteTeam, { isLoading: loadingDelete }] = useDeleteTeamMutation();
  const [createTeam, { isLoading: loadingCreate }] = useCreateTeamMutation();
  const [updateTeam, { isLoading: loadingUpdate }] = useUpdateTeamMutation();

  // Sorting state (Starts at Ascending/null)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
 
  // Create a sortedTeams copy of the data
  const sortedTeams = [...(data?.teams || [])].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valueA = a[sortConfig.key].toLowerCase();
    const valueB = b[sortConfig.key].toLowerCase();
    return sortConfig.direction === 'asc'
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });

  const [filterSport, setFilterSport] = useState('All');

  // Toggle sorting direction when a column header is clicked
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
    
  // Open deletion confirmation modal when trash icon is clicked
  const handleDeleteClick = (team) => {
    setSelectedTeam(team);
    setShowConfirm(true);
  };

  // Open edit modal when edit icon is clicked
  const handleEditClick = (team) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  // Updates the team and closes the modal
  const handleEditTeam = async (updatedTeam) => {
    try {
      await updateTeam(updatedTeam).unwrap();
      refetch();
      setShowEditModal(false);
      toast.success('Team updated successfully');
    } catch (err) {
      console.error('Failed to update team:', err);
      toast.error('Failed to update team');
    }
  };
  
  // Called when the user confirms deletion
  const handleConfirmDeletion = async () => {
    if (!selectedTeam) return;
    try {
      await deleteTeam(selectedTeam._id).unwrap();
      refetch();
      toast.success('Team deleted successfully');
    } catch (err) {
      console.error(err);
      const errorMessage = err?.data?.message || err.message || 'Failed to delete team';
      // Display a specific toast if the error indicates players are assigned
      if (
        errorMessage.toLowerCase().includes('attached') ||
        errorMessage.toLowerCase().includes('assigned')
      ) {
        toast.error('Cannot delete team as it has players assigned');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setShowConfirm(false);
      setSelectedTeam(null);
    }
  };

  // Called when the user cancels deletion
  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedTeam(null);
  };

  // Called when a new team is submitted via the modal
  const handleAddTeam = async (teamData) => {
    try {
      await createTeam(teamData).unwrap();
      refetch();
      setShowAddModal(false);
      toast.success('Team created successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create team');
    }
  };

  // Create an array of unique team sports for the filter dropdown
  const uniqueSports = sortedTeams.reduce((acc, team) => {
    if (!acc.includes(team.sport)) {
      acc.push(team.sport);
    }
    return acc;
  }, []);

  return (
    <Container>
      {/* Header with Team Management title and add button */}
      <Row className="align-items-center my-4">
        <Col>
          <h2>Team Management</h2>
        </Col>      
        <Col className="text-end">
          <Button variant="primary" className="btn-sm" onClick={() => setShowAddModal(true)}>
            <FaPlus />
          </Button>
        </Col>
      </Row>

      {/* Filter Controls */}
      <Row className="mb-3">
        <Col md={4}>
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

      {/* Display Loader, Error Message, or Table */}
      {isLoading || loadingDelete || loadingCreate || loadingUpdate ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error.data?.message || error.error}
        </Message>
      ) : data && data.teams && data.teams.length > 0 ? (
        <Table striped bordered hover responsive className="table-sm">
          <thead className="table-dark">
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Team Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
              <th onClick={() => handleSort('sport')} style={{ cursor: 'pointer' }}>
                Sport {sortConfig.key === 'sport' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
              </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams
              .filter((team) => filterSport === 'All' || team.sport === filterSport)
              .map((team) => (
                <tr key={team._id}>
                  <td>{team.name}</td>
                  <td>{team.sport}</td>
                  <td>
                    <Button variant="light" className="btn-sm mx-2" onClick={() => handleEditClick(team)}>
                      <FaEdit />
                    </Button>
                  </td>
                  <td>
                    <Button variant="light" className="btn-sm mx-2" onClick={() => handleDeleteClick(team)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info" className="text-center">
          No teams found.
        </Alert>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${selectedTeam ? selectedTeam.name : 'this team'}?`}
      />

      {/* Add Team Modal */}
      <AddTeamModal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)} 
        onAddTeam={handleAddTeam} 
      />

      {/* Edit Team Modal */}
      <EditTeamModal 
        show={showEditModal} 
        onHide={() => setShowEditModal(false)} 
        onEditTeam={handleEditTeam} 
        team={selectedTeam} 
      />
    </Container>
  );
};

export default TeamManagementScreen;
