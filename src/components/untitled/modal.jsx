// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, scoped reset, and React 18 forwarded refs.
"use client";
import "./styles/generated.css";

import { forwardRef } from "react";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { cx } from "./utils/cx";
export const DialogTrigger = AriaDialogTrigger;
export const ModalOverlay = forwardRef((props, ref) => {
  return <AriaModalOverlay ref={ref} data-untitled-control data-untitled-modal-overlay {...props} className={state => cx("uui:fixed uui:inset-0 uui:z-50 uui:flex uui:min-h-dvh uui:w-full uui:items-end uui:justify-center uui:bg-overlay/70 uui:px-4 uui:outline-hidden uui:backdrop-blur-[6px] uui:sm:items-center uui:sm:justify-center uui:sm:px-8",
  // Vertical padding
  "uui:pt-(--modal-pt) uui:pb-(--modal-pb) uui:[--modal-pb:clamp(16px,8vh,64px)] uui:[--modal-pt:16px] uui:sm:[--modal-pb:32px] uui:sm:[--modal-pt:32px]",
  // Animations
  state.isEntering && "uui:duration-300 uui:ease-out uui:animate-in uui:fade-in", state.isExiting && "uui:duration-200 uui:ease-in uui:animate-out uui:fade-out", typeof props.className === "function" ? props.className(state) : props.className)} />;
});
export const Modal = props => <AriaModal {...props} className={state => cx("uui:w-full uui:rounded-xl uui:bg-primary uui:align-middle uui:shadow-xl uui:outline-hidden uui:max-sm:overflow-y-auto uui:sm:rounded-2xl",
// Max height based on parent's vertical padding
"uui:max-h-[calc(var(--visual-viewport-height)-var(--modal-pt)-var(--modal-pb))]",
// Animations
state.isEntering && "uui:duration-300 uui:ease-out uui:animate-in uui:zoom-in-95", state.isExiting && "uui:duration-200 uui:ease-in uui:animate-out uui:zoom-out-95", typeof props.className === "function" ? props.className(state) : props.className)} />;
export const Dialog = forwardRef((props, ref) => <AriaDialog ref={ref} {...props} className={cx("uui:relative uui:max-h-[inherit] uui:w-full uui:overflow-y-auto uui:outline-hidden", props.className)} />);
ModalOverlay.displayName = "ModalOverlay";
Dialog.displayName = "Dialog";
