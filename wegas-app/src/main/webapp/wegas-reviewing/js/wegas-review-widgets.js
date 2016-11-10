/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013, 2014, 2015 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
/* global Chartist, I18n */

/**
 * @fileoverview
 * @author Maxence Laurent (maxence.laurent gmail.com)
 */
YUI.add("wegas-review-widgets", function(Y) {
    "use strict";
    var CONTENTBOX = "contentBox", WIDGET = "widget", PAGEID = "pageId",
        Wegas = Y.Wegas, ReviewVariableEditor, pageloaderErrorMessageClass = "wegas-pageloader-error",
        SUBPAGE = "wegas-review-subpage", BUTTON = "wegas-review-button",
        ReviewOrchestrator, ReviewWidget, ReviewTabView,
        GradeInput, TextEvalInput, CategorizationInput;

    /**
     * @name Y.Wegas.ReviewOrchestrator
     * @extends Y.Widget
     * @borrows Y.WidgetChild, Y.WidgetParent, Y.Wegas.Widget, Y.Wegas.Editable
     * @class  class loader of wegas's pages
     * @constructor
     * @description
     */
    ReviewOrchestrator = Y.Base.create("wegas-review-orchestrator", Y.Widget, [Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
        /** @lends Y.Wegas.ReviewOrchestrator# */
        CONTENT_TEMPLATE: "<div>" +
            "<div class=\"summary\"><h1>" + I18n.t("review.orchestrator.mainTitle") +
            "<span class=\"refresh\"></span></h1>" +
            "<div class=\"control-panel\">" +
            "<div class=\"state not-started\">" +
            "<h7>" + I18n.t("review.orchestrator.state.edition.title") + "</h7>" +
            I18n.t("review.orchestrator.state.edition.description") +
            "</div>" +
            "<div class=\"transition start-review\"><span class=\"fa fa-arrow-circle-right fa-4x\"></span></div>" +
            "<div class=\"state reviewing\">" +
            "<h7>" + I18n.t("review.orchestrator.state.reviewing.title") + "</h7>" +
            I18n.t("review.orchestrator.state.reviewing.description") +
            "</div>" +
            "<div class=\"transition close-review\"><span class=\"fa fa-arrow-circle-right fa-4x\"></span></div>" +
            "<div class=\"state commenting\">" +
            "<h7>" + I18n.t("review.orchestrator.state.commenting.title") + "</h7>" +
            I18n.t("review.orchestrator.state.commenting.description") +
            "</div>" +
            "<div class=\"transition close-comment\"><span class=\"fa fa-arrow-circle-right fa-4x\"></span></div>" +
            "<div class=\"state closed\">" +
            "<h7>" + I18n.t("review.orchestrator.state.completed.title") + "</h7>" +
            I18n.t("review.orchestrator.state.completed.description") +
            "</div>" +
            "<div style=\"clear: both;\"></div>" +
            "<div class=\"include-evicted\">" +
            "<span class=\"checkbox\">" + I18n.t("review.orchestrator.includeEvicted") +
            "</span>" +
            "</div>" +
            "</div>" +
            "<div class=\"overview\"><h2>" + I18n.t("review.orchestrator.overview").capitalize() + "</h2></div>" +
            "<div class=\"reviews\"><h2>" + I18n.t("review.orchestrator.reviews").capitalize() + "</h2></div>" +
            "<div class=\"comments\"><h2>" + I18n.t("review.orchestrator.comments").capitalize() + "</h2></div>" +
            "</div>" +
            "<div class=\"charts\"></div>" +
            "</div>",
        initializer: function() {
            this.handlers = [];
            this.datatables = {};
            this._freeForAll = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("properties.freeForAll");

            this.detailsOverlay = new Y.Overlay({
                zIndex: 100,
                width: this.get("width"),
                constrain: true,
                visible: false
            }).render(this.get("contentBox"));

            this.detailsOverlay.get("contentBox").addClass("wegas-review-orchestrator--popup-overlay");

        },
        countByStatus: function(instances) {
            var counters = {}, instance, key;
            for (key in instances) {
                if (instances.hasOwnProperty(key)) {
                    instance = instances[key];
                    counters[instance.get("reviewState")] = (counters[instance.get("reviewState")] + 1) || 1;
                }
            }
            return counters;
        },
        renderUI: function() {
            var prd = this.get("variable.evaluated"), ctx;
            ctx = this;
            this.refreshButton = new Y.Button({
                label: "<span class=\"fa fa-refresh\"></span>",
                //label: "<span class=\"wegas-icon wegas-icon-refresh\"></span>",
                visible: true
                    //}).render(this.get(CONTENTBOX));
            }).render(this.get(CONTENTBOX).one(".refresh"));

            this.request = "ReviewHelper.summarize('" + prd.get("name") + "');";
        },
        _getMonitoredData: function() {
            var ctx = this;
            //return new Y.Promise(function(resolve, reject) {
            Y.Wegas.Facade.Variable.sendRequest({
                request: "/Script/Run/" + Y.Wegas.Facade.Game.cache.getCurrentPlayer().get("id"),
                cfg: {
                    method: "POST",
                    headers: {"Managed-Mode": false},
                    data: {
                        "@class": "Script",
                        content: ctx.request
                    }
                },
                on: {
                    success: function(e) {
                        ctx._monitoredData = e.response.results;
                        ctx.syncTable();
                    }//,
                    //failure: reject
                }
            });
            //});
        },
        /**
         * @function
         * @private
         * @description bind function to events.
         */
        bindUI: function() {

            // TODO use updatedInstance
            this.handlers.push(Wegas.Facade.Variable.after("update", this.syncUI, this));
            this.get(CONTENTBOX).delegate("click", this.onDispatch, ".control-panel .transition.start-review span", this);
            this.get(CONTENTBOX).delegate("click", this.onNotify, ".control-panel .transition.close-review span", this);
            this.get(CONTENTBOX).delegate("click", this.onClose, ".control-panel .transition.close-comment span", this);

            this.handlers.push(Y.one("body").on("click", this.detailsOverlay.hide, this.detailsOverlay));
            this.get(CONTENTBOX).delegate("click", this.onTeamNameClick, ".yui3-datatable-col-team-name", this);

            this.get(CONTENTBOX).delegate("click", this.onTextEvalClick, ".yui3-datatable-cell span.texteval-data", this);

            this.get(CONTENTBOX).delegate("click", this.onIncludeEvictedClick, ".control-panel .include-evicted.enabled", this);

            /*this.handlers.push(Y.Wegas.Facade.Variable.after("updatedDescriptor", function(e) {
             var question = this.get("variable.evaluated");
             if (question && question.get("id") === e.entity.get("id")) {
             this.syncUI();
             }
             }, this));*/

            this.refreshButton.on("click", this.syncUI, this);
            //this.datatable.after("synched", this.syncSummary, this);
        },
        onTextEvalClick: function(e) {
            var cell, teamId, data, title, body, i, dt, evId, token;
            for (dt in this.datatables) {
                cell = this.datatables[dt].getRecord(e.currentTarget);
                if (cell) {
                    break;
                }
            }

            teamId = cell.get("team-id");
            evId = "ev-" + e.target.getAttribute("data-ref").match(/\d+/)[0];
            token = teamId + "-" + evId;
            if (this.currentTarget !== token || !this.detailsOverlay.get("visible")) {
                data = cell.get(e.target.getAttribute("data-ref"));
                title = this._monitoredData.structure[dt].find(function(item) {
                    return item.id === evId;
                }).title;

                if (data) {
                    body = "";
                    for (i = data.length - 1; i >= 0; i -= 1) {
                        body += (data[i] ? data[i] : "<I>" + I18n.t("review.editor.noValueProvided") + "</i>");
                        if (i > 0) {
                            body += "<hr />";
                        }
                    }
                } else {
                    body = "<i>" + I18n.t("review.orchestrator.notAvailableYet") + "</i>";
                }
                this.currentTarget = token;
                this.currentPos = [e.pageX + 10, e.pageY + 20];
                this.display(title, body);
            } else {
                this.detailsOverlay.hide();
                this.currentTarget = null;
            }
            e.halt(true);
        },
        onTeamNameClick: function(e) {
            var cell, teamId, dt, token;

            for (dt in this.datatables) {
                cell = this.datatables[dt].getRecord(e.currentTarget);
                if (cell) {
                    break;
                }
            }

            teamId = cell.get("team-id");
            token = dt + "-" + teamId;

            if (this.currentTarget !== token || !this.detailsOverlay.get("visible")) {
                this.currentTarget = token;
                this.currentPos = [e.pageX + 10, e.pageY + 20];
                // TODO Individual ?
                if (this._freeForAll) {
                    this.display(I18n.t("review.orchestrator.playerData", {playerName: cell.get("team-name")}), this._monitoredData.variable[teamId]);
                } else {
                    this.display(I18n.t("review.orchestrator.teamData", {teamName: cell.get("team-name")}), this._monitoredData.variable[teamId]);
                }
            } else {
                this.detailsOverlay.hide();
                this.currentTarget = null;
            }
            e.halt(true);
        },
        display: function(title, body) {
            this.detailsOverlay.set("headerContent", title);
            this.detailsOverlay.setStdModContent('body', body);
            this.detailsOverlay.move(this.currentPos[0], this.currentPos[1]);
            this.detailsOverlay.show();
        },
        /**
         * @function
         * @private
         */
        syncUI: function() {
            this._getMonitoredData();
            this.syncIncludeEvicted();
        },
        syncIncludeEvicted: function() {
            this.get(CONTENTBOX).one(".control-panel .include-evicted").toggleClass("selected", this.get("variable.evaluated").get("includeEvicted"));
        },
        onIncludeEvictedClick: function() {
            var prd = this.get("variable.evaluated");
            prd.set("includeEvicted", !prd.get("includeEvicted"));
            Y.Wegas.Facade.Variable.cache.put(prd.toObject());
        },
        syncTable: function() {
            //this.dashboard && this.dashboard.syncUI();
            var ctx = this,
                columns = {}, data = {}, formatter, nodeFormatter,
                game, team, globalStatus, teamStatus, prd, childEntry,
                group, item, i, j, teamId, entry, key, section;

            game = Y.Wegas.Facade.Game.cache.getCurrentGame();
            data = {
                overview: [],
                reviews: [],
                comments: []
            };

            for (section in this._monitoredData.structure) {
                if (!columns[section]) {
                    // TODO Individual ?
                    this;
                    columns[section] = [{key: "team-name", label: (this._freeForAll ? I18n.t("wegas.player").capitalize() : I18n.t("wegas.team").capitalize()), formatter: "{value} <i class=\"fa fa-info-circle\"></i>"}];
                }
                for (i = 0; i < this._monitoredData.structure[section].length; i++) {
                    group = this._monitoredData.structure[section][i];
                    entry = {label: group.title, children: []};

                    for (j = 0; j < group.items.length; j++) {
                        item = group.items[j];
                        if (item.formatter) {
                            formatter = item.formatter.indexOf("function") === 0 ? eval("(" + item.formatter + ")") : item.formatter;
                        }

                        if (item.nodeFormatter) {
                            nodeFormatter = item.nodeFormatter.indexOf("function") === 0 ? eval("(" + item.nodeFormatter + ")") : item.nodeFormatter;
                        } else {
                            nodeFormatter = null;
                        }
                        childEntry = {
                            key: item.id,
                            label: item.label,
                            formatter: (formatter === "null" ? "<span class=\"" + item.id.replace(/[0-9]+-/, "") + "\">{value}</span>" : formatter),
                            allowHTML: (item.allowHTML || false)
                        };
                        if (nodeFormatter) {
                            childEntry.nodeFormatter = nodeFormatter;
                        }

                        entry.children.push(childEntry);
                    }
                    columns[section].push(entry);
                }
            }

            for (teamId in this._monitoredData.data) {
                team = Y.Wegas.Facade.Game.cache.getTeamById(teamId);
                if ((game.get("@class") === "DebugGame" || team.get("@class") !== "DebugTeam") && team.get("players").length > 0) {
                    switch (this._monitoredData.data[teamId].overview.internal_status) {
                        case "editing":
                        case "ready":
                            teamStatus = "NOT_STARTED";
                            break;
                        case "reviewing":
                        case "done":
                            teamStatus = "REVIEWING";
                            break;
                        case "commenting":
                        case "completed":
                            teamStatus = "COMMENTING";
                            break;
                        case "closed":
                            teamStatus = "CLOSED";
                            break;
                        case "evicted":
                            teamStatus = "EVICTED";
                            break;
                        default:
                            teamStatus = "N/A";
                    }
                    if (teamStatus !== "EVICTED") {
                        if (!globalStatus) {
                            globalStatus = teamStatus;
                        } else if (globalStatus !== teamStatus) {
                            globalStatus = "N/A";
                        }
                    }

                    for (section in this._monitoredData.data[teamId]) {
                        entry = {
                            "team-name": (this._freeForAll ? team.get("players")[0].get("name") : team.get("name")),
                            "team-id": teamId
                        };
                        for (key in this._monitoredData.data[teamId][section]) {
                            entry[key] = this._monitoredData.data[teamId][section][key];
                        }
                        data[section].push(entry);
                    }
                }
            }

            this.get(CONTENTBOX).one(".state.not-started").removeClass("current");
            this.get(CONTENTBOX).one(".state.reviewing").removeClass("current");
            this.get(CONTENTBOX).one(".state.commenting").removeClass("current");
            this.get(CONTENTBOX).one(".state.closed").removeClass("current");

            this.get(CONTENTBOX).one(".transition.start-review span").removeClass("active");
            this.get(CONTENTBOX).one(".transition.close-review span").removeClass("active");
            this.get(CONTENTBOX).one(".transition.close-comment span").removeClass("active");

            this.get(CONTENTBOX).one(".control-panel .include-evicted").removeClass("enabled");

            switch (globalStatus) {
                case "NOT_STARTED":
                    this.get(CONTENTBOX).one(".transition.start-review span").addClass("active");
                    this.get(CONTENTBOX).one(".control-panel .include-evicted").addClass("enabled");
                    this.get(CONTENTBOX).one(".state.not-started").addClass("current");
                    break;
                case "REVIEWING":
                    this.get(CONTENTBOX).one(".transition.close-review span").addClass("active");
                    this.get(CONTENTBOX).one(".state.reviewing").addClass("current");
                    break;
                case "COMMENTING":
                    this.get(CONTENTBOX).one(".transition.close-comment span").addClass("active");
                    this.get(CONTENTBOX).one(".state.commenting").addClass("current");
                    break;
                case "CLOSED":
                    this.get(CONTENTBOX).one(".state.closed").addClass("current");
                    break;
                case "N/A":
                    this.get(CONTENTBOX).one(".transition.start-review span").addClass("active");
                    this.get(CONTENTBOX).one(".transition.close-review span").addClass("active");
                    this.get(CONTENTBOX).one(".transition.close-review span").addClass("active");
                    break;
            }

            for (section in ctx.datatables) {
                ctx.datatables[section].destroy();
            }

            for (section in this._monitoredData.structure) {
                ctx.datatables[section] = new Y.DataTable({columns: columns[section], data: data[section], sortable: true});
                ctx.datatables[section].render(this.get(CONTENTBOX).one(".summary ." + section));
            }
            ctx.syncSummary();
        },
        addCell: function(table, content, td) {
            td = td || "td";
            table.push("<" + td + ">");
            table.push(content);
            table.push("</" + td + ">");
        },
        getInfoFromSummary: function(summary) {
            if (summary.type === "GradeSummary") {
                return  [summary.mean, summary.median, summary.sd];
            } else if (summary.type === "TextSummary") {
                return [summary.averageNumberOfWords, summary.averageNumberOfCharacters];
            } else {
                return ["n/a"];
            }
            return ["n/a"];
        },
        syncSummary: function() {
            var data = this._monitoredData,
                evalSummary,
                node, prd;

            prd = this.get("variable.evaluated");
            evalSummary = data.extra;

            node = this.get(CONTENTBOX).one(".charts");
            node.setContent("");
            node.append("<h1>" + I18n.t("review.orchestrator.charts").capitalize() + "</h1>");
            node.append("<div class=\"feedback\"><h2>" + I18n.t("review.orchestrator.reviews").capitalize() + "</h2></div>");
            node.append("<div class=\"comments\"><h2>" + I18n.t("review.orchestrator.comments").capitalize() + "</h2></div>");

            this.buildCharts(prd.get("feedback").get("evaluations"), node.one(".feedback"), evalSummary);
            this.buildCharts(prd.get("fbComments").get("evaluations"), node.one(".comments"), evalSummary);
        },
        createGradeChart: function(klass, summary, descriptor) {
            var min, max, data, options, i, bar;

            data = {
                labels: [],
                series: [{
                        "name": descriptor.get("name"),
                        data: []
                    }]
            };

            options = {
                width: 400,
                height: 250
            };

            for (i in summary.histogram) {
                bar = summary.histogram[i];
                min = bar.min || Number.NaN;
                max = bar.max || Number.NaN;
                data.labels.push("[" + min.toFixed(2) + "," + max.toFixed(2) + "[");
                data.series[0].data.push(bar.count);
            }
            this.chart = new Chartist.Bar(klass, data, options);


        },
        createCategoryChart: function(klass, summary, descriptor) {
            var min, max, data, options, key;
            min = summary.min;
            max = summary.max;

            data = {
                labels: [],
                series: [{
                        "name": descriptor.get("name"),
                        data: []
                    }]
            };

            options = {
                width: 400,
                height: 250
            };

            for (key in summary.histogram) {
                data.labels.push(key);
                data.series[0].data.push(summary.histogram[key]);
            }
            this.chart = new Chartist.Bar(klass, data, options);
        },
        _formatNumber: function(value, nD) {
            nD = nD || 2;
            return Y.Lang.isNumber(value) ? value.toFixed(nD) : "n/a";
        },
        buildCharts: function(evals, node, summary) {
            var i, evD, klass, data;/*math,*/
            for (i in evals) {
                evD = evals[i];
                klass = "eval-" + evD.get("id");
                node.append("<div class=\"evaluation " + klass + "\">" +
                    "<div class=\"title\"></div>" +
                    "<div class=\"ct-chart chart\"></div>" +
                    "<div class=\"legend\"></div>" +
                    "</div>");
                data = summary[evD.get("id")].get("val");
                if (evD.get("@class") === "GradeDescriptor") {
                    /*
                     math = "<math xmlns=\"http://www.w3.org/1998/Math/MathML\">" +
                     "<mrow>" +
                     "<mstyle displaystyle=\"true\" scriptlevel=\"0\"> " +
                     "<mrow> " +
                     "<mrow> " +
                     "<mover> " +
                     "<mi>x</mi> " +
                     "<mo stretchy=\"false\">¯<!-- ¯ --></mo> " +
                     "</mover> " +
                     "</mrow> " +
                     "<mo>=</mo>" +
                     "<mn>"  + data.mean.toFixed(2) + "</mn>" +
                     "<mo>;</mo>" +
                     "</mrow> " +
                     "<mrow>"+
                     "<mrow>"+
                     "<mover> " +
                     "<mi>x</mi> " +
                     "<mo stretchy=\"false\">~<!-- ~ --></mo> " +
                     "</mover> " +
                     "</mrow> " +
                     "</mrow> " +
                     "<mo>=</mo>" +
                     "<mn>"  + data.median.toFixed(2) + "</mn>" +
                     "<mo>;</mo>" +
                     "<mrow> " +
                     "<mi>σ<!-- σ --></mi> " +
                     "</mrow> " +
                     "<mo>=</mo>" +
                     "<mn>"  + data.sd.toFixed(2) + "</mn>" +
                     "<mo>;</mo>" +
                     "</mstyle> " +
                     "</mrow> " +
                     "</math>";*/
                    this.createGradeChart("." + klass + " .chart", data, evD);
                    node.one("." + klass + " .title").setContent("<h3>" + evD.get("name") + "</h3>");
                    //node.one("." + klass + " .legend").append(math);
                    node.one("." + klass + " .legend").append("<p>" +
                        I18n.t("review.orchestrator.stats.mean") + ": " + this._formatNumber(data.mean) +
                        "; " + I18n.t("review.orchestrator.stats.median") + ": " + this._formatNumber(data.median) +
                        "; " + I18n.t("review.orchestrator.stats.sd") + ": " + this._formatNumber(data.sd) +
                        "; " + I18n.t("review.orchestrator.stats.bounds") + ": [" + this._formatNumber(data.min) + "," + this._formatNumber(data.min) + "]" +
                        " </p>");

                    node.one("." + klass + " .legend").append("<p>" + I18n.t("review.orchestrator.stats.basedOn", {available: data.numberOfValues || 0, expected: summary.maxNumberOfValue}) + "</p>");
                } else if (evD.get("@class") === "CategorizedEvaluationDescriptor") {
                    this.createCategoryChart("." + klass + " .chart", summary[evD.get("id")].get("val"), evD);
                    node.one("." + klass + " .title").setContent("<h3>" + evD.get("name") + "</h3>");

                    node.one("." + klass + " .legend").append("<p>" + I18n.t("review.orchestrator.stats.basedOn", {available: data.numberOfValues || 0, expected: summary.maxNumberOfValue}) + "</p>");
                } else if (evD.get("@class") === "TextEvaluationDescriptor") {
                    node.one("." + klass + " .title").setContent("<h3>" + evD.get("name") + "</h3>");
                    node.one("." + klass + " .chart").append("<p>" + I18n.t("review.orchestrator.stats.avgWc") + ": " + (data.averageNumberOfWords ? data.averageNumberOfWords.toFixed(2) : "n/a") + "</p>");
                    node.one("." + klass + " .chart").append("<p>" + I18n.t("review.orchestrator.stats.avgCc") + ": " + (data.averageNumberOfCharacters ? data.averageNumberOfCharacters.toFixed(2) : "n/a") + "</p>");
                    node.one("." + klass + " .legend").append("<p>" + I18n.t("review.orchestrator.stats.basedOn", {available: data.numberOfValues || 0, expected: summary.maxNumberOfValue}) + "</p>");
                }
            }
        },
        /**
         * @function
         * @private
         * @description Destroy widget and detach all functions created by this widget
         */
        destructor: function() {
            Y.Array.each(this.handlers, function(h) {
                h.detach();
            });
        },
        getEditorLabel: function() {
            return "Orchestrator";
        },
        onClose: function(e) {
            if (e.target.hasClass("active")) {
                this.onAction("Close");
            }
        },
        onNotify: function(e) {
            if (e.target.hasClass("active")) {
                this.onAction("Notify");
            }
        },
        onDispatch: function(e) {
            if (e.target.hasClass("active")) {
                this.onAction("Dispatch");
            }
        },
        onAction: function(action) {
            var prd = this.get("variable.evaluated");

            Wegas.Panel.confirm(I18n.t("review.orchestrator.goNextConfirmation"), Y.bind(function() {
                this.showOverlay();
                Y.Wegas.Facade.Variable.sendRequest({
                    request: "/PeerReviewController/" + prd.get("id") + "/" + action + "/" + Y.Wegas.Facade.Game.cache.getCurrentGame().get("id"),
                    cfg: {
                        updateCache: true,
                        method: "post"
                    },
                    on: {
                        success: Y.bind(function() {
                            this.hideOverlay();
                        }, this),
                        failure: Y.bind(function() {
                            this.hideOverlay();
                            this.showMessage("error", "Something went wrong");
                        }, this)
                    }
                });
            }, this));
        }
    }, {
        /** @lends Y.Wegas.ReviewOrchestrator */
        EDITORNAME: "Review Orchestrator",
        ATTRS: {
            /**
             * The PeerReviewDescriptor
             *
             */
            variable: {
                getter: Wegas.Widget.VARIABLEDESCRIPTORGETTER,
                _inputex: {
                    _type: "variableselect",
                    label: "Peer Review Descriptor",
                    classFilter: ["PeerReviewDescriptor"],
                    wrapperClassName: "inputEx-fieldWrapper"
                }
            }
        }
    });
    Wegas.ReviewOrchestrator = ReviewOrchestrator;


    /**
     * @name Y.Wegas.ReviewVariableEditor
     * @extends Y.Widget
     * @borrows Y.WidgetChild, Y.WidgetParent, Y.Wegas.Widget, Y.Wegas.Editable
     */
    ReviewVariableEditor = Y.Base.create("wegas-review-variableeditor", Y.Widget,
        [Y.WidgetParent, Y.WidgetChild, Y.Wegas.Widget, Y.Wegas.Editable], {
        /** @lends Y.Wegas.ReviewVariableEditor# */
        initializer: function() {
            this.handlers = [];
        },
        renderUI: function() {
            var prd = this.get("variable.evaluated");

            this._mainList = new Y.Wegas.List({
                cssClass: "wegas-review-variable-editor--list",
                editable: false
            });


            //this._mainList.add(this._input);

            this._submitButton = new Y.Wegas.Button({
                cssClass: BUTTON,
                label: I18n.t("review.global.submit").capitalize(),
                visible: true
            });
            this._mainList.add(this._submitButton);

            this.add(this._mainList);
        },
        /**
         * @function
         * @private
         * @description bind function to events.
         */
        bindUI: function() {
            this.handlers.push(Wegas.Facade.Variable.after("update", function() {// When the variable cache is updated,
                //TODO clever sync, please...
                this.syncUI(); // sync the view
            }, this));
            this._submitButton.on("click", this.onSubmit, this);
        },
        /**
         * @function
         * @private
         */
        syncUI: function() {
            var prd = this.get("variable.evaluated"),
                variableName;

            variableName = prd.get("toReviewName");

            if (prd.getInstance().get("reviewState") === "NOT_STARTED") {
                // Time to edit the variable
                this._submitButton.set("visible", true && this.get("showSubmitButton"));
                if (!this._input || this._input.get("readonly.evaluated")) {
                    this._input && this._input.destroy();
                    this._input = new Y.Wegas.TextInput({
                        variable: {name: variableName},
                        showSaveButton: false,
                        showStatus: true,
                        toolbar1: "bold italic underline bullist",
                        toolbar2: "",
                        toolbar3: "",
                        contextmenu: "bold italic underline bullist",
                        disablePaste: false,
                        readonly: {
                            "content": "return false;"
                        }
                    });
                    this._mainList.add(this._input, 0);
                }
            } else {
                // No longer editable
                this._submitButton.set("visible", false);
                // No input or editable one
                if (!this._input || !this._input.get("readonly.evaluated")) {
                    this._input && this._input.destroy();
                    this._input = new Y.Wegas.TextInput({
                        variable: {name: variableName},
                        showSaveButton: false,
                        showStatus: true,
                        toolbar1: "bold italic underline bullist",
                        toolbar2: "",
                        toolbar3: "",
                        contextmenu: "bold italic underline bullist",
                        disablePaste: false,
                        readonly: {
                            "content": "return true;"
                        }
                    });
                    this._mainList.add(this._input, 0);
                }
            }
        },
        /**
         * @function
         * @private
         */
        destructor: function() {
            Y.Array.each(this.handlers, function(h) {
                h.detach();
            });
        },
        getEditorLabel: function() {
            return this.get("pageLoaderId");
        },
        // *** Private Methods ***/
        /**
         * @function
         * @private
         * @param {String} pageId check for this page's ID.
         * @return boolean
         * @description Return true if an ancestor already loads pageId
         */
        onSubmit: function() {

            var prd = this.get("variable.evaluated");

            Wegas.Panel.confirm(I18n.t("review.global.confirmation"), Y.bind(function() {
                Wegas.Panel.confirmPlayerAction(Y.bind(function() {
                    this.showOverlay();
                    Y.Wegas.Facade.Variable.sendRequest({
                        request: "/PeerReviewController/" + prd.get("id") + "/Submit/" + Y.Wegas.Facade.Game.get('currentPlayerId'),
                        cfg: {
                            updateCache: true,
                            method: "post"
                        },
                        on: {
                            success: Y.bind(function() {
                                this.hideOverlay();
                            }, this),
                            failure: Y.bind(function() {
                                this.hideOverlay();
                                this.showMessage("error", "Error while submiting");
                            }, this)
                        }
                    });
                }, this));
            }, this));
        }
    }, {
        /** @lends Y.Wegas.PageLoader */
        EDITORNAME: "Review Variable Editor",
        ATTRS: {
            variable: {
                getter: Wegas.Widget.VARIABLEDESCRIPTORGETTER,
                _inputex: {
                    _type: "variableselect",
                    label: "Peer Review Descriptor",
                    classFilter: ["PeerReviewDescriptor"],
                    wrapperClassName: "inputEx-fieldWrapper"
                }
            },
            showSubmitButton: {
                type: "boolean",
                value: true,
                _inputex: {
                    label: "Display submit button"
                }
            }
        }
    });
    Wegas.ReviewVariableEditor = ReviewVariableEditor;


    /**
     * @name Y.Wegas.ReviewTabView
     * @extends Y.Widget
     * @borrows Y.WidgetChild, Y.Wegas.Widget, Y.Wegas.Editable
     * @class
     * @constructor
     * @description Show available review to the player. There is two review categories:
     * the first one contains reviews the player (self) has to write to reflect
     * his thoughts about work done by others players. The second contains the reviews
     * written by others about the work of the current player.
     */
    ReviewTabView = Y.Base.create("wegas-review-tabview", Y.Widget, [Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
        /** @lends Y.Wegas.ReviewTabView# */
        // *** Lifecycle Methods *** //
        CONTENT_TEMPLATE: null,
        /**
         * @function
         * @private
         * @description Set variable with initials values.
         */
        initializer: function() {
            /**
             * datasource from Y.Wegas.Facade.Variable
             */
            this.dataSource = Wegas.Facade.Variable;
            this.tabView = new Y.TabView();
            /**
             * Reference to each used functions
             */
            this.handlers = [];
            this.isRemovingTabs = false;
        },
        /**
         * @function
         * @private
         * @description Render the TabView widget in the content box.
         */
        renderUI: function() {
            var cb = this.get(CONTENTBOX),
                prd, pri;

            this.tabView.render(cb);
            this.tabView.get("boundingBox").addClass("horizontal-tabview");
            cb.append("<div style='clear:both'></div>");

            prd = this.get("variable.evaluated");
            pri = prd.getInstance();

            if (pri.get("reviewState") === "NOT_STARTED") {
                this.status = "EMPTY";
                this.tabView.add(new Y.Tab({
                    label: "",
                    content: "<center><i><br /><br /><br />" + I18n.t("review.tabview.emptyness_message") + "</i></center>"
                }));
                this.tabView.selectChild(0);
            }/* else {
             this.status = "BUILT";
             this.addReviews(pri);
             }*/

        },
        bindUI: function() {
            this.tabView.after("selectionChange", this.onTabSelected, this);
            //this.handlers.push(this.dataSource.after("update", this.syncUI, this));
            this.handlers.push(Y.Wegas.Facade.Instance.after("updatedInstance", this.syncEntity, this));


        },
        syncEntity: function(payload) {
            var prd = this.get("variable.evaluated"),
                pri = prd.getInstance(),
                entity = payload.entity;
            if (entity.get("@class") === pri.get("@class") && entity.get("id") === pri.get("id")) {
                this.syncUI();
            }
        },
        /**
         * @function
         * @private
         * @description Clear and re-fill the TabView with reviews
         * Display a message if there is not time to review (NOT_STARTED)
         */
        syncUI: function() {
            var prd = this.get("variable.evaluated"),
                pri = prd.getInstance();
            //selectedTab = this.tabView.get('selection'),
            //lastSelection = (selectedTab) ? selectedTab.get('index') : 0;

            //this.hideOverlay();

            if (this.status === "EMPTY" && pri.get("reviewState") !== "NOT_STARTED") {
                this.status = "BUILT";
                this.isRemovingTabs = true;
                this.tabView.destroyAll();
                this.isRemovingTabs = false;
                this.addReviews(pri);
            } else {
                this.updateReviews(pri);
            }
        },
        addReview: function(review, i, j) {
            var tab;

            if (i === 0 || review.get("reviewState") === "NOTIFIED" ||
                review.get("reviewState") === "COMPLETED" ||
                review.get("reviewState") === "CLOSED") {
                tab = new Y.Tab({
                    label: (i === 0 ? I18n.t("review.tabview.toReview") : I18n.t("review.tabview.toComment")) + " " + I18n.t("review.editor.number") + (j + 1)
                });
                tab.loaded = false;
                tab.review = review;
                tab.reviewer = (i === 0);
                this.updateUnreadStatus(tab);
                this.tabView.add(tab);
            }
        },
        updateUnreadStatus: function(tab) {
            // TODO _ improve 
            if ((tab.reviewer && tab.review.get("reviewState") === "DISPATCHED") ||
                (!tab.reviewer && tab.review.get("reviewState") === "NOTIFIED")) {
                tab.get("boundingBox").addClass("unread");
            } else {
                tab.get("boundingBox").removeClass("unread");
            }
        },
        updateReviews: function(pri) {
            var i, j, k, types = ["toReview", "reviewed"],
                reviews, review, tab,
                selectedTab = this.tabView.get('selection'),
                lastSelection = (selectedTab ? selectedTab.get('index') : 0);

            for (i = 0; i < 2; i++) {
                reviews = pri.get(types[i]);
                for (j = 0; j < reviews.length; j++) {
                    review = reviews[j];
                    tab = null;
                    for (k = 0; k < this.tabView.size(); k += 1) {
                        if (this.tabView.item(k).reviewer === (i === 0) && this.tabView.item(k).review && this.tabView.item(k).review.get("id") === review.get("id")) {
                            tab = this.tabView.item(k);
                            break;
                        }
                    }
                    if (tab) {
                        if (tab.reviewWidget) {
                            tab.review = reviews[j];
                            this.updateUnreadStatus(tab);
                            if (review.get("reviewState") !== tab.reviewWidget._status) {
                                // Build new
                                this.renderTab(tab);
                            } else {
                                //if (tab === selectedTab) {
                                //tab.reviewWidget.outdate();
                                //} else {
                                tab.reviewWidget.set("review", tab.review);
                                tab.reviewWidget.syncUI();
                                //}
                            }
                        }
                    } else {
                        this.addReview(reviews[j], i, j);
                    }
                }
            }
        },
        addReviews: function(pri) {
            var i, j, types = ["toReview", "reviewed"], reviews;

            for (i = 0; i < 2; i++) {
                reviews = pri.get(types[i]);
                for (j = 0; j < reviews.length; j++) {
                    this.addReview(reviews[j], i, j);
                }
            }
        },
        /**
         * @function
         * @param e description
         * @private
         * @description Display selected question's description on current tab.
         */
        onTabSelected: function(e) {
            if (e.newVal && e.newVal.review
                && (!this.isRemovingTabs && !e.newVal.loaded) ||
                e.newVal.reviewWidget._status === "OUTDATED") {
                e.newVal.loaded = true;
                this.renderTab(e.newVal);
            }
        },
        renderTab: function(tab) {
            if (tab.reviewWidget) {
                tab.reviewWidget.destroy();
            }
            tab.reviewWidget = new Wegas.ReviewWidget({
                title: tab.get("label"),
                review: tab.review,
                descriptor: this.get("variable.evaluated"),
                reviewer: tab.reviewer,
                showSubmitButton: this.get("showSubmitButton")
            }).render(tab.get("panelNode"));
            tab.reviewWidget.on(["*:message", "*:showOverlay", "*:hideOverlay"], this.fire, this); // Event on the loaded
        },
        getEditorLabel: function() {
            var variable = this.get("variable.evaluated");
            if (variable) {
                return variable.getEditorLabel();
            }
            return null;
        },
        /**
         * @function
         * @private
         * @description Destroy TabView and detach all functions created
         *  by this widget
         */
        destructor: function() {
            this.tabView.each(function(item) {
                item.reviewWidget && item.reviewWidget.destroy();
            });
            this.tabView.destroy();
            Y.Array.each(this.handlers, function(h) {
                h.detach();
            });
        }
    }, {
        EDITORNAME: "Review display",
        /** @lends Y.Wegas.ReviewTabView */
        /**
         * @field
         * @static
         * @description
         * <p><strong>Attributes</strong></p>
         * <ul>
         *    <li>variable: The target variable, returned either based on the name
         *     attribute, and if absent by evaluating the expr attribute.</li>
         * </ul>
         */
        ATTRS: {
            variable: {
                /**
                 * The target variable, returned either based on the name attribute,
                 * and if absent by evaluating the expr attribute.
                 */
                getter: Wegas.Widget.VARIABLEDESCRIPTORGETTER,
                _inputex: {
                    _type: "variableselect",
                    label: "Peer Review",
                    classFilter: ["PeerReviewDescriptor"]
                }
            },
            showSubmitButton: {
                type: "boolean",
                value: true,
                _inputex: {
                    label: "Display submit button"
                }
            }
        }
    });
    Wegas.ReviewTabView = ReviewTabView;


    /**
     * @name Y.Wegas.ReviewWidget
     * @extends Y.Widget
     * @borrows Y.WidgetChild, Y.Wegas.Widget, Y.Wegas.Editable
     * @class
     * @constructor
     * @description Is used to display a specific review.
     */
    ReviewWidget = Y.Base.create("wegas-review-widget", Y.Widget, [Y.WidgetParent, Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
        CONTENT_TEMPLATE: "<div>"
            + "  <div class=\"title\"></div>"
            + "  <div class=\"container\">"
            + "    <div class=\"toReview\">"
            + "      <div class=\"subtitle\"></div>"
            + "      <div class=\"description\"></div>"
            + "      <div class=\"content\"></div>"
            + "    </div>"
            + "  </div>"
            + "  <div class=\"container\">"
            + "    <div class=\"feedback\">"
            + "      <div class=\"subtitle\"></div>"
            + "      <div class=\"content\"></div>"
            + "    </div>"
            + "  </div>"
            + "  <div class=\"container\">"
            + "    <div class=\"feedbackEv\">"
            + "      <div class=\"subtitle\"></div>"
            + "      <div class=\"content\"></div>"
            + "    </div>"
            + "  </div>"
            + "  <div>"
            + "    <div class=\"submit\"></div>"
            + "  </div>"
            + "</div>",
        initializer: function() {
            this._status = this.get("review").get("reviewState");
            this.widgets = {};
            this.handlers = {};
            this.locks = {};
        },
        /**
         *
         * @param {type} ev
         * @param {type} container
         * @param {type} mode hidden, read or write, others means hidden
         * @returns {undefined}
         */
        addEvaluation: function(ev, container, mode) {
            var klass = ev.get("@class"),
                widget, readonly = mode === "read", cfg = {
                    evaluation: ev,
                    readonly: readonly,
                    showStatus: false
                };

            if (mode === "write" || mode === "read") {
                switch (klass) {
                    case "GradeInstance":
                        widget = new Wegas.GradeInput(cfg).render(container);
                        break;
                    case "TextEvaluationInstance":
                        cfg.readonly = {
                            "content": "return " + readonly + ";"
                        };
                        widget = new Wegas.TextEvalInput(cfg).render(container);
                        break;
                    case "CategorizedEvaluationInstance":
                        widget = new Wegas.CategorizationInput(cfg).render(container);
                        break;
                }
                this.add(widget);
                //widget.before("*:save", this.fire, this);
                //widget.on(["*:message", "*:saved", "*:revert", "*:editing", "*:showOverlay", "*:hideOverlay"], this.fire, this); // Event on the loaded
            }
            return widget;
        },
        renderUI: function() {
            var review = this.get("review"), widget,
                i, evls,
                reviewer = this.get("reviewer"),
                desc = this.get("descriptor"),
                fbContainer = this.get("contentBox").one(".feedback").one(".content"),
                fbEContainer = this.get("contentBox").one(".feedbackEv").one(".content"),
                modeFb = "hidden",
                modeFbEval = "hidden";

            this.get("contentBox").one(".title").setContent(this.get("title"));
            this.get("contentBox").one(".description").setContent(desc.get("description"));

            var content = this.get(CONTENTBOX).one(".toReview").one(".content");
            this.showOverlay();
            Y.Wegas.Facade.Variable.sendRequest({
                request: "/PeerReviewController/" + desc.get("id") + "/ToReview/" + review.get("id")
                    + "/" + Y.Wegas.Facade.Game.cache.get("currentPlayerId"),
                cfg: {
                    updateCache: false,
                    method: "get"
                },
                on: {
                    success: Y.bind(function(e) {
                        content.setContent(e.response.entity.get("value"));
                        this.hideOverlay();
                        this.fire("contentUpdated");
                    }, this),
                    failure: Y.bind(function() {
                    }, this)
                }
            });


            this.get("contentBox").one(".toReview").toggleClass("me", !reviewer);
            this.get("contentBox").one(".feedback").toggleClass("me", reviewer);
            this.get("contentBox").one(".feedbackEv").toggleClass("me", !reviewer);

            this.get("contentBox").one(".toReview").one(".subtitle").setContent(I18n.t("review.editor.given"));

            if (reviewer) {
                if (review.get("reviewState") === "DISPATCHED") {
                    modeFb = "write";
                    this.get("contentBox").one(".feedback").one(".subtitle").setContent(I18n.t("review.editor.ask_your_feedback"));

                } else {
                    modeFb = "read";
                    this.get("contentBox").one(".feedback").one(".subtitle").setContent(I18n.t("review.editor.your_feedback"));
                }
                if (review.get("reviewState") === "CLOSED") {
                    modeFbEval = "read";
                    this.get("contentBox").one(".feedbackEv").one(".subtitle").setContent(I18n.t("review.editor.author_comment"));
                }
            } else { // Author
                if (review.get("reviewState") === "NOTIFIED") {
                    modeFb = "read";
                    modeFbEval = "write";
                    this.get("contentBox").one(".feedback").one(".subtitle").setContent(I18n.t("review.editor.reviewer_feedback"));
                    this.get("contentBox").one(".feedbackEv").one(".subtitle").setContent(I18n.t("review.editor.ask_comment"));
                } else if (review.get("reviewState") === "COMPLETED" || review.get("reviewState") === "CLOSED") {
                    modeFb = "read";
                    modeFbEval = "read";
                    this.get("contentBox").one(".feedback").one(".subtitle").setContent(I18n.t("review.editor.reviewer_feedback"));
                    this.get("contentBox").one(".feedbackEv").one(".subtitle").setContent(I18n.t("review.editor.comment"));
                }
            }

            if (modeFb === "write" || modeFbEval === "write") {
                if (modeFb === "write") {
                    this.get("contentBox").one(".container .feedback .subtitle").append("<span class=\"save-status\"></span>");
                } else {
                    this.get("contentBox").one(".container .feedbackEv .subtitle").append("<span class=\"save-status\"></span>");
                }

                if (this.get("showSubmitButton")) {
                    this.submitButton = new Y.Button({
                        label: I18n.t("review.global.submit"),
                        visible: true
                    }).render(this.get(CONTENTBOX).one('.submit'));
                }
            }

            evls = review.get("feedback");
            for (i in evls) {
                this.widgets[evls[i].get("id")] = this.addEvaluation(evls[i], fbContainer, modeFb);
            }

            evls = review.get("comments");
            for (i in evls) {
                this.widgets[evls[i].get("id")] = this.addEvaluation(evls[i], fbEContainer, modeFbEval);
            }
        },
        syncUI: function() {
            var i, evl, evls, review = this.get("review"), w;

            evls = review.get("feedback").concat(review.get("comments"));
            for (i in evls) {
                evl = evls[i];
                w = this.widgets[evl.get("id")];
                if (w) {
                    w.set("evaluation", evl);
                    w.syncUI();
                }
            }
        },
        outdate: function() {
            this._status = "OUTDATED";
            this.get("contentBox").one(".title").append("<p style='warn'>Outdated</p>");
        },
        bindUI: function() {
            if (this.submitButton) {
                this.submitButton.on("click", this.submit, this);
            }
            /*if (this.saveButton) {
             this.saveButton.on("click", this.save, this);
             }*/

            //this.handlers.beforeAnswerSave = this.before("*:save", this.onSave, this);
            this.handlers.afterAnswerSave = this.after("*:saved", this.onSaved, this);
            this.handlers.editing = this.on("*:editing", this.onEdit, this);
            this.handlers.revert = this.on("*:revert", this.onRevert, this);

        },
        /*onSave: function(e) {
         Y.log("SAVE " + e.id + " := " + e.value);
         },*/
        setStatus: function(status) {
            this.get("contentBox").one(".save-status").setContent(status);

            if (this.statusTimer) {
                this.statusTimer.cancel();
            }
            this.statusTimer = Y.later(3000, this, function() {
                this.get("contentBox").one(".save-status").setContent("");
            });
        },
        onSaved: function(e) {
            this.setStatus("not saved");
            this.submitButton.set("disabled", true);
            delete this.locks[e.id];
            if (this.timer) {
                this.timer.cancel();
            }
            this.timer = Y.later(2000, this, function() {
                var id;
                for (id in this.locks) {
                    if (this.locks.hasOwnProperty(id) && this.locks[id]) {
                        return;
                    }
                }
                this.setStatus("saving <i class=\"fa fa-1x fa-spinner fa-spin\"></i>");
                this.save();
            });
        },
        onEdit: function(e) {
            this.locks[e.id] = true;
            this.setStatus("not saved");
            this.submitButton.set("disabled", true);
        },
        onRevert: function(e) {
            delete this.locks[e.id];
        },
        destructor: function() {
            Y.log("DESTROY REVIEW WIDGET");
            if (this.timer) {
                this.timer.cancel();
                this.save();
            }
            var id;
            for (id in this.handlers) {
                if (this.handlers.hasOwnProperty(id)) {
                    this.handlers[id].detach();
                }
            }

            /*for (id in this.widgets) {
             this.widgets[id] && this.widgets[id].destroy();
             }*/

            if (this.submitButton) {
                this.submitButton.destroy();
            }
            /*if (this.saveButton) {
             this.saveButton.destroy();
             }*/
        },
        _sendRequest: function(action, updateCache, cb) {
            this.showOverlay();
            Y.Wegas.Facade.Variable.sendQueuedRequest({
                request: "/PeerReviewController/" + action
                    + "/" + Y.Wegas.Facade.Game.cache.get("currentPlayerId"),
                cfg: {
                    updateCache: updateCache,
                    method: "post",
                    data: this.get("review")
                },
                on: {
                    success: Y.bind(function() {
                        this.hideOverlay();
                        cb && cb.call(this);
                    }, this),
                    failure: Y.bind(function() {
                        this.hideOverlay();
                        cb && cb.call(this);
                        this.showMessage("error", "Something went wrong: " + action + " review");
                    }, this)
                }
            });
        },
        save: function() {
            Y.log("SendSaveReviewRequest");
            Y.later(500, this, function() {
                this._sendRequest("SaveReview", false, function() {
                    this.submitButton.set("disabled", false);
                    this.setStatus("saved");
                });
            });
        },
        submit: function() {
            Wegas.Panel.confirm(I18n.t("review.global.confirmation").capitalize(), Y.bind(function() {
                Wegas.Panel.confirmPlayerAction(Y.bind(function() {
                    this._sendRequest("SubmitReview", true);
                }, this));
            }, this));
        }
    }, {
        ATTRS: {
            title: {
                type: "string",
                value: "Review"
            },
            descriptor: {
                type: "PeerReviewDescriptor"
            },
            review: {
                type: "Review"
            },
            reviewer: {
                type: "boolean",
                value: false
            },
            showPage: {
                type: "string",
                _inputex: {
                    label: "Show page",
                    _type: "pageselect",
                    required: true
                }
            },
            showSubmitButton: {
                type: "boolean",
                value: true,
                _inputex: {
                    label: "Display submit button"
                }
            }

        }
    });
    Wegas.ReviewWidget = ReviewWidget;

    GradeInput = Y.Base.create("wegas-review-gradeinput", Y.Widget, [Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
        CONTENT_TEMPLATE: "<div class=\"wegas-review-evaluation\">" +
            "<div class=\"wegas-review-evaluation-label\"></div>" +
            "<div class=\"wegas-review-evaluation-desc\"></div>" +
            "<div class=\"wegas-review-evaluation-content\">" +
            "<div class=\"wegas-review-grade-instance-slider\"></div>" +
            "<div class=\"wegas-review-grade-instance-input-container\">" +
            "<input class=\"wegas-review-grade-instance-input\" />" +
            "</div>" +
            "</div>" +
            "</div>",
        initializer: function() {
            this.handlers = [];
            this.xSlider = null;
            this._initialValue = undefined;
            //this.get("evaluation").get("value");
            this.publish("save", {
                emitFacade: true
            });
            this.publish("saved", {
                emitFacade: true
            });
            this.publish("editing", {
                emitFacade: true
            });
            /* to be fired if content is edited and canceled in a shot */
            this.publish("revert", {
                emitFacade: true
            });
        },
        renderUI: function() {
            var ev = this.get("evaluation"), desc = ev.get("descriptor"),
                CB = this.get("contentBox");
            this.evId = ev.get("id");
            CB.one(".wegas-review-evaluation-label").setContent(desc.get("name"));
            CB.one(".wegas-review-evaluation-desc").setContent(desc.get("description"));

            if (!this.get("readonly")) {
                //this.get(CONTENTBOX).one(".wegas-review-grade-instance-input").set("value", ev.get("value"));
                if (Y.Lang.isNumber(desc.get("minValue")) && Y.Lang.isNumber(desc.get("maxValue"))) {
                    this.xSlider = new Y.Slider({
                        min: desc.get("minValue"),
                        max: desc.get("maxValue"),
                        value: +ev.get("value")
                    }).render(this.get(CONTENTBOX).one(".wegas-review-grade-instance-slider"));
                }
                //} else {
                //    this.get(CONTENTBOX).one(".wegas-review-grade-instance-input-container").setContent('<p>' +
                //        ev.get("value") + '</p>');
            }

        },
        syncUI: function() {
            var evl, value;
            evl = this.get("evaluation");
            value = evl.get("value");
            this.evId = evl.get("id");

            if (value !== this._initialValue) {
                this._initialValue = value;

                if (!this.get("readonly")) {
                    this.get(CONTENTBOX).one(".wegas-review-grade-instance-input").set("value", value);
                    if (this.xSlider) {
                        this.xSlider.set("value", value);
                    }
                } else {
                    this.get(CONTENTBOX).one(".wegas-review-grade-instance-input-container").setContent('<p>' +
                        (value ? value : "<i>" + I18n.t("review.editor.noValueProvided")) + '</i></p>');
                }
            } else {
                if (!this.get("readonly")) {
                    evl.set("value", this.getCurrentValue());
                }
            }
        },
        getCurrentValue: function() {
            if (this.get("readonly")) {
                return this.get(CONTENTBOX).one(".wegas-review-grade-instance-input-container p").getContent();
            } else {
                return parseInt(this.get(CONTENTBOX).one(".wegas-review-grade-instance-input").get("value"), 10);
            }
        },
        bindUI: function() {
            var input = this.get(CONTENTBOX).one(".wegas-review-grade-instance-input");
            if (this.xSlider) {
                this.handlers.push(this.xSlider.after("valueChange", this.updateInput, this));
            }
            if (input) {
                this.handlers.push(input.on("keyup", this.updateSlider, this));
            }
            this.on("save", this._save);
        },
        _save: function(e) {
            var ev = this.get("evaluation");
            ev.set("value", e.value);
            this.fire("saved", {id: e.id, value: e.value});
        },
        destructor: function() {
            this.timer && this.timer.cancel();
            Y.Array.each(this.handlers, function(h) {
                h.detach();
            });
        },
        updateValue: function(rawValue) {
            var ev = this.get("evaluation"),
                desc = ev.get("descriptor"),
                value = +rawValue;

            if (isNaN(value)) {
                this.showMessage("error", I18n.t("errors.nan", {value: rawValue}));
                return false;
            } else if ((desc.get("minValue") && value < desc.get("minValue")) ||
                (desc.get("maxValue") && value > desc.get("maxValue"))
                ) {
                this.showMessage("error", I18n.t("errors.outOfBounds", {value: value, min: desc.get("minValue"), max: desc.get("maxValue")}));
                return false;
            }

            if (value === this._initialValue) {
                this.fire("revert", {"id": this.evId, "value": value});
            } else {
                this.fire("save", {"id": this.evId, "value": value});
            }

            return true;
        },
        updateInput: function(e) {
            var input = this.get(CONTENTBOX).one(".wegas-review-grade-instance-input"),
                value = this.xSlider.get("value");

            if (this.updateValue(value)) {
                input.set("value", value);
            }
        },
        updateSlider: function(e) {
            var input = this.get(CONTENTBOX).one(".wegas-review-grade-instance-input"),
                value = input.get("value");

            this.fire("editing", {"id": this.evId, "value": value});

            if (this.timer) {
                this.timer.cancel();
            }
            this.timer = Y.later(200, this, function() {
                this.timer = null;
                if (this.updateValue(value)) {
                    if (this.xSlider) {
                        this.xSlider.set("value", value);
                    }
                }
            });
        }
    }, {
        ATTRS: {
            evaluation: {
                type: "GradeInstance"
            },
            readonly: {
                type: "boolean",
                value: false
            }
        }
    });
    Wegas.GradeInput = GradeInput;




    TextEvalInput = Y.Base.create("wegas-review-textevalinput", Y.Wegas.TextInput, [], {
        CONTENT_TEMPLATE: "<div class=\"wegas-review-evaluation\">" +
            "<div class=\"wegas-review-evaluation-label\"></div>" +
            "<div class=\"wegas-review-evaluation-desc\"></div>" +
            "<div class=\"wegas-review-evaluation-content\">" +
            "<div class=\"wegas-text-input-editor\"></div>" +
            "<div class=\"wegas-text-input-toolbar\"><div class=\"status\"></div></div>" +
            "</div>" +
            "</div>",
        getInitialContent: function() {
            var ev = this.get("evaluation"), desc = ev.get("descriptor"),
                CB = this.get("contentBox");

            CB.one(".wegas-review-evaluation-label").setContent(desc.get("name"));
            CB.one(".wegas-review-evaluation-desc").setContent(desc.get("description"));
            this._initialContent = ev.get("value");

            if (this.get("readonly.evaluated") && !this._initialContent) {
                return "<i>" + I18n.t("review.editor.noValueProvided") + '</i>';
            }

            return this._initialContent;
        },
        valueChanged: function(newValue) {
            this.currentValue = newValue;
        },
        getCurrentValue: function(){
            return this.currentValue;  
        },
        getPayload: function(value) {
            return {
                id: this.get("evaluation").get("id"),
                value: value
            };
        },
        /*save: function(value) {
         this.get("evaluation").set("value", value);
         return true;
         },*/
        _save: function(e) {
            var cb = this.get("contentBox"),
                value = e.value,
                ev = this.get("evaluation");
            this._initialContent = value;
            Y.log("SetInitialContext _Save -> " + value);
            ev.set("value", value);
            cb.removeClass("loading");
            this.fire("saved", this.getPayload(e.value));
        },
        syncUI: function() {
            var evl, value;
            evl = this.get("evaluation");
            value = evl.get("value");
            Y.log("Sync? " + value + " <==> " + this._initialContent);
            if (value !== this._initialContent && this.getCurrentValue() === this._initialContent) {
                Y.log("Sync: Set _content & Editor to \"" + value + "\"");
                Y.later(100, this, function() {
                    var content = this.getInitialContent();
                    this.currentValue = content;
                    this.editor.setContent(content);
                    /*var tmceI = tinyMCE.get(this.get("contentBox").one(".wegas-text-input-editor"));
                     if (tmceI) {
                     tmceI.setContent(this.getInitialContent());
                     }*/

                });
            } else {
                if (!this.get("readonly.evaluated")) {
                    evl.set("value", this.editor.getContent());
                }
            }
        }
    }, {
        EDITORNAME: "TextEvalInput",
        ATTRS: {
            evaluation: {
                type: "TextEvaluationInstance"
            },
            showSaveButton: {
                type: "boolean",
                value: false
            }
        }
    });
    Wegas.TextEvalInput = TextEvalInput;


    CategorizationInput = Y.Base.create("wegas-review-categinput", Y.Widget, [Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
        CONTENT_TEMPLATE: "<div class=\"wegas-review-evaluation\">" +
            "<div class=\"wegas-review-evaluation-label\"></div>" +
            "<div class=\"wegas-review-evaluation-desc\"></div>" +
            "<div class=\"wegas-review-evaluation-content\">" +
            "<div class=\"wegas-review-categinput-content\"></div>" +
            "</div>" +
            "</div>",
        initializer: function() {
            this.handlers = [];
            this._initialValue = undefined;
            this.publish("save", {
                emitFacade: true
            });
            this.publish("saved", {
                emitFacade: true
            });
            this.publish("editing", {
                emitFacade: true
            });
            /* to be fired if content is edited and canceled in a shot */
            this.publish("revert", {
                emitFacade: true
            });
        },
        renderUI: function() {
            var ev = this.get("evaluation"), desc = ev.get("descriptor"), categs, i,
                categ, frag, CB = this.get("contentBox");
            CB.one(".wegas-review-evaluation-label").setContent(desc.get("name") + ": ");
            CB.one(".wegas-review-evaluation-desc").setContent(desc.get("description"));

            if (!this.get("readonly")) {
                frag = ['<select>'];
                categs = desc.get("categories");
                frag.push("<option value=\"\" disabled selected>--select--</option>");
                for (i in categs) {
                    if (categs.hasOwnProperty(i)) {
                        categ = categs[i];
                        frag.push("<option value=\"" + categ + "\" " +
                            (categ === ev.get("value") ? "selected=''" : "") +
                            ">" + categ + "</option>");
                    }
                }
                frag.push('</select>');
                CB.one(".wegas-review-categinput-content").setContent(frag.join(""));
            }
        },
        getCurrentValue: function() {
            var option = this.get("contentBox").one(".wegas-review-categinput-content select");
            if (option) {
                return option.get("options").item(option.get("selectedIndex")).getAttribute("value");
            } else {
                option = this.get("contentBox").one(".wegas-review-categinput-content");
                if (option) {
                    return option.getContent();
                } else {
                    return undefined;
                }
            }
        },
        syncUI: function() {
            var evl, CB, value, select, option;
            CB = this.get("contentBox");
            evl = this.get("evaluation");
            value = evl.get("value");
            if (this.get("readonly")) {
                if (!value) {
                    value = "<i>" + I18n.t("review.editor.noValueProvided") + '</i>';
                }
                CB.one(".wegas-review-categinput-content").setContent(value);
            } else if (value !== this._initialValue) {
                this._initialValue = value;
                select = CB.one(".wegas-review-categinput-content select");
                option = select.one("option[value='" + value + "']");

                option && option.setAttribute("selected");
            } else {
                // no-update case, fetch effective value from "select"
                evl.set("value", this.getCurrentValue());
            }
        },
        bindUI: function() {
            var select;
            select = this.get(CONTENTBOX).one(".wegas-review-categinput-content select");
            if (select) {
                this.handlers.push(select.on("change", this.updateValue, this));
            }
        },
        destructor: function() {
            Y.Array.each(this.handlers, function(h) {
                h.detach();
            });
        },
        updateValue: function(e) {
            var ev = this.get("evaluation"),
                value = e.target.get("value");

            ev.set("value", value);
            this.fire("saved", {id: ev.get("id"), value: value});

            return true;
        }
    }, {
        ATTRS: {
            evaluation: {
                type: "CategorizedEvaluationInstance"
            },
            readonly: {
                type: "boolean",
                value: false
            }
        }
    });
    Wegas.CategorizationInput = CategorizationInput;
});
