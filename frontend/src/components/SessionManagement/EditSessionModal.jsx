// import React, { useState, useEffect } from 'react';
// import { Modal, Button, Form, Table } from 'react-bootstrap';
// import EditCSVModal from './EditCSVModal';
// import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
// import { useSelector } from 'react-redux';

// // Convert numeric seconds to "HH:mm:ss"
// const formatTime = (value) => {
//   if (!value) return '';
//   const totalSeconds = Number(value);
//   if (isNaN(totalSeconds)) return '';
//   const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
//   const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
//   const secs = String(totalSeconds % 60).padStart(2, '0');
//   return `${hrs}:${mins}:${secs}`;
// };

// // Convert "HH:mm:ss" to numeric seconds
// const timeStringToSeconds = (timeStr) => {
//   if (!timeStr) return 0;
//   const parts = timeStr.split(':');
//   const hrs = parseInt(parts[0] || '0', 10);
//   const mins = parseInt(parts[1] || '0', 10);
//   const secs = parseInt(parts[2] || '0', 10);
//   return hrs * 3600 + mins * 60 + secs;
// };

// const EditSessionModal = ({ show, onHide, onCSVCancel, onEditSession, session }) => {
//   // --- We add _id here so we keep it in local state
//   const [localSessionData, setLocalSessionData] = useState({
//     _id: '',
//     teamName: '',
//     sessionName: '',
//     date: '',
//     type: '',
//     duration: '',
//     notes: '',
//     splits: [],
//   });

//   const [csvUpdates, setCsvUpdates] = useState(null);
//   const [showCSVModal, setShowCSVModal] = useState(false);

//   // Pull user info & teams
//   const { userInfo } = useSelector((state) => state.auth);
//   const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useGetTeamsQuery();
//   const filteredTeams = teamsData?.teams?.filter((team) => team.userId === userInfo?._id) || [];

//   // When the modal opens, copy the session (including _id) into local state
//   useEffect(() => {
//     if (show && session) {
//       setLocalSessionData({
//         _id: session._id || '',
//         teamName: session.teamName || '',
//         sessionName: session.sessionName || '',
//         date: session.date
//           ? new Date(session.date).toISOString().split('T')[0]
//           : '',
//         type: session.type || '',
//         duration: session.duration !== undefined ? String(session.duration) : '',
//         notes: session.notes || '',
//         splits: Array.isArray(session.splits) ? session.splits : [],
//       });
//       setCsvUpdates(null);
//     }
//   }, [show, session]);

//   // Generic changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setLocalSessionData((prev) => ({ ...prev, [name]: value }));
//   };

//   // Splits changes
//   const handleSplitChange = (index, field, value) => {
//     setLocalSessionData((prev) => {
//       const newSplits = [...prev.splits];
//       newSplits[index] = { ...newSplits[index], [field]: value };
//       return { ...prev, splits: newSplits };
//     });
//   };

//   // Add / delete splits
//   const handleAddSplit = () => {
//     setLocalSessionData((prev) => ({
//       ...prev,
//       splits: [...prev.splits, { title: '', start: 0, end: 0 }],
//     }));
//   };
//   const handleDeleteSplit = (index) => {
//     setLocalSessionData((prev) => ({
//       ...prev,
//       splits: prev.splits.filter((_, i) => i !== index),
//     }));
//   };

//   // CSV Modal
//   const openCSVModal = () => {
//     setShowCSVModal(true);
//     onHide();
//   };
//   const handleCSVSave = (updates) => {
//     setCsvUpdates(updates);
//     setShowCSVModal(false);
//     if (onCSVCancel) onCSVCancel();
//   };
//   const handleCSVCancel = () => {
//     setShowCSVModal(false);
//     if (onCSVCancel) onCSVCancel();
//   };

//   // Final Submit => send data with _id
//   const handleFinalSubmit = (e) => {
//     e.preventDefault();
//     // Build final object, ensuring we keep the localSessionData._id
//     const finalData = {
//       _id: localSessionData._id,
//       teamName: localSessionData.teamName,
//       sessionName: localSessionData.sessionName,
//       date: localSessionData.date,
//       type: localSessionData.type,
//       duration: localSessionData.duration,
//       notes: localSessionData.notes,
//       splits: localSessionData.splits,
//       csvUpdates,
//     };

//     // Call parent
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
//             {/* Team Name */}
//             <Form.Group controlId="teamName" className="mb-3">
//               <Form.Label>Team Name</Form.Label>
//               {teamsLoading ? (
//                 <p>Loading teams...</p>
//               ) : teamsError ? (
//                 <p>Error loading teams.</p>
//               ) : (
//                 <Form.Control
//                   as="select"
//                   name="teamName"
//                   value={localSessionData.teamName}
//                   onChange={handleChange}
//                   required
//                 >
//                   <option value="">Select Team</option>
//                   {filteredTeams.map((team) => (
//                     <option key={team._id} value={team.name}>
//                       {team.name} ({team.sport})
//                     </option>
//                   ))}
//                 </Form.Control>
//               )}
//             </Form.Group>

//             {/* Session Name */}
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

//             {/* Date */}
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

//             {/* Type */}
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

//             {/* Duration */}
//             <Form.Group controlId="duration" className="mb-3">
//               <Form.Label>Duration (minutes)</Form.Label>
//               <Form.Control
//                 type="number"
//                 name="duration"
//                 value={localSessionData.duration}
//                 onChange={handleChange}
//                 required
//                 step="1"
//                 min="0"
//               />
//             </Form.Group>

//             {/* Splits */}
//             <h5>Splits</h5>
//             <Table striped bordered hover>
//               <thead className="table-dark">
//                 <tr>
//                   <th>Title</th>
//                   <th>Start Time</th>
//                   <th>End Time</th>
//                   <th>Action</th>
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
//                         step="1"
//                         value={formatTime(split.start)}
//                         onChange={(e) =>
//                           handleSplitChange(
//                             index,
//                             'start',
//                             timeStringToSeconds(e.target.value)
//                           )
//                         }
//                         required
//                       />
//                     </td>
//                     <td>
//                       <Form.Control
//                         type="time"
//                         step="1"
//                         value={formatTime(split.end)}
//                         onChange={(e) =>
//                           handleSplitChange(
//                             index,
//                             'end',
//                             timeStringToSeconds(e.target.value)
//                           )
//                         }
//                         required
//                       />
//                     </td>
//                     <td>
//                       <Button
//                         variant="outline-danger"
//                         size="sm"
//                         onClick={() => handleDeleteSplit(index)}
//                       >
//                         Delete
//                       </Button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </Table>
//             <div className="d-flex justify-content-end mb-3">
//               <Button variant="secondary" onClick={handleAddSplit}>
//                 Add Split
//               </Button>
//             </div>

//             {/* Notes */}
//             <Form.Group controlId="notes" className="mb-3">
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

//       {/* CSV Modal */}
//       <EditCSVModal
//         show={showCSVModal}
//         onSave={handleCSVSave}
//         onCancel={handleCSVCancel}
//         sessionId={localSessionData._id} // pass the correct ID
//       />
//     </>
//   );
// };

// export default EditSessionModal;
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import EditCSVModal from './EditCSVModal';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import { useSelector } from 'react-redux';

// Convert numeric seconds to "HH:mm:ss"
const formatTime = (value) => {
  if (!value) return '';
  const totalSeconds = Number(value);
  if (isNaN(totalSeconds)) return '';
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

// Convert "HH:mm:ss" to numeric seconds
const timeStringToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hrs = parseInt(parts[0] || '0', 10);
  const mins = parseInt(parts[1] || '0', 10);
  const secs = parseInt(parts[2] || '0', 10);
  return hrs * 3600 + mins * 60 + secs;
};

const EditSessionModal = ({
  show,
  onHide,
  onCSVCancel,
  onEditSession,
  session
}) => {
  const [localSessionData, setLocalSessionData] = useState({
    _id: '',
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

  // When the modal opens, copy the session into local state, but
  // convert each split’s absolute ms => seconds offset from session.date
  useEffect(() => {
    if (show && session) {
      const dateMs = session.date || 0;

      // Convert each split's absolute ms to offset in seconds
      const adjustedSplits = (session.splits || []).map((split) => ({
        ...split,
        start: Math.floor((split.start - dateMs) / 1000), 
        end:   Math.floor((split.end   - dateMs) / 1000),
      }));

      setLocalSessionData({
        _id: session._id || '',
        teamName: session.teamName || '',
        sessionName: session.sessionName || '',
        date: session.date
          ? new Date(session.date).toISOString().split('T')[0] // "yyyy-MM-dd"
          : '',
        type: session.type || '',
        duration: session.duration !== undefined ? String(session.duration) : '',
        notes: session.notes || '',
        splits: adjustedSplits,
      });
      setCsvUpdates(null);
    }
  }, [show, session]);

  // Generic changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalSessionData((prev) => ({ ...prev, [name]: value }));
  };

  // Splits changes
  const handleSplitChange = (index, field, value) => {
    setLocalSessionData((prev) => {
      const newSplits = [...prev.splits];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return { ...prev, splits: newSplits };
    });
  };

  // Add / delete splits
  const handleAddSplit = () => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: [...prev.splits, { title: '', start: 0, end: 0 }],
    }));
  };
  const handleDeleteSplit = (index) => {
    setLocalSessionData((prev) => ({
      ...prev,
      splits: prev.splits.filter((_, i) => i !== index),
    }));
  };

  // CSV Modal
  const openCSVModal = () => {
    setShowCSVModal(true);
    onHide();
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

  // Final Submit => convert offset seconds back to absolute ms
  const handleFinalSubmit = (e) => {
    e.preventDefault();

    // Convert localSessionData.date => ms
    const parsedDate = new Date(localSessionData.date).getTime() || 0;

    // Build final splits with absolute ms
    const finalSplits = localSessionData.splits.map((split) => ({
      ...split,
      start: parsedDate + split.start * 1000,
      end:   parsedDate + split.end   * 1000,
    }));

    const finalData = {
      _id: localSessionData._id,
      teamName: localSessionData.teamName,
      sessionName: localSessionData.sessionName,
      // store date in ms
      date: parsedDate,
      type: localSessionData.type,
      duration: localSessionData.duration,
      notes: localSessionData.notes,
      splits: finalSplits,
      csvUpdates,
    };

    // Call parent
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
                  onChange={handleChange}
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

            {/* Duration */}
            <Form.Group controlId="duration" className="mb-3">
              <Form.Label>Duration (minutes)</Form.Label>
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
            <Form.Group controlId="notes" className="mb-3">
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

      {/* CSV Modal */}
      <EditCSVModal
        show={showCSVModal}
        onSave={handleCSVSave}
        onCancel={handleCSVCancel}
        sessionId={localSessionData._id}
      />
    </>
  );
};

export default EditSessionModal;
