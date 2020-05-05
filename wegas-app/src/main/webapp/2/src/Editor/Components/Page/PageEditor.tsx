import * as React from 'react';
import { Toolbar } from '../../../Components/Toolbar';
import { JSONandJSEditor } from '../ScriptEditors/JSONandJSEditor';
import { deepClone } from 'fast-json-patch';
import { ComponentPalette, DnDComponent } from './ComponentPalette';
import { usePageComponentStore } from '../../../Components/PageComponents/tools/componentFactory';
import { MainLinearLayout } from '../LinearTabLayout/LinearLayout';
import ComponentEditor from './ComponentEditor';
import { PageLoader } from './PageLoader';
import { css, cx } from 'emotion';
import { noop } from 'lodash-es';
import { PagesLayout } from './PagesLayout';
import { store, useStore } from '../../../data/store';
import { Actions } from '../../../data';
import { deepDifferent } from '../../../Components/Hooks/storeHookFactory';
import { themeVar } from '../../../Components/Theme';
import { flex, grow, expandBoth } from '../../../css/classes';
import { Button } from '../../../Components/Inputs/Buttons/Button';
import { Toggler } from '../../../Components/Inputs/Boolean/Toggler';
import { mergeDeep } from '../../../Helper/tools';
import { findComponent } from '../../../Helper/pages';
const innerButtonStyle = css({
  margin: '2px auto 2px auto',
  width: 'fit-content',
});

export interface Handles {
  [path: string]: { jsx: JSX.Element; dom: React.RefObject<HTMLDivElement> };
}

export interface FocusedComponent {
  pageId: string;
  componentPath: number[];
}

export interface PageContext {
  editMode: boolean;
  showBorders: boolean;
  showControls: boolean;
  pageIdPath: string[];
  handles: Handles;
  onDrop: (
    dndComponent: DnDComponent,
    path: number[],
    index?: number,
    props?: WegasComponent['props'],
  ) => void;
  onDelete: (path: number[]) => void;
  onEdit: (path: number[]) => void;
  onUpdate: (value: WegasComponent, path?: number[], patch?: boolean) => void;
}

const defaultPageCTX: PageContext = {
  editMode: false,
  showBorders: false,
  showControls: true,
  pageIdPath: [],
  handles: {},
  onDrop: noop,
  onEdit: noop,
  onDelete: noop,
  onUpdate: noop,
};

export const pageCTX = React.createContext<PageContext>(defaultPageCTX);

interface PageEditorState {
  selectedPageId?: string;
  editedPath?: number[];
}

interface PageEditorContext extends PageEditorState {
  loading: boolean;
  selectedPage?: WegasComponent;
}
export const pageEditorCTX = React.createContext<PageEditorContext>({
  loading: false,
});

export const computePageLabel = (id: string, pageName?: string | null) =>
  pageName ? `${pageName} (${id})` : id;

export const returnPages = (
  pages: Pages,
  item?: PageIndexItem,
): PagesWithName => {
  if (item == null) {
    return {};
  }
  if (item['@class'] === 'Folder') {
    return {
      ...item.items.reduce((o, i) => ({ ...o, ...returnPages(pages, i) }), {}),
    };
  }
  return { [item.id!]: { name: item.name, page: pages[item.id!] } };
};

const patchPage = (selectedPageId: string, page: WegasComponent) =>
  store.dispatch(Actions.PageActions.patch(selectedPageId, page));

const createComponent = (
  page: WegasComponent,
  path: number[],
  componentType: string,
  componentProps?: WegasComponent['props'],
  index?: number,
) => {
  const newPath = [...path];
  const { newPage, component } = findComponent(page, newPath);
  if (component) {
    if (component.props.children === undefined) {
      component.props.children = [];
    }
    const children = component.props.children;
    const droppedComp: WegasComponent = {
      type: componentType,
      props: componentProps || {},
    };
    if (index !== undefined) {
      children.splice(index, 0, droppedComp);
      if (index >= children.length) {
        newPath.push(children.length - 1);
      } else {
        newPath.push(index);
      }
    } else {
      children.push(droppedComp);
      newPath.push(children.length - 1);
    }
    return { newPage, newPath };
  }
};

const deleteComponent = (page: WegasComponent, path: number[]) => {
  const newPage = deepClone(page) as WegasComponent;
  let parent: WegasComponent = newPage;
  const browsePath = [...path];
  while (browsePath.length > 0) {
    if (parent.props.children) {
      if (browsePath.length == 1) {
        parent.props.children.splice(browsePath[0], 1);
        return newPage;
      }
      parent = parent.props.children[browsePath[0]];
    }
    browsePath.splice(0, 1);
  }
};

const updateComponent = (
  page: WegasComponent,
  value: WegasComponent,
  path: number[],
  patch?: boolean,
) => {
  const { newPage, parent } = findComponent(page, path);
  if (parent) {
    if (parent.props.children && path) {
      let comp = value;
      if (patch) {
        const oldComp = parent.props.children[path[path.length - 1]];
        comp = {
          ...oldComp,
          props: {
            ...oldComp.props,
            ...value.props,
          },
        };
      }
      parent.props.children.splice(Number(path[path.length - 1]), 1, comp);
      return newPage;
    }
  } else {
    return value;
  }
};

function SourceEditor() {
  return (
    <pageEditorCTX.Consumer>
      {({ selectedPageId, selectedPage, loading }) =>
        loading ? (
          <pre>Loading the pages</pre>
        ) : (
          <JSONandJSEditor
            content={JSON.stringify(selectedPage, null, 2)}
            onSave={content => {
              try {
                if (selectedPageId) {
                  patchPage(selectedPageId, JSON.parse(content));
                } else {
                  throw Error('No selected page');
                }
              } catch (e) {
                return { status: 'error', text: e };
              }
            }}
          />
        )
      }
    </pageEditorCTX.Consumer>
  );
}

interface PageDisplayProps {
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBorders: React.Dispatch<React.SetStateAction<boolean>>;
}

function PageDisplay({
  setShowBorders,
  setEditMode,
  setShowControls,
}: PageDisplayProps) {
  const { selectedPageId, loading } = React.useContext(pageEditorCTX);
  const { editMode, showControls, showBorders } = React.useContext(pageCTX);

  if (loading) {
    return <pre>Loading the pages</pre>;
  }

  return (
    <Toolbar className={expandBoth + ' PAGE-DISPLAY'}>
      <Toolbar.Header>
        <div style={{ margin: 'auto' }}>
          {editMode && (
            <Button label={'Toggle controls'} disableBorders={{ right: true }}>
              <div className={innerButtonStyle}>
                <Toggler
                  value={showControls}
                  onChange={() => setShowControls(c => !c)}
                />
              </div>
            </Button>
          )}
          <Button
            label={'Toggle edit mode'}
            disableBorders={{ right: editMode, left: editMode }}
          >
            <div className={innerButtonStyle}>
              <Toggler
                value={editMode}
                onChange={() => setEditMode(!editMode)}
              />
            </div>
          </Button>
          {editMode && (
            <Button label={'Toggle borders'} disableBorders={{ left: true }}>
              <div className={innerButtonStyle}>
                <Toggler
                  value={showBorders}
                  onChange={() => setShowBorders(b => !b)}
                />
              </div>
            </Button>
          )}
        </div>
      </Toolbar.Header>
      <Toolbar.Content>
        <PageLoader selectedPageId={selectedPageId} />
      </Toolbar.Content>
    </Toolbar>
  );
}

interface LayoutProps {
  setPageEditorState: React.Dispatch<React.SetStateAction<PageEditorState>>;
  onMoveLayoutComponent: (
    sourcePageId: string,
    destPageId: string,
    sourcePage: WegasComponent,
    destPage: WegasComponent,
    sourcePath: number[],
    destPath: number[],
    destIndex: number,
    props?: WegasComponent['props'],
  ) => void;
  onNewLayoutComponent: (
    pageId: string,
    page: WegasComponent,
    path: number[],
    type: string,
  ) => void;
  onDeleteLayoutComponent: (
    pageId: string,
    page: WegasComponent,
    path: number[],
  ) => void;
  onEdit: (selectedPageId?: string, path?: number[]) => void;
}

function Layout({
  onDeleteLayoutComponent,
  onEdit,
  onMoveLayoutComponent,
  onNewLayoutComponent,
  setPageEditorState,
}: LayoutProps) {
  return (
    <PagesLayout
      onPageClick={pageId =>
        setPageEditorState(ops => ({
          ...ops,
          selectedPageId: pageId,
          editedPath: undefined,
        }))
      }
      componentControls={{
        onNew: onNewLayoutComponent,
        onDelete: onDeleteLayoutComponent,
        onEdit: onEdit,
        onMove: onMoveLayoutComponent,
      }}
    />
  );
}

export const pageLayoutId = 'PageEditorLayout';

export default function PageEditor() {
  const handles = React.useRef({});
  const focusTab = React.useRef<(tabId: string, layoutId: string) => void>();
  const [{ selectedPageId, editedPath }, setPageEditorState] = React.useState<
    PageEditorState
  >({});

  const [editMode, setEditMode] = React.useState(false);
  const [showBorders, setShowBorders] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);

  const [availableLayoutTabs, setAvailableLayoutTabs] = React.useState<{
    [name: string]: JSX.Element;
  }>({});

  const components = usePageComponentStore(s => s);
  const { selectedPage, defaultPageId, loading } = useStore(
    s => ({
      selectedPage: selectedPageId ? s.pages[selectedPageId] : undefined,
      defaultPageId: s.pages.index ? s.pages.index.defaultPageId : undefined,
      loading: selectedPageId == null || s.pages.index == null,
    }),
    deepDifferent,
  );

  React.useEffect(() => {
    if (selectedPageId == null && defaultPageId != null) {
      setPageEditorState(os => ({
        ...os,
        selectedPageId: defaultPageId,
        loading: defaultPageId == null,
      }));
    }
  }, [defaultPageId, selectedPageId]);

  const onEdit = React.useCallback(
    (selectedPageId?: string, path?: number[]) => {
      if (path != null) {
        focusTab.current && focusTab.current('Component Editor', pageLayoutId);
      }
      setPageEditorState(o => ({ ...o, editedPath: path, selectedPageId }));
    },
    [],
  );

  const onMoveLayoutComponent = React.useCallback(
    (
      sourcePageId: string,
      destPageId: string,
      sourcePage: WegasComponent,
      destPage: WegasComponent,
      sourcePath: number[],
      destPath: number[],
      destIndex: number,
      props?: WegasComponent['props'],
    ) => {
      const moveInsideItself = destPath.join().indexOf(sourcePath.join()) === 0;
      const samePage = sourcePageId === destPageId;
      const sameContainerPath =
        JSON.stringify(sourcePath.slice(0, -1)) === JSON.stringify(destPath);
      const sourceIndex: number | undefined = sourcePath.slice(-1)[0];
      const samePosition = sourceIndex === destIndex;

      // Don't do anything if the result is the same than before or if the user tries to put a container in itself
      if (
        !(
          moveInsideItself ||
          (samePage && sameContainerPath && samePosition && props == null)
        )
      ) {
        const { component } = findComponent(sourcePage, sourcePath);
        if (component) {
          const newSourcePage = deleteComponent(sourcePage, sourcePath);
          // Don't do anything if the path to the source element points to nothing (should never happen)
          if (newSourcePage != null) {
            const newDestPage = createComponent(
              samePage ? newSourcePage : destPage,
              destPath,
              component.type,
              props ? mergeDeep(component.props, props) : component.props,
              destIndex,
            );
            // Don't modify the source page if it's the same than the destination page
            if (newDestPage != null) {
              if (sourcePageId !== destPageId) {
                patchPage(sourcePageId, newSourcePage);
              }
              patchPage(destPageId, newDestPage.newPage);
              onEdit(destPageId, newDestPage.newPath);
            }
          }
        }
      }
    },
    [onEdit],
  );

  const onDrop = React.useCallback(
    (
      dndComponent: DnDComponent,
      path: number[],
      index?: number,
      props?: WegasComponent['props'],
    ) => {
      if (selectedPageId != null && selectedPage != null) {
        if (dndComponent.path == null) {
          const newComponent = createComponent(
            selectedPage,
            path,
            dndComponent.componentName,
            props
              ? props
              : components[
                  dndComponent.componentName
                ].getComputedPropsFromVariable(),
            index,
          );
          if (newComponent) {
            patchPage(selectedPageId, newComponent.newPage);
            onEdit(selectedPageId, newComponent.newPath);
          }
        } else {
          const newIndex = index ? index : 0;
          onMoveLayoutComponent(
            selectedPageId,
            selectedPageId,
            selectedPage,
            selectedPage,
            dndComponent.path,
            path,
            newIndex,
            props,
          );
          // onEdit(selectedPageId, [...path, newIndex]);
        }
      }
    },
    [components, selectedPage, selectedPageId, onEdit, onMoveLayoutComponent],
  );

  const onDelete = React.useCallback(
    (path: number[]) => {
      if (selectedPageId && selectedPage) {
        const newPage = deleteComponent(selectedPage, path);
        if (newPage) {
          patchPage(selectedPageId, newPage);
        }
      }
    },
    [selectedPage, selectedPageId],
  );

  const onUpdate = React.useCallback(
    (value: WegasComponent, componentPath?: number[], patch?: boolean) => {
      const path = componentPath ? componentPath : editedPath;
      if (selectedPageId != null && selectedPage != null && path != null) {
        const newPage = updateComponent(selectedPage, value, path, patch);
        if (newPage) {
          patchPage(selectedPageId, newPage);
        }
      }
    },
    [editedPath, selectedPage, selectedPageId],
  );

  const onNewLayoutComponent = React.useCallback(
    (pageId, page, path, type) => {
      const newComponent = createComponent(
        page,
        path,
        type,
        components[type]?.getComputedPropsFromVariable(),
      );
      if (newComponent) {
        patchPage(pageId, newComponent.newPage);
        onEdit(pageId, newComponent.newPath);
      }
    },
    [components, onEdit],
  );

  const onDeleteLayoutComponent = React.useCallback(
    (pageId: string, page: WegasComponent, path: number[]) => {
      const newPage = deleteComponent(page, path);
      if (newPage) {
        patchPage(pageId, newPage);
      }
    },
    [],
  );

  React.useEffect(() => {
    setAvailableLayoutTabs({
      'Pages Layout': (
        <Layout
          onDeleteLayoutComponent={onDeleteLayoutComponent}
          onEdit={onEdit}
          onMoveLayoutComponent={onMoveLayoutComponent}
          onNewLayoutComponent={onNewLayoutComponent}
          setPageEditorState={setPageEditorState}
        />
      ),
      'Component Palette': <ComponentPalette />,
      'Page Display': (
        <PageDisplay
          setEditMode={setEditMode}
          setShowBorders={setShowBorders}
          setShowControls={setShowControls}
        />
      ),
      'Source Editor': <SourceEditor />,
      'Component Editor': <ComponentEditor />,
    });
  }, [
    onDeleteLayoutComponent,
    onEdit,
    onMoveLayoutComponent,
    onNewLayoutComponent,
  ]);

  return Object.keys(availableLayoutTabs).length === 0 ? (
    <pre>Loading...</pre>
  ) : (
    <div
      className={
        cx(
          flex,
          grow,
          css({
            borderStyle: 'solid',
            borderColor: themeVar.primaryDarkerColor,
            margin: '1px',
            marginTop: '0px',
          }),
        ) + ' PAGE-EDITOR'
      }
    >
      <pageEditorCTX.Provider
        value={{
          selectedPageId,
          selectedPage,
          editedPath,
          loading,
        }}
      >
        <pageCTX.Provider
          value={{
            editMode,
            showControls,
            showBorders: showBorders /*|| (editMode && isAnythingDragged)*/,
            pageIdPath: selectedPageId
              ? [selectedPageId]
              : defaultPageId
              ? [defaultPageId]
              : [],
            handles: handles.current,
            onDrop,
            onDelete,
            onEdit: path => onEdit(selectedPageId, path),
            onUpdate,
          }}
        >
          <MainLinearLayout
            tabs={availableLayoutTabs}
            layout={[
              [['Pages Layout'], ['Component Palette']],
              ['Page Display'],
            ]}
            layoutId={pageLayoutId}
            onFocusTab={ft => {
              focusTab.current = ft;
            }}
          />
        </pageCTX.Provider>
      </pageEditorCTX.Provider>
    </div>
  );
}
