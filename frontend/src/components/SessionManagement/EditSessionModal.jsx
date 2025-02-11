import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';

const EditSessionModal = ({ show, onHide, onEditSession, session }) => {
  const [teamName, setTeamName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch user info & teams
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();

  // Filter teams based on the logged-in user
  const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];

  // Populate the form when editing a session
  useEffect(() => {
    if (session) {
      setTeamName(session.teamName || '');
      setSessionName(session.sessionName || '');
      setDate(session.date ? new Date(session.date).toISOString().split('T')[0] : '');
      setType(session.type || '');
      setDuration(session.duration || '');
      setNotes(session.notes || '');
    }
  }, [session]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!teamName.trim() || !sessionName.trim() || !date.trim() || !type.trim() || !duration.trim()) {
      toast.error('All fields are required!', { position: 'top-right' });
      return;
    }

    const updatedSession = {
      ...session,
      teamName,
      sessionName,
      date: new Date(date).getTime(), // Convert to UNIX timestamp
      type,
      duration,
      notes,
    };

    onEditSession(updatedSession);
    //toast.success("Session updated successfully!", { position: 'top-right' });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Session</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Team Name Dropdown */}
          <Form.Group controlId="teamName" className="mb-3">
            <Form.Label>Team Name</Form.Label>
            <Form.Control as="select" value={teamName} onChange={(e) => setTeamName(e.target.value)} required>
              <option value="">Select Team</option>
              {filteredTeams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          {/* Session Name */}
          <Form.Group controlId="sessionName" className="mb-3">
            <Form.Label>Session Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter session name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              required
            />
          </Form.Group>

          {/* Date */}
          <Form.Group controlId="date" className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Form.Group>

          {/* Type Dropdown */}
          <Form.Group controlId="type" className="mb-3">
            <Form.Label>Session Type</Form.Label>
            <Form.Control as="select" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Select Type</option>
              <option value="Training">Training</option>
              <option value="Game">Game</option>
            </Form.Control>
          </Form.Group>

          {/* Duration */}
          <Form.Group controlId="duration" className="mb-3">
            <Form.Label>Duration (in minutes)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </Form.Group>

          {/* Notes */}
          <Form.Group controlId="notes" className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
            />
          </Form.Group>

          <Button variant="primary" type="submit">
            Save Changes
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditSessionModal;
