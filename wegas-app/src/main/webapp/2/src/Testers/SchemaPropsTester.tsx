import * as React from 'react';
import { expandBoth, flex, flexColumn } from '../css/classes';
import { cx } from 'emotion';
import Form from 'jsoninput';
import { ValidationError } from 'jsonschema/lib';
import { Value } from '../Components/Outputs/Value';
import { MessageString } from '../Editor/Components/MessageString';
import { schemaProps } from '../Components/PageComponents/tools/schemaProps';
import { createScript } from '../Helper/wegasEntites';

//It's really important to import index.ts in order to have the widjets allready registered before using Form
import '../Editor/Components/FormView';
import { wegasComponentOptionsSchema } from '../Components/PageComponents/tools/options';
import { themeVar } from '../Components/Style/ThemeVars';

const testSchema = {
  hidden: schemaProps.hidden(),
  boolean: schemaProps.boolean('Boolean'),
  number: schemaProps.number('Number'),
  string: schemaProps.string('String'),
  script: schemaProps.script('Script'),
  code: schemaProps.code('Code'),
  select: schemaProps.select('Select', true, [
    'Option 1',
    'Option 2',
    'Option 3',
  ]),
  undefSelect: schemaProps.select('Undefined select', false, [
    'Option 1',
    'Option 2',
    'Option 3',
  ]),
  simpleHashList: schemaProps.hashlist('Simple hashlist', true),
  customizedHashList: schemaProps.hashlist('Customized hashlist', true, [
    {
      label: 'Attribute1',
      value: {
        prop: 'Attribute1',
        schema: schemaProps.select('Attribute1', true, ['1', '2', '3']),
      },
    },
    {
      label: 'Attribute2',
      value: {
        prop: 'Attribute2',
        schema: schemaProps.select('Attribute2', true, ['A', 'B', 'C']),
      },
    },
  ]),
  customizedMultilevelHashList: wegasComponentOptionsSchema('FLEX').options,
  file: schemaProps.file('File', true),
  greyFilterfile: schemaProps.file('Filtered audio file', true, 'FILE', {
    filterType: 'grey',
    fileType: 'audio',
  }),
};

interface SchemaPropsTesterState {
  hidden: string[];
  boolean: boolean;
  number: number;
  string: string;
  script: IScript;
  code: object;
  select: string;
  undefSelect?: string;
  simpleHashList: {};
  customizedHashList: {};
  customizedMultilevelHashList: {};
  file?: IAbstractContentDescriptor;
  greyFilterfile?: IAbstractContentDescriptor;
}

export default function SchemaPropsTester() {
  const [values, setValues] = React.useState<SchemaPropsTesterState>({
    hidden: ['hidden'],
    boolean: false,
    number: 0,
    string: '',
    script: createScript(),
    code: {},
    select: 'Option 1',
    undefSelect: undefined,
    simpleHashList: {},
    customizedHashList: {},
    // customizedMultilevelHashList: {},
    customizedMultilevelHashList: { layout: { order: 1234567 } },
    // customizedMultilevelHashList: {
    //   nextlevel: { 'Next level attribute 1': '2' },
    // },
    file: undefined,
    greyFilterfile: undefined,
  });
  const [errors, setErrors] = React.useState<ValidationError[]>([]);

  return (
    <div className={cx(flex, expandBoth, flexColumn)}>
      {errors.length > 0 && (
        <MessageString
          value={JSON.stringify(errors)}
          duration={10000}
          onLabelVanish={() => setErrors([])}
          type="error"
        />
      )}
      <Form
        value={values}
        schema={{
          description: 'TestSchema',
          properties: testSchema,
        }}
        onChange={(v, e) => {
          setValues(v);
          setErrors(e);
        }}
      />
      <div
        style={{
          margin: '20px',
          borderStyle: 'solid',
          borderColor: themeVar.Layout.colors.BorderColor,
        }}
      >
        {Object.entries(values).map(([k, v]) => (
          <Value key={k} label={k} value={v} />
        ))}
      </div>
    </div>
  );
}
