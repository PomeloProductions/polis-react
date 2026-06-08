import React from 'react';
import { Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import './index.scss';

interface NetworkErrorProps {
  onRetry?: () => void;
}

const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry }) => {
  return (
    <div className={'network-error'}>
      <h2>Unable to Connect</h2>
      <span className={'icon icon-close'} data-testid="close-icon" />
      <p>
        It looks like there was an issue connecting to the server. Please check your connection and
        try again.
      </p>
      {onRetry && (
        <Button leftSection={<IconRefresh size={16} />} onClick={onRetry} variant="filled" mt="md">
          Retry
        </Button>
      )}
    </div>
  );
};

export default NetworkError;
