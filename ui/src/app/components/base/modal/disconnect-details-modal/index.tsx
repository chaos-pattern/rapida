import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { ModalProps } from '@/app/components/base/modal';
import { Modal, ModalBody, ModalHeader } from '@/app/components/carbon/modal';

type DisconnectDetail = {
  label: string;
  value: string;
};

interface DisconnectDetailsDialogProps extends ModalProps {
  details: DisconnectDetail[];
}

export function DisconnectDetailsDialog({
  modalOpen,
  setModalOpen,
  details,
}: DisconnectDetailsDialogProps) {
  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
      <ModalHeader
        label="Session"
        title="Disconnect details"
        onClose={() => setModalOpen(false)}
      />
      <ModalBody hasScrollingContent>
        {details.length > 0 ? (
          <Table className="w-full table-fixed">
            <TableHead>
              <TableRow>
                <TableHeader className="w-44">Field</TableHeader>
                <TableHeader>Value</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map(row => (
                <TableRow key={row.label}>
                  <TableCell className="w-44">{row.label}</TableCell>
                  <TableCell
                    className="font-mono"
                    style={{
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </ModalBody>
    </Modal>
  );
}
