import { Statement, isExpressionStatement } from '@babel/types';
import generate from '@babel/generator';
import * as React from 'react';
import { ExpressionStatement } from './ExpressionStatement';

interface StatementsProps {
  statements: Statement[];
  onChange: (statements: Statement[]) => void;
}
export function Statements({ statements, onChange }: StatementsProps) {
  return (
    <>
      {statements.map(
        (s, i) =>
          isExpressionStatement(s) ? (
            <ExpressionStatement
              stmt={s}
              key={i}
              onChange={stmt => {
                const copy = statements.slice();
                copy.splice(i, 1, stmt);
                onChange(copy);
              }}
            />
          ) : (
            <div key={i}>
              {generate(s).code}
              {/* <SrcEditor
                language="javascript"
                value={generate(s).code}
                onBlur={code => {
                  const stmts = parse(code, { sourceType: 'script' }).program
                    .body;
                  const copy = statements.slice();
                  copy.splice(i, 1, ...stmts);
                  onChange(copy);
                }}
              /> */}
            </div>
          ),
      )}
    </>
  );
}
