import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const AddPlayerModal = ({ show, onHide, onAddPlayer }) => {

  // State variables to store player details
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [teamId, setTeamId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Calls the onAddPlayer function and passes the new player data
    onAddPlayer({ name, position, teamId });
    
    // Clears the input fields after submission
    setName('');
    setPosition('');
    setTeamId('');
  };

  return (
    //opens/closes add player model based on 'show' prop
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
         
         
          <Form.Group controlId="playerTeamId" className="mb-3">
            <Form.Label>Team ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team ID"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
            />
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
