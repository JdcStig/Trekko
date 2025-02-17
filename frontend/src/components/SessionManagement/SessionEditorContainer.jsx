import React, { useState } from 'react';
import EditSessionModal from './EditSessionModal';

const SessionEditorContainer = ({ session, onEditSession }) => {
  const [showSessionModal, setShowSessionModal] = useState(false);

  const handleOpenSessionModal = () => {
    setShowSessionModal(true);
  };

  const handleHideSessionModal = () => {
    setShowSessionModal(false);
  };

  // This callback is called when the CSV modal is cancelled.
  // It re-opens the Edit Session modal.
  const handleReopenSessionModal = () => {
    setShowSessionModal(true);
  };

  const handleFinalEdit = (updatedSession) => {
    //console.log('Final updated session payload:', updatedSession);
    if (onEditSession) {
      onEditSession(updatedSession);
    }
    setShowSessionModal(false);
  };

  return (
    <div>
      <button onClick={handleOpenSessionModal}>Edit Session</button>
      {showSessionModal && (
        <EditSessionModal
          show={showSessionModal}
          onHide={handleHideSessionModal}
          onCSVCancel={handleReopenSessionModal}
          session={session}
          onEditSession={handleFinalEdit}
        />
      )}
    </div>
  );
};

export default SessionEditorContainer;
