import * as React from 'react';
import { flex, flexColumn, flexRow } from '../../../css/classes';
import { IconButton } from '../Buttons/IconButton';
import { cx, css } from 'emotion';
import { MessageString } from '../../../Editor/Components/MessageString';
import { themeVar } from '../../Style/ThemeVars';
import { useOnClickOutside } from '../../Hooks/useOnClickOutside';

const newModeStyle = css({
  borderColor: themeVar.Common.colors.MainColor,
  borderRadius: themeVar.Common.dimensions.BorderRadius,
  borderWidth: themeVar.Common.dimensions.BorderWidth,
  borderStyle: 'solid',
  padding: themeVar.Common.dimensions.BorderWidth,
});

type InputModes = 'close' | 'new';

export interface ConfrimAdderProps<T> {
  label?: string;
  validator?: (input?: T) => string | undefined;
  accept?: (input?: T) => string | undefined;
  onAccept: (value?: T) => void;
  children: (
    onNewValue: (setter: (oldValue?: T) => T | undefined) => void,
  ) => JSX.Element;
}

export function ConfirmAdder<T>({
  label,
  validator,
  accept,
  onAccept,
  children,
}: ConfrimAdderProps<T>) {
  const container = React.useRef<HTMLDivElement>(null);

  const [modalState, setModalState] = React.useState<InputModes>('close');
  const [error, setError] = React.useState<string | undefined>();
  const [inputValue, setInputValue] = React.useState<T | undefined>();

  const setValue = React.useCallback<
    (setter: (oldValue?: T) => T | undefined) => void
  >(
    setter => {
      const newValue = setter(inputValue);

      let error = undefined;
      if (validator) {
        error = validator(newValue);
      }
      setError(error);
      setInputValue(newValue);
    },
    [inputValue, validator],
  );

  function onCancel() {
    setError(undefined);
    setInputValue(undefined);
    setModalState('close');
  }

  useOnClickOutside(container, onCancel);

  return (
    <div ref={container} className={flex}>
      {modalState === 'close' ? (
        <IconButton
          icon="plus"
          label={label}
          onClick={() => setModalState('new')}
          prefixedLabel
        />
      ) : (
        <div className={cx(flex, flexColumn, newModeStyle)}>
          {error && (
            <MessageString
              type="warning"
              value={error}
              duration={5000}
              onLabelVanish={() => setError(undefined)}
            />
          )}
          <div className={cx(flex, flexRow)}>
            {children(setValue)}
            <IconButton
              icon="save"
              disabled={error != null || !accept || accept(inputValue) != null}
              tooltip={(accept && accept(inputValue)) || error}
              onClick={() => {
                onAccept(inputValue);
                setInputValue(undefined);
                setModalState('close');
              }}
            />
            <IconButton icon="times" tooltip={'cancel'} onClick={onCancel} />
          </div>
        </div>
      )}
    </div>
  );
}
