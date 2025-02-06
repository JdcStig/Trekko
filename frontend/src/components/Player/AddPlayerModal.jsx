import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import { useGetPlayersQuery } from "../../slices/playersApiSlice";



const AddPlayerModal = ({ show, onHide, onAddPlayer }) => {
  // State variables to store player details
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [teamName, setTeamName] = useState('');
  const { refetch } = useGetPlayersQuery();


  // Gets user info
  const { userInfo } = useSelector((state) => state.auth);

  // Fetches teams
  const { data: teamsData } = useGetTeamsQuery();

  const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];
  // Reset fields when modal closes
  useEffect(() => {
    if (!show) {
      setName('');
      setPosition('');
      setTeamName('');
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate inputs before submission
    if (!name.trim() || !position.trim() || !teamName.trim()) {
      return alert('All fields are required!');
    }

    // Calls the onAddPlayer function and passes the new player data
    onAddPlayer({ name, position, teamName, userId: userInfo._id }).then(() => refetch());

    // Clear input fields after submission
    setName('');
    setPosition('');
    setTeamName('');
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Player</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="playerName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter player's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="playerPosition" className="mb-3">
            <Form.Label>Position</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter player's position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </Form.Group>

          {/* Team Dropdown - Only show teams created by the logged-in user */}
          <Form.Group controlId="team">
            <Form.Label>Team Name</Form.Label>
            <Form.Control
             as="select"
             value={teamName}
             onChange={(e) => setTeamName(e.target.value)}
              >
              <option value="">Select Team</option>
                 {filteredTeams.map((team) => (
                 <option key={team._id} value={team.name}>
                  {team.name}
              </option>
                   ))}
</Form.Control>
          </Form.Group>

          <Button variant="primary" type="submit">
            Add Player
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddPlayerModal;
