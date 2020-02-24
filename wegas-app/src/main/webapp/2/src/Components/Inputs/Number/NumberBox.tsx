import * as React from 'react';
import { debounce } from 'lodash-es';
import { themeVar } from '../../Theme';
import { cx, css } from 'emotion';
import { flex } from '../../../css/classes';
import { checkMinMax } from './numberComponentHelper';

const numberSquareStyle = css({
  borderColor: themeVar.disabledColor,
  borderStyle: 'solid',
  borderRadius: '2px',
  width: '2em',
  height: '2em',
  lineHeight: '2em',
  textAlign: 'center',
  cursor: 'default',
  ':hover': {
    borderColor: themeVar.primaryTextColor,
  },
});

const activeNumberSquareStyle = css({
  backgroundColor: themeVar.primaryLighterColor,
});

const clickableNumberSquareStyle = css({
  cursor: 'pointer',
});

const disabledNumberSquareStyle = css({
  backgroundColor: themeVar.disabledColor,
});

interface NumberSquareProps {
  value?: number | string;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  active?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hideValue?: boolean;
  activeClassName?: string;
  className?: string;
}

function NumberSquare({
  value,
  onClick,
  active,
  disabled,
  readOnly,
  hideValue,
  activeClassName,
  className,
}: NumberSquareProps) {
  return (
    <div
      onClick={e => !disabled && !readOnly && onClick && onClick(e)}
      className={cx(numberSquareStyle, className, {
        [activeClassName ? activeClassName : activeNumberSquareStyle]: active,
        [clickableNumberSquareStyle]: !disabled && !readOnly,
        [disabledNumberSquareStyle]: disabled && active,
      })}
    >
      {hideValue ? null : value}
    </div>
  );
}

export interface NumberBoxProps {
  /**
   * value - the value to show in the box
   */
  value: number;
  /**
   * minValue - the minimal value
   */
  minValue?: number;
  /**
   * maxValue - the maximal value
   */
  maxValue?: number;
  /**
   * onChange - return the value set by the component
   */
  onChange?: (value: number) => void;
  /**
   * disabled - disable the component
   */
  disabled?: boolean;
  /**
   * readOnly - disable the click on the component
   */
  readOnly?: boolean;
  /**
   * activeClassName - the class to apply on an active box
   */
  activeClassName?: string;
  /**
   * boxClassName - the class to apply on the boxes
   */
  boxClassName?: string;
  /**
   * className - the class to apply on the component
   */
  className?: string;
}

export function NumberBox({
  value,
  minValue,
  maxValue,
  onChange,
  disabled,
  readOnly,
  activeClassName,
  boxClassName,
}: NumberBoxProps) {
  const [currentValue, setCurrentValue] = React.useState(value);

  const computedMinValue = minValue !== undefined ? minValue : 0;
  const computedMaxValue = maxValue !== undefined ? maxValue : currentValue + 1;

  React.useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const debouncedOnChange = React.useCallback(
    debounce((value: number) => {
      onChange && onChange(value);
    }, 100),
    [onChange],
  );

  const minMaxCheck = checkMinMax(
    computedMinValue,
    computedMaxValue,
    currentValue,
  );
  if (minMaxCheck !== undefined) {
    return minMaxCheck;
  }

  const squares: JSX.Element[] = [];

  for (let i = computedMinValue; i <= computedMaxValue; ++i) {
    squares.push(
      <NumberSquare
        key={i}
        value={i}
        onClick={() => {
          setCurrentValue(i);
          debouncedOnChange(i);
        }}
        active={i <= currentValue}
        disabled={disabled}
        readOnly={readOnly}
        activeClassName={activeClassName}
        className={boxClassName}
      />,
    );
  }

  return <div className={flex}>{squares}</div>;
}
