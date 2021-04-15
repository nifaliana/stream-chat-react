import React, { useCallback, useEffect, useState } from 'react';

import { MessageActionsBox } from './MessageActionsBox';

import { isUserMuted } from '../Message/utils';

import { useChatContext } from '../../context/ChatContext';
import { MessageContextValue, useMessageContext } from '../../context/MessageContext';

import type {
  DefaultAttachmentType,
  DefaultChannelType,
  DefaultCommandType,
  DefaultEventType,
  DefaultMessageType,
  DefaultReactionType,
  DefaultUserType,
} from '../../../types/types';

type HandlersToPick =
  | 'getMessageActions'
  | 'handleDelete'
  | 'handleFlag'
  | 'handleMute'
  | 'handlePin';

export type MessageActionsProps<
  At extends DefaultAttachmentType = DefaultAttachmentType,
  Ch extends DefaultChannelType = DefaultChannelType,
  Co extends DefaultCommandType = DefaultCommandType,
  Ev extends DefaultEventType = DefaultEventType,
  Me extends DefaultMessageType = DefaultMessageType,
  Re extends DefaultReactionType = DefaultReactionType,
  Us extends DefaultUserType<Us> = DefaultUserType
> = Partial<Pick<MessageContextValue<At, Ch, Co, Ev, Me, Re, Us>, HandlersToPick>> & {
  customWrapperClass?: string;
  inline?: boolean;
  messageWrapperRef?: React.RefObject<HTMLDivElement>;
};

export const MessageActions = <
  At extends DefaultAttachmentType = DefaultAttachmentType,
  Ch extends DefaultChannelType = DefaultChannelType,
  Co extends DefaultCommandType = DefaultCommandType,
  Ev extends DefaultEventType = DefaultEventType,
  Me extends DefaultMessageType = DefaultMessageType,
  Re extends DefaultReactionType = DefaultReactionType,
  Us extends DefaultUserType<Us> = DefaultUserType
>(
  props: MessageActionsProps<At, Ch, Co, Ev, Me, Re, Us>,
) => {
  const {
    customWrapperClass = '',
    getMessageActions: propGetMessageActions,
    handleDelete: propHandleDelete,
    handleFlag: propHandleFlag,
    handleMute: propHandleMute,
    handlePin: propHandlePin,
    inline,
    messageWrapperRef,
  } = props;

  const { mutes } = useChatContext<At, Ch, Co, Ev, Me, Re, Us>();
  const {
    getMessageActions: contextGetMessageActions,
    handleDelete: contextHandleDelete,
    handleFlag: contextHandleFlag,
    handleMute: contextHandleMute,
    handlePin: contextHandlePin,
    isMyMessage,
    message,
    setEditingState,
  } = useMessageContext<At, Ch, Co, Ev, Me, Re, Us>();

  const getMessageActions = propGetMessageActions || contextGetMessageActions;
  const handleDelete = propHandleDelete || contextHandleDelete;
  const handleFlag = propHandleFlag || contextHandleFlag;
  const handleMute = propHandleMute || contextHandleMute;
  const handlePin = propHandlePin || contextHandlePin;

  const [actionsBoxOpen, setActionsBoxOpen] = useState(false);

  const isMuted = useCallback(() => isUserMuted(message, mutes), [message, mutes]);

  const hideOptions = useCallback(() => setActionsBoxOpen(false), []);

  const messageActions = getMessageActions();
  const messageDeletedAt = !!message?.deleted_at;

  useEffect(() => {
    if (messageWrapperRef?.current) {
      messageWrapperRef.current.addEventListener('onMouseLeave', hideOptions);
    }
  }, [hideOptions, messageWrapperRef]);

  useEffect(() => {
    if (messageDeletedAt) {
      document.removeEventListener('click', hideOptions);
    }
  }, [hideOptions, messageDeletedAt]);

  useEffect(() => {
    if (actionsBoxOpen) {
      document.addEventListener('click', hideOptions);
    } else {
      document.removeEventListener('click', hideOptions);
    }

    return () => document.removeEventListener('click', hideOptions);
  }, [actionsBoxOpen, hideOptions]);

  if (messageActions.length === 0) return null;

  return (
    <MessageActionsWrapper
      customWrapperClass={customWrapperClass}
      inline={inline}
      setActionsBoxOpen={setActionsBoxOpen}
    >
      <MessageActionsBox
        getMessageActions={getMessageActions}
        handleDelete={handleDelete}
        handleEdit={setEditingState}
        handleFlag={handleFlag}
        handleMute={handleMute}
        handlePin={handlePin}
        isUserMuted={isMuted}
        mine={isMyMessage()}
        open={actionsBoxOpen}
      />
      <svg height='4' viewBox='0 0 11 4' width='11' xmlns='http://www.w3.org/2000/svg'>
        <path
          d='M1.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'
          fillRule='nonzero'
        />
      </svg>
    </MessageActionsWrapper>
  );
};

export type MessageActionsWrapperProps = {
  setActionsBoxOpen: React.Dispatch<React.SetStateAction<boolean>>;
  customWrapperClass?: string;
  inline?: boolean;
};

const MessageActionsWrapper: React.FC<MessageActionsWrapperProps> = (props) => {
  const { children, customWrapperClass, inline, setActionsBoxOpen } = props;

  const defaultWrapperClass =
    'str-chat__message-simple__actions__action str-chat__message-simple__actions__action--options';

  const wrapperClass = customWrapperClass || defaultWrapperClass;

  const onClickOptionsAction = (event: React.BaseSyntheticEvent) => {
    event.stopPropagation();
    setActionsBoxOpen(true);
  };

  const wrapperProps = {
    className: wrapperClass,
    'data-testid': 'message-actions',
    onClick: onClickOptionsAction,
  };

  if (inline) return <span {...wrapperProps}>{children}</span>;

  return <div {...wrapperProps}>{children}</div>;
};
