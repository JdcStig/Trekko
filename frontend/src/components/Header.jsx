import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { FaUsers, FaUser, FaSignOutAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout as logoutAction } from '../slices/authSlice';
import { useLogoutMutation } from '../slices/usersApiSlices';
import { apiSlice } from '../slices/apiSlice'; // Import for resetting cache
import { useEffect } from 'react';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);

  const [logout, { isLoading, isError }] = useLogoutMutation();

  const logoutHandler = async () => {
    try {
      await logout().unwrap(); // Call backend logout
      dispatch(logoutAction()); // Clear Redux state and localStorage
      dispatch(apiSlice.util.resetApiState()); // Reset RTK Query cache
      navigate('/login'); // Redirect user
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Ensure the user is redirected if they are logged out
  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
    }
  }, [userInfo, navigate]);

  return (
    <header>
      <Navbar bg="dark" variant="dark" expand="md" collapseOnSelect>
        <Container>
          <img src={logo} alt="TrakkoLogo" className="logo" />
          <Navbar.Brand href="/">Trakko</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link href="/PlayerManagementScreen">
                <FaUsers /> Player Management
              </Nav.Link>
              <Nav.Link href="/TeamManagementScreen">
                <FaUsers /> Team Management
              </Nav.Link>
              {userInfo ? (
                <NavDropdown title={userInfo.name} id="username">
                  <NavDropdown.Item onClick={logoutHandler} disabled={isLoading}>
                    <FaSignOutAlt /> {isLoading ? 'Logging out...' : 'Logout'}
                  </NavDropdown.Item>
                  {isError && <span className="text-danger">Logout failed</span>}
                </NavDropdown>
              ) : (
                <Nav.Link href="/LoginScreen">
                  <FaUser /> Login
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
