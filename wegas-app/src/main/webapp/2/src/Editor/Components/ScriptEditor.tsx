import * as React from 'react';
import { TabLayout } from '../../Components/Tabs';
import { Toolbar } from '../../Components/Toolbar';
import { IconButton } from '../../Components/Button/IconButton';
import { LibraryApi, NewLibErrors, LibType } from '../../API/library.api';
import { GameModel } from '../../data/selectors';
import SrcEditor from './SrcEditor';
import { StoreConsumer, StoreDispatch } from '../../data/store';
import { State } from '../../data/Reducer/reducers';
import { Actions } from '../../data';
import { LibraryState } from '../../data/Reducer/libraryState';

type VisibilityMode = 'CREATE' | 'EDIT' | 'DELETE' | 'CONTENT';

interface ScriptEditorLayoutProps {
  dispatch: StoreDispatch;
}

interface ScriptEditorProps {
  scriptType: LibType;
  dispatch: StoreDispatch;
}

const visibilities: IVisibility[] = [
  'INTERNAL',
  'PROTECTED',
  'INHERITED',
  'PRIVATE',
];

interface LibraryStatus {
  isEdited: boolean;
}

interface ILibrariesWithState {
  [id: string]: {
    library: ILibrary;
    status: LibraryStatus;
  };
}

interface ILibrariesState {
  key: string;
  libraries: ILibrariesWithState;
  tempLibrary: ILibrary;
  tempStatus: LibraryStatus;
}

function ScriptEditor(props: ScriptEditorProps) {
  const gameModelId = GameModel.selectCurrent().id!;
  const gameModel = GameModel.selectCurrent();
  const librarySelectorId = 'library-selector';
  const visibilitySelectorId = 'visibility-selector';

  const [librariesState, setLibrariesState] = React.useState<ILibrariesState>({
    key: '',
    libraries: {},
    tempLibrary: {
      content: '',
      visibility: 'PRIVATE',
    },
    tempStatus: {
      isEdited: false,
    },
  });

  let scriptLanguage: 'css' | 'javascript';

  switch (props.scriptType) {
    case 'CSS':
      scriptLanguage = 'css';
      break;
    case 'ClientScript':
    case 'Script':
    default:
      scriptLanguage = 'javascript';
  }

  const getVisibilitySelector = () => {
    return document.getElementById(visibilitySelectorId)! as HTMLInputElement;
  };

  const getLibrarySelector = () => {
    return document.getElementById(librarySelectorId)! as HTMLInputElement;
  };

  const setLibraryEdition = (isEdited: boolean) => {
    setLibrariesState((oldState: ILibrariesState) => {
      if (oldState.key) {
        const newLibs = oldState.libraries;
        newLibs[oldState.key].status.isEdited = isEdited;
        return { ...oldState, libraries: newLibs };
      } else {
        return {
          ...oldState,
          tempStatus: {
            ...oldState.tempStatus,
            isEdited: isEdited,
          },
        };
      }
    });
  };

  const setLibraryVisibility = (visibility: IVisibility) => {
    setLibrariesState((oldState: ILibrariesState) => {
      if (oldState.key) {
        const newLibs = oldState.libraries;
        newLibs[oldState.key].library.visibility = visibility;
        return { ...oldState, libraries: newLibs };
      } else {
        return {
          ...oldState,
          tempLibrary: {
            ...oldState.tempLibrary,
            visibility: visibility,
          },
        };
      }
    });
  };

  const loadLibraries = (select?: string) => {
    LibraryApi.getAllLibraries(gameModelId, props.scriptType)
      .then((libs: ILibraries) => {
        setLibrariesState((oldState: ILibrariesState) => {
          const libKeys = Object.keys(libs);
          const libKey = select
            ? select
            : libKeys.indexOf(oldState.key) !== -1 //Checks if old key still exists in libs
            ? oldState.key
            : libKeys.length > 0 //If not, sets the new key as the first element in library
            ? libKeys[0]
            : ''; //If no more libraries, set key to ''
          let newLib: ILibrariesWithState = {};

          for (const key in libs) {
            newLib[key] = {
              library: libs[key],
              status: {
                isEdited: oldState.libraries[key]
                  ? oldState.libraries[key].status.isEdited
                  : false,
              },
            };
          }

          return {
            ...oldState,
            key: libKey,
            libraries: newLib,
          };
        });
      })
      .catch(e => {
        console.log(e);
        alert('Cannot get the scripts');
      });
  };

  const onLibraryChange = () => {
    setLibrariesState((oldState: ILibrariesState) => {
      const newKey = getLibrarySelector().value;
      getVisibilitySelector().value =
        librariesState.libraries[newKey].library.visibility;
      return {
        ...oldState,
        key: newKey,
        libraries: oldState.libraries,
      };
    });
  };

  const onVisibilityChange = () => {
    setLibraryEdition(true);
    setLibraryVisibility(getVisibilitySelector().value as IVisibility);
  };

  const onNewLibrary = (name: string | null, library?: ILibrary) => {
    if (name !== null) {
      return LibraryApi.addLibrary(gameModelId, props.scriptType, name, library)
        .then((res: IGameModel) => {
          loadLibraries(name);
        })
        .catch((e: NewLibErrors) => {
          switch (e) {
            case 'NOTNEW':
              alert(
                'Script name not available (script already exists or the name contains bad characters)',
              );
              break;
            case 'UNKNOWN':
            default:
              alert('Cannot create the script');
          }
        });
    }
  };

  const onSaveLibrary = () => {
    let libKey: string | null = librariesState.key;
    if (!libKey) {
      libKey = prompt('Please enter a script name');
      if (libKey) {
        onNewLibrary(libKey, {
          content: librariesState.tempLibrary.content,
          visibility: getVisibilitySelector().value as IVisibility,
        });
      }
    } else {
      // props.dispatch(
      //   Actions.ScriptActions.patch(
      //     librariesState.libraries[libKey].library.id,
      //     p,
      //   ),
      // );

      LibraryApi.saveLibrary(
        gameModelId,
        props.scriptType,
        libKey,
        librariesState.libraries[libKey].library,
      )
        .then(() => {
          setLibraryEdition(false);
          loadLibraries();
        })
        .catch(() => {
          alert('Cannot save the script');
        });
    }
  };

  const onDeleteLibrary = () => {
    if (confirm('Are you sure you want to delete this library?')) {
      LibraryApi.deleteLibrary(
        gameModelId,
        props.scriptType,
        librariesState.key,
      )
        .then(() => {
          loadLibraries();
        })
        .catch(() => {
          alert('Cannot delete the script');
        });
    }
  };

  const onEditorBlur = (content: string) => {
    setLibrariesState((oldState: ILibrariesState) => {
      if (oldState.key !== '') {
        const newLibs = oldState.libraries;
        newLibs[oldState.key].status.isEdited =
          newLibs[oldState.key].status.isEdited ||
          oldState.libraries[oldState.key].library.content !== content;
        newLibs[oldState.key].library.content = content;
        return {
          ...oldState,
          libraries: newLibs,
        };
      } else {
        return {
          ...oldState,
          tempLibrary: {
            ...oldState.tempLibrary,
            content: content,
          },
          tempStatus: {
            isEdited: oldState.tempLibrary.content !== content,
          },
        };
      }
    });
  };

  const getScriptEditingState = (): boolean => {
    return (
      (!librariesState.key && librariesState.tempStatus.isEdited) ||
      (librariesState.libraries[librariesState.key] &&
        librariesState.libraries[librariesState.key].status.isEdited)
    );
  };

  const getActualScriptContent = (): string => {
    return librariesState.libraries[librariesState.key]
      ? librariesState.libraries[librariesState.key].library.content
      : !librariesState.key
      ? librariesState.tempLibrary.content
      : '';
  };

  const getActualScriptVisibility = (): IVisibility => {
    return librariesState.key
      ? librariesState.libraries[librariesState.key].library.visibility
      : librariesState.tempLibrary.visibility;
  };

  const isVisibilityAllowed = (visibility: IVisibility): boolean => {
    const currentVisibility: IVisibility = librariesState.key
      ? librariesState.libraries[librariesState.key].library.visibility
      : 'PRIVATE';
    let allowedVisibilities: IVisibility[] = [];

    if (
      gameModel.type === 'MODEL' ||
      (gameModel.type === 'REFERENCE' && librariesState.key)
    ) {
      allowedVisibilities = ['INHERITED', 'INTERNAL', 'PRIVATE', 'PROTECTED'];
    } else if (librariesState.key) {
      allowedVisibilities.push(currentVisibility);
    } else {
      allowedVisibilities.push('PRIVATE');
    }

    return allowedVisibilities.indexOf(visibility) !== -1;
  };

  const isDeleteAllowed = (): boolean => {
    if (!librariesState.key) {
      return false;
    } else if (
      gameModel.type === 'SCENARIO' &&
      librariesState.libraries[librariesState.key].library.visibility !==
        'PRIVATE'
    ) {
      return false;
    } else {
      return true;
    }
  };

  const isEditAllowed = (): boolean => {
    if (!librariesState.key) {
      return true;
    } else if (
      gameModel.type === 'SCENARIO' &&
      librariesState.libraries[librariesState.key].library.visibility !==
        'PRIVATE' &&
      librariesState.libraries[librariesState.key].library.visibility !==
        'INHERITED'
    ) {
      return false;
    } else {
      return true;
    }
  };

  React.useEffect(() => {
    loadLibraries();
  }, [props]);

  return (
    <Toolbar>
      <Toolbar.Header>
        <IconButton
          icon="plus"
          tooltip="Add a new script"
          onClick={() => {
            if (!librariesState.key) {
              onSaveLibrary(); //Force save temporary content
            } else {
              onNewLibrary(prompt('Type the name of the script'));
            }
          }}
        />
        <select
          id={librarySelectorId}
          onChange={onLibraryChange}
          value={librariesState.key}
        >
          {Object.keys(librariesState.libraries).length > 0 ? (
            Object.keys(librariesState.libraries).map((key: string) => {
              return (
                <option key={key} value={key}>
                  {key}
                </option>
              );
            })
          ) : (
            <option key={''} value="">
              No script
            </option>
          )}
        </select>
        <select
          id={visibilitySelectorId}
          onChange={onVisibilityChange}
          value={getActualScriptVisibility()}
        >
          {visibilities.map((item, key) => {
            return (
              <option
                key={key}
                hidden={!isVisibilityAllowed(item)}
                value={item}
              >
                {item}
              </option>
            );
          })}
        </select>
        <IconButton
          icon="file"
          onClick={() => {
            setLibraryEdition(false);
          }}
        />
        {isEditAllowed() && (
          <IconButton
            icon="save"
            tooltip="Save the script"
            onClick={onSaveLibrary}
          />
        )}
        {isDeleteAllowed() && (
          <IconButton
            icon="trash"
            tooltip="Delete the script"
            onClick={onDeleteLibrary}
          />
        )}
        <div>
          {getScriptEditingState()
            ? 'The script is not saved'
            : 'The script is saved'}
        </div>
      </Toolbar.Header>
      <Toolbar.Content>
        <SrcEditor
          value={getActualScriptContent()}
          language={scriptLanguage}
          onBlur={onEditorBlur}
          readonly={!isEditAllowed()}
        />
      </Toolbar.Content>
    </Toolbar>
  );
}

export function ScriptEditorLayout(props: ScriptEditorLayoutProps) {
  return (
    <TabLayout tabs={['Styles', 'Client', 'Server']}>
      <ScriptEditor {...props} scriptType="CSS" />
      <ScriptEditor {...props} scriptType="ClientScript" />
      <ScriptEditor {...props} scriptType="Script" />
    </TabLayout>
  );
}

export default function ConnectedPageDisplay() {
  return (
    <StoreConsumer selector={(s: State) => ({})}>
      {({ state, dispatch }) => (
        <ScriptEditorLayout {...state} dispatch={dispatch} />
      )}
    </StoreConsumer>
  );
}
