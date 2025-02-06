import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const AddTeamModal = ({ show, onHide, onAddTeam }) => {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  

  useEffect(() => {
    if (!show) {
      setName('');
      setSport('');
      
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddTeam({ name, sport });

    // Reset fields after submit
    setName('');
    setSport('');
  
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Team</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="teamName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="teamSport" className="mb-3">
            <Form.Label>Sport</Form.Label>
            <Form.Control
              as="select"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              required
            >
              <option value="">Select a sport</option>
              <option value="Soccer">Soccer</option>
              <option value="GAA Football">GAA Football</option>
              <option value="GAA Hurling">GAA Hurling</option>
              <option value="Rugby">Rugby</option>
              <option value="Other">Other</option>
            </Form.Control>
          </Form.Group>

      

          <Button variant="primary" type="submit">
            Add Team
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddTeamModal;
