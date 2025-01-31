import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaUsers, FaUser } from 'react-icons/fa';
import logo from '../assets/logo.png'

const Header = () => {
    return (
        <header>
            <Navbar bg="dark" variant="dark" expand="md" collapseOnSelect>
                <Container>
                <img 
                    src={logo}
                    alt="TrakkoLogo"
                    className="logo"
                   />
                    <Navbar.Brand href="/">
                    Trakko
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto">
                            <Nav.Link href="/SquadManagementScreen"><FaUsers /> Squade Management</Nav.Link>
                            <Nav.Link href="/LoginScreen"><FaUser /> Login</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </header>
    );
}

export default Header;
