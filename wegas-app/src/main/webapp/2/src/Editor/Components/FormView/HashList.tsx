import * as React from 'react';
import { WidgetProps } from 'jsoninput/typings/types';
import { CommonViewContainer, CommonView } from './commonView';
import Form from 'jsoninput';
import { omit } from 'lodash-es';
import { useDeepChanges } from '../../../Components/Hooks/useDeepChanges';
import {
  schemaProps,
  SchemaPropsSchemas,
} from '../../../Components/PageComponents/tools/schemaProps';
import { LabeledView, Labeled } from './labeled';
import { DragDropArray } from './Array';
import { Item } from '../Tree/TreeSelect';

interface ImprovedObjectValue {
  value: string;
  index: number;
}

export type HashListChoices = Item<{
  prop: string;
  schema: SchemaPropsSchemas;
}>[];

export type HashListViewProps = WidgetProps.ObjectProps<
  CommonView &
    LabeledView & {
      disabled?: boolean;
      tooltip?: string;
      choices: HashListChoices;
    }
>;

interface EntryViewProps<T> {
  prop: string;
  value: T;
  onChange: (key: string, value: T) => void;
  schema?: SchemaPropsSchemas;
}

export function EntryView<T>({
  prop,
  value,
  onChange,
  schema,
}: EntryViewProps<T>) {
  return (
    <Form
      schema={{
        description: 'EntryView',
        properties: {
          prop: schema
            ? schemaProps.hidden(true, 'string')
            : schemaProps.string(
                'Key',
                true,
                prop,
                'DEFAULT',
                undefined,
                'shortInline',
                false,
              ),
          value: schema
            ? {
                ...schema,
                view: {
                  ...schema.view,
                  layout: 'shortInline',
                },
              }
            : schemaProps.string(
                'Value',
                true,
                typeof value === 'string' ? value : JSON.stringify(value),
                'DEFAULT',
                undefined,
                'shortInline',
              ),
        },
      }}
      value={{ prop, value }}
      onChange={v => onChange(v.prop, v.value)}
    />
  );
}

type ImprovedValues = { [prop: string]: ImprovedObjectValue };
const normalizeValues = (nv: object) => (
  ov: ImprovedValues,
): ImprovedValues => {
  const newValues = Object.entries(nv).reduce(
    (o, [k, v], i) => ({
      ...o,
      [k]: { value: v, index: ov[k] != null ? ov[k].index : i },
    }),
    {},
  );
  return newValues;
};

const extractValues = (values: ImprovedValues) =>
  Object.entries(values || {}).reduce(
    (o, [k, v]) => ({ ...o, [k]: v.value }),
    {},
  );

const sortValues = (a: ImprovedObjectValue, b: ImprovedObjectValue) =>
  a.index - b.index;

// const getChoiceValue = (label:)

function HashListView({
  errorMessage,
  view,
  onChange: onChangeOutside,
  value,
  schema,
}: HashListViewProps) {
  const { label, readOnly, disabled, description, tooltip } = view;
  const { patternProperties } = schema;

  const onChange = React.useCallback(
    (value?: ImprovedValues) => {
      onChangeOutside(extractValues(value || {}));
    },
    [onChangeOutside],
  );

  const [currentValue, setValue] = React.useState<ImprovedValues>({});
  useDeepChanges(value, nv => {
    setValue(normalizeValues(nv || {}));
  });

  const choices = patternProperties
    ? Object.keys(patternProperties)
        .filter(k => !Object.keys(currentValue).includes(k))
        .map(k => ({
          label: k,
          value: k,
        }))
    : undefined;
  // const entrySchema = choices

  return (
    <CommonViewContainer errorMessage={errorMessage} view={view}>
      <Labeled label={label} description={description}>
        {({ inputId, labelNode }) => (
          <DragDropArray
            choices={choices}
            onChildAdd={choice => {
              const index = Object.keys(currentValue).length;
              onChange({
                ...currentValue,
                [choice ? String(choice) : `key${index}`]: { index, value: '' },
              });
            }}
            onChildRemove={i => {
              onChange(
                Object.entries(currentValue)
                  .filter((_kv, vI) => vI !== i)
                  .reduce((o, [k, v]) => ({ ...o, [k]: v }), {}),
              );
            }}
            array={Object.values(currentValue)}
            disabled={disabled}
            readOnly={readOnly}
            inputId={inputId}
            label={labelNode}
            tooltip={tooltip}
          >
            {currentValue &&
              Object.entries(currentValue)
                .sort(([, a], [, b]) => sortValues(a, b))
                .map(([k, v], i) => (
                  <EntryView
                    key={i}
                    prop={k}
                    value={v.value}
                    onChange={(newKey, newVal) => {
                      const safeNewKey =
                        newKey === k || currentValue[newKey] == null
                          ? newKey
                          : newKey + ' - copy';
                      const newValue = {
                        ...omit(currentValue, k),
                        [safeNewKey]: {
                          ...(currentValue ? currentValue[k] : { index: i }),
                          value: newVal,
                        },
                      };
                      setValue(newValue);
                      onChange(newValue);
                    }}
                    schema={
                      patternProperties &&
                      (patternProperties[k] as SchemaPropsSchemas)
                    }
                  />
                ))}
          </DragDropArray>
        )}
      </Labeled>
    </CommonViewContainer>
  );
}

export default HashListView;
