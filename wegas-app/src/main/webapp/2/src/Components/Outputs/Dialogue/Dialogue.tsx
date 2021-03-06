import { css, cx } from 'emotion';
import * as React from 'react';
import {
  SDialogueDescriptor,
  SDialogueState,
  SDialogueTransition,
} from 'wegas-ts-api';
import {
  flex,
  flexColumn,
  flexDistribute,
  grow,
  itemCenter,
} from '../../../css/classes';
import { applyFSMTransition } from '../../../data/Reducer/VariableInstanceReducer';
import { useCurrentPlayer } from '../../../data/selectors/Player';
import { store } from '../../../data/store';
import { deepDifferent } from '../../Hooks/storeHookFactory';
import { themeVar } from '../../Style/ThemeVars';
import { DialogueChoice } from './DialogueChoice';
import { DialogueEntry } from './DialogueEntry';
import { WaitingLoader } from './WaitingLoader';

const dialogEntryStyle = css({
  padding: '5px',
  '&>.player': {
    alignSelf: 'flex-end',
    backgroundColor: themeVar.Common.colors.HeaderColor,
  },
});

const choicePannelStyle = css({
  position: 'relative',
  backgroundColor: themeVar.Common.colors.HeaderColor,
  padding: '5px',
});

const dialogueDisplayStyle = css({
  border: 'solid',
});

interface DialogueDisplayProps {
  dialogue: SDialogueDescriptor;
}

export function DialogueDisplay({ dialogue }: DialogueDisplayProps) {
  const player = useCurrentPlayer();
  const [waiting, setWaiting] = React.useState(false);
  const dialogueInstance = dialogue.getInstance(player);
  const history = dialogueInstance.getTransitionHistory();
  const dialogueStates = dialogue.getStates();
  const oldHistoryState = React.useRef<typeof history>(history);

  const wait = React.useCallback(() => {
    setWaiting(true);
    const timer = setTimeout(() => {
      setWaiting(false);
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // React.useEffect(() => {
  //   wlog('MOUNT');
  //   wait();
  //   return () => wlog('UNMOUNT');
  // }, [wait]);

  React.useEffect(() => {
    if (deepDifferent(oldHistoryState.current, history)) {
      oldHistoryState.current = history;
      wait();
    }
  }, [history, wait]);

  function renderHistory(): JSX.Element[] {
    let currentState = Object.values(dialogueStates)
      .sort((stateA, stateB) => {
        const A = stateA.getIndex();
        const B = stateB.getIndex();
        return (
          (B == null ? Number.MAX_SAFE_INTEGER : B) -
          (A == null ? Number.MAX_SAFE_INTEGER : A)
        );
      })
      .pop() as SDialogueState;
    const dialogueComponents: JSX.Element[] = [
      <DialogueEntry key="STATE0" text={currentState.getText()} />,
    ];
    history.map((transitionId, i, arr) => {
      const transition = currentState
        .getTransitions()
        .find(transition => transition.getId() === transitionId) as
        | SDialogueTransition
        | undefined;

      if (transition != null) {
        dialogueComponents.push(
          <DialogueEntry
            key={`TRANSITION${transitionId}`}
            text={transition.getActionText()}
            player
          />,
        );
        currentState = dialogueStates[
          transition.getNextStateId()
        ] as SDialogueState;
        dialogueComponents.push(
          <DialogueEntry
            key={`STATE${transitionId}`}
            text={currentState.getText()}
            waiting={i === arr.length - 1 && waiting}
          />,
        );
      }
    });
    return dialogueComponents;
  }

  const choices = dialogueStates[
    dialogueInstance.getCurrentStateId()
  ].getTransitions();

  return (
    <div
      className={
        cx(dialogueDisplayStyle, flex, flexColumn, grow) + ' wegas wegas-dialog'
      }
    >
      <div className={cx(dialogEntryStyle, flex, flexColumn, grow)}>
        {renderHistory()}
      </div>
      <div
        className={cx(
          flex,
          flexColumn,
          flexDistribute,
          itemCenter,
          choicePannelStyle,
        )}
      >
        {choices.map((transition: SDialogueTransition) => (
          <DialogueChoice
            key={`CHOICE${transition.getId()}`}
            label={transition.getActionText()}
            onClick={() => {
              store.dispatch(
                applyFSMTransition(
                  dialogue.getEntity(),
                  transition.getEntity(),
                ),
              );
            }}
          />
        ))}
        {waiting && choices.length > 0 && (
          <WaitingLoader
            color={themeVar.Common.colors.HeaderColor}
            background={themeVar.Common.colors.HeaderColor}
          />
        )}
      </div>
    </div>
  );
}
