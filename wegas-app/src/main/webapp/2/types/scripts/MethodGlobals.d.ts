interface WegasScriptEditorNameAndTypes
  extends WegasEntitesNamesAndClasses {
  boolean: boolean;
  'boolean[]': boolean[];
  number: number;
  'number[]': number[];
  string: string;
  'string[]': string[];
  object: object;
  'object[]': object[];
  never: never;
  'never[]': never[];
  void: void;
  'void[]': void[];
  undefined: undefined;
  'undefined[]': undefined[];
}

interface ArrayedTypeMap<T = {}> {
  undefined: T[keyof T];
  array: T[keyof T][];
}

type WegasScriptEditorReturnTypeName = keyof WegasScriptEditorNameAndTypes;

type WegasScriptEditorReturnType = WegasScriptEditorNameAndTypes[WegasScriptEditorReturnTypeName];

type ArrayedAndNot<T extends {}> = ArrayedTypeMap<
  T
>[keyof ArrayedTypeMap];

type GlobalMethodAdd = <
  T extends keyof WegasScriptEditorNameAndTypes,
  AT extends ArrayedTypeMap<Pick<WegasScriptEditorNameAndTypes, T>>,
  A extends keyof AT
>(
  name: string,
  types: T[],
  array: A,
  method: () => AT[A],
) => void;

interface GlobalMethodPayload {
  name: string;
  types: WegasScriptEditorReturnTypeName[];
  array: keyof ArrayedTypeMap;
  method: () => unknown;
}

interface GlobalMethodClass {
  addMethod: GlobalMethodAdd;
  getMethod: (
    name: string,
  ) => () => ArrayedAndNot<WegasScriptEditorNameAndTypes>;
}