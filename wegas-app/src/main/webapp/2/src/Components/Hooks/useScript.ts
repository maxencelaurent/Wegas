import * as React from 'react';
import { instantiate } from '../../data/scriptable';
import { Player, VariableDescriptor as VDSelect } from '../../data/selectors';
import { useStore, store } from '../../data/store';
import { featuresCTX } from '../Contexts/FeaturesProvider';
import { languagesCTX } from '../Contexts/LanguagesProvider';
import { useGameModel } from './useGameModel';
import { Actions } from '../../data';
import { transpile } from 'typescript';
import { classesCTX } from '../Contexts/ClassesProvider';
import { wwarn } from '../../Helper/wegaslog';
import { deepDifferent } from './storeHookFactory';
import { IVariableDescriptor, WegasClassNames } from 'wegas-ts-api/typings/WegasEntities';
import { SGameModel, SPlayer } from 'wegas-ts-api/src/generated/WegasScriptableEntities';
import { ScriptableEntity } from 'wegas-ts-api/src/index';

interface GlobalVariableClass {
  find: <T extends IVariableDescriptor>(
    _gm: unknown,
    name: string,
  ) => ScriptableEntity<T> | undefined;
}

interface GlobalClasses {
  gameModel?: Readonly<SGameModel>;
  self?: Readonly<SPlayer>;
  Variable: GlobalVariableClass;
  Editor: GlobalEditorClass;
  ClientMethods: GlobalClientMethodClass;
  ServerMethods: GlobalServerMethodClass;
  Schemas: GlobalSchemaClass;
  Classes: GlobalClassesClass;
}

export function createSandbox<T = unknown>() {
  const sandbox = document.createElement('iframe');
  // This is used to prevent unwanted modification from scripts.
  // One can still access main window from the sandbox (window.top) and modify it from there. (Break it)
  sandbox.setAttribute('sandbox', 'allow-same-origin');
  sandbox.style.display = 'none';
  document.body.appendChild(sandbox);
  return { sandbox, globals: (sandbox.contentWindow as unknown) as T };
}

const { sandbox, globals } = createSandbox<GlobalClasses>();

export function useGlobals() {
  // Hooks
  const player = useStore(Player.selectCurrent);
  const gameModel = useGameModel();
  const defaultFeatures: FeaturesSelecta = {
    DEFAULT: true,
    ADVANCED: false,
    INTERNAL: false,
  };
  const { currentFeatures, setFeature, removeFeature } = React.useContext(
    featuresCTX,
  );
  const { lang, selectLang } = React.useContext(languagesCTX);

  // Global variables
  globals.gameModel = instantiate(gameModel);
  globals.self = instantiate(player);

  // Variable class
  globals.Variable = {
    find: <T extends IVariableDescriptor>(_gm: unknown, name: string) => {
      const iDesc = VDSelect.findByName<T>(name);
      if (iDesc) {
        return instantiate(iDesc) as any;
      }
    },
  };

  // Editor class
  globals.Editor = {
    getFeatures: () =>
      Object.keys(defaultFeatures).reduce(
        (fs, f: FeatureLevel) => ({ ...fs, [f]: currentFeatures.includes(f) }),
        defaultFeatures,
      ),
    setFeatures: (features: FeaturesSelecta) =>
      Object.keys(features).map((f: FeatureLevel) => {
        if (features[f]) {
          setFeature(f);
        } else {
          removeFeature(f);
        }
      }),
    getLanguage: () => gameModel.languages.find(l => l.code === lang),
    setLanguage: lang =>
      selectLang(typeof lang === 'string' ? lang : lang.code),
  };

  const addMethod: ClientMethodAdd = (name, types, array, method) => {
    store.dispatch(
      Actions.EditorActions.setClientMethod(
        name,
        types,
        array as keyof ArrayedTypeMap,
        method,
      ),
    );
  };

  // // Test for addMethod
  // addMethod(
  //   "Taddaaa",
  //   ["number","string[]"],
  //   "array",
  //   ()=>[
  //       // Respecting the type
  //       ["yeah"],
  //       1234,
  //       // No respecting the type
  //       true,
  //       "nooo",
  //       [6666]
  //   ]);

  // ClientMethods class
  globals.ClientMethods = {
    addMethod: addMethod,
    getMethod: (name: string) => {
      return store.getState().global.clientMethods[name]
        .method as () => WegasScriptEditorReturnType;
    },
  };

  const registerMethod: ServerMethodRegister = (method, schema) => {
    store.dispatch(Actions.EditorActions.registerServerMethod(method, schema));
  };

  // ServerMethods class
  globals.ServerMethods = {
    registerMethod,
  };

  // Schemas class
  globals.Schemas = {
    addSchema: (
      name: string,
      schemaFN: CustomSchemaFN,
      simpleFilter?: WegasClassNames,
    ) => {
      store.dispatch(
        Actions.EditorActions.setSchema(name, schemaFN, simpleFilter),
      );
    },
    removeSchema: (name: string) => {
      store.dispatch(Actions.EditorActions.setSchema(name));
    },
  };

  // Classes class
  const { addClass, removeClass } = React.useContext(classesCTX);
  globals.Classes = {
    addClass,
    removeClass,
  };

  // TEST
  //   const currentPhase = globals.Variable.find(gameModel,'phaseMSG')?.getValue(self)
  // 	const currentPeriod = 1;
  // 	let items = []
  // 	const q = globals.Variable.find(gameModel,'questions').item(currentPhase - 1);
  // 	if (q) {
  // 		for (const i in q.get('items')) {
  // 			const item = q.item(i);
  // 			if (item.get('@class') === 'QuestionDescriptor' || item.get('@class') === 'WhQuestionDescriptor')
  // 			{
  // 				items.push(item);
  // 			} else if (i == currentPeriod - 1 && item.get('@class') === 'ListDescriptor') {
  // 				items = items.concat(item.flatten());
  // 			}
  // 		}
  // 	}
  // wlog(items);
}

export function clientScriptEval<ReturnValue>(script?: string) {
  return script != null
    ? ((sandbox.contentWindow as unknown) as {
      eval: (code: string) => ReturnValue;
    })
      // 'undefined' so that an empty script don't return '"use strict"'
      .eval('"use strict";undefined;' + transpile(script))
    : undefined;
}

export function safeClientScriptEval<ReturnValue>(script?: string) {
  try {
    return clientScriptEval<ReturnValue>(script);
  } catch (e) {
    wwarn(
      `Script error at line ${e.lineNumber} : ${
      e.message
      }\n\nScript content is :\n${script}\n\nTraspiled content is :\n${
      script != null ? transpile(script) : undefined
      }`,
    );
    return undefined;
  }
}

/**
 * Hook, execute a script locally.
 * @param script code to execute
 * @returns Last expression or LocalEvalError in case it errors.
 */
export function useScript<ReturnValue>(
  script?: string,
): ReturnValue | undefined {
  useGlobals();
  const fn = React.useCallback(
    () => safeClientScriptEval<ReturnValue>(script),
    [script],
  );
  return useStore(fn, deepDifferent) as ReturnValue | undefined;
}
