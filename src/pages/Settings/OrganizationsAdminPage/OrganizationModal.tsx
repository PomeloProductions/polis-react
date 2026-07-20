import React, { useEffect, useState } from 'react';
import { Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import OrganizationForm from '../../../components/Forms/OrganizationForm';
import { OrganizationPayload } from '../../../services/requests/OrganizationRequests';
import Organization from '../../../models/organization/organization';

export interface OrganizationModalProps {
  opened: boolean;
  /** When set, the modal edits this org; when null, it creates a new one. */
  org: Organization | null;
  onClose: () => void;
  onSaved: () => void;
  onCreate: (payload: OrganizationPayload) => Promise<Organization>;
  onUpdate: (orgId: number, payload: OrganizationPayload) => Promise<Organization>;
}

/**
 * Create / edit an organization (super-admin flow). Wraps `<OrganizationForm />`
 * in a Mantine `<Modal>`; create wires to `onCreate`, edit to `onUpdate`.
 */
const OrganizationModal: React.FC<OrganizationModalProps> = ({
  opened,
  org,
  onClose,
  onSaved,
  onCreate,
  onUpdate,
}) => {
  const editing = org != null;
  // Remount the form each time the modal opens (or the target org changes) so
  // its initial values reset.
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (opened) setFormKey((k) => k + 1);
  }, [opened, org]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? `Edit ${org?.name}` : 'Create organization'}
    >
      <OrganizationForm
        key={formKey}
        initialValues={{ name: org?.name ?? '' }}
        submitLabel={editing ? 'Save' : 'Create'}
        onSubmit={async (values) => {
          if (editing && org && org.id != null) {
            await onUpdate(org.id, { name: values.name });
          } else {
            await onCreate({ name: values.name });
          }
        }}
        onSuccess={() => {
          notifications.show({
            color: 'green',
            title: editing ? 'Organization updated' : 'Organization created',
            message: 'Saved.',
          });
          onSaved();
          onClose();
        }}
      />
    </Modal>
  );
};

export default OrganizationModal;
