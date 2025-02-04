import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const ConfirmDeletion = ({ show, onConfirm, onCancel, title, message }) => {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || 'Confirm Deletion'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message || 'Are you sure you want to delete this item?'}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDeletion;
