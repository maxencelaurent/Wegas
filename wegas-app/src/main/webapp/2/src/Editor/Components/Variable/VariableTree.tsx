import * as React from 'react';
import { VariableDescriptor } from '../../../data/selectors';
import { Actions } from '../../../data';
import { Toolbar } from '../../../Components/Toolbar';
import { varIsList, entityIs } from '../../../data/entities';
import { get } from 'lodash-es';

import { Container, Node } from '../Views/TreeView';
import { moveDescriptor } from '../../../data/Reducer/VariableDescriptorReducer';
import {
  getEntityActions,
  getIcon,
  getLabel,
  getChildren,
} from '../../editionConfig';
import { StoreDispatch, useStore, store } from '../../../data/store';
import { css, cx } from 'emotion';
import { shallowIs } from '../../../Helper/shallowIs';
import { DropMenu } from '../../../Components/DropMenu';
import { withDefault, IconComp } from '../Views/FontAwesome';
import { asyncSFC } from '../../../Components/HOC/asyncSFC';
import { AddMenuParent, AddMenuChoice, AddMenuFeedback } from './AddMenu';
import { editorLabel } from '../../../data/methods/VariableDescriptorMethods';
import { SearchTool } from '../SearchTool';
import { useAsync } from '../../../Components/Hooks/useAsync';
import { ComponentWithForm } from '../FormView/ComponentWithForm';
import { useGameModel } from '../../../Components/Hooks/useGameModel';
import { Edition } from '../../../data/Reducer/globalState';
import { shallowDifferent } from '../../../Components/Hooks/storeHookFactory';
import { mainLayoutId } from '../Layout';
import { themeVar } from '../../../Components/Style/ThemeVars';
import {
  globalSelection,
  localSelection,
  searchSelection,
  componentMarginLeft,
  flex,
  grow,
  flexColumn,
} from '../../../css/classes';
import {
  IVariableDescriptor,
  IEvaluationDescriptorContainer,
} from 'wegas-ts-api';
import { focusTab } from '../LinearTabLayout/LinearLayout';

const itemsPromise = getChildren({ '@class': 'ListDescriptor' }).then(
  children =>
    children.map(i => {
      const Label = asyncSFC(async () => {
        const entity = { '@class': i };
        return (
          <>
            <IconComp icon={withDefault(getIcon(entity), 'question')} />
            {getLabel(entity)}
          </>
        );
      });
      return {
        label: <Label />,
        value: i,
      };
    }),
);

interface VariableTreeTitleProps extends ClassAndStyle {
  variable?: IVariableDescriptor | IEvaluationDescriptorContainer;
  subPath?: (string | number)[];
}

export function VariableTreeTitle({
  variable,
  subPath,
  className,
  style,
}: VariableTreeTitleProps) {
  return (
    <div className={className} style={style}>
      <IconComp icon={withDefault(getIcon(variable!), 'question')} />
      {entityIs(variable, 'EvaluationDescriptorContainer')
        ? subPath && subPath.length === 1
          ? String(subPath[0]) === 'feedback'
            ? 'Feedback'
            : 'Feedback comment'
          : 'Unreachable code'
        : editorLabel(variable)}
    </div>
  );
}

interface TreeProps {
  variables: number[];
  localState?: Readonly<Edition> | undefined;
  localDispatch?: StoreDispatch;
}
function TreeView({ variables, localState, localDispatch }: TreeProps) {
  const [search, setSearch] = React.useState('');
  const { data } = useAsync(itemsPromise);
  const globalDispatch = store.dispatch;

  return (
    <Toolbar>
      <Toolbar.Header>
        <input
          type="string"
          value={search}
          placeholder="Filter"
          aria-label="Filter"
          onChange={ev => {
            setSearch(ev.target.value);
          }}
        />
        <DropMenu
          items={data || []}
          icon="plus"
          onSelect={(i, e) => {
            if (e.ctrlKey && localDispatch) {
              localDispatch(Actions.EditorActions.createVariable(i.value));
            } else {
              globalDispatch(Actions.EditorActions.createVariable(i.value));
              focusTab(mainLayoutId, 'Variable Properties');
            }
          }}
        />
        <SearchTool />
      </Toolbar.Header>
      <Toolbar.Content style={{ paddingTop: '1px' }}>
        <Container
          onDropResult={({ source, target, id }) => {
            if (
              source.parent !== target.parent ||
              source.index !== target.index
            ) {
              globalDispatch(
                moveDescriptor(
                  id as IVariableDescriptor,
                  target.index,
                  target.parent as IParentDescriptor,
                ),
              );
            }
          }}
        >
          {({ nodeProps }) => (
            <div className={cx(flex, grow, flexColumn)}>
              {variables ? (
                variables.map(v => (
                  <CTree
                    nodeProps={nodeProps}
                    key={v}
                    search={search}
                    variableId={v}
                    localState={localState}
                    localDispatch={localDispatch}
                  />
                ))
              ) : (
                <span>Loading ...</span>
              )}
            </div>
          )}
        </Container>
      </Toolbar.Content>
    </Toolbar>
  );
}

/**
 * test a variable and children's editorLabel against a text
 */
function isMatch(variableId: number, search: string): boolean {
  const variable = VariableDescriptor.select(variableId);
  if (variable == null) {
    return false;
  }
  if (editorLabel(variable).toLowerCase().includes(search.toLowerCase())) {
    return true;
  }
  if (varIsList(variable)) {
    return variable.itemsIds.some(id => isMatch(id, search));
  }
  return false;
}

function isEditing(
  variableId: number,
  subPath?: string[],
  editing?: Readonly<Edition>,
) {
  return (
    editing !== undefined &&
    (editing.type === 'Variable' || editing.type === 'VariableFSM') &&
    editing.entity &&
    variableId === editing.entity.id &&
    shallowIs(subPath || [], editing.path)
  );
}

//const SELECTED_STYLE_WIDTH = 4;
const headerStyle = css({
  //  borderLeft: `${SELECTED_STYLE_WIDTH}px solid transparent`,
});

export const nodeContentStyle = cx(
  css({
    cursor: 'pointer',
    marginRight: '5px',
    ':hover': {
      backgroundColor: themeVar.Common.colors.HoverColor,
    },
  }),
  componentMarginLeft,
);

export const TREEVIEW_ITEM_TYPE = 'TREEVIEW_DRAG_ITEM';

interface CTreeProps {
  variableId: number;
  subPath?: string[];
  search: string;
  nodeProps: () => {};
}

function CTree(
  props: Omit<CTreeProps & TreeProps, 'variables'>,
): JSX.Element | null {
  const { searching, editing, variable, match } = useStore(state => {
    let variable:
      | undefined
      | IVariableDescriptor
      | IEvaluationDescriptorContainer = VariableDescriptor.select(
      props.variableId,
    );
    if (Array.isArray(props.subPath) && props.subPath.length > 0) {
      variable = get(variable, props.subPath) as
        | IVariableDescriptor
        | IEvaluationDescriptorContainer;
    }

    return {
      variable: variable,
      match: isMatch(props.variableId, props.search),
      editing: isEditing(props.variableId, props.subPath, state.global.editing),
      searching:
        (variable &&
          entityIs(variable, 'VariableDescriptor') &&
          state.global.search.type === 'GLOBAL' &&
          state.global.search.value.includes(editorLabel(variable))) ||
        false,
    };
  }, shallowDifferent);

  const localEditing = isEditing(
    props.variableId,
    props.subPath,
    props.localState,
  );
  if (variable) {
    if (!match) {
      return null;
    }
    return (
      <Node
        dragId={TREEVIEW_ITEM_TYPE}
        {...props.nodeProps()}
        header={
          <div
            className={cx(headerStyle, flex, {
              [globalSelection]: editing,
              [localSelection]: localEditing,
              [searchSelection]: searching,
            })}
            onClick={(e: ModifierKeysEvent) => {
              let dispatch = store.dispatch;
              if (e.ctrlKey && props.localDispatch) {
                dispatch = props.localDispatch;
              } else {
                if (
                  entityIs(variable, 'FSMDescriptor') ||
                  entityIs(variable, 'DialogueDescriptor')
                ) {
                  focusTab(mainLayoutId, 'State Machine');
                }
                focusTab(mainLayoutId, 'Variable Properties');
              }
              getEntityActions(variable!).then(({ edit }) =>
                dispatch(
                  edit(
                    VariableDescriptor.select(props.variableId)!,
                    props.subPath,
                  ),
                ),
              );
            }}
          >
            <VariableTreeTitle
              variable={variable}
              subPath={props.subPath}
              className={nodeContentStyle}
            />
            {entityIs(variable, 'ListDescriptor') ||
            entityIs(variable, 'QuestionDescriptor') ||
            entityIs(variable, 'WhQuestionDescriptor') ? (
              <AddMenuParent
                variable={variable}
                localDispatch={props.localDispatch}
                focusTab={tabId => focusTab(mainLayoutId, tabId)}
              />
            ) : entityIs(variable, 'ChoiceDescriptor') ? (
              <AddMenuChoice
                variable={variable}
                localDispatch={props.localDispatch}
                focusTab={tabId => focusTab(mainLayoutId, tabId)}
              />
            ) : entityIs(variable, 'EvaluationDescriptorContainer') ? (
              <AddMenuFeedback
                variable={variable}
                localDispatch={props.localDispatch}
                focusTab={tabId => focusTab(mainLayoutId, tabId)}
                path={props.subPath![0] as 'feedback' | 'fbComments'}
              />
            ) : null}
          </div>
        }
        id={variable}
      >
        {({ nodeProps }) =>
          varIsList(variable)
            ? variable.itemsIds.map(i => (
                <CTree
                  nodeProps={nodeProps}
                  key={i}
                  variableId={i}
                  search={props.search}
                  localState={props.localState}
                  localDispatch={props.localDispatch}
                />
              ))
            : entityIs(variable, 'ChoiceDescriptor')
            ? variable.results.map((r, index) => (
                <CTree
                  nodeProps={nodeProps}
                  key={r.id}
                  search={props.search}
                  variableId={r.parentId!}
                  subPath={['results', String(index)]}
                  localState={props.localState}
                  localDispatch={props.localDispatch}
                />
              ))
            : entityIs(variable, 'PeerReviewDescriptor')
            ? [
                <CTree
                  nodeProps={nodeProps}
                  key={0}
                  search={props.search}
                  variableId={props.variableId}
                  subPath={['feedback']}
                  localState={props.localState}
                  localDispatch={props.localDispatch}
                />,
                <CTree
                  nodeProps={nodeProps}
                  key={1}
                  search={props.search}
                  variableId={props.variableId}
                  subPath={['fbComments']}
                  localState={props.localState}
                  localDispatch={props.localDispatch}
                />,
              ]
            : entityIs(variable, 'EvaluationDescriptorContainer')
            ? variable.evaluations.map((r, index) => (
                <CTree
                  nodeProps={nodeProps}
                  key={r.id}
                  search={props.search}
                  variableId={props.variableId}
                  subPath={[
                    ...(props.subPath ? props.subPath : []),
                    'evaluations',
                    String(index),
                  ]}
                  localState={props.localState}
                  localDispatch={props.localDispatch}
                />
              ))
            : null
        }
      </Node>
    );
  }
  return <div>Loading...</div>;
}
export function Tree() {
  const entities = useGameModel().itemsIds;
  return <TreeView variables={entities} />;
}

export default function TreeWithMeta() {
  const entities = useGameModel().itemsIds;
  return (
    <ComponentWithForm entityEditor>
      {({ localState, localDispatch }) => {
        return (
          <TreeView
            variables={entities}
            localState={localState}
            localDispatch={localDispatch}
          />
        );
      }}
    </ComponentWithForm>
  );
}
