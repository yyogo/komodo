import { ConfirmModal, ConfirmModalProps } from "@/components/confirm-modal";

export interface ConfirmModalWithDisableProps extends Omit<
  ConfirmModalProps,
  "disableModal"
> {}

export default function ConfirmModalWithDisable({
  ...props
}: ConfirmModalWithDisableProps) {
  return <ConfirmModal {...props} />;
}
