import React from 'react';
import { Modal, Spinner } from 'react-bootstrap';

function CalculationModal({ show, onHide }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>RUNNING CALCULATIONS</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center justify-content-center" style={{ gap: '1rem' }}>
          <Spinner animation="border" role="status" />
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Please wait...</h1>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default CalculationModal;
