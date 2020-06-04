import * as React from 'react';
import { css, cx } from 'emotion';
import { themeVar } from './ThemeVars';
import {
  FonkyFlexContainer,
  FonkyFlexContent,
  FonkyFlexSplitter,
} from '../Layouts/FonkyFlex';
import {
  expandBoth,
  expandHeight,
  flex,
  flexColumn,
  justifyCenter,
  grow,
  autoScroll,
} from '../../css/classes';
import { ThemeProvider } from './Theme';
import { JSONPageDeserializer } from '../PageComponents/tools/JSONPageDeserializer';

const titleStyle = css({
  backgroundColor: themeVar.Text.colors.HoverColor,
  textAlign: 'center',
  padding: '2px',
});

const page1JSON = {
  type: 'FlexList',
  props: {
    children: [
      {
        type: 'FlexList',
        props: {
          name: 'Entete',
          children: [
            {
              type: 'Text',
              props: {
                script: {
                  '@class': 'Script',
                  content: "Variable.find(gameModel,'infoboxPhaseActuelle')",
                  language: 'JavaScript',
                },
                className: 'infoboxPhaseActuelle',
                options: {},
                style: {
                  'text-align': 'center',
                },
              },
            },
            {
              type: 'Phases',
              props: {
                phase: {
                  '@class': 'Script',
                  content: "Variable.find(gameModel,'phaseMSG')",
                  language: 'JavaScript',
                },
                options: {},
                style: {
                  width: '50%',
                },
                phaseMax: {
                  '@class': 'Script',
                  content: "Variable.find(gameModel,'phaseMax')",
                  language: 'JavaScript',
                },
                phaseMin: {
                  '@class': 'Script',
                  content: "Variable.find(gameModel,'phaseInitiale')",
                  language: 'JavaScript',
                },
              },
            },
            {
              type: 'Button',
              props: {
                action: {
                  '@class': 'Script',
                  content: 'Event.fire("PhaseSuivante");',
                  language: 'JavaScript',
                },
                label: 'Phase suivante',
                options: {
                  upgrades: {
                    disableIf: {
                      '@class': 'Script',
                      content:
                        'Variable.find(gameModel, "desactiverBoutonPhaseSuivante").getValue(self) || Variable.find(gameModel, "phaseMaxPlayer").getValue(self) <= Variable.find(gameModel, "phaseMSG").getValue(self);',
                      language: 'JavaScript',
                    },
                  },
                },
                style: {},
              },
            },
          ],
          options: {},
          layout: {
            justifyContent: 'space-evenly',
            alignItems: 'center',
          },
          style: {},
        },
      },
      {
        type: 'LinearLayout',
        props: {
          children: [
            {
              type: 'FlexList',
              props: {
                name: 'Nav bar',
                children: [
                  {
                    type: 'IconButton',
                    props: {
                      icon: 'hotel',
                      label: 'Accueil',
                      action: {
                        '@class': 'Script',
                        content: '',
                        language: 'JavaScript',
                      },
                      prefixedLabel: false,
                      options: {
                        actions: {
                          openPage: {
                            pageId: {
                              '@class': 'Script',
                              content: '"2"',
                              language: 'TypeScript',
                            },
                            pageLoaderName: {
                              '@class': 'Script',
                              content: '"Main page loader"',
                              language: 'TypeScript',
                            },
                          },
                        },
                      },
                      style: {},
                      name: 'Accueil',
                    },
                  },
                  {
                    type: 'IconButton',
                    props: {
                      icon: 'envelope',
                      label: 'Mail',
                      action: {
                        '@class': 'Script',
                        content: '',
                        language: 'JavaScript',
                      },
                      prefixedLabel: false,
                      options: {
                        upgrades: {
                          unreadCount: {
                            '@class': 'Script',
                            content: "Variable.find(gameModel,'inbox')",
                            language: 'JavaScript',
                          },
                        },
                        actions: {
                          openPage: {
                            pageId: {
                              '@class': 'Script',
                              content: '"3"',
                              language: 'TypeScript',
                            },
                            pageLoaderName: {
                              '@class': 'Script',
                              content: '"Main page loader"',
                              language: 'TypeScript',
                            },
                          },
                        },
                      },
                      style: {},
                    },
                  },
                  {
                    type: 'IconButton',
                    props: {
                      icon: 'list-ul',
                      label: 'Actions',
                      action: {
                        '@class': 'Script',
                        content: '',
                        language: 'JavaScript',
                      },
                      prefixedLabel: false,
                      options: {
                        upgrades: {
                          unreadCount: {
                            '@class': 'Script',
                            content:
                              "\tconst currentPhase = Variable.find(gameModel,'phaseMSG').getValue(self)\n\tconst currentPeriod = 1;\n\tlet items = []\n\tconst q = Variable.find(gameModel,'questions').items[currentPhase - 1];\t\n\tif (q) {\n\t\tq.items.map((item,i)=>{\n\t\t\tif (item['@class'] === 'QuestionDescriptor' || item['@class'] === 'WhQuestionDescriptor') \n\t\t\t{ \n\t\t\t\titems.push(item); \n\t\t\t} else if (i == currentPeriod - 1 && item['@class'] === 'ListDescriptor') { \n\t\t\t\titems = items.concat(item.flatten());\n\t\t\t}\n\t\t});\n\t}\nitems;",
                            language: 'JavaScript',
                          },
                        },
                        actions: {
                          openPage: {
                            pageId: {
                              '@class': 'Script',
                              content: '"4"',
                              language: 'TypeScript',
                            },
                            pageLoaderName: {
                              '@class': 'Script',
                              content: '"Main page loader"',
                              language: 'TypeScript',
                            },
                          },
                        },
                      },
                      style: {},
                    },
                  },
                  {
                    type: 'IconButton',
                    props: {
                      icon: 'clock',
                      label: 'Historique',
                      action: {
                        '@class': 'Script',
                        content: '',
                        language: 'JavaScript',
                      },
                      prefixedLabel: false,
                      options: {
                        actions: {
                          openPage: {
                            pageId: {
                              '@class': 'Script',
                              content: '"5"',
                              language: 'TypeScript',
                            },
                            pageLoaderName: {
                              '@class': 'Script',
                              content: '"Main page loader"',
                              language: 'TypeScript',
                            },
                          },
                        },
                      },
                      style: {},
                    },
                  },
                  {
                    type: 'IconButton',
                    props: {
                      icon: 'exclamation',
                      label: 'Final',
                      action: {
                        '@class': 'Script',
                        content: '',
                        language: 'JavaScript',
                      },
                      options: {
                        layout: {
                          order: -1,
                        },
                        actions: {
                          openPage: {
                            pageLoaderName: {
                              '@class': 'Script',
                              content: '"Main page loader"',
                              language: 'TypeScript',
                            },
                            pageId: {
                              '@class': 'Script',
                              content: '"6"',
                              language: 'TypeScript',
                            },
                          },
                        },
                      },
                      prefixedLabel: false,
                      style: {},
                    },
                  },
                ],
                layout: {
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                  flexDirection: 'column',
                },
                options: {},
                style: {},
              },
            },
            {
              type: 'PageLoader',
              props: {
                options: {},
                style: {
                  height: '100%',
                },
                selectedPageId: {
                  '@class': 'Script',
                  content: '"2"',
                  language: 'TypeScript',
                },
                name: 'Main page loader',
                initialSelectedPageId: {
                  '@class': 'Script',
                  content: '"2"',
                  language: 'TypeScript',
                },
              },
            },
            {
              type: 'FlexList',
              props: {
                children: [
                  {
                    type: 'Boxes',
                    props: {
                      options: {},
                      style: {},
                      name: '',
                      script: {
                        '@class': 'Script',
                        content: "Variable.find(gameModel,'timeCards')",
                        language: 'JavaScript',
                      },
                      label: 'Budget temps',
                      hideBoxValue: true,
                      showLabelValue: true,
                    },
                  },
                  {
                    type: 'Gauge',
                    props: {
                      options: {},
                      script: {
                        '@class': 'Script',
                        content: "Variable.find(gameModel,'timeCards')",
                        language: 'JavaScript',
                      },
                      label: 'Budget temps',
                      style: {
                        width: '100%',
                      },
                      followNeedle: false,
                    },
                  },
                  {
                    type: 'Gauge',
                    props: {
                      label: 'Liquidités',
                      script: {
                        '@class': 'Script',
                        content: "Variable.find(gameModel,'caisse')",
                        language: 'JavaScript',
                      },
                      options: {},
                      style: {
                        width: '100%',
                      },
                    },
                  },
                  {
                    type: 'Gauge',
                    props: {
                      label: 'Dépenses mensuelles engagées',
                      script: {
                        '@class': 'Script',
                        content:
                          "Variable.find(gameModel,'depensesMensuelles')",
                        language: 'JavaScript',
                      },
                      options: {},
                      style: {
                        width: '100%',
                      },
                    },
                  },
                ],
                layout: {
                  flexDirection: 'column',
                  alignItems: 'center',
                  alignContent: 'space-evenly',
                },
                options: {},
                style: {},
              },
            },
          ],
          name: 'corps',
          flexValues: [456.934, 2034.57, 509.244],
          options: {},
          style: {
            height: '100%',
            overflow: 'auto',
          },
          noSplitter: true,
          noResize: true,
        },
      },
    ],
    style: {
      width: '100%',
      height: '100%',
      overflow: 'auto',
    },
    name: 'Main list',
    layout: {
      flexDirection: 'column',
    },
    options: {},
  },
};

export function PageExamples() {
  return (
    <FonkyFlexContainer
      vertical
      className={cx(
        expandBoth,
        css({
          borderStyle: 'solid',
          borderWidth: '5px',
          borderColor: themeVar.Layout.colors.BorderColor,
        }),
      )}
    >
      <FonkyFlexContent>
        <FonkyFlexContainer className={expandHeight}>
          <FonkyFlexContent>
            <div className={cx(flex, flexColumn, justifyCenter, expandHeight)}>
              <div className={titleStyle}>Mode : Normal</div>
              <div className={cx(grow, autoScroll)}>
                <ThemeProvider contextName="player">
                  <JSONPageDeserializer wegasComponent={page1JSON} />
                </ThemeProvider>
              </div>
            </div>
          </FonkyFlexContent>
          <FonkyFlexSplitter notDraggable />
          <FonkyFlexContent>
            <div className={cx(flex, flexColumn, justifyCenter, expandHeight)}>
              <div className={titleStyle}>Mode : Lighter</div>
              <div className={cx(grow, autoScroll)}>
                <ThemeProvider contextName="player">
                  <JSONPageDeserializer wegasComponent={page1JSON} />
                </ThemeProvider>
              </div>
            </div>
          </FonkyFlexContent>
        </FonkyFlexContainer>
      </FonkyFlexContent>
      <FonkyFlexSplitter notDraggable />
      <FonkyFlexContent>
        <FonkyFlexContainer className={expandHeight}>
          <FonkyFlexContent>
            <div className={cx(flex, flexColumn, justifyCenter, expandHeight)}>
              <div className={titleStyle}>Mode : Dark</div>
              <div className={cx(grow, autoScroll)}>
                <ThemeProvider contextName="player">
                  <JSONPageDeserializer wegasComponent={page1JSON} />
                </ThemeProvider>
              </div>
            </div>
          </FonkyFlexContent>
          <FonkyFlexSplitter notDraggable />
          <FonkyFlexContent>
            <div className={cx(flex, flexColumn, justifyCenter, expandHeight)}>
              <div className={titleStyle}>Mode : Dark lighter</div>
              <div className={cx(grow, autoScroll)}>
                <ThemeProvider contextName="player">
                  <JSONPageDeserializer wegasComponent={page1JSON} />
                </ThemeProvider>
              </div>
            </div>
          </FonkyFlexContent>
        </FonkyFlexContainer>
      </FonkyFlexContent>
    </FonkyFlexContainer>
  );
}
