import generate from '@babel/generator';
import { parse } from '@babel/parser';
import {
  booleanLiteral,
  emptyStatement,
  EmptyStatement,
  Expression,
  expressionStatement,
  ExpressionStatement,
  isBooleanLiteral,
  isEmptyStatement,
  isExpressionStatement,
  isLogicalExpression,
  logicalExpression,
  program,
  Statement,
} from '@babel/types';
import { WidgetProps } from 'jsoninput/typings/types';
import * as React from 'react';
import { IconButton } from '../../../../Components/Button/IconButton';
import { CommonView, CommonViewContainer } from '../commonView';
import { Labeled, LabeledView } from '../labeled';
import { Statements } from './Statements';
import { wlog } from '../../../../Helper/wegaslog';
import {
  WegasScriptEditor,
  WegasScriptEditorProps,
} from '../../ScriptEditors/WegasScriptEditor';
import { css } from 'emotion';
import { runScript } from '../../../../data/Reducer/VariableInstanceReducer';
import { Player } from '../../../../data/selectors';
import { store } from '../../../../data/store';
import { toLower } from 'lodash-es';

const scriptEdit = css({ height: '5em', marginTop: '0.8em', width: '500px' });

function literalToExpression(expr: Expression) {
  return isBooleanLiteral(expr, { value: true })
    ? emptyStatement()
    : expressionStatement(expr);
}
function logicalToList(expression: Expression): Statement[] {
  if (isLogicalExpression(expression, { operator: '&&' })) {
    if (isLogicalExpression(expression.left)) {
      return logicalToList(expression.left).concat([
        literalToExpression(expression.right),
      ]);
    }
    return [
      literalToExpression(expression.left),
      literalToExpression(expression.right),
    ];
  }
  return [literalToExpression(expression)];
}

function listToLogical(
  expressions: (ExpressionStatement | EmptyStatement)[],
): ExpressionStatement | undefined {
  switch (expressions.length) {
    case 0:
      return;
    case 1: {
      const exp = expressions[0];
      if (isEmptyStatement(exp)) {
        return expressionStatement(booleanLiteral(true));
      }
      return exp;
    }
    default: {
      let last = expressions.pop()!;
      if (isEmptyStatement(last)) {
        last = expressionStatement(booleanLiteral(true));
      }
      const left = listToLogical(expressions)!;

      return expressionStatement(
        logicalExpression('&&', left.expression, last.expression),
      );
    }
  }
}
function scriptObject(script?: string | IScript | null) {
  return typeof script === 'object' && script != null
    ? script.content
    : script || '';
}
interface ScriptBodyProps {
  script?: IScript | string | null;
  onChange: (script: IScript) => void;
  mode: 'GET' | 'SET';
  children: (props: {
    ast: Statement[];
    onChange: (ast: Statement[]) => void;
  }) => JSX.Element;
}
function ScriptBody({ script, onChange, children, mode }: ScriptBodyProps) {
  const code = scriptObject(script);
  const ast = parse(code, { sourceType: 'script' }).program.body;
  function transform(ast: Statement[]) {
    let updted;
    if (mode === 'SET') {
      updted = ast;
    } else {
      if (
        ast.some(
          stmt => !(isExpressionStatement(stmt) || isEmptyStatement(stmt)),
        )
      ) {
        throw Error('Unhandled');
      }
      // ast is (ExpressionStatement|EmptyStatement)[]
      updted = [
        listToLogical((ast as any) as (ExpressionStatement | EmptyStatement)[]),
      ].filter(v => v !== undefined) as Statement[];
    }
    onChange({
      '@class': 'Script',
      language: 'JavaScript',
      content: generate(program(updted)).code,
    });
  }
  const fstStmt = ast[0];
  if (mode === 'GET' && isExpressionStatement(fstStmt)) {
    return children({
      ast: logicalToList(fstStmt.expression),
      onChange: transform,
    });
  }
  return children({
    ast: ast,
    onChange: transform,
  });
}

interface ScriptProps
  extends WidgetProps.BaseProps<
    LabeledView & CommonView & { mode?: 'SET' | 'GET' }
  > {
  value?: string | IScript;
  context?: IVariableDescriptor<IVariableInstance>;
  onChange: (code: IScript) => void;
}

export function Script({
  view,
  errorMessage,
  value,
  context,
  onChange,
}: ScriptProps) {
  const [error, setError] = React.useState();
  const [srcMode, setSrcMode] = React.useState(false);
  const [editorValue, setEditorValue] = React.useState(
    value === undefined
      ? ''
      : typeof value === 'string'
      ? value
      : value.content,
  );
  const mode = view.mode || 'SET';

  const toggleSrcMode = React.useCallback(() => setSrcMode(src => !src), []);
  const testScript = React.useCallback(() => {
    try {
      store.dispatch(runScript(editorValue, Player.selectCurrent(), context));
    } catch (error) {
      setError(error.message);
    }
  }, [context, editorValue]);

  const handleChanges = React.useCallback(
    (value: string) => {
      setEditorValue(() => {
        wlog('TRIGGER ON CHANGE');
        onChange({
          '@class': 'Script',
          language: 'JavaScript',
          content: value,
        });
        return value;
      });
    },
    [onChange],
  );

  React.useEffect(() => {
    setEditorValue((oldVal: string) => {
      const newValue =
        value === undefined
          ? ''
          : typeof value === 'string'
          ? value
          : value.content;
      if (newValue !== oldVal) {
        return newValue;
      }
      return oldVal;
    });
  }, [value]);

  return (
    <CommonViewContainer
      view={view}
      errorMessage={error ? [error] : errorMessage}
    >
      <Labeled label={view.label} description={view.description} /*{...view}*/>
        {({ labelNode }) => {
          return (
            <>
              {labelNode}
              <IconButton icon="code" pressed={error} onClick={toggleSrcMode} />
              <IconButton icon="play" onClick={testScript} />
              {srcMode ? (
                <div className={scriptEdit}>
                  <WegasScriptEditor
                    value={editorValue}
                    onBlur={handleChanges}
                    minimap={false}
                    noGutter={true}
                  />
                </div>
              ) : (
                <ScriptBody
                  script={editorValue}
                  onChange={onChange}
                  mode={mode}
                >
                  {({ ast, onChange }) => (
                    <Statements
                      statements={ast}
                      onChange={onChange}
                      mode={mode}
                    />
                  )}
                </ScriptBody>
              )}
            </>
          );
        }}
      </Labeled>
    </CommonViewContainer>
  );
}

export type CodeLanguage =
  | 'JavaScript'
  | 'TypeScript'
  | 'CSS'
  | 'JSON'
  | 'PlainText';

interface CodeProps
  extends WidgetProps.BaseProps<
    LabeledView & CommonView & { language?: CodeLanguage }
  > {
  value?: {} | string;
  onChange: (code: string) => void;
}

export function Code({ view, value, onChange }: CodeProps) {
  return (
    <CommonViewContainer view={view}>
      <Labeled label={view.label} description={view.description} /*{...view}*/>
        {({ labelNode }) => {
          return (
            <>
              {labelNode}
              <div className={scriptEdit}>
                <WegasScriptEditor
                  language={
                    view.language
                      ? (toLower(
                          view.language,
                        ) as WegasScriptEditorProps['language'])
                      : view.language
                  }
                  value={
                    typeof value === 'string' ? value : JSON.stringify(value)
                  }
                  onBlur={onChange}
                  minimap={false}
                  noGutter={true}
                />
              </div>
            </>
          );
        }}
      </Labeled>
    </CommonViewContainer>
  );
}
