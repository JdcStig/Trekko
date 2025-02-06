import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditTeamModal = ({ show, onHide, onEditTeam, team }) => {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');

  // Available sports for the dropdown
  const sportsOptions = ["Soccer", "GAA Football", "GAA Hurling", "Rugby", "Other"];

  useEffect(() => {
    if (show && team) {
      setName(team?.name || '');
      setSport(team?.sport || '');
      console.log("Loaded team for edit:", team); // Debugging
    }
  }, [show, team]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!team?._id) {
      console.error("No team ID found for editing.");
      return;
    }

    const updatedTeam = {
      _id: team._id,  // Ensure we send the correct ID
      name,
      sport,
    };

    console.log("Submitting updated team:", updatedTeam); // Debugging
    onEditTeam(updatedTeam);

    // Close modal after submission
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Team</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Team Name Input */}
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

          {/* Sport Dropdown */}
          <Form.Group controlId="teamSport" className="mb-3">
            <Form.Label>Sport</Form.Label>
            <Form.Control
              as="select"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              required
            >
              <option value="">Select a sport</option>
              {sportsOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Button variant="primary" type="submit">
            Update Team
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditTeamModal;
