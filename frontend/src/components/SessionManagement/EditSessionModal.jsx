import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import EditCSVModal from './EditCSVModal';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import { useSelector } from 'react-redux';

// Convert numeric seconds into "HH:mm:ss" (or "HH:mm" if you prefer)
const formatTime = (value) => {
  if (!value) return '';
  const totalSeconds = Number(value);
  if (isNaN(totalSeconds)) return '';

  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`; // For step="1", we include seconds
};

// Convert "HH:mm" or "HH:mm:ss" back into numeric seconds
const timeStringToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hrs = parseInt(parts[0] || '0', 10);
  const mins = parseInt(parts[1] || '0', 10);
  const secs = parseInt(parts[2] || '0', 10);
  return hrs * 3600 + mins * 60 + secs;
};

const EditSessionModal = ({ show, onHide, onCSVCancel, onEditSession, session }) => {
  const [localSessionData, setLocalSessionData] = useState({
    teamName: '',
    sessionName: '',
    date: '',
    type: '',
    duration: '',
    notes: '',
    splits: [],
  });
  const [csvUpdates, setCsvUpdates] = useState(null);
  const [showCSVModal, setShowCSVModal] = useState(false);

  // Pull user info & teams
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useGetTeamsQuery();
  const filteredTeams = teamsData?.teams?.filter((team) => team.userId === userInfo?._id) || [];

  /**
   * Re-initialize local session data each time the modal opens
   */
  useEffect(() => {
    if (show && session) {
      setLocalSessionData({
        teamName: session.teamName || '',
        sessionName: session.sessionName || '',
        date: session.date
          ? new Date(session.date).toISOString().split('T')[0]
          : '',
        type: session.type || '',
        duration: session.duration !== undefined ? session.duration.toString() : '',
        notes: session.notes || '',
        splits: session.splits || [],
      });
      setCsvUpdates(null);
    }
  }, [show, session]);

  // Generic input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalSessionData((prev) => ({ ...prev, [name]: value }));
  };

  // Team dropdown change
  const handleTeamChange = (e) => {
    setLocalSessionData((prev) => ({ ...prev, teamName: e.target.value }));
  };

  // Splits changes
  const handleSplitChange = (index, field, value) => {
    setLocalSessionData((prev) => {
      const newSplits = prev.splits.map((split, i) =>
        i === index ? { ...split, [field]: value } : split
      );
      return { ...prev, splits: newSplits };
    });
  };

  // Add a new split row
  const handleAddSplit = () => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: [...prev.splits, { title: '', start: '', end: '' }],
    }));
  };

  // Delete a split row
  const handleDeleteSplit = (index) => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: prev.splits.filter((_, i) => i !== index),
    }));
  };

  // CSV Modal
  const openCSVModal = () => {
    setShowCSVModal(true);
    onHide(); // Hide the Edit Session modal
  };
  const handleCSVSave = (updates) => {
    setCsvUpdates(updates);
    setShowCSVModal(false);
    if (onCSVCancel) onCSVCancel();
  };
  const handleCSVCancel = () => {
    setShowCSVModal(false);
    if (onCSVCancel) onCSVCancel();
  };

  // Final Save
  const handleFinalSubmit = (e) => {
    e.preventDefault();
    const finalData = { ...session, ...localSessionData, csvUpdates };
    onEditSession(finalData);
    onHide(); // Close modal
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFinalSubmit}>
            {/* Team Name */}
            <Form.Group controlId="teamName" className="mb-3">
              <Form.Label>Team Name</Form.Label>
              {teamsLoading ? (
                <p>Loading teams...</p>
              ) : teamsError ? (
                <p>Error loading teams.</p>
              ) : (
                <Form.Control
                  as="select"
                  name="teamName"
                  value={localSessionData.teamName}
                  onChange={handleTeamChange}
                  required
                >
                  <option value="">Select Team</option>
                  {filteredTeams.map((team) => (
                    <option key={team._id} value={team.name}>
                      {team.name} ({team.sport})
                    </option>
                  ))}
                </Form.Control>
              )}
            </Form.Group>

            {/* Session Name */}
            <Form.Group controlId="sessionName" className="mb-3">
              <Form.Label>Session Name</Form.Label>
              <Form.Control
                type="text"
                name="sessionName"
                value={localSessionData.sessionName}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {/* Date */}
            <Form.Group controlId="date" className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={localSessionData.date}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {/* Type */}
            <Form.Group controlId="type" className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Control
                as="select"
                name="type"
                value={localSessionData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                <option value="Training">Training</option>
                <option value="Game">Game</option>
              </Form.Control>
            </Form.Group>

            {/* Duration (in minutes) */}
            <Form.Group controlId="duration" className="mb-3">
              <Form.Label>Duration (in minutes)</Form.Label>
              <Form.Control
                type="number"
                name="duration"
                value={localSessionData.duration}
                onChange={handleChange}
                required
                step="1"
                min="0"
              />
            </Form.Group>

            {/* Splits */}
            <h5>Splits</h5>
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>Title</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {localSessionData.splits.map((split, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Control
                        type="text"
                        value={split.title}
                        onChange={(e) =>
                          handleSplitChange(index, 'title', e.target.value)
                        }
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="time"
                        step="1"
                        value={formatTime(split.start)}
                        onChange={(e) =>
                          handleSplitChange(
                            index,
                            'start',
                            timeStringToSeconds(e.target.value)
                          )
                        }
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="time"
                        step="1"
                        value={formatTime(split.end)}
                        onChange={(e) =>
                          handleSplitChange(
                            index,
                            'end',
                            timeStringToSeconds(e.target.value)
                          )
                        }
                        required
                      />
                    </td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteSplit(index)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="d-flex justify-content-end mb-3">
              <Button variant="secondary" onClick={handleAddSplit}>
                Add Split
              </Button>
            </div>

            {/* Notes */}
            <Form.Group controlId="notes" className="mt-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={localSessionData.notes}
                onChange={handleChange}
                placeholder="Enter notes"
              />
            </Form.Group>

            {/* Footer Buttons */}
            <div className="d-flex justify-content-end mt-3">
              <Button variant="info" onClick={openCSVModal}>
                Edit CSV Files
              </Button>
              <Button variant="primary" type="submit" className="ms-2">
                Save All Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* CSV Modal */}
      <EditCSVModal
        show={showCSVModal}
        onSave={handleCSVSave}
        onCancel={handleCSVCancel}
        sessionId={session?._id}
      />
    </>
  );
};

export default EditSessionModal;
