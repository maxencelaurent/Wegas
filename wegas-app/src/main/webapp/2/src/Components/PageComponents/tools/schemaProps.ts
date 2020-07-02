import {
  ScriptMode,
  CodeLanguage,
  ScriptProps,
} from '../../../Editor/Components/FormView/Script/Script';
import { TYPESTRING, Schema, WidgetProps } from 'jsoninput/typings/types';
import { DEFINED_VIEWS } from '../../../Editor/Components/FormView';
import { WegasMethod } from '../../../Editor/editionConfig';
import { emptyStatement, Statement } from '@babel/types';
import { BooleanProps } from '../../../Editor/Components/FormView/Boolean';
import { StringInputProps } from '../../../Editor/Components/FormView/String';
import { CodeProps } from '../../../Editor/Components/FormView/Code';
import { IAsyncSelectProps } from '../../../Editor/Components/FormView/Select';
import { PageSelectProps } from '../../../Editor/Components/FormView/PageSelect';
import {
  TreeVariableSelectProps,
  ScripableVariableSelectProps,
  TreeVSelectProps,
  TreeSelectItem,
} from '../../../Editor/Components/FormView/TreeVariableSelect';
import { IArrayProps } from '../../../Editor/Components/FormView/Array';
import { StatementViewProps } from '../../../Editor/Components/FormView/Script/Expressions/ExpressionEditor';
import { createScript } from '../../../Helper/wegasEntites';
import { HashListChoices } from '../../../Editor/Components/FormView/HashList';
import {
  FileFilter,
  FilePickingType,
} from '../../../Editor/Components/FileBrowser/FileBrowser';
import { CustomScriptProps } from '../../../Editor/Components/FormView/CustomScript';
import { IAbstractContentDescriptor } from 'wegas-ts-api/typings/WegasEntities';

type TypedProps<T extends { view: {} }> = Schema<
  T['view'] & {
    type: keyof typeof DEFINED_VIEWS;
  }
>;

type SchemaLayout = 'inline' | 'shortInline';

export interface SelectItem {
  label: string;
  value: {};
}

const simpleSchemaProps = {
  hidden: (
    required: boolean = true,
    type: TYPESTRING | TYPESTRING[] = 'array',
    index: number = 0,
  ): TypedProps<WidgetProps.BaseProps> => ({
    required,
    type,
    index,
    view: {
      type: 'hidden',
    },
  }),
  boolean: (
    label?: string,
    required: boolean = true,
    value?: boolean,
    readOnly: boolean = false,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<BooleanProps> => ({
    required,
    type: 'boolean',
    value,
    index,
    view: {
      borderTop,
      index,
      readOnly,
      featureLevel,
      label,
      layout,
      type: 'boolean',
    },
  }),
  number: (
    label?: string,
    required: boolean = true,
    value?: number,
    readOnly: boolean = false,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<StringInputProps> => ({
    required,
    type: 'number',
    value,
    index,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      layout,
      readOnly,
      type: 'number',
    },
  }),
  string: (
    label?: string,
    required: boolean = true,
    value?: string,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
    readOnly?: boolean,
  ): TypedProps<StringInputProps> => ({
    required,
    type: 'string',
    value,
    index,
    view: {
      borderTop,
      index,
      layout,
      featureLevel,
      label,
      type: 'string',
      readOnly,
    },
  }),
  custom: <T extends keyof typeof DEFINED_VIEWS>(
    label?: string,
    required: boolean = true,
    type?: WegasMethod['returns'],
    viewType?: T,
    value?: number,
    index: number = 0,
    layout?: SchemaLayout,
    readOnly: boolean = false,
    featureLevel: FeatureLevel = 'DEFAULT',
    borderTop?: boolean,
  ) =>
    /* TODO : Improve  */
    /*: TypedProps<Parameters<typeof DEFINED_VIEWS[T]>[0]>*/
    ({
      featureLevel,
      required,
      type,
      value,
      index,
      view: {
        borderTop,
        index,
        featureLevel,
        label,
        layout,
        readOnly,
        type: viewType,
      },
    }),
  script: (
    label?: string,
    required: boolean = true,
    mode: ScriptMode = 'SET',
    language?: 'JavaScript' | 'JSON' | 'TypeScript' | 'CSS',
    value?: string,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<ScriptProps> => ({
    required,
    type: 'object',
    value: createScript(value, language),
    index,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      mode,
      type: 'script',
      layout,
    },
  }),
  customScript: (
    label?: string,
    required: boolean = true,
    returnType?: WegasScriptEditorReturnTypeName[],
    language?: 'JavaScript' | 'JSON' | 'TypeScript' | 'CSS',
    value?: string,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<CustomScriptProps> => ({
    required,
    type: 'object',
    value: createScript(value, language),
    index,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      returnType,
      type: 'customscript',
      layout,
    },
  }),
  code: (
    label?: string,
    required: boolean = true,
    language: CodeLanguage = 'JavaScript',
    value?: {} | string,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<CodeProps> => ({
    required,
    type: 'object',
    value,
    index,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      language,
      type: 'code',
      layout,
    },
  }),
  select: (
    label?: string,
    required: boolean = true,
    values: readonly (string | SelectItem)[] = [],
    value?: {} | string,
    returnType: TYPESTRING | TYPESTRING[] = 'string',
    openChoices: boolean = false,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<IAsyncSelectProps> & { enum: readonly unknown[] } => {
    let enumerator: readonly unknown[] = [];
    let choices: SelectItem[] = [];
    if (values.length > 0) {
      if (typeof values[0] === 'string') {
        enumerator = values;
        choices = values.map((v: string) => ({ label: v, value: v }));
      } else {
        enumerator = values.map((v: SelectItem) => v.value);
        choices = values as SelectItem[];
      }
    }

    return {
      enum: enumerator,
      required,
      type: returnType,
      index,
      value,
      view: {
        borderTop,
        index,
        choices,
        featureLevel,
        label,
        type: 'select',
        layout,
        undefined: !required,
        openChoices,
      },
    };
  },
  pageSelect: (
    label?: string,
    required: boolean = true,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<PageSelectProps> => {
    return {
      required,
      type: 'object',
      index,
      view: {
        borderTop,
        index,
        featureLevel,
        label,
        type: 'pageselect',
        layout,
      },
    };
  },
  pageLoaderSelect: (
    label?: string,
    required: boolean = true,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<PageSelectProps> => {
    return {
      required,
      type: 'object',
      index,
      view: {
        borderTop,
        index,
        featureLevel,
        label,
        type: 'pagesloaderselect',
        layout,
      },
    };
  },
  themeModeSelect: (
    label?: string,
    required: boolean = true,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<PageSelectProps> => {
    return {
      required,
      type: 'string',
      index,
      view: {
        borderTop,
        index,
        featureLevel,
        label,
        type: 'thememodeselect',
        layout,
      },
    };
  },
  variable: (
    label?: string,
    required: boolean = true,
    returnType: WegasScriptEditorReturnTypeName[] = [],
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    items?: TreeSelectItem<string>[],
    borderTop?: boolean,
  ): TypedProps<TreeVariableSelectProps> => ({
    required,
    type: 'string',
    index,
    view: {
      borderTop,
      index,
      returnType,
      featureLevel,
      label,
      type: 'variableselect',
      layout,
      items,
    },
  }),
  tree: <T>(
    label?: string,
    items?: TreeSelectItem<T>[],
    required: boolean = true,
    returnType: WegasScriptEditorReturnTypeName[] = [],
    type: TYPESTRING | TYPESTRING[] = 'string',
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<TreeVSelectProps<T>> => ({
    required,
    type,
    index,
    view: {
      borderTop,
      index,
      returnType,
      featureLevel,
      label,
      type: 'treeselect',
      layout,
      items,
    },
  }),
  scriptVariable: (
    label?: string,
    required: boolean = true,
    returnType: WegasScriptEditorReturnTypeName[] = [],
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<ScripableVariableSelectProps> => ({
    required,
    type: 'object',
    index,
    view: {
      borderTop,
      index,
      returnType,
      featureLevel,
      label,
      type: 'scriptableVariableSelect',
      layout,
    },
  }),
  array: (
    label?: string,
    itemShema: {} = {},
    userOnChildAdd?: (value?: {}) => void,
    // onChildRemove?: (index: number) => void,
    requiredItems: boolean = false,
    itemType: TYPESTRING = 'object',
    required: boolean = true,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    highlight: boolean = true,
    sortable: boolean = true,
    borderTop?: boolean,
  ): TypedProps<IArrayProps> => ({
    required,
    items: {
      // description:"shemaprops.array.items",
      properties: itemShema,
      required: requiredItems,
      type: itemType,
    },
    // onChildRemove,
    type: 'array',
    index,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      type: 'array',
      layout,
      highlight,
      sortable,
      userOnChildAdd,
    },
  }),
  statement: (
    label?: string,
    required: boolean = true,
    mode: ScriptMode = 'SET',
    value: Statement = emptyStatement(),
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ): TypedProps<StatementViewProps> => ({
    required,
    type: 'object',
    index,
    value,
    view: {
      borderTop,
      index,
      featureLevel,
      label,
      type: 'statement',
      layout,
      mode,
    },
  }),
  hashlist: (
    label?: string,
    required: boolean = true,
    choices?: HashListChoices,
    value: object = {},
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
    objectViewStyle?: boolean,
  ) => ({
    required,
    type: 'object',
    value,
    index,
    view: {
      choices,
      featureLevel,
      index,
      label,
      type: 'hashlist',
      layout,
      borderTop,
      objectViewStyle,
    },
  }),
  file: (
    label?: string,
    required: boolean = true,
    pick: FilePickingType = 'FILE',
    filter?: FileFilter,
    value?: IAbstractContentDescriptor,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ) => ({
    required,
    type: 'object',
    value,
    index,
    view: {
      pick,
      filter,
      featureLevel,
      index,
      label,
      type: 'file',
      layout,
      borderTop,
    },
  }),
  path: (
    label?: string,
    required: boolean = true,
    pick: FilePickingType = 'FILE',
    filter?: FileFilter,
    value?: string,
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ) => ({
    required,
    type: 'string',
    value,
    index,
    view: {
      pick,
      filter,
      featureLevel,
      index,
      label,
      type: 'file',
      layout,
      borderTop,
    },
  }),
};

type SimpleSchemaPropsValues = keyof typeof simpleSchemaProps;

export type SimpleSchemaPropsSchemas = ReturnType<
  typeof simpleSchemaProps[SimpleSchemaPropsValues]
>;

const objectSchemaProps = {
  object: (
    label?: string,
    properties: { [key: string]: SimpleSchemaPropsSchemas } = {},
    required: boolean = true,
    value: object = {},
    featureLevel: FeatureLevel = 'DEFAULT',
    index: number = 0,
    layout?: SchemaLayout,
    borderTop?: boolean,
  ) => ({
    description: 'com.wegas.core.persistence.variable.primitive.NumberInstance',
    properties,
    value,
    // protectionLevel: "INTERNAL"
    required,
    type: 'object',
    index,
    view: { featureLevel, index, label, layout, borderTop },
  }),
};

type ObjectSchemaPropsValues = keyof typeof objectSchemaProps;

type ObjectSchemaPropsSchemas = ReturnType<
  typeof objectSchemaProps[ObjectSchemaPropsValues]
>;

export const schemaProps = { ...simpleSchemaProps, ...objectSchemaProps };

export type SchemaPropsValues =
  | SimpleSchemaPropsValues
  | ObjectSchemaPropsValues;

export type SchemaPropsSchemas =
  | SimpleSchemaPropsSchemas
  | ObjectSchemaPropsSchemas;
