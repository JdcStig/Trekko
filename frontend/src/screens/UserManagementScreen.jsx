import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Container } from 'react-bootstrap';

const UserManagementScreen = () => {
    const [squads, setUsers] = useState([]);  // State for storing squads
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState(null); // Error state

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/squads'); // Fetch squads from backend // --To Do make a global variable
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

            {/* Shows loading spinner */}
            {loading && (
                <div className="text-center my-4">
                    <Spinner animation="border" variant="primary" />
                </div>
            )}

            {/* Shows error message */}
            {error && (
                <Alert variant="danger">
                    <strong>Error:</strong> {error}
                </Alert>
            )}

            {/* Displays table when squads exist */}
            {!loading && !error && squads.length > 0 ? (
                <Table striped bordered hover responsive className="table-sm">
                    <thead className="table-dark">
                        <tr>
                            {/* <th>ID</th> */}
                            <th>Name</th>
                            <th>Team Id</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {squads.map((squad) => (
                            <tr key={squad._id}>                      
                                <td>{squad.name}</td>
                                <td>{squad.teamId}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                !loading && !error && (
                    <Alert variant="info" className="text-center">
                        No squads found.
                    </Alert>
                )
            )}
        </Container>
    );
};

export default UserManagementScreen;
