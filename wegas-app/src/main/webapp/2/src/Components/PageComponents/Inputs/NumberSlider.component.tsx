import * as React from 'react';
import {
  registerComponent,
  pageComponentFactory,
} from '../tools/componentFactory';
import { schemaProps } from '../tools/schemaProps';
import {
  NumberSlider,
  DisplayMode,
  displayModes,
} from '../../Inputs/Number/NumberSlider';
import { store } from '../../../data/store';
import { Actions } from '../../../data';
import { WegasComponentProps } from '../tools/EditableComponent';
import { IScript, SNumberDescriptor } from 'wegas-ts-api';
import { createFindVariableScript } from '../../../Helper/wegasEntites';
import { classStyleIdShema } from '../tools/options';
import { useScript } from '../../Hooks/useScript';
import {
  OnVariableChange,
  onVariableChangeSchema,
  useOnVariableChange,
} from './tools';
import { useCurrentPlayer } from '../../../data/selectors/Player';

interface PlayerNumberSliderProps extends WegasComponentProps {
  /**
   * script - the script that returns the variable to display and modify
   */
  script?: IScript;
  /**
   * steps - the number of steps between min and max value. 100 by default.
   */
  steps?: number;
  /**
   * displayValue - displays the value modified if set
   * Can be a boolean or a formatting function that takes the value and return a string
   */
  displayValues?: DisplayMode;
  /**
   * disabled - set the component in disabled mode
   */
  disabled?: boolean;
  onVariableChange?: OnVariableChange;
}

function PlayerNumberSlider({
  script,
  context,
  className,
  style,
  id,
  onVariableChange,
  ...restProps
}: PlayerNumberSliderProps) {
  const number = useScript<SNumberDescriptor>(script, context);
  const player = useCurrentPlayer();
  const { handleOnChange } = useOnVariableChange(onVariableChange, context);

  return number == null ? (
    <pre className={className} style={style} id={id}>
      Not found: {script?.content}
    </pre>
  ) : (
    <NumberSlider
      {...restProps}
      className={className}
      style={style}
      id={id}
      value={number.getValue(player)}
      onChange={(v, i) => {
        if (i === 'DragEnd') {
          if (handleOnChange) {
            handleOnChange(v);
          } else {
            store.dispatch(
              Actions.VariableInstanceActions.runScript(
                `Variable.find(gameModel,"${number.getName()}").setValue(self, ${v});`,
              ),
            );
          }
        }
      }}
      min={number.getMinValue() || 0}
      max={number.getMaxValue() || 1}
    />
  );
}

registerComponent(
  pageComponentFactory({
    component: PlayerNumberSlider,
    componentType: 'Input',
    name: 'NumberSlider',
    icon: 'sliders-h',
    schema: {
      script: schemaProps.scriptVariable({
        label: 'Variable',
        required: true,
        returnType: ['SNumberDescriptor'],
      }),
      steps: schemaProps.number({ label: 'Steps' }),
      displayValues: schemaProps.select({
        label: 'Display value',
        values: displayModes,
      }),
      disabled: schemaProps.boolean({ label: 'Disabled' }),
      onVariableChange: onVariableChangeSchema('On number change action'),
      ...classStyleIdShema,
    },
    allowedVariables: ['NumberDescriptor'],
    getComputedPropsFromVariable: v => ({
      script: createFindVariableScript(v),
    }),
  }),
);
