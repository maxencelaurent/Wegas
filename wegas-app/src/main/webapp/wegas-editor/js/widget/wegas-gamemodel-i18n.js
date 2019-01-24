/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */


/* global I18n, tinyMCE, Promise */

/**
 * @fileOverview GameModel langueages management widgets
 * @author Maxence
 */
YUI.add('wegas-gamemodel-i18n', function(Y) {
    "use strict";
    var LanguagesManager,
        TranslationEditor,
        GameModelScriptUpgrader;


    function _getCfgFromNode(node) {
        var code = node.getAttribute("lang");
        if (node.hasClass("wegas-translation-inscript")) {
            var cfg = {
                type: "inscript",
                node: node,
                code: code,
                parentClass: node.getData('parentClass'),
                parentId: node.getData('parentId'),
                index: node.getData('index'),
                fieldName: node.getData('fieldName')
            };
            cfg.key = cfg.parentClass + "-" + cfg.parentId + "-" + cfg.fieldName + "#" + cfg.index + ":" + code;
            return cfg;
        } else {
            var trId = node.getData("trid");
            return {
                type: 'std',
                node: node,
                trId: trId,
                code: code,
                key: code + "-" + trId
            };
        }
    }

    LanguagesManager = Y.Base.create("wegas-i18n-manager", Y.Widget,
        [Y.WidgetParent, Y.WidgetChild, Y.Wegas.Editable, Y.Wegas.Parent], {
        initializer: function() {
            this.handlers = {};
            this.plug(Y.Plugin.TranslationEditor);
            this.plug(Y.Plugin.Injector);
            this.showTable = {};
            this.ghostLanguages = {};
            var langs = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"),
                i, count = 0;
            // show first to languages by default
            for (i in langs) {
                if (langs[i] && langs[i].get("id") && count < 2) {
                    this.showTable[langs[i].get("id")] = true;
                    count++;
                }
            }
            this.isCurrentUserAdmin = !!Y.Wegas.Facade.User.cache.get("currentUser").get("roles").find(function(role) {
                return role.get("name") === "Administrator";
            });
        },
        destructor: function() {
            if (this.i18nMenu) {
                this.i18nMenu.destroy();
            }
            var k;
            for (k in this.handlers) {
                if (this.handlers.hasOwnProperty(k)) {
                    this.handlers[k].detach();
                }
            }
        },
        /**
         * Detect languages supported by translation service
         */
        initTranslationService: function() {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: "/I18n/AvailableLanguages",
                cfg: {
                    method: "GET"
                },
                on: {
                    success: Y.bind(this.initSupportedLanguages, this),
                    failure: Y.bind(function() {
                        Y.Wegas.Alerts.showNotification("Error while fetching supported languages", {
                            iconCss: 'fa fa-warning'
                        });
                    }, this)
                }
            });
        },
        getUsage: function() {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: "/I18n/Usage",
                cfg: {
                    method: "GET"
                },
                on: {
                    success: Y.bind(this.initUsage, this),
                    failure: Y.bind(function() {
                        Y.Wegas.Alerts.showNotification("Error while fetching usage", {
                            iconCss: 'fa fa-warning'
                        });
                    }, this)
                }
            });
        },
        getUsageRatio: function() {
            return this.usage.character_count / this.usage.character_limit;
        },
        initUsage: function(e) {
            this.usage = e.response.entity.get("val");
            this.isLimitReached = this.getUsageRatio() >= 1;
            this.syncUI();
        },
        initSupportedLanguages: function(e) {
            this.supportedLanguages = e.response.entities;
            this.syncUI();
        },
        renderUI: function() {
            this.header = new Y.Wegas.FlexList({
                cssClass: "wegas-i18n-manager--header",
                direction: 'horizontal'
            });

            this.title = new Y.Wegas.Text({
                cssClass: "wegas-i18n-manager--title",
                content: I18n.t("i18n.manager.title")
            });
            this.refreshButton = new Y.Button({
                label: "<i class=\"fa fa-refresh\"></i>"
            });
            this.addBtn = new Y.Wegas.Text({
                cssClass: "create-button",
                content: "Create new language: <i class='fa fa-plus'></i>"
            });

            this.toggleHide = new Y.Wegas.Text({
                cssClass: "hide-empty--button",
                content: "Hide empty: <i class='fa fa-square-o'></i>"
            });

            this.toolbar = new Y.Wegas.FlexList({
                cssClass: "wegas-i18n-manager--toolbar",
                direction: 'horizontal'
            });

            this.languagesHeader = new Y.Wegas.FlexList({
                cssClass: "wegas-i18n-manager--languages-header",
                direction: 'horizontal'
            });

            this.languages = new Y.Wegas.FlexList({
                cssClass: "wegas-i18n-manager--languages",
                direction: 'horizontal'
            });

            this.editor = new Y.Wegas.Text({
                cssClass: "wegas-i18n-manager--editor",
                content: "loading translation table <i class='fa fa-pulse fa-spinner'></i>"
            });
            this.header.add(this.title);
            this.header.add(this.refreshButton);
            this.add(this.header);

            if (navigator.userAgent.toLowerCase().indexOf("firefox") >= 0) {
                this.disclaimer = new Y.Wegas.Text({
                    cssClass: "wegas-disclaimer",
                    content: "This page is known to be slow with Firefox. You should use another browser to edit translations!"
                });

                this.add(this.disclaimer);
            }

            this.toolbar.add(this.addBtn);
            this.toolbar.add(this.toggleHide);

            this.add(this.toolbar);

            this.add(this.languagesHeader);
            this.add(this.languages);
            this.add(this.editor);
        },
        syncUI: function() {
            if (this.usage) {
                if (this.supportedLanguages) {
                    this.get("contentBox").toggleClass("limit-reached", this.getUsageRatio() >= 1);
                    var gm = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel(),
                        languages = gm.get("languages"),
                        i, lang;
                    this.languages.destroyAll();
                    this.languagesHeader.destroyAll();
                    for (i in languages) {
                        lang = languages[i];
                        this.renderLanguageInHeader(lang.get("id"), lang.get("code"));
                    }
                    //this.renderLanguageInHeader(lang.get("id"), lang.get("code"), lang.get("lang"), lang.get("active"), lang.get("visibility"));

                    var globals = [Y.Wegas.RForm.Script.getGlobals('getter'), Y.Wegas.RForm.Script.getGlobals('condition')];
                    Promise.all(globals).then(Y.bind(function(globalsP) {
                        this.globals = Y.mix(Y.mix({}, globalsP[0]), globalsP[1]);
                        this.rebuildEditor();
                    }, this));
                } else {
                    this.initTranslationService();
                }
            } else {
                this.getUsage();
            }
        },
        renderLanguageInHeader: function(id, code) {
            if (this.languagesHeader.size() && id) {
                this.languagesHeader.add(new Y.Wegas.Text({
                    content: "<span class='move-up fa fa-arrows-h' data-language-id='" + id + "'></>"
                }));
            }
            this.languagesHeader.add(new Y.Wegas.Text({
                content: "<div class='language' data-language-code='" + code + "'" + "' data-language-id='" + id + "'>" +
                    "<div>" +
                    "  <label>Show " + code + "</label>" +
                    "  <input type='checkbox' class='language-show' " + (this.showTable[id] ? "checked" : "") + ">" +
                    "</div>" +
                    "</div>"
            }));
        },
        renderLanguage: function(id, code, lang, active, visibility) {
            var readonly = visibility !== "PRIVATE" &&
                Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("type") === "SCENARIO";

            this.languages.add(new Y.Wegas.Text({
                content: "<div class='language" + (!id ? " unsaved" : "") + "' data-language-code='" + code + "'" + "' data-language-id='" + id + "'>" +
                    "<div class='form'>" +
                    "<div><label>Code:</label> <input size='5'" + (readonly ? " readonly" : "") + " class='language-code' value='" + code + "'></div>" +
                    "<div><label>Name:</label> <input " + (readonly ? "readonly" : "") + " class='language-name' value='" + lang + "'></div>" +
                    (id ? "<div><label>Active:</label> <input type='checkbox' class='language-active' " + (active ? "checked" : "") + "></div>" : "") +
                    "<div class='tools'>" +
                    "  <span class='validate fa fa-save'></span>" +
                    "  <span class='cancel fa fa-times'></span>" +
                    "</div>" +
                    "</div>" +
                    (id && this.isCurrentUserAdmin && !this.isLimitReached && this.supportedLanguages.indexOf(code) >= 0 ? "<div><span>Auto-Translate: <i class='wegas-language-i18n-auto fa fa-language'></i></span></div>" : "") +
                    (id ? "<div><span class='save-all-container'>Save : <i class='wegas-language-save-all fa fa-save'></i></span></div>" : "") +
                    "</div>"
            }));
        },
        bindUI: function() {
            this.get("contentBox").delegate("click", this.toggleShowEmpty, ".hide-empty--button i", this);
            this.get("contentBox").delegate("click", this.addLanguageClick, ".create-button i", this);
            this.languagesHeader.get("contentBox").delegate("click", this.languageUp, ".move-up", this);

            this.languagesHeader.get("contentBox").delegate("change", this.toggleShow, ".language input.language-show", this);
            this.languages.get("contentBox").delegate(["input", "change"], this.languageChange, ".language .form input", this);
            this.languages.get("contentBox").delegate("click", this.openAutoTranslateMenu, ".wegas-language-i18n-auto", this);
            this.languages.get("contentBox").delegate("click", this.saveAll, ".wegas-language-save-all", this);
            this.languages.get("contentBox").delegate("click", this.languageSave, ".language:not(.loading) .validate", this);
            this.languages.get("contentBox").delegate("click", this.languageCancel, ".language:not(.loading) .cancel", this);


            this.editor.get("contentBox").delegate("click", this.toggleCollapse, ".node-name .expander", this);

            this.handlers.onRefresh = this.refreshButton.on("click", Y.bind(this.rebuildEditor, this));

            this.handlers.onDescriptorUpdate = Y.Wegas.Facade.Variable.after('updatedDescriptor',
                this.afterDescriptorUpdate, this);
            this.handlers.onInstanceUpdate = Y.Wegas.Facade.Instance.after('*:updatedInstance',
                this.afterInstanceUpdate, this);


            this.handlers.onSaveChange = this.TranslationEditor.on("saveStatusChange", Y.bind(this.saveStatusChange, this));

            // scroll on TV select
            this.handlers.onEditEntity = Y.after("edit-entity:edit", function(e) {
                var anchor = this.get("contentBox").one(".anchor[data-entityid=\"" + e.entity._yuid + "\"]"),
                    node = this.get("contentBox").one(".node[data-entityid=\"" + e.entity._yuid + "\"] .node-name");
                this.get("contentBox").all(".highlight").removeClass("highlight");

                if (anchor) {
                    // expand all collapsed ancestors
                    anchor.ancestors(".node.collapsed").removeClass("collapsed");
                    Y.Wegas.Helper.scrollIntoViewIfNot(anchor);
                }
                if (node) {
                    node.addClass("highlight");
                }
            }, this);
        },
        toggleShowEmpty: function(e) {
            this.get("contentBox").toggleClass("hide-empty-translation");
        },
        toggleCollapse: function(e) {
            e.currentTarget.ancestor(".node").toggleClass("collapsed");
        },
        saveStatusChange: function(e) {
            var langNode = this.languages.get("contentBox").one(".language[data-language-code='" + e.lang + "']");
            var unsaved = this.get("contentBox").one(".wegas-translation.unsaved[lang='" + e.lang + "']");

            if (langNode) {
                // a "ghost" language does not exists...
                langNode.toggleClass("has-unsaved", unsaved);
            }

        },
        saveAll: function(e) {
            var lang = e.target.ancestor("div.language").getData()["language-code"];
            this.TranslationEditor.saveAll(lang);
        },
        openAutoTranslateMenu: function(e) {
            if (!this.i18nMenu) {
                this.i18nMenu = new Y.Wegas.Menu();
                this.i18nMenu.on("button:click", this.autoTranslate, this);
            } else {
                this.i18nMenu.destroyAll();
            }

            var langData = e.target.ancestor("div.language").getData();

            var langs = [];
            var allLangs = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages");
            for (var i in allLangs) {
                var code = allLangs[i].get("code");
                if (this.supportedLanguages.indexOf(code) >= 0 && code !== langData["language-code"]) {
                    langs.push({
                        code: code,
                        name: allLangs[i].get("lang")
                    });
                }
            }

            var langsBtn = [];
            for (var i in langs) {
                var lang = langs[i];

                langsBtn.push({
                    type: "Button",
                    label: lang.name,
                    data: {
                        source: lang.code,
                        target: langData["language-code"]
                    }
                });
            }

            this.i18nMenu.add(langsBtn);
            this.i18nMenu.attachTo(e.target);
        },
        autoTranslate: function(e) {
            var data = e.target.get("data");
            Y.Wegas.Panel.confirm("Generate (and override) " + data.target + " translations from " + data.source + "?",
                Y.bind(function() {
                    this.showOverlay();
                    Y.Wegas.Facade.GameModel.sendRequest({
                        request: "/" + Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("id") + "/I18n/InitLanguage/" + data.source + "/" + data.target,
                        cfg: {
                            method: "PUT"
                        },
                        on: {
                            success: Y.bind(function() {
                                this.hideOverlay();
                                Y.Wegas.Alerts.showNotification("OK", {
                                    timeout: 500
                                });
                            }, this),
                            failure: Y.bind(function() {
                                this.hideOverlay();
                                Y.Wegas.Alerts.showNotification("Translation service error", {
                                    iconCss: 'fa fa-warning'
                                });
                            }, this)
                        }
                    });
                }, this));
        },
        findLanguage: function(attr, needle, langToIgnore) {
            return Y.Array.find(Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"), function(item) {
                return (!langToIgnore || item.get("id") !== langToIgnore.get("id")) && item.get(attr) === needle;
            });
        },
        toggleShow: function(e) {
            var langNode = e.target.ancestor(".language"),
                langId = langNode.getData("language-id");
            if (langId) {
                this.showTable[langId] = !this.showTable[langId];
                this.rebuildEditor();
            }
        },
        languageChange: function(e) {
            var langNode = e.target.ancestor(".language");
            langNode.addClass("unsaved");
        },
        languageUp: function(e) {
            this.moveLanguageUp(e.target.getData("language-id"));
        },
        languageSave: function(e) {
            var langNode = e.target.ancestor(".language"),
                lang = this.findLanguage("id", +langNode.getData("language-id")),
                code = langNode.one(".language-code").getDOMNode().value,
                name = langNode.one(".language-name").getDOMNode().value;
            if (!code || !name) {
                this.showMessage("error", "Code or name missing");
            } else if (this.findLanguage("code", code, lang)) {
                this.showMessage("error", "Language code already exists");
            } else if (this.findLanguage("lang", name, lang)) {
                this.showMessage("error", "Language name already exists");
            } else {
                if (lang) {
                    // language already exists -> update
                    var active = langNode.one(".language-active").getDOMNode().checked;
                    langNode.addClass("loading");

                    lang.set("code", code);
                    lang.set("lang", name);
                    lang.set("active", active);
                    this.updateLanguage(lang);
                } else {
                    // create new language
                    this.createNewLanguage(code, name, active);
                }
            }
            //langNode.addClass("unsaved");
        },
        languageCancel: function(e) {
            var langNode = e.target.ancestor(".language"),
                lang = this.findLanguage("id", +langNode.getData("language-id"));
            if (lang) {
                // revert changes
                langNode.removeClass("unsaved");
                langNode.one(".language-code").getDOMNode().value = lang.get("code");
                langNode.one(".language-name").getDOMNode().value = lang.get("lang");
                langNode.one(".language-active").getDOMNode().checked = lang.get("active");
            } else {
                // do not create new language
                langNode.remove(true);
            }
        },
        getLanguagesToEdit: function() {
            return Y.Array.filter(Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"), Y.bind(function(lang) {
                return this.showTable[lang.get("id")];
            }, this));
        },
        rebuildEditor: function() {
            var gm = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel();

            var languages = gm.get("languages");

            this.languages.destroyAll();

            for (var i in languages) {
                var lang = languages[i];
                if (this.showTable[lang.get("id")]) {
                    this.renderLanguage(lang.get("id"), lang.get("code"), lang.get("lang"), lang.get("active"), lang.get("visibility"));
                }
            }

            this.ghostLanguages = {};
            this.tree = this.genTree(gm);

            //this.treeview.set("content", "<ul>" + this.genTreeviewMarkup(this.tree) + "</ul>");
            //this.treeview.syncUI();

            if (this.tree.containsOutdated && !this.upgrader) {
                this.upgrader = new Y.Wegas.GameModelScriptUpgrader();
                this.handlers.onGmUpgrade = this.upgrader.on("upgraded", Y.bind(this.rebuildEditor, this));
                this.add(this.upgrader, 1);
            } else {
                if (this.upgrader) {
                    this.handlers.onGmUpgrade && this.handlers.onGmUpgrade.detach();
                    this.upgrader.remove(true);
                    this.upgrader = null;
                }
            }

            var languagesToEdit = this.getLanguagesToEdit();

            if (Object.keys(this.ghostLanguages).length) {
                this.showMessage("warn", "Ghost Translations summary: " + JSON.stringify(this.ghostLanguages));
                Y.log("GHOSTS: " + JSON.stringify(this.ghostLanguages));
                for (var ghost in this.ghostLanguages) {
                    languagesToEdit.push(ghost);
                }
            }

            this.editor.set("content", this.genEditorMarkup(this.tree, languagesToEdit));
            this.editor.syncUI();

        },
        mapASTObjectProperties: function(node) {
            if (node && node.type && node.type === "ObjectExpression") {
                var i, p, properties = {};

                if (node.properties) {
                    for (i in node.properties) {
                        p = node.properties[i];
                        properties[p.key.value] = p.value;
                    }
                }
                return properties;
            }
            return null;
        },
        extractTranslatableContents: function(script, key, entity, cfg, mode) {
            var stack = [],
                sub,
                properties,
                content,
                goIn,
                index = 0,
                goOut;

            goIn = function(name, label) {
                if (sub) {
                    stack.push(sub);
                }
                sub = {
                    type: "Script",
                    nodeName: name,
                    nodeLabel: label,
                    hasTranslations: false,
                    containsOutdated: false,
                    mode: mode,
                    translations: [],
                    children: []
                };
            };

            goOut = function() {
                var parent = stack.pop();
                if (parent) {
                    parent.children.push(sub);
                    parent.containsOutdated = parent.containsOutdated || sub.containsOutdated;
                    parent.hasTranslations = parent.hasTranslations || sub.hasTranslations;
                    sub = parent;
                }
            };
            // init root level
            goIn(key, cfg && cfg.view && cfg.view.label);

            Y.inputEx.WysiwygScript.visitAST(script, {
                onEnterFn: Y.bind(function(node, args) {
                    var method = Y.inputEx.WysiwygScript.parseMethod(node, this.globals);
                    if (method && method.method) {
                        goIn(method.methodName, method.methodName);
                    }

                    if (args && args.properties && args.properties["@class"]
                        && args.properties["@class"].value === "TranslatableContent") {
                        // expecting TranslatableContent
                        properties = this.mapASTObjectProperties(node);
                        if (!properties || !properties["@class"] || properties["@class"].value !== "TranslatableContent") {
                            // but no TranslatableContent found
                            sub.containsOutdated = true;
                        }
                    }

                    if (args && args.properties && args.properties["@class"]
                        && args.properties["@class"].value === "Attachment") {
                        // expecting attachment
                        properties = this.mapASTObjectProperties(node);
                        if (!properties || !properties["@class"] || properties["@class"].value !== "Attachment") {
                            // but no Attachement found
                            sub.containsOutdated = true;
                        }
                    }

                    if (node && node.type && node.type === "ObjectExpression") {
                        properties = this.mapASTObjectProperties(node);
                        if (properties) {
                            if (properties["@class"] && properties["@class"].value === "TranslatableContent") {

                                // current node is and TranslatableContent object
                                if (properties.translations &&
                                    properties.translations.properties &&
                                    properties.translations.properties.length === 0
                                    || (properties.translations.properties[0].value &&
                                        properties.translations.properties[0].value.type === "ObjectExpression")) {
                                    // I18nV2 only !
                                    sub.hasTranslations = true;
                                    content = {
                                        parentClass: entity.get("@class"),
                                        parentId: entity.get("id"),
                                        index: index,
                                        key: key,
                                        label: null,
                                        value: {
                                            astNode: node,
                                            translations: {},
                                            cfg: args
                                        }
                                    };
                                    index++;

                                    properties["translations"].properties.forEach(function(p) {
                                        var trProps = this.mapASTObjectProperties(p.value);
                                        content.value.translations[p.key.value] = {
                                            translation: trProps.translation.value,
                                            status: trProps.status.value
                                        };
                                    }, this);
                                    this.detectGhostLanguages(Object.keys(content.value.translations));
                                    sub.translations.push(content);
                                    return false;
                                } else {
                                    // translation exists but v1
                                    sub.containsOutdated = true;
                                    return false;
                                }
                            }
                        }
                    }
                    return true;
                }, this),
                onExitFn: Y.bind(function(node) {
                    var method = Y.inputEx.WysiwygScript.parseMethod(node, this.globals);
                    if (method && method.method) {
                        goOut();
                    }
                }, this),
                globals: this.globals
            });

            return sub;

        },
        detectGhostLanguages: function(languages) {
            var code,
                gmLangs = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages");

            for (var i in languages) {
                code = languages[i];

                var caseSensitiveMatch = Y.Array.find(gmLangs, function(item) {
                    return item.get("code") === code;
                });

                if (!caseSensitiveMatch) {
                    this.ghostLanguages[code] = (this.ghostLanguages[code] || 0) + 1;
                }
            }
        },
        hasTranslation: function(tr, code) {
            return tr && tr.value && tr.value.translations && tr.value.translations.hasOwnProperty(code);
        },
        getTranslation: function(tr, code) {
            if (tr && tr.value && tr.value.translations) {
                if (tr.value.translations.hasOwnProperty(code)) {
                    return tr.value.translations[code];
                }
            }
            return {
                translation: "",
                status: ""
            };
        },
        afterInstanceUpdate: function(e) {
            this.updateEditor(e.entity);
        },
        afterDescriptorUpdate: function(e) {
            this.updateEditor(e.entity);
        },
        updateEditor: function(entity) {
            var newTree = this.genTree(entity);
            var cb = this.editor.get("contentBox");
            var outdated = false;

            function updateTrSpan(trSpan, tr) {
                if (trSpan) {
                    if (tr) {
                        var newTr = tr.translation || "";
                        var newStatus = tr.status || "";

                        var cfg = _getCfgFromNode(trSpan);
                        if (cfg.key && this.TranslationEditor.contents[cfg.key]) {
                            this.TranslationEditor.contents[cfg.key] = newTr;
                        }

                        if (!trSpan.hasClass("unsaved")) {
                            trSpan.one(".wegas-translation--toedit").setContent(newTr);
                        }
                        if (newStatus) {
                            newStatus = "(" + newStatus + ")";
                        }
                        trSpan.ancestor().one(".translation-status").setContent(newStatus);
                        trSpan.toggleClass("outdated", newStatus);
                    }
                } else {
                    outdated = true;
                }

            }

            function update(node, languages) {
                var tr;
                if (node.hasTranslations) {
                    if (node.translations && node.translations.length > 0) {
                        if (node.type === 'Script') {

                            // TODO: make sure inner structure is the same !
                            for (var i in node.translations) {
                                tr = node.translations[i];

                                for (var l in languages) {
                                    var lang = languages[l].get("code");

                                    updateTrSpan.call(this, cb.one(".wegas-translation"
                                        + "[data-parentClass=\"" + tr.parentClass + "\"]"
                                        + "[data-parentId=\"" + tr.parentId + "\"]"
                                        + "[data-fieldName=\"" + tr.key + "\"]"
                                        + "[data-index=\"" + tr.index + "\"]"
                                        + "[lang=\"" + lang + "\"]"), tr.value.translations[lang]);
                                }
                            }
                        } else {
                            for (var i in node.translations) {
                                tr = node.translations[i];
                                var trcId = tr.value.get("id");
                                for (var l in languages) {
                                    var lang = languages[l].get("code");
                                    updateTrSpan.call(this,
                                        cb.one(".wegas-translation[data-trid=\"" + trcId + "\"][lang=\"" + lang + "\"]"),
                                        tr.value.get("translations")[lang]);
                                }
                            }
                        }
                    }

                    // go deep
                    for (var i in node.children) {
                        update.call(this, node.children[i], languages);
                    }
                }
            }

            update.call(this, newTree, this.getLanguagesToEdit());

            if (outdated) {
                if (!this.get("boundingBox").one(".wegas-panel")) {
                    this.showMessage("error", "Translations table is outdated, please reload");
                }
            }
        },
        isLanguageSupported: function(code) {
            return this.supportedLanguages.indexOf(code) >= 0;
        },
        genEditorMarkup: function(node, languages, level) {
            level = level || 0;
            var child, tr, markup = [], field, i;
            if (node.hasTranslations) {
                markup.push("<div class='node' data-entityid='", node.entityId, "' data-level='", level, "'>");
                markup.push("<span class='anchor' data-entityid='", node.entityId, "'></span>");

                if ((node.nodeLabel || node.nodeName) && ((node.translations && node.translations.length > 0) || node.type === 'Script')) {
                    markup.push("<div class='node-name'>", (node.nodeLabel || node.nodeName), " <span class='node-scriptalias'>(", node.nodeName, ")</span><span class='expander'></span></div>");
                }
                if (node.comments) {
                    markup.push("<div class='node-comments fa fa-info-circle'>", node.comments, " </div>");
                }

                if (node.translations && node.translations.length > 0) {
                    markup.push("<div class='translatedcontents'>");
                    for (var i in node.translations) {
                        tr = node.translations[i];


                        if (node.type === 'Script') {
                            // In Script translations
                            var cfg, type, label;
                            label = tr.key;
                            // fetch label from attr config
                            if (tr.value.cfg) {
                                cfg = tr.value.cfg;
                                if (cfg && cfg.properties && cfg.properties.translations
                                    && cfg.properties.translations && cfg.properties.translations.view) {
                                    type = cfg.properties.translations.view.type.replace("I18n", "");
                                    label = cfg.properties.translations.view.label;
                                }
                            }
                            var domNode = (type === "html" ? "div" : "span");
                            markup.push("<div class='translatedcontent'>");

                            for (var l in languages) {
                                var isGhost = typeof languages[l] === "string";
                                var langCode = isGhost ? languages[l] : languages[l].get("code");

                                if (isGhost && !this.hasTranslation(tr, langCode)) {
                                    continue;
                                }

                                var theTr = this.getTranslation(tr, langCode);
                                markup.push("<div class='translation");

                                if (!isGhost && this.isLanguageSupported(langCode)) {
                                    markup.push(" supported-language");
                                }

                                if (isGhost) {
                                    markup.push(" ghost-translation");
                                }

                                markup.push("'>");
                                markup.push("<div class='translation-title'>");
                                markup.push("<span class='field-name'>", label, "</span>");
                                markup.push("<span class='translation-language'> [", langCode, "]</span>");
                                markup.push(" <span class='translation-status'>");
                                var hasStatusClass = "";
                                if (theTr.status) {
                                    markup.push("(");
                                    markup.push(theTr.status);
                                    markup.push(")");
                                    hasStatusClass = " outdated";
                                }
                                markup.push("</span>");
                                markup.push("</div>"); // /translation title
                                if (node.mode === "READONLY" && Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("type") === "SCENARIO") {
                                    markup.push("<span class='wegas-readonly-translation'>", theTr.translation, "</span>");
                                } else {
                                    markup.push("<", domNode,
                                        " class='wegas-translation ", hasStatusClass,
                                        " favorite-lang wegas-translation-inscript wegas-translation-", type, "' lang='",
                                        langCode,
                                        "' data-index='", tr.index,
                                        "' data-parentClass='", tr.parentClass,
                                        "' data-parentId='", tr.parentId,
                                        "' data-fieldName='", tr.key,
                                        "' lang='", langCode,
                                        "'>",
                                        I18n.getEditorTools(),
                                        "<", domNode, " class='wegas-translation--toolbar'></", domNode, ">" +
                                        "<", domNode);

                                    if (type === "wegasurl") {
//                                        markup.push(" role='button'");
                                    }
                                    markup.push(" class='wegas-translation--value");
                                    if (type === "wegasurl") {
                                        markup.push(" fa fa-folder-o");
                                    }
                                    markup.push("'><", domNode, " tabindex='0' class='wegas-translation--toedit'>",
                                        theTr.translation,
                                        "</", domNode, ">", "</", domNode, ">", "</", domNode, ">");
                                }
                                markup.push("</div>");
                            }
                            markup.push("</div>");
                        } else {
                            field = tr.label || tr.key;
                            markup.push("<div class='translatedcontent");



                            var allEmpty = true;

                            for (var l in languages) {
                                var langCode = typeof languages[l] === "string" ? languages[l] : languages[l].get("code");
                                allEmpty = allEmpty && !Y.Wegas.Helper.stripHtml(
                                    I18n.t(tr.value, {lang: langCode, caseSensitiveCode: true}) || "");
                            }

                            if (allEmpty) {
                                // emtpy translation
                                markup.push(" all-translations-empty");
                            }
                            markup.push("'>");

                            for (var l in languages) {
                                var isGhost = typeof languages[l] === "string";

                                var langCode = isGhost ? languages[l] : languages[l].get("code");
                                if (isGhost && !I18n.t(tr.value, {lang: langCode, caseSensitiveCode: true}) || "") {
                                    continue;
                                }


                                markup.push("<div class='translation");
                                if (!isGhost && this.isLanguageSupported(langCode)) {
                                    markup.push(" supported-language");
                                }

                                if (isGhost) {
                                    markup.push(" ghost-translation");
                                }

                                markup.push("'>");
                                markup.push("<div class='translation-title'>");
                                markup.push("<span class='field-name'>", field, "</span>");
                                markup.push("<span class='translation-language'> [", langCode, "]</span>");
                                var trStatus = I18n.getTrStatus(tr.value, langCode);
                                markup.push(" <span class='translation-status'>");
                                if (trStatus) {
                                    markup.push("(");
                                    markup.push(trStatus);
                                    markup.push(")");
                                }
                                markup.push(")</span>");

                                markup.push("</div>"); // /translation title
                                markup.push(I18n.t(tr.value, {
                                    lang: langCode,
                                    caseSensitiveCode: true,
                                    inlineEditor: tr.type && tr.type.replace("I18n", "")
                                }));
                                markup.push("</div>"); // /translation
                            }
                            markup.push("</div>"); // /translatedcontent
                        }
                    }
                    markup.push("</div>"); // translatedcontens
                }

                markup.push("<div class='node-children'>");
                for (var i in node.children) {
                    child = node.children[i];
                    markup.push(this.genEditorMarkup(child, languages, level + 1));
                }
                markup.push("</div>");
                markup.push("</div>"); // /node
            }
            return markup.join("");
        },
        genTree: function(entity, inheritedVisibility, inheritedMaxWritableVisibility) {
            var attrs, key, attr, sub, i, child, children,
                node, visibility, maxWritableVisibility,
                visibilities = ["NONE", "PRIVATE", "INHERITED", "PROTECTED", "INTERNAL"];
            if (entity instanceof Y.Wegas.persistence.Entity) {
                node = {
                    entityId: entity._yuid,
                    nodeName: entity.get("name"),
                    nodeLabel: entity.getEditorLabel(),
                    hasTranslations: false,
                    containsOutdated: false,
                    translations: [],
                    children: []
                };
                visibility = entity.get("visibility") || inheritedVisibility || "INHERITED";

                if (node.nodeLabel && entity.getIconCss) {
                    // prefix non emtpy label with icon if any
                    node.nodeLabel = "<i class='" + entity.getIconCss() + "'></i> " + node.nodeLabel;
                }

                if (entity.get("comments") && typeof entity.get("comments") === "string") {
                    node.comments = entity.get("comments");
                }

                attrs = entity.getAttrs();
                for (key in attrs) {
                    if (attrs.hasOwnProperty(key)) {
                        attr = attrs[key];
                        if (attr) {
                            sub = null;
                            var cfg = entity.getAttrCfgs()[key];
                            if ((!cfg["transient"] || key === "items") // transient "items" args is allowed
                                && (!cfg.visible || cfg.visible(attr, attrs))) { // check attre against visible method if any

                                var mode;
                                maxWritableVisibility = cfg.maxWritableVisibility || inheritedMaxWritableVisibility || "INHERITED";
                                mode = (visibilities.indexOf(maxWritableVisibility) >= visibilities.indexOf(visibility) ? "EDITABLE" : "READONLY");

                                if (Array.isArray(attr) ||
                                    // attr is an object but is not a wegasEntity -> process as a collection
                                        (Y.Lang.isObject(attr) && !(attr instanceof Y.Wegas.persistence.Entity))) {
                                    children = {
                                        nodeName: key,
                                        nodeLabel: key,
                                        hasTranslations: false,
                                        containsOutdated: false,
                                        translations: [],
                                        children: []
                                    };
                                    for (i in attr) {
                                        child = attr[i];
                                        sub = this.genTree(child, visibility, maxWritableVisibility);
                                        if (sub && sub.hasTranslations) {
                                            children.hasTranslations = true;
                                            children.children.push(sub);
                                        }
                                        if (sub && sub.containsOutdated) {
                                            children.containsOutdated = true;
                                        }
                                    }
                                    sub = children;
                                } else if (attr instanceof Y.Wegas.persistence.TranslatableContent) {
                                    // TranslatableContent found, register in node.translations
                                    node.hasTranslations = true;
                                    var type = null, label = null;
                                    if (cfg && cfg.properties && cfg.properties.translations
                                        && cfg.properties.translations && cfg.properties.translations.view) {
                                        type = cfg.properties.translations.view.type;
                                        label = cfg.properties.translations.view.label;
                                    }
                                    node.translations.push({
                                        type: type,
                                        label: label,
                                        key: key,
                                        value: attr,
                                        mode: mode
                                    });
                                    this.detectGhostLanguages(Object.keys(attr.get("translations")));
                                } else if (attr instanceof Y.Wegas.persistence.Script) {
                                    // extract translatables from script content
                                    sub = this.extractTranslatableContents(attr, key, entity, cfg, mode);
                                } else {
                                    sub = this.genTree(attr, visibility, maxWritableVisibility);
                                }

                                if (sub && (sub.hasTranslations || sub.containsOutdated)) {
                                    node.hasTranslations = node.hasTranslations || sub.hasTranslations;
                                    node.containsOutdated = node.containsOutdated || sub.containsOutdated;
                                    node.children.push(sub);
                                }
                            }
                        }
                    }

                }
            }

            return node;
        },
        addLanguageClick: function(e) {
            this.renderLanguage("", "", "", false, "PRIVATE");
        },
        createNewLanguage: function(code, name, active) {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Lang",
                cfg: {
                    method: "POST",
                    data: {
                        "@class": "GameModelLanguage",
                        code: code,
                        lang: name,
                        active: active
                    }
                },
                on: {
                    success: Y.bind(this.syncUI, this),
                    failure: Y.bind(this.syncUI, this)
                }
            });
        },
        updateLanguage: function(language) {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Lang",
                cfg: {
                    method: "PUT",
                    data: language.toObject()
                },
                on: {
                    success: Y.bind(this.syncUI, this),
                    failure: Y.bind(this.syncUI, this)
                }
            });
        },
        moveLanguageUp: function(langId) {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Lang/" + langId + "/Up",
                cfg: {
                    method: "PUT"
                },
                on: {
                    success: Y.bind(this.syncUI, this),
                    failure: Y.bind(this.syncUI, this)
                }
            });
        }
    }, {
        EDITORNAME: "Languages Manager",
        ATTRS: {}
    });
    Y.Wegas.LanguagesManager = LanguagesManager;



    TranslationEditor = Y.Base.create('wegas-translation-editor', Y.Plugin.Base, [Y.Wegas.Plugin, Y.Wegas.Editable], {
        onClick: function(e) {
            console.log("Click target: " + e.target);
        },
        initializer: function() {
            this.handlers = {};
            var hostCB = this.get("host").get("contentBox");
            hostCB.delegate("focus", this.setupEditor, ".wegas-translation.favorite-lang .wegas-translation--value", this);
            hostCB.delegate("click", this.selectFile, ".wegas-translation-wegasurl.favorite-lang .wegas-translation--value", this);
            hostCB.delegate("keydown", this.selectFileOnKeyDown, ".wegas-translation-wegasurl.favorite-lang .wegas-translation--value", this);

            hostCB.delegate("click", this.save, ".wegas-translation.favorite-lang.unsaved .inline-editor-validate", this); // minor 
            hostCB.delegate("click", this.majorSaveConfirmMenu, ".wegas-translation.favorite-lang .inline-editor-major-validate", this); // major
            hostCB.delegate("click", this.catchUpSave, ".wegas-translation.favorite-lang .inline-editor-catch_up-validate", this); // catch up
            hostCB.delegate("click", this.outdateSave, ".wegas-translation.favorite-lang .inline-editor-outdate-validate", this); // outdate

            this.handlers.clickOut = Y.one("body").on("click", this.clickOut, this);

            hostCB.delegate("key", this.ctrlSave, 'down:83+ctrl', ".wegas-translation.favorite-lang .wegas-translation--value", this);
            hostCB.delegate("key", this.ctrlSave, 'down:83+meta', ".wegas-translation.favorite-lang .wegas-translation--value", this);

            hostCB.delegate("click", this.openAutoTranslateMenu, ".wegas-translation.favorite-lang .inline-editor-i18n", this); // auto

            //hostCB.delegate("key", this.selectAllInSpan, 'down:65+ctrl', ".wegas-translation-string span[contenteditable]", this);
            hostCB.delegate("click", this.cancel, ".wegas-translation.favorite-lang.unsaved .inline-editor-cancel", this);
            this.contents = {};
            //hostCB.delegate("blur", this.onBlurString, ".wegas-translation-blur.favorite-lang", this);

            this.publish('saveStatusChange', {
                emitFacade: true
            });
        },
        clickOut: function(e) {
            if (this.editor && !(e.target.hasClass("wegas-translation") || e.target.ancestor(".wegas-translation, clickOut, . wegas-panel-fileselect"))) {
                this.removeEditor();
            }
        },
        fireSaveStatusChange: function(lang) {
            this.fire("saveStatusChange", {
                lang: lang
            });
        },
        _getCfgFromEvent: function(e) {
            var node;
            if (e.target && e.target.ancestor) {
                node = e.currentTarget.ancestor(".wegas-translation");
            } else {
                node = Y.one("#" + e.target.id).ancestor(".wegas-translation");
            }

            if (node) {
                return _getCfgFromNode(node);
            } else {
                return null;
            }
        },
        _onHtmlChange: function(e) {
            if (this.editor) {
                var newContent = this.toInjectorStyle(this.editor.getContent()),
                    cfg = this._getCfgFromEvent(e),
                    updated = newContent !== this.contents[cfg.key];
                cfg.node.toggleClass("unsaved", updated);
                this.fireSaveStatusChange(cfg.code);
            }
        },
        autoTranslate: function(e) {
            var data = e.target.get("data");
            Y.Wegas.Panel.confirm("Generate (and override) " + data.target + " translation from " + data.source + "?",
                Y.bind(function() {
                    this.transactions = this.transactios || {};
                    this.showOverlay();

                    var tId = Y.Wegas.Facade.GameModel.sendRequest({
                        request: "/" + Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("id") + "/I18n/Translate/" + data.source + "/" + data.target,
                        cfg: {
                            method: "PUT",
                            data: data.value,
                            headers: {
                                "Content-Type": "text/plain;charset=UTF-8"
                            }
                        },
                        on: {
                            success: Y.bind(function(e) {
                                var newText = e.response.entity.get("val").text;
                                var targetNodeId = this.transactions[e.tId];
                                var node, cfg;
                                Y.log("newText: " + newText);
                                if (targetNodeId
                                    && (node = Y.one("#" + targetNodeId))
                                    && (cfg = _getCfgFromNode(node.ancestor(".wegas-translation")))) {

                                    node.setContent(newText);
                                    cfg.node.toggleClass("unsaved", true);
                                    this.fireSaveStatusChange(cfg.code);
                                } else {
                                    Y.Wegas.Alerts.showNotification("Target node not found", {
                                        iconCss: 'fa fa-warning',
                                        timeout: 2500
                                    });
                                }
                                delete this.transactions[tId];
                                this.hideOverlay();
                            }, this),
                            failure: Y.bind(function() {
                                this.hideOverlay();
                                Y.Wegas.Alerts.showNotification("Translation Service Error", {
                                    iconCss: 'fa fa-warning',
                                    timeout: 2500
                                });
                            }, this)
                        }
                    });
                    this.transactions[tId] = data.targetNodeId;
                }, this));
        },
        openAutoTranslateMenu: function(e) {

            if (this.get("host").supportedLanguages) {

                if (!this.i18nMenu) {
                    this.i18nMenu = new Y.Wegas.Menu();
                    this.i18nMenu.on("button:click", this.autoTranslate, this);
                } else {
                    this.i18nMenu.destroyAll();
                }

                var node = e.target.ancestor(".wegas-translation");
                var langCode = node.getAttribute("lang");
                var allLangs = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages");
                var theLang;


                var targetNode = e.target.ancestor(".translatedcontent").one(".wegas-translation[lang='" + langCode + "'] .wegas-translation--toedit");

                var langs = [];
                for (var i in allLangs) {
                    var code = allLangs[i].get("code");
                    if (code === langCode) {
                        theLang = allLangs[i];
                    }

                    if (this.get("host").supportedLanguages.indexOf(code) >= 0 && code !== langCode) {
                        langs.push({
                            code: code,
                            name: allLangs[i].get("lang")
                        });
                    }
                }

                if (theLang && langs.length > 0) {
                    var langsBtn = [];
                    for (var i in langs) {
                        var lang = langs[i];

                        var nodeToTranslate = e.target.ancestor(".translatedcontent").one(".wegas-translation[lang='" + lang.code + "'] .wegas-translation--toedit");

                        if (nodeToTranslate) {
                            var textToTranslate = this.toInjectorStyle(nodeToTranslate.getContent());
                            langsBtn.push({
                                type: "Button",
                                label: lang.name,
                                data: {
                                    source: lang.code,
                                    target: langCode,
                                    value: textToTranslate,
                                    targetNodeId: targetNode.get("id")
                                }
                            });
                        } else {
                            langsBtn.push({
                                type: "Text",
                                content: lang.name + " (show it first)"
                            });
                        }
                    }
                }

                this.i18nMenu.add(langsBtn);
                this.i18nMenu.attachTo(e.target);

            }
        },
        _onHtmlBlur: function(e) {
            this.removeEditor();
        },
        ctrlSave: function(e) {
            e.halt(true);
            if (e.target.ancestor(".wegas-translation.unsaved")) {
                this.save(e);
                document.activeElement.blur();
            }
        },
        save: function(e, mode) {
            var cfg = this._getCfgFromEvent(e),
                rawValue = cfg.node.one(".wegas-translation--value").getContent(),
                newValue = this.toInjectorStyle(rawValue);

            if (cfg.type === "inscript") {
                this.saveInScriptTranslation(cfg, newValue, mode);
            } else {
                this.saveTranslation(cfg, newValue, mode);
            }
            // save wegas-translation--value 
        },
        majorSaveConfirmMenu: function(e) {
            if (!this.majorMenu) {
                this.majorMenu = new Y.Wegas.Menu();
                this.majorMenu.on("button:click", this.majorSave, this);
            } else {
                this.majorMenu.destroyAll();
            }

            this.majorMenu.add([{
                    type: "Button",
                    label: "Save and outdate other languages",
                    data: {
                        event: e
                    }
                }]);

            this.majorMenu.attachTo(e.target);
        },
        majorSave: function(e) {
            var data = e.target.get("data");
            return this.save(data.event, "MAJOR");
        },
        catchUpSave: function(e) {
            return this.save(e, "CATCH_UP");
        },
        outdateSave: function(e) {
            return this.save(e, "OUTDATE");
        },
        cancel: function(e) {
            var cfg = this._getCfgFromEvent(e);
            this.contents[cfg.key];
            // reset wegas-translation--value to initial one and remove tools
            cfg.node.one(".wegas-translation--toedit").setContent(this.contents[cfg.key]);
            cfg.node.removeClass("unsaved");
            this.fireSaveStatusChange(cfg.code);
        },
        saveAll: function(lang) {
            var toSave = this.get("host").get("contentBox").all(".wegas-translation.unsaved[lang='" + lang + "']");
            var payload = [];

            toSave.each(function(node) {
                var cfg = _getCfgFromNode(node),
                    rawValue = cfg.node.one(".wegas-translation--value").getContent(),
                    newValue = this.toInjectorStyle(rawValue);
                if (cfg.type === "inscript") {
                    payload.push(this.getInScriptPayload(cfg, newValue));
                } else {
                    payload.push(this.getTrPayload(cfg, newValue));
                }
                cfg.node.removeClass("unsaved");
                this.fireSaveStatusChange(cfg.code);
            }, this);
            if (payload.length) {
                Y.Wegas.Facade.GameModel.sendRequest({
                    request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/BatchUpdate",
                    cfg: {
                        method: "PUT",
                        data: payload
                    },
                    on: {
                        success: Y.bind(function() {
                            Y.Wegas.Alerts.showNotification("Batch Success", {
                                timeout: 500
                            });
                        }, this),
                        failure: Y.bind(function() {
                            Y.Wegas.Alerts.showNotification("Batch Failure", {
                                cssIcon: "fa fa-error"
                            });
                        }, this)
                    }
                });
            } else {
                Y.Wegas.Alerts.showNotification("Nothing to save", {
                    timeout: 500
                });
            }
        },
        getInScriptPayload: function(cfg, translation) {
            return  {
                "@class": "InScriptUpdate",
                parentClass: cfg.parentClass,
                parentId: cfg.parentId,
                fieldName: cfg.fieldName,
                code: cfg.code,
                index: cfg.index,
                value: translation
            };
        },
        getTrPayload: function(cfg, translation) {
            return {
                "@class": "TranslationUpdate",
                trId: cfg.trId,
                code: cfg.code,
                value: translation
            };
        },
        saveInScriptTranslation: function(cfg, translation, mode) {
            mode = mode || "MINOR";
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Tr/" + mode,
                cfg: {
                    method: "PUT",
                    data: this.getInScriptPayload(cfg, translation)
                },
                on: {
                    success: Y.bind(this.inScriptSuccess, this, cfg, translation),
                    failure: Y.bind(this.inScriptError, this, cfg, translation)
                }
            });
        },
        inScriptSuccess: function(cfg, translation, response) {
            Y.log("SUCCESS");
            if (response.response.entity) {
                this.contents[cfg.key] = translation;
            } else {
                var trNode = cfg.node.one(".wegas-translation--toedit");
                if (trNode) {
                    trNode.setHTML(this.contents[cfg.key]);
                }
            }
            /*
             var statusNode = cfg.node.one(".translation-status");
             if (statusNode) {
             statusNode.setHTML("(" + newStatus + ")");
             }*/
            cfg.node.removeClass("unsaved");
            this.fireSaveStatusChange(cfg.code);
            this.removeEditor();
            this.get("host").updateEditor && this.get("host").updateEditor(response.response.entity);

        },
        inScriptError: function() {
            Y.log("ERROR");
        },
        saveTranslation: function(cfg, translation, mode) {
            mode = mode || "MINOR";
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Tr/" + mode,
                cfg: {
                    method: "PUT",
                    data: this.getTrPayload(cfg, translation)
                },
                on: {
                    success: Y.bind(this.success, this, cfg),
                    failure: Y.bind(this.error, this, cfg)
                }
            });
        },
        success: function(cfg, response) {
            Y.log("SUCCESS");
            this.contents[cfg.key] = response.response.entity.get("translations")[cfg.code].translation;
            var newStatus = response.response.entity.get("translations")[cfg.code].status;

            cfg.node.removeClass("unsaved");
            this.fireSaveStatusChange(cfg.code);
            /*var trNode = cfg.node.one(".wegas-translation--toedit");
             if (trNode) {
             trNode.setHTML(this.contents[cfg.key]);
             }
             var statusNode = cfg.node.one(".translation-status");
             if (statusNode) {
             statusNode.setHTML("(" + newStatus + ")");
             }*/
            this.removeEditor();
            this.get("host").updateEditor && this.get("host").updateEditor(response.response.entity);
        },
        error: function() {
            Y.log("ERROR");
        },
        toInjectorStyle: function(content) {
            // remove yui ids
            var root = document.createElement('div');
            root.innerHTML = content;

            var toEdit = root.querySelector(".wegas-translation--toedit");
            if (toEdit) {
                root = toEdit;
            }

            var yuiId = root.querySelectorAll('[id^="yui_"]');
            for (var n = 0; n < yuiId.length; n += 1) {
                yuiId[n].removeAttribute('id');
            }


            // hack to clean TinyMCE dirty empta content
            var mceBogus = root.querySelectorAll('[data-mce-bogus=\"1\"]');
            for (var n = 0; n < mceBogus.length; n += 1) {
                mceBogus[n].remove();
            }

            return root.innerHTML
                .replace(
                    new RegExp(
                        '((src|href)="[^"]*/rest/File/GameModelId/[^"]*/read([^"]*)")',
                        'gi'
                        ),
                    'data-file="$3"'
                    ) // Replace absolute path with injector style path (old version)
                .replace(
                    new RegExp(
                        '((src|href)="[^"]*/rest/GameModel/[^"]*/File/read([^"]*)")',
                        'gi'
                        ),
                    'data-file="$3"'
                    ); // Replace absolute path with injector style path
        },
        removeEditor: function() {
            if (this.editor) {
                Y.log("Destroy editor ");
                this.get("host").get("contentBox").all(".wegas-translation.has-focus").each(function(node) {
                    node.removeClass("has-focus");
                });

                var editor = this.editor;

                this.editor = null;
                this.currentEditorKey = undefined;

                editor.remove();
                editor.destroy();
            }
        },
        selectFileOnKeyDown: function(event) {
            if (event.type === 'keydown') {
                if (event.keyCode === 13 || event.keyCode === 32) {
                    this.selectFile(event);
                    event.preventDefault();
                }
            }
        },
        selectFile: function(e) {
            var cfg = this._getCfgFromEvent(e);
            if (cfg.node.hasClass("wegas-translation-wegasurl")) {
                Y.log("Select File for " + cfg.key);
                if (this.contents[cfg.key] === undefined) {
                    // save initial values
                    this.contents[cfg.key] = this.toInjectorStyle(cfg.node.one(".wegas-translation--toedit").getHTML());
                }

                var filepanel = new Y.Wegas.FileSelect();
                filepanel.on('*:fileSelected', Y.bind(function(e, path) {
                    e.halt(true);
                    filepanel.destroy();
                    var updated = path !== this.contents[cfg.key];
                    cfg.node.toggleClass("unsaved", updated);
                    this.fireSaveStatusChange(cfg.code);
                    cfg.node.one(".wegas-translation--toedit").setHTML(path);
                }, this));
            }
        },
        setupEditor: function(e) {
            var cfg = this._getCfgFromEvent(e);
            if (cfg) {
                if (this.editor) {
                    if (cfg.key === this.currentEditorKey) {
                        return;
                    }
                    this.removeEditor();
                }
                cfg.node.toggleClass("has-focus", true);

                if (!cfg.node.hasClass("wegas-translation-wegasurl")) {
                    Y.log("SetupEditor for " + cfg.key);
                    this.currentEditorKey = cfg.key;

                    var toEditNode = cfg.node.one(".wegas-translation--toedit");
                    if (!toEditNode) {
                        var dNode = cfg.node.hasClass("wegas-translation-string") ? "span" : "div";
                        cfg.node.one(".wegas-translation--value").append("<" + dNode + " class='wegas-translation--toedit'></" + dNode + ">");
                        toEditNode = cfg.node.one(".wegas-translation--toedit");
                    }

                    if (this.contents[cfg.key] === undefined) {
                        // save initial values
                        this.contents[cfg.key] = this.toInjectorStyle(toEditNode.getHTML());
                    }

                    var tinyConfig = {
                        inline: true,
                        selector: "#" + cfg.node.get("id") + " .wegas-translation--toedit",
                        browser_spellcheck: true,
                        plugins: [
                            'autolink link image lists code media table',
                            'paste advlist textcolor',
                                // textcolor wordcount autosave contextmenu
                                // advlist charmap print preview hr anchor pagebreak spellchecker
                                // directionality
                        ],
                        external_plugins: {
                            "dynamic_toolbar": Y.Wegas.app.get("base") +
                                "wegas-editor/js/plugin/wegas-tinymce-dynamictoolbar.js"
                        },
                        toolbar1: 'bold italic bullist | link image media  addToolbarButton', /* 'code' not working!!! */
                        toolbar2: 'forecolor backcolor underline alignleft aligncenter alignright alignjustify table',
                        toolbar3: 'fontsizeselect styleselect',
                        //selection_toolbar: 'bold italic bullist | quicklink quickimage media ',
                        fixed_toolbar_container: "#" + cfg.node.get("id") + " .wegas-translation--toolbar",
                        // formatselect removeformat underline unlink forecolor backcolor anchor previewfontselect
                        // fontsizeselect styleselect spellchecker template
                        // contextmenu: 'link image inserttable | cell row
                        // column deletetable | formatselect forecolor',
                        paste_preprocess: function(plugin, args) {
                            var root = document.createElement('div'),
                                editorContainer;
                            root.innerHTML = args.content;
                            editorContainer = root.querySelector("[contenteditable=\"true\"]");
                            if (editorContainer) {
                                args.content = editorContainer.innerHTML;
                            }

                        },
                        paste_postprocess: function(plugin, args) {
                        },
                        menubar: false,
                        resize: 'both',
                        max_height: 500,
                        statusbar: true,
                        branding: false,
                        relative_urls: false,
                        toolbar_items_size: 'small',
                        hidden_tootlbar: [2, 3],
                        file_browser_callback: Y.bind(this.onFileBrowserClick, this),
                        setup: Y.bind(function(editor) {
                            Y.log("Editor ready");
                            this.editor = editor;
                            editor.on('change', Y.bind(this._onHtmlChange, this));
                            editor.on('keyUp', Y.bind(this._onHtmlChange, this));
                            editor.on('blur', Y.bind(this._onHtmlBlur, this)); // text input & ctrl-related operations
                            editor.on('init', Y.bind(function() {
                                this.editor = editor;
                                this.editor.fire("focus");
                                this.editor.focus();
                            }, this));
                            //this.editor.focus();
                            //this.editor.targetElm.click();
                        }, this),
                        image_advtab: true,
                        content_css: [
                            '//maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
                            Y.Wegas.app.get('base') + "wegas-editor/css/wegas-tinymce-editor.css",
                        ],
                        style_formats: [
                            {
                                // Style formats
                                title: 'Title 1',
                                block: 'h1',
                            },
                            {
                                title: 'Title 2',
                                block: 'h2',
                                // styles : {
                                //    color : '#ff0000'
                                // }
                            },
                            {
                                title: 'Title 3',
                                block: 'h3',
                            },
                            {
                                title: 'Normal',
                                inline: 'span',
                            },
                            {
                                title: 'Code',
                                // icon: 'code',
                                block: 'code',
                            },
                        ],
                        formats: {}
                    };
                    if (cfg.node.hasClass("wegas-translation-string")) {
                        tinyConfig.theme = 'inlite';
                    }

                    var extraButtons = Y.Wegas.Config.TinyExtraButtons;

                    if (extraButtons) {
                        /* config example :
                         Y.namespace("Wegas.Config").TinyExtraButtons = {
                         className : "off-game",
                         cssIcon: "fa fa-asterisk",
                         tooltip : "off-game information style"
                         },
                         danger: {
                         block: "div",
                         className : "danger-message",
                         cssIcon: "fa fa-warning",
                         tooltip : "danger message style"
                         }};
                         */
                        var toolbar = tinyConfig.toolbar1.split(" ");
                        toolbar.pop(); // remove addToolbarButton
                        toolbar.push("|");

                        var initFunctions = [];

                        for (var name in extraButtons) {
                            var btnCfg = extraButtons[name];
                            tinyConfig.formats[name] = {
                                attributes: {
                                    'class': btnCfg.className
                                }
                            };

                            if (btnCfg.block) {
                                tinyConfig.formats[name].block = btnCfg.block;
                            } else if (btnCfg.inline) {
                                tinyConfig.formats[name].inline = btnCfg.inline;
                            } else {
                                tinyConfig.formats[name].inline = "span";
                            }

                            toolbar.push(name);

                            initFunctions.push({
                                name: name,
                                config: btnCfg,
                                'function':
                                    function(editor, name, btnCfg) {
                                        editor.addButton(name, {
                                            icon: "x " + btnCfg.cssIcon,
                                            stateSelector: "." + btnCfg.className,
                                            tooltip: btnCfg.tooltip,
                                            onclick: function(e) {
                                                tinymce.activeEditor.formatter.toggle(name);
                                            }
                                        });
                                    }
                            });
                        }

                        tinyConfig.setup = Y.bind(function(editor) {
                            this.editor = editor;
                            editor.on('change', Y.bind(this._onHtmlChange, this));
                            editor.on('keyUp', Y.bind(this._onHtmlChange, this));
                            editor.on('blur', Y.bind(this._onHtmlBlur, this)); // text input & ctrl-related operations
                            editor.on('init', Y.bind(function() {
                                this.editor = editor;
                                this.editor.fire("focus");
                                this.editor.focus();
                            }, this));
                            //this.editor.focus();
                            //this.editor.targetElm.click();


                            // call each initFunction
                            for (var i in initFunctions) {
                                initFunctions[i].function.call(editor, editor,
                                    initFunctions[i].name, initFunctions[i].config);
                            }
                        }, this);

                        // rebuild toolbar1
                        toolbar.push("|");
                        toolbar.push("addToolbarButton");
                        tinyConfig.toolbar1 = toolbar.join(" ");
                        /*} else {
                         tinyConfig.setup = Y.bind(function(editor) {
                         this.editor = editor;
                         editor.on('change', Y.bind(this._onHtmlChange, this));
                         editor.on('keyUp', Y.bind(this._onHtmlChange, this));
                         editor.on('blur', Y.bind(this._onHtmlBlur, this)); // text input & ctrl-related operations
                         editor.on('init', Y.bind(function() {
                         this.editor = editor;
                         this.editor.fire("focus");
                         this.editor.focus();
                         }, this));
                         //this.editor.focus();
                         //this.editor.targetElm.click();
                         }, this);
                         */}
                    tinyMCE.init(tinyConfig);
                }
            }
        },
        onFileBrowserClick: function(field_name, url, type, win) {
            this.filePanel = new Y.Wegas.FileSelect();
            this.filePanel.after("*:fileSelected", Y.bind(function(e, path) {
                e.stopImmediatePropagation();
                e.preventDefault();
                var win = this.filePanel.win,
                    field_name = this.filePanel.field_name,
                    targetInput = win.document.getElementById(field_name);
                targetInput.value = Y.Wegas.Facade.File.getPath() + path; // update the input field

                if (typeof (win.ImageDialog) !== "undefined") { // are we an image browser
                    if (win.ImageDialog.getImageData) { // we are, so update image dimensions...
                        win.ImageDialog.getImageData();
                    }

                    if (win.ImageDialog.showPreviewImage) { // ... and preview if necessary
                        win.ImageDialog.showPreviewImage(Wegas.Facade.File.getPath() + path);
                    }
                }
                if (win.Media) { // If in an editor window
                    win.Media.formToData("src"); // update the data
                }
                this.filePanel.destroy();
            }, this));
            this.filePanel.win = win;
            this.filePanel.field_name = field_name;
            return false;
        },
        destructor: function() {
            this.i18nMenu && this.i18nMenu.destroy();
            this.majorMenu && this.majorMenu.destroy();
            var k;

            for (k in this.handlers) {
                this.handlers[k].detach();
            }
        }
    }, {
        NS: 'TranslationEditor',
        ATTRS: {
        }
    });
    Y.Plugin.TranslationEditor = TranslationEditor;




    /**
     * Upgrade not-translated or old translations version in script to up to date translated content
     */
    GameModelScriptUpgrader = Y.Base.create("wegas-i18n-upgrader", Y.Widget,
        [Y.WidgetParent, Y.WidgetChild, Y.Wegas.Editable, Y.Wegas.Parent], {
        initializer: function() {
            this.handlers = {};
            this.publish('upgraded', {
                emitFacade: true
            });
        },
        renderUI: function() {
            this.text = new Y.Wegas.Text({
                content: "GameModel still contains non-internationalised impacts! Click to upgrade"
            });
            this.add(this.text);
            this.upgradeBtn = new Y.Button({
                label: "<i class=\"fa fa-3x fa-level-up\"></i>"
            });
            this.add(this.upgradeBtn);
        },
        bindUI: function() {
            this.handlers.onUpgrade = this.upgradeBtn.on("click", this.execute, this);
        },
        processScript: function(entity, attrName, attr, globals) {
            var toUpgrade = [],
                payload = [],
                content = attr.get("content"),
                i, node, newContent, before, after;
            Y.inputEx.WysiwygScript.visitAST(content, {
                onEnterFn: Y.bind(function(node, args) {
                    // expected arg type is a Translatable content
                    if (args && args.properties && args.properties["@class"]
                        && args.properties["@class"].value === "TranslatableContent") {

                        if (node && node.type) {
                            if (node.type === "Literal") {
                                // but effective arg is a string
                                toUpgrade.unshift({
                                    type: "TR",
                                    node: node
                                });
                            } else if (node.type === "ObjectExpression") {
                                for (var i in node.properties) {
                                    if (node.properties[i].key.value === "translations") {
                                        if (node.properties[i].value.properties && node.properties[i].value.properties.length) {
                                            if (node.properties[i].value.properties[0].value.type === "Literal") {
                                                toUpgrade.unshift({
                                                    type: "TRv1",
                                                    node: node.properties[i].value
                                                });
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (args && args.properties && args.properties["@class"]
                        && args.properties["@class"].value === "Attachment") {

                        if (node && node.type && node.type === "Literal") {
                            toUpgrade.unshift({
                                type: "Attachment",
                                node: node
                            });
                        }
                    }
                    return true;
                }, this),
                globals: globals
            });

            if (toUpgrade.length) {
                Y.log("Entity: " + entity.get("@class") + "#" + entity.get("id") + "::" + attrName + ": ");
                Y.log("CONTENT:" + content);
                // sort by range, last first to not alter first ranges location
                toUpgrade.sort(function(a, b) {
                    if (a && a.node && a.node.range &&
                        b && b.node && b.node.range) {
                        return b.node.range[0] - a.node.range[0];
                    }
                    return 0;
                });
                for (i in toUpgrade) {
                    node = toUpgrade[i].node;
                    // new argument value
                    if (toUpgrade[i].type === "TRv1") {
                        newContent = {};
                        for (var p in node.properties) {
                            var lang = node.properties[p].key.value;
                            newContent[lang] = {
                                translation: JSON.parse(content.substring(node.properties[p].value.range[0], node.properties[p].value.range[1])),
                                status: ""
                            };
                        }
                    } else {
                        newContent = {
                            "@class": "TranslatableContent",
                            "translations": {
                            }
                        };
                        newContent.translations[this.defaultCode] = {
                            translation: JSON.parse(content.substring(node.range[0], node.range[1])),
                            status: ""
                        };
                        if (toUpgrade[i].type === "Attachment") {
                            newContent = {
                                "@class": "Attachment",
                                file: newContent
                            };
                        }
                    }
                    // script before argument
                    before = content.substring(0, node.range[0]);
                    // script after argument
                    after = content.substring(node.range[1]);
                    // combine before, newArg and after
                    content = before + JSON.stringify(newContent) + after;
                }

                Y.log("NEW CONTENT:" + content);
                // all args processed
                payload.push({
                    "@class": "ScriptUpdate",
                    "parentClass": entity.get("@class"),
                    "parentId": entity.get("id"),
                    "fieldName": attrName,
                    "value": content
                });
            }
            return payload;
        },
        saveScripts: function(payload) {
            if (payload.length) {
                Y.Wegas.Facade.GameModel.sendRequest({
                    request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/BatchUpdate",
                    cfg: {
                        method: "PUT",
                        data: payload
                    },
                    on: {
                        success: Y.bind(this.batchSuccess, this),
                        failure: Y.bind(this.batchFailure, this)
                    }
                });
            }
        },
        batchSuccess: function(e) {
            this.fire("upgraded");
        },
        batchFailure: function(e) {
            alert("SOMETHING WENT WRONG");
        },
        execute: function() {
            var globals = [Y.Wegas.RForm.Script.getGlobals('getter'),
                Y.Wegas.RForm.Script.getGlobals('condition')];
            this.defaultCode = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages")[0].get("code");
            Promise.all(globals).then(Y.bind(function(globals) {
                var scriptToUpdate = this.extractScripts(Y.Wegas.Facade.GameModel.cache.getCurrentGameModel(),
                    Y.mix(Y.mix({}, globals[0]), globals[1]));
                this.saveScripts(scriptToUpdate);
            }, this));
        },
        extractScripts: function(entity, globals) {
            var attrs, key, attr, sub, i, child, children,
                results = [];
            if (entity instanceof Y.Wegas.persistence.Entity) {
                attrs = entity.getAttrs();
                for (key in attrs) {
                    if (attrs.hasOwnProperty(key)) {
                        attr = attrs[key];
                        if (attr) {
                            sub = null;
                            var cfg = entity.getAttrCfgs()[key];
                            if ((!cfg["transient"] || key === "items") // transient "items" args is allowed
                                && (!cfg.visible || cfg.visible(attr, attrs))) { // check attre against visible method if any
                                if (Array.isArray(attr) ||
                                    // attr is an object but is not a wegasEntity -> process as a collection
                                        (Y.Lang.isObject(attr) && !(attr instanceof Y.Wegas.persistence.Entity))) {
                                    for (i in attr) {
                                        child = attr[i];
                                        results = results.concat(this.extractScripts(child, globals));
                                    }
                                    sub = children;
                                } else if (attr instanceof Y.Wegas.persistence.Script) {
                                    results = results.concat(this.processScript(entity, key, attr, globals));
                                    // 
                                } else {
                                    results = results.concat(this.extractScripts(attr, globals));
                                }
                            }
                        }
                    }

                }
            }
            return results;
        },
        destructor: function() {
            var k;
            for (k in this.handlers) {
                if (this.handlers.hasOwnProperty(k)) {
                    this.handlers[k].detach();
                }
            }
        }
    }, {
        EDITORNAME: "GameModelScriptUpgrader",
        ATTRS: {}
    });
    Y.Wegas.GameModelScriptUpgrader = GameModelScriptUpgrader;
});
