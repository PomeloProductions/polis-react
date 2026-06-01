import React from "react";
import { Text } from "@mantine/core";
import { Link, LinkProps, useLocation } from "react-router-dom";

const MenuLink: React.FC<LinkProps> = ({ children, to, ...props }) => {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

    return (
        <Text
            component={Link}
            to={to}
            size="sm"
            fw={isActive ? 500 : 400}
            c={isActive ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-6)'}
            py="sm"
            px="md"
            display="block"
            style={{
                textDecoration: 'none',
                borderBottom: '1px solid var(--mantine-color-gray-2)',
            }}
            {...props}
        >
            {children}
        </Text>
    );
};

export default MenuLink;
