import * as React from 'react';
import {
  pageComponentFactory,
  registerComponent,
  PageComponentMandatoryProps,
} from '../tools/componentFactory';
import { schemaProps } from '../tools/schemaProps';
import { IconButton, IconButtonProps } from '../../Inputs/Buttons/IconButton';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { icons } from '../../../Editor/Components/Views/FontAwesome';

function PlayerIconButton(
  props: IconButtonProps & PageComponentMandatoryProps,
) {
  const { EditHandle } = props;
  return (
    <>
      <EditHandle />
      <IconButton {...props} />
    </>
  );
}

registerComponent(
  pageComponentFactory(
    PlayerIconButton,
    'IconButton',
    'cube',
    {
      icon: schemaProps.select('Icon', true, Object.keys(icons)),
      label: schemaProps.string('Label', false),
      onClick: schemaProps.script('onClick', false),
      onMouseDown: schemaProps.script('onMouseDown', false),
      disabled: schemaProps.boolean('Disabled', false),
      pressed: schemaProps.boolean('Pressed', false),
      id: schemaProps.string('Id', false),
      tooltip: schemaProps.string('Tooltip', false),
      tabIndex: schemaProps.number('Tab index', false),
      prefixedLabel: schemaProps.boolean('Prefixed label', false),
      type: schemaProps.select('Type', false, ['submit', 'reset']),
    },
    [],
    () => ({
      icon: 'cube' as IconName,
      label: 'IconButton',
    }),
  ),
);
