import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Container } from 'react-bootstrap';

const SquadManagementScreen = () => {
    const [users, setUsers] = useState([]);  // State for storing users
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState(null); // Error state

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/users'); // Fetch users from backend
                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }
                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false); // Stop loading
            }
        };

        fetchUsers();
    }, []);

    return (
        <Container>
            <h2 className="my-4 text-center">Squad Management</h2>

            {/* Show loading spinner */}
            {loading && (
                <div className="text-center my-4">
                    <Spinner animation="border" variant="primary" />
                </div>
            )}

            {/* Show error message */}
            {error && (
                <Alert variant="danger">
                    <strong>Error:</strong> {error}
                </Alert>
            )}

            {/* Display table when users exist */}
            {!loading && !error && users.length > 0 ? (
                <Table striped bordered hover responsive className="table-sm">
                    <thead className="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>{user.id || 'N/A'}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                !loading && !error && (
                    <Alert variant="info" className="text-center">
                        No users found.
                    </Alert>
                )
            )}
        </Container>
    );
};

export default SquadManagementScreen;
