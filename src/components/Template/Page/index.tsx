import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss';
import Menu from "../../Menu";
import { Link } from "react-router-dom";
import { usePolisTheme } from "../../PolisProvider";

interface PageProps extends React.HTMLProps<HTMLDivElement> {
}

const Page: React.FC<PageProps> = ({children}) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const theme = usePolisTheme();

    return (
        <div className="d-flex" id="wrapper">
            {/* Sidebar */}
            <div
                className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
                id="sidebar-wrapper"
                data-testid="sidebar"
                style={{ borderRight: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
            >
                <div style={{ borderBottom: `1px solid ${theme.colors.border}`, padding: '12px 16px' }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500, fontFamily: theme.fonts.heading }}>
                        Home
                    </Link>
                </div>
                <Menu/>
            </div>

            {/* Page Content */}
            <div id="page-content-wrapper" className="flex-grow-1">
                {/* Top Navigation */}
                <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
                    <button className="btn btn-primary" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        ☰
                    </button>
                    <div className="ms-3">Header Title</div>
                </nav>

                {/* Main Content */}
                <div className="container-fluid mt-4" role="main">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Page;
