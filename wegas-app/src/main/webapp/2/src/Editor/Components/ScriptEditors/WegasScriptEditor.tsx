import * as React from 'react';
import SrcEditor from './SrcEditor';
import { EditorProps } from './SrcEditor';
import { store } from '../../../data/store';

import entitiesSrc from '!!raw-loader!../../../../types/generated/WegasEntities.d.ts';

const variableClasses = Object.values(
  store.getState().variableDescriptors,
).reduce<{ [variable: string]: string }>((newObject, variable) => {
  if (variable !== undefined && variable.name !== undefined) {
    newObject[variable.name] = variable['@class'];
  }
  return newObject;
}, {});

const libContent =
  entitiesSrc +
  `type Exclude<T, U> = T extends U ? never : T;
    type Pick<T, K extends keyof T> = {
      [P in K]: T[P];
    };
    interface GameModel{}
    interface VariableClasses {${Object.keys(variableClasses).reduce(
      (s, k) => s + k + ':I' + variableClasses[k] + ';\n',
      '',
    )}}
    class Variable {
      static find: <T extends keyof VariableClasses>(
        gameModel: GameModel,
        name: T
      ) => VariableClasses[T];
    }`;

// Will allow to make readonly parts in the editor
//   editor.onDidChangeCursorPosition(function (e) {
//     if (e.position.lineNumber < 3) {
//         this.editor.setPosition({
//             lineNumber:3,
//             column: 1
//         });
//     }
// });

export function WegasScriptEditor(props: EditorProps) {
  return (
    <SrcEditor
      {...props}
      language={'javascript'}
      defaultExtraLibs={[
        {
          content: libContent,
          name: 'Userscript.d.ts',
        },
      ]}
    />
  );
}
