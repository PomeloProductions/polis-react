import React from "react";
import { Text } from "@mantine/core";
import { Link, LinkProps, useLocation } from "react-router-dom";
import { usePolisTheme } from "../../PolisProvider";

const MenuLink: React.FC<LinkProps> = ({ children, to, ...props }) => {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
    const theme = usePolisTheme();

    return (
        <Text
            component={Link}
            to={to}
            size="sm"
            fw={isActive ? 500 : 400}
            c={isActive ? theme.colors.textPrimary : theme.colors.textMuted}
            py="sm"
            px="md"
            display="block"
            style={{
                textDecoration: 'none',
                borderBottom: `1px solid ${theme.colors.border}`,
                fontFamily: theme.fonts.body,
            }}
            {...props}
        >
            {children}
        </Text>
    );
};

export default MenuLink;
