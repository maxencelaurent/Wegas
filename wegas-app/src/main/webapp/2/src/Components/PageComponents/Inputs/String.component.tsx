import * as React from 'react';
import {
  registerComponent,
  pageComponentFactory,
} from '../tools/componentFactory';
import { schemaProps } from '../tools/schemaProps';
import { store, useStore } from '../../../data/store';
import { WegasComponentProps } from '../tools/EditableComponent';
import { IScript, SStringDescriptor } from 'wegas-ts-api';
import { createFindVariableScript } from '../../../Helper/wegasEntites';
import { SimpleInput } from '../../Inputs/SimpleInput';
import { useScript } from '../../Hooks/useScript';
import { classAndStyleShema } from '../tools/options';
import { runScript } from '../../../data/Reducer/VariableInstanceReducer';
import { instantiate } from '../../../data/scriptable';
import { Player } from '../../../data/selectors';

interface PlayerStringInput extends WegasComponentProps {
  /**
   * script - the script that returns the variable to display and modify
   */
  script?: IScript;
  /**
   * placeholder - the grey text inside the box when nothing is written
   */
  placeholder?: IScript;
}

function PlayerStringInput({
  placeholder,
  context,
  script,
  options,
  className,
  style,
}: PlayerStringInput) {
  const placeholderText = useScript<string>(placeholder, context);
  const text = useScript<SStringDescriptor>(script, context);
  const player = instantiate(useStore(Player.selectCurrent));

  const { disabled, readOnly } = options;

  return text == null ? (
    <pre>Not found: {script?.content}</pre>
  ) : (
    <SimpleInput
      value={text.getValue(player)}
      onChange={v => {
        store.dispatch(
          runScript(
            `Variable.find(gameModel,"${text.getName()}").setValue(self, '${v}');`,
          ),
        );
      }}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholderText}
      className={className}
      style={style}
    />
  );
}

registerComponent(
  pageComponentFactory({
    component: PlayerStringInput,
    componentType: 'Input',
    name: 'String input',
    icon: 'paragraph',
    schema: {
      script: schemaProps.scriptVariable({
        label: 'Variable',
        required: true,
        returnType: ['SStringDescriptor'],
      }),
      placeholder: schemaProps.scriptString({ label: 'Placeholder' }),
      ...classAndStyleShema,
    },
    allowedVariables: ['StringDescriptor'],
    getComputedPropsFromVariable: v => ({
      script: createFindVariableScript(v),
    }),
  }),
);
