import React, {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  WheelEventHandler,
} from 'react';

import { useMessageListScrollManager } from './useMessageListScrollManager';

import type { StreamMessage } from '../../../context/ChannelStateContext';

import type { DefaultStreamChatGenerics } from '../../../types/types';

export type UseScrollLocationLogicParams<
  StreamChatGenerics extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  hasMoreNewer: boolean;
  suppressAutoscroll: boolean;
  ulRef: RefObject<HTMLUListElement>;
  currentUserId?: string;
  messages?: StreamMessage<StreamChatGenerics>[];
  scrolledUpThreshold?: number;
};

const OBSERVE_THRESHOLD = 10;

export const useScrollLocationLogic = <
  StreamChatGenerics extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
>(
  params: UseScrollLocationLogicParams<StreamChatGenerics>,
) => {
  const {
    messages = [],
    scrolledUpThreshold = 200,
    hasMoreNewer,
    suppressAutoscroll,
    ulRef,
  } = params;

  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [wrapperRect, setWrapperRect] = useState<DOMRect>();

  const closeToBottom = useRef(false);
  const closeToTop = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line sort-keys
  const userInteraction = React.useRef({ user: false, performedScroll: true });

  const scrollToBottom = useCallback(() => {
    if (!listRef.current?.scrollTo || hasMoreNewer || suppressAutoscroll) {
      return;
    }

    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
    });
    setHasNewMessages(false);
  }, [listRef, hasMoreNewer, suppressAutoscroll]);

  useEffect(() => {
    if (!ulRef.current || !listRef.current) return;

    const observer = new ResizeObserver(() => {
      // since there's no way (i know of) for us to add custom data
      // to the scroll event, we'll have to flag it ourselves with reference
      userInteraction.current.performedScroll = true;
      scrollToBottom();
    });

    observer.observe(ulRef.current);

    const handleScroll: WheelEventHandler = (e) => {
      // we'll then reset the reference but also quit out the
      // scroll handler since it has not been dispatched by the user
      if (userInteraction.current.performedScroll) {
        userInteraction.current.performedScroll = false;
        return;
      }

      const { clientHeight, scrollHeight, scrollTop } = e.currentTarget;

      console.log(scrollTop + clientHeight, scrollHeight - OBSERVE_THRESHOLD);

      // user scrolled past threshold of 10 pixels, unobserve
      if (scrollTop + clientHeight < scrollHeight - OBSERVE_THRESHOLD && ulRef.current) {
        console.log('unobserve');
        return observer.unobserve(ulRef.current);
      }

      // user scrolled back within threshold of 10 pixels, observe
      if (scrollTop + clientHeight >= scrollHeight - OBSERVE_THRESHOLD && ulRef.current) {
        console.log('observe');
        return observer.observe(ulRef.current);
      }
    };

    listRef.current.addEventListener('scroll', handleScroll as any);

    return () => {
      listRef.current?.removeEventListener('scroll', handleScroll as any);
    };
  }, [listRef.current, ulRef.current]);

  useLayoutEffect(() => {
    if (listRef?.current) {
      setWrapperRect(listRef.current.getBoundingClientRect());
    }
  }, [listRef.current, hasMoreNewer]);

  const updateScrollTop = useMessageListScrollManager({
    messages,
    onScrollBy: (scrollBy) => {
      listRef.current?.scrollBy({ top: scrollBy });
    },

    scrollContainerMeasures: () => ({
      offsetHeight: listRef.current?.offsetHeight || 0,
      scrollHeight: listRef.current?.scrollHeight || 0,
    }),
    scrolledUpThreshold,
    scrollToBottom,
    showNewMessages: () => setHasNewMessages(true),
  });

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.target as HTMLDivElement;
      const scrollTop = element.scrollTop;

      updateScrollTop(scrollTop);

      const offsetHeight = element.offsetHeight;
      const scrollHeight = element.scrollHeight;

      closeToBottom.current = scrollHeight - (scrollTop + offsetHeight) < scrolledUpThreshold;
      closeToTop.current = scrollTop < scrolledUpThreshold;

      if (closeToBottom.current) {
        setHasNewMessages(false);
      }
    },
    [updateScrollTop, closeToTop, closeToBottom, scrolledUpThreshold],
  );

  const onMessageLoadCaptured = useCallback(() => {
    /**
     * A load event (emitted by e.g. an <img>) was captured on a message.
     * In some cases, the loaded asset is larger than the placeholder, which means we have to scroll down.
     */
    if (closeToBottom.current && !closeToTop.current) {
      scrollToBottom();
    }
  }, [closeToTop, closeToBottom, scrollToBottom]);

  return {
    hasNewMessages,
    listRef,
    onMessageLoadCaptured,
    onScroll,
    scrollToBottom,
    wrapperRect,
  };
};
