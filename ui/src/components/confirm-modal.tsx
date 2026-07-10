import { useRead } from "@/lib/hooks";
import { Button, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ConfirmModal as TypedConfirmModal,
  ConfirmModalProps as TypedConfirmModalProps,
} from "mogh_ui";
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ConfirmModalProps extends TypedConfirmModalProps {}

export function ConfirmModal({
  children,
  icon,
  disabled,
  confirmText,
  title,
  confirmButtonContent,
  onConfirm,
  loading,
  additional,
  topAdditonal,
  targetProps,
  targetNoIcon,
  confirmProps,
  disableModal,
  ...modalProps
}: ConfirmModalProps) {
  const info = useRead("GetCoreInfo", {}).data;
  const mode = disableModal
    ? "double_click"
    : (info?.confirm_mode ??
      (info?.disable_confirm_dialog ? "double_click" : "hold"));

  if (mode !== "hold") {
    return (
      <TypedConfirmModal
        icon={icon}
        disabled={disabled}
        confirmText={confirmText}
        title={title}
        confirmButtonContent={confirmButtonContent}
        onConfirm={onConfirm}
        loading={loading}
        additional={additional}
        topAdditonal={topAdditonal}
        targetProps={targetProps}
        targetNoIcon={targetNoIcon}
        confirmProps={confirmProps}
        disableModal={mode === "double_click"}
        {...modalProps}
      >
        {children}
      </TypedConfirmModal>
    );
  }

  return (
    <HoldConfirmModal
      icon={icon}
      disabled={disabled}
      confirmText={confirmText}
      title={title}
      confirmButtonContent={confirmButtonContent}
      onConfirm={onConfirm}
      loading={loading}
      additional={additional}
      topAdditonal={topAdditonal}
      targetProps={targetProps}
      targetNoIcon={targetNoIcon}
      confirmProps={confirmProps}
      holdSeconds={info?.confirm_hold_seconds ?? 3}
      {...modalProps}
    >
      {children}
    </HoldConfirmModal>
  );
}

function HoldConfirmModal({
  children,
  icon,
  disabled,
  title,
  confirmButtonContent,
  onConfirm,
  loading,
  additional,
  topAdditonal,
  targetProps,
  targetNoIcon,
  confirmProps,
  holdSeconds,
  ...modalProps
}: ConfirmModalProps & { holdSeconds: number }) {
  const [opened, { open, close }] = useDisclosure();
  const [remainingMs, setRemainingMs] = useState(holdSeconds * 1_000);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const durationMs = Math.max(1, holdSeconds) * 1_000;

  const resetHold = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    startedAtRef.current = null;
    completedRef.current = false;
    setRemainingMs(durationMs);
  }, [durationMs]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setRemainingMs(0);
    Promise.resolve(onConfirm?.())
      .then(() => close())
      .finally(resetHold);
  }, [close, onConfirm, resetHold]);

  const tick = useCallback(
    (now: number) => {
      if (startedAtRef.current === null) return;
      const remaining = Math.max(
        0,
        durationMs - (now - startedAtRef.current),
      );
      setRemainingMs(remaining);
      if (remaining === 0) {
        complete();
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    },
    [complete, durationMs],
  );

  const startHold = useCallback(() => {
    if (disabled || loading || startedAtRef.current !== null) return;
    completedRef.current = false;
    startedAtRef.current = performance.now();
    setRemainingMs(durationMs);
    frameRef.current = requestAnimationFrame(tick);
  }, [disabled, durationMs, loading, tick]);

  const cancelHold = useCallback(() => {
    if (!completedRef.current) resetHold();
  }, [resetHold]);

  useEffect(() => resetHold, [resetHold]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      cancelHold();
    }
  };

  const holding = startedAtRef.current !== null;
  const countdown = Math.max(0, Math.ceil(remainingMs / 1_000));

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => {
          resetHold();
          close();
        }}
        title={
          <Text fz="h3">
            {title ?? (
              <>
                Confirm <b>{children}</b>
              </>
            )}
          </Text>
        }
        styles={{ content: { padding: "0.5rem" } }}
        size="lg"
        onClick={(event) => event.stopPropagation()}
        {...modalProps}
      >
        <Stack>
          {topAdditonal}
          <Text>
            Press and hold the button for <b>{durationMs / 1_000} seconds</b>{" "}
            to confirm this action.
          </Text>
          {additional}
          <Group justify="end">
            <Button
              justify="space-between"
              w={{ base: "100%", xs: 190 }}
              miw="fit-content"
              rightSection={
                loading ? <Loader color="white" size="1rem" /> : icon
              }
              disabled={loading || disabled}
              {...confirmProps}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={cancelHold}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onBlur={cancelHold}
              style={{ touchAction: "none", userSelect: "none" }}
              aria-label={`Hold for ${durationMs / 1_000} seconds to confirm`}
            >
              {holding
                ? `Keep holding · ${countdown}s`
                : `Hold to ${confirmButtonContent ?? children ?? "confirm"}`}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Button
        justify="space-between"
        w={{ base: "100%", xs: 190 }}
        miw="fit-content"
        rightSection={
          targetNoIcon ? undefined : loading ? <Loader size="1rem" /> : icon
        }
        loading={targetNoIcon ? loading : undefined}
        disabled={disabled || loading}
        {...targetProps}
        onClick={(event) => {
          event.stopPropagation();
          open();
        }}
      >
        {children}
      </Button>
    </>
  );
}
