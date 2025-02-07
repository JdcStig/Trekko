import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import sportPositions from '../../data/sportPositions.json'; // Import JSON data

const AddPlayerModal = ({ show, onHide, onAddPlayer }) => {
  // State variables
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('');
  
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();
  
  // Filter teams by logged-in user
  const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];

  // Reset fields when modal closes
  useEffect(() => {
    if (!show) {
      setName('');
      setPosition('');
      setTeamName('');
      setSport('');
    }
  }, [show]);

  // Handle team selection & infer sport
  const handleTeamChange = (e) => {
    const selectedTeamName = e.target.value;
    setTeamName(selectedTeamName);

    const selectedTeam = filteredTeams.find(team => team.name === selectedTeamName);
    if (selectedTeam) {
      setSport(selectedTeam.sport); // Assuming teams have a "sport" property
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !position.trim() || !teamName.trim()) {
      return alert('All fields are required!');
    }

    onAddPlayer({ name, position, teamName, userId: userInfo._id });
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

          {/* Team Dropdown */}
          <Form.Group controlId="team">
            <Form.Label>Team Name</Form.Label>
            <Form.Control as="select" value={teamName} onChange={handleTeamChange} required>
              <option value="">Select Team</option>
              {filteredTeams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name} ({team.sport}) {/* Display sport next to team */}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          {/* Position Dropdown */}
          <Form.Group controlId="playerPosition" className="mb-3">
            <Form.Label>Position</Form.Label>
            <Form.Control as="select" value={position} onChange={(e) => setPosition(e.target.value)} required>
              <option value="">Select Position</option>
              {sport && sportPositions[sport]
                ? sportPositions[sport].map((pos, index) => (
                    <option key={index} value={pos}>{pos}</option>
                  ))
                : <option disabled>No positions available</option>
              }
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
