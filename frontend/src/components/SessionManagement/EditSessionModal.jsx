// import React, { useState, useEffect } from 'react';
// import { Modal, Button, Form, Table } from 'react-bootstrap';
// import EditCSVModal from './EditCSVModal';

// const EditSessionModal = ({ show, onHide, onCSVCancel, onEditSession, session }) => {
//   // Local state for session edits
//   const [localSessionData, setLocalSessionData] = useState({
//     teamName: '',
//     sessionName: '',
//     date: '',
//     type: '',
//     duration: '',
//     notes: '',
//     splits: [],
//   });
//   // Store CSV updates (if any)
//   const [csvUpdates, setCsvUpdates] = useState(null);
//   // Control CSV modal visibility
//   const [showCSVModal, setShowCSVModal] = useState(false);
  
//   useEffect(() => {
//     if (session) {
//       setLocalSessionData({
//         teamName: session.teamName || '',
//         sessionName: session.sessionName || '',
//         date: session.date ? new Date(session.date).toISOString().split('T')[0] : '',
//         type: session.type || '',
//         duration: session.duration || '',
//         notes: session.notes || '',
//         splits: session.splits || [],
//       });
//       setCsvUpdates(null);
//     }
//   }, [session]);
  
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setLocalSessionData(prev => ({ ...prev, [name]: value }));
//   };
  
//   const handleSplitChange = (index, field, value) => {
//     setLocalSessionData(prev => {
//       const newSplits = prev.splits.map((split, i) =>
//         i === index ? { ...split, [field]: value } : split
//       );
//       return { ...prev, splits: newSplits };
//     });
//   };
  
//   // Open CSV modal and hide the session modal
//   const openCSVModal = () => {
//     setShowCSVModal(true);
//     onHide(); // Hide the Edit Session modal (controlled by the parent)
//   };
  
//   // Called when CSV modal saves changes
//   const handleCSVSave = (updates) => {
//     setCsvUpdates(updates);
//     setShowCSVModal(false);
//     // Reopen the session modal after saving CSV changes
//     if (onCSVCancel) onCSVCancel();
//   };
  
//   // Called when CSV modal is cancelled (via "X" or Cancel button)
//   const handleCSVCancel = () => {
//     setShowCSVModal(false);
//     // Reopen the Edit Session modal
//     if (onCSVCancel) onCSVCancel();
//   };
  
//   const handleFinalSubmit = (e) => {
//     e.preventDefault();
//     // Combine session edits and CSV updates into one payload
//     const finalData = { ...session, ...localSessionData, csvUpdates };
//     onEditSession(finalData);
//     onHide();
//   };
  
//   return (
//     <>
//       <Modal show={show} onHide={onHide} centered>
//         <Modal.Header closeButton>
//           <Modal.Title>Edit Session</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Form onSubmit={handleFinalSubmit}>
//             <Form.Group controlId="teamName" className="mb-3">
//               <Form.Label>Team Name</Form.Label>
//               <Form.Control
//                 type="text"
//                 name="teamName"
//                 value={localSessionData.teamName}
//                 onChange={handleChange}
//                 required
//               />
//             </Form.Group>
//             <Form.Group controlId="sessionName" className="mb-3">
//               <Form.Label>Session Name</Form.Label>
//               <Form.Control
//                 type="text"
//                 name="sessionName"
//                 value={localSessionData.sessionName}
//                 onChange={handleChange}
//                 required
//               />
//             </Form.Group>
//             <Form.Group controlId="date" className="mb-3">
//               <Form.Label>Date</Form.Label>
//               <Form.Control
//                 type="date"
//                 name="date"
//                 value={localSessionData.date}
//                 onChange={handleChange}
//                 required
//               />
//             </Form.Group>
//             <Form.Group controlId="type" className="mb-3">
//               <Form.Label>Type</Form.Label>
//               <Form.Control
//                 as="select"
//                 name="type"
//                 value={localSessionData.type}
//                 onChange={handleChange}
//                 required
//               >
//                 <option value="">Select Type</option>
//                 <option value="Training">Training</option>
//                 <option value="Game">Game</option>
//               </Form.Control>
//             </Form.Group>
//             <Form.Group controlId="duration" className="mb-3">
//               <Form.Label>Duration (in minutes)</Form.Label>
//               <Form.Control
//                 type="text"
//                 name="duration"
//                 value={localSessionData.duration}
//                 onChange={handleChange}
//                 required
//               />
//             </Form.Group>
//             <h5>Splits</h5>
//             <Table striped bordered hover>
//               <thead className="table-dark">
//                 <tr>
//                   <th>Title</th>
//                   <th>Start Time</th>
//                   <th>End Time</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {localSessionData.splits.map((split, index) => (
//                   <tr key={index}>
//                     <td>
//                       <Form.Control
//                         type="text"
//                         value={split.title}
//                         onChange={(e) =>
//                           handleSplitChange(index, 'title', e.target.value)
//                         }
//                         required
//                       />
//                     </td>
//                     <td>
//                       <Form.Control
//                         type="time"
//                         value={split.start}
//                         onChange={(e) =>
//                           handleSplitChange(index, 'start', e.target.value)
//                         }
//                         required
//                       />
//                     </td>
//                     <td>
//                       <Form.Control
//                         type="time"
//                         value={split.end}
//                         onChange={(e) =>
//                           handleSplitChange(index, 'end', e.target.value)
//                         }
//                         required
//                       />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </Table>
//             <Form.Group controlId="notes" className="mt-3">
//               <Form.Label>Notes</Form.Label>
//               <Form.Control
//                 as="textarea"
//                 rows={3}
//                 name="notes"
//                 value={localSessionData.notes}
//                 onChange={handleChange}
//                 placeholder="Enter notes"
//               />
//             </Form.Group>
//             <div className="d-flex justify-content-end mt-3">
//               <Button variant="info" onClick={openCSVModal}>
//                 Edit CSV Files
//               </Button>
//               <Button variant="primary" type="submit" className="ms-2">
//                 Save All Changes
//               </Button>
//             </div>
//           </Form>
//         </Modal.Body>
//       </Modal>
//       <EditCSVModal
//         show={showCSVModal}
//         onSave={handleCSVSave}
//         onCancel={handleCSVCancel}
//         sessionId={session?._id}
//       />
//     </>
//   );
// };

// export default EditSessionModal;
// EditSessionModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import EditCSVModal from './EditCSVModal';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import { useSelector } from 'react-redux';

const EditSessionModal = ({
  show,
  onHide,
  onCSVCancel,
  onEditSession,
  session,
}) => {
  // Local state for session edits
  const [localSessionData, setLocalSessionData] = useState({
    teamName: '',
    sessionName: '',
    date: '',
    type: '',
    duration: '',
    notes: '',
    splits: [],
  });
  // State to hold any CSV updates from the CSV modal
  const [csvUpdates, setCsvUpdates] = useState(null);
  // Control CSV modal visibility
  const [showCSVModal, setShowCSVModal] = useState(false);

  // Get user info from auth slice and fetch teams
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useGetTeamsQuery();

  // Filter teams to only include those created by the logged-in user.
  const filteredTeams =
    teamsData?.teams?.filter((team) => team.userId === userInfo?._id) || [];

  // When the session prop changes, update the local state
  useEffect(() => {
    if (session) {
      setLocalSessionData({
        teamName: session.teamName || '',
        sessionName: session.sessionName || '',
        date: session.date ? new Date(session.date).toISOString().split('T')[0] : '',
        type: session.type || '',
        duration: session.duration || '',
        notes: session.notes || '',
        splits: session.splits || [],
      });
      setCsvUpdates(null);
    }
  }, [session]);

  // Handle generic field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalSessionData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle team dropdown change
  const handleTeamChange = (e) => {
    const selectedTeamName = e.target.value;
    setLocalSessionData((prev) => ({ ...prev, teamName: selectedTeamName }));
  };

  const handleSplitChange = (index, field, value) => {
    setLocalSessionData((prev) => {
      const newSplits = prev.splits.map((split, i) =>
        i === index ? { ...split, [field]: value } : split
      );
      return { ...prev, splits: newSplits };
    });
  };

  // Add a new empty split row
  const handleAddSplit = () => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: [...prev.splits, { title: '', start: '', end: '' }],
    }));
  };

  // Delete a split row by its index
  const handleDeleteSplit = (index) => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: prev.splits.filter((_, i) => i !== index),
    }));
  };

  // Open CSV modal and hide the Edit Session modal
  const openCSVModal = () => {
    setShowCSVModal(true);
    onHide(); // Hide the Edit Session modal (controlled by the parent)
  };

  // Called when CSV modal saves changes
  const handleCSVSave = (updates) => {
    setCsvUpdates(updates);
    setShowCSVModal(false);
    if (onCSVCancel) onCSVCancel();
  };

  // Called when CSV modal is cancelled
  const handleCSVCancel = () => {
    setShowCSVModal(false);
    if (onCSVCancel) onCSVCancel();
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    // Merge session edits and CSV updates into one payload
    const finalData = { ...session, ...localSessionData, csvUpdates };
    onEditSession(finalData);
    onHide();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFinalSubmit}>
            {/* Team Name Dropdown */}
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
            <Form.Group controlId="duration" className="mb-3">
              <Form.Label>Duration (in minutes)</Form.Label>
              <Form.Control
                type="text"
                name="duration"
                value={localSessionData.duration}
                onChange={handleChange}
                required
              />
            </Form.Group>
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
                        value={split.start}
                        onChange={(e) =>
                          handleSplitChange(index, 'start', e.target.value)
                        }
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="time"
                        value={split.end}
                        onChange={(e) =>
                          handleSplitChange(index, 'end', e.target.value)
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
